import { assert } from "@esm-bundle/chai"
import type * as ort from "onnxruntime-web/wasm"
import { SileroV5 } from "../src/models/v5"

const FRAME_SAMPLES = 512
const CONTEXT_SAMPLES = 64

class FakeTensor {
  constructor(
    public type: string,
    public data: unknown,
    public dims?: number[]
  ) {}
  dispose() {}
}

/**
 * A stand-in for onnxruntime that records the input tensor of every call, so we
 * can check what the model is actually handed rather than what comes back.
 */
function fakeOrt() {
  const inputs: Float32Array[] = []
  const fake = {
    Tensor: FakeTensor,
    InferenceSession: {
      create: async () => ({
        run: async (feeds: { input: FakeTensor }) => {
          inputs.push(Float32Array.from(feeds.input.data as Float32Array))
          return {
            stateN: new FakeTensor(
              "float32",
              new Float32Array(2 * 128),
              [2, 1, 128]
            ),
            output: { data: [0.5] },
          }
        },
        release: async () => {},
      }),
    },
  }
  return { ortInstance: fake as unknown as typeof ort, inputs }
}

/** Distinct per frame and per sample, so a misplaced slice is unambiguous. */
function rampFrame(seed: number) {
  const frame = new Float32Array(FRAME_SAMPLES)
  for (let i = 0; i < FRAME_SAMPLES; i++) {
    frame[i] = seed * 1000 + i
  }
  return frame
}

async function newModel() {
  const { ortInstance, inputs } = fakeOrt()
  const model = await SileroV5.new(ortInstance, async () => new ArrayBuffer(0))
  return { model, inputs }
}

describe("SileroV5 context window", () => {
  it("passes 576 samples, not the bare 512-sample frame", async () => {
    const { model, inputs } = await newModel()
    await model.process(rampFrame(1))
    assert.equal(inputs[0].length, CONTEXT_SAMPLES + FRAME_SAMPLES)
  })

  it("starts with a zeroed context", async () => {
    const { model, inputs } = await newModel()
    const frame = rampFrame(1)
    await model.process(frame)
    assert.deepEqual(
      Array.from(inputs[0].subarray(0, CONTEXT_SAMPLES)),
      Array(CONTEXT_SAMPLES).fill(0)
    )
    assert.deepEqual(
      Array.from(inputs[0].subarray(CONTEXT_SAMPLES)),
      Array.from(frame)
    )
  })

  it("prepends the tail of the previous frame, not its head", async () => {
    const { model, inputs } = await newModel()
    const first = rampFrame(1)
    const second = rampFrame(2)
    await model.process(first)
    await model.process(second)

    assert.deepEqual(
      Array.from(inputs[1].subarray(0, CONTEXT_SAMPLES)),
      Array.from(first.subarray(FRAME_SAMPLES - CONTEXT_SAMPLES)),
      "context should be the last 64 samples of the previous frame"
    )
    assert.deepEqual(
      Array.from(inputs[1].subarray(CONTEXT_SAMPLES)),
      Array.from(second)
    )
  })

  it("clears the context in reset_state", async () => {
    const { model, inputs } = await newModel()
    await model.process(rampFrame(1))
    model.reset_state()
    await model.process(rampFrame(2))
    assert.deepEqual(
      Array.from(inputs[1].subarray(0, CONTEXT_SAMPLES)),
      Array(CONTEXT_SAMPLES).fill(0),
      "a reset model should behave like a fresh one"
    )
  })

  it("copies the context, so a reused frame buffer cannot corrupt it", async () => {
    const { model, inputs } = await newModel()
    const frame = rampFrame(1)
    const tail = Array.from(frame.subarray(FRAME_SAMPLES - CONTEXT_SAMPLES))
    await model.process(frame)
    // The worklet hands the same buffer back for the next frame.
    frame.fill(-1)
    await model.process(rampFrame(2))
    assert.deepEqual(
      Array.from(inputs[1].subarray(0, CONTEXT_SAMPLES)),
      tail,
      "context must not alias the caller's frame"
    )
  })
})
