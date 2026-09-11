import * as ort from "onnxruntime-web/wasm"
import { log } from "../logging"
import { ModelFactory, ModelFetcher, SpeechProbabilities } from "./common"

// Silero v5 scores a frame against the tail of the frame before it, so an onset
// straddling a frame boundary is still seen whole. 64 samples at 16 kHz, matching
// `OnnxWrapper.__call__` in silero-vad's utils_vad.py.
const CONTEXT_SAMPLES = 64

function getNewState(ortInstance: typeof ort) {
  const zeroes = Array(2 * 128).fill(0)
  return new ortInstance.Tensor("float32", zeroes, [2, 1, 128])
}

export class SileroV5 {
  private _context = new Float32Array(CONTEXT_SAMPLES)

  constructor(
    private _session: ort.InferenceSession,
    private _state: ort.Tensor,
    private _sr: ort.Tensor,
    private ortInstance: typeof ort
  ) {}

  static new: ModelFactory = async (
    ortInstance: typeof ort,
    modelFetcher: ModelFetcher
  ) => {
    log.debug("Loading VAD...")
    const modelArrayBuffer = await modelFetcher()
    const _session = await ortInstance.InferenceSession.create(modelArrayBuffer)

    const _sr = new ortInstance.Tensor("int64", [16000n])
    const _state = getNewState(ortInstance)
    log.debug("...finished loading VAD")
    return new SileroV5(_session, _state, _sr, ortInstance)
  }

  reset_state = () => {
    this._state = getNewState(this.ortInstance)
    this._context = new Float32Array(CONTEXT_SAMPLES)
  }

  process = async (audioFrame: Float32Array): Promise<SpeechProbabilities> => {
    const withContext = new Float32Array(CONTEXT_SAMPLES + audioFrame.length)
    withContext.set(this._context, 0)
    withContext.set(audioFrame, CONTEXT_SAMPLES)
    this._context = audioFrame.slice(-CONTEXT_SAMPLES)

    const t = new this.ortInstance.Tensor("float32", withContext, [
      1,
      withContext.length,
    ])
    const inputs = {
      input: t,
      state: this._state,
      sr: this._sr,
    }
    const out = await this._session.run(inputs)

    if (!out["stateN"]) {
      throw new Error("No state from model")
    }
    this._state = out["stateN"]

    if (!out["output"]?.data) {
      throw new Error("No output from model")
    }
    const isSpeech = out["output"].data[0]
    if (typeof isSpeech != "number") {
      throw new Error("Weird output data")
    }
    const notSpeech = 1 - isSpeech
    return { notSpeech, isSpeech }
  }

  release = async () => {
    await this._session.release()
    this._state.dispose()
    this._sr.dispose()
  }
}
