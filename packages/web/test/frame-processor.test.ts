import { expect } from "@esm-bundle/chai"
import {
  FrameProcessor,
  FrameProcessorEvent,
  FrameProcessorOptions,
  defaultFrameProcessorOptions,
} from "../src/frame-processor"
import { Message } from "../src/messages"
import { SpeechProbabilities } from "../src/models"

describe("FrameProcessor events ", () => {
  // V5 = 32 ms per frame
  const msPerFrame = 32
  let events: { frame: number; event: FrameProcessorEvent }[]

  interface SpeechPart<Name extends string = string> {
    name: Name
    isSpeech: boolean
    durationMs: number
  }

  interface SequencePart<Name extends string = string> {
    name: Name
    isSpeech: boolean
    start: number
    end: number
  }

  type NamedSequence<T extends readonly SpeechPart[]> = {
    [K in T[number] as K["name"]]: SequencePart<K["name"]>
  }

  // Generates structure with start/end indexes for each part, and returns a named object
  function sequenceInMs<T extends readonly SpeechPart<string>[]>(
    parts: T
  ): { named: NamedSequence<T>; parts: SequencePart[]; totalFrames: number } {
    let frameIdx = 0
    const result: SequencePart[] = []
    const named = {} as NamedSequence<T>
    for (const part of parts) {
      const frameCount = Math.ceil(part.durationMs / msPerFrame)
      const start = frameIdx
      const end = frameIdx + frameCount - 1
      const seqPart: SequencePart = {
        name: part.name,
        isSpeech: part.isSpeech,
        start,
        end,
      }
      result.push(seqPart)
      // @ts-expect-error: TS can't infer K here, but runtime is safe
      named[part.name] = seqPart
      frameIdx += frameCount
    }
    return { named, parts: result, totalFrames: frameIdx }
  }

  // Transforms SequenceWithParts to isSpeechSequence: boolean[]
  const sequencePartsToBoolArray = (seq: {
    parts: SequencePart[]
    totalFrames: number
  }): boolean[] => {
    const arr: boolean[] = new Array(seq.totalFrames)
    for (const part of seq.parts) {
      for (let i = part.start; i <= part.end; i++) {
        arr[i] = part.isSpeech
      }
    }
    return arr
  }

  const createProcessor = (
    isSpeechSequence: boolean[],
    testOptions: Partial<FrameProcessorOptions> = {}
  ) => {
    let callCount = 0
    const modelProcessFunc = async (
      _frame: Float32Array
    ): Promise<SpeechProbabilities> => {
      const isSpeech = isSpeechSequence[callCount]
        ? { notSpeech: 0.0, isSpeech: 1.0 }
        : { notSpeech: 1.0, isSpeech: 0.0 }
      callCount++
      return isSpeech
    }
    const modelResetFunc = () => {}
    const options = { ...defaultFrameProcessorOptions, ...testOptions }
    const processor = new FrameProcessor(
      modelProcessFunc,
      modelResetFunc,
      options,
      msPerFrame
    )
    processor.resume()
    return processor
  }

  const process = async (
    isSpeechSequence: boolean[],
    testOptions: Partial<FrameProcessorOptions> = {}
  ) => {
    const processor = createProcessor(isSpeechSequence, testOptions)
    for (let i = 0; i < isSpeechSequence.length; i++) {
      // Send frame with size of 1, content is not relevant for this test
      // But test can validate audio buffer length if needed
      await processor.process(
        new Float32Array([isSpeechSequence[i] ? 1 : 0]),
        (event) => {
          if (event.msg !== Message.FrameProcessed) {
            events.push({ frame: i, event })
          }
        }
      )
    }
  }

  // Helper: creates Float32Array from parts, 1 for isSpeech, 0 for silence
  const float32ArrayFromParts = (
    parts: readonly SpeechPart[]
  ): Float32Array => {
    const arr: number[] = []
    for (const part of parts) {
      const frameCount = Math.ceil(part.durationMs / msPerFrame)
      for (let i = 0; i < frameCount; i++) {
        arr.push(part.isSpeech ? 1 : 0)
      }
    }
    return new Float32Array(arr)
  }

  beforeEach(() => {
    events = []
  })

  it("SpeechStart fires at exact start of speech part", async () => {
    const parts = [
      { name: "silence1", isSpeech: false, durationMs: 200 },
      {
        name: "speech1",
        isSpeech: true,
        durationMs: defaultFrameProcessorOptions.minSpeechMs / 2,
      },
      {
        name: "silence2",
        isSpeech: false,
        durationMs: defaultFrameProcessorOptions.redemptionMs / 2,
      },
    ] as const
    const seq = sequenceInMs(parts)
    const isSpeechSequence = sequencePartsToBoolArray(seq)

    await process(isSpeechSequence)

    expect(events).to.deep.equal([
      { frame: seq.named.speech1.start, event: { msg: Message.SpeechStart } },
    ])
  })

  it("SpeechRealStart fires at correct frame", async () => {
    const parts = [
      { name: "silence1", isSpeech: false, durationMs: 200 },
      {
        name: "speech1",
        isSpeech: true,
        durationMs: defaultFrameProcessorOptions.minSpeechMs * 2,
      },
      {
        name: "silence2",
        isSpeech: false,
        durationMs: defaultFrameProcessorOptions.redemptionMs / 2,
      },
    ] as const
    const seq = sequenceInMs(parts)
    const isSpeechSequence = sequencePartsToBoolArray(seq)

    await process(isSpeechSequence)

    const minSpeechFrames = Math.floor(
      defaultFrameProcessorOptions.minSpeechMs / msPerFrame
    )
    expect(events).to.deep.include({
      frame: seq.named.speech1.start,
      event: { msg: Message.SpeechStart },
    })
    expect(events).to.deep.include({
      frame: seq.named.speech1.start + minSpeechFrames - 1,
      event: { msg: Message.SpeechRealStart },
    })
  })

  it("SpeechEnd fires at correct frame after speech", async () => {
    const parts = [
      { name: "silence1", isSpeech: false, durationMs: 200 },
      {
        name: "speech1",
        isSpeech: true,
        durationMs: defaultFrameProcessorOptions.minSpeechMs * 2,
      },
      {
        name: "silence2",
        isSpeech: false,
        durationMs: defaultFrameProcessorOptions.redemptionMs * 2,
      },
    ] as const
    const seq = sequenceInMs(parts)
    const isSpeechSequence = sequencePartsToBoolArray(seq)

    await process(isSpeechSequence)

    // SpeechEnd should fire at the first frame after redemption period in silence2
    const redemptionFrames = Math.floor(
      defaultFrameProcessorOptions.redemptionMs / msPerFrame
    )
    const expectedSpeechEndFrame =
      seq.named.silence2.start + redemptionFrames - 1

    expect(
      events.some(
        (e) =>
          e.frame === expectedSpeechEndFrame &&
          e.event.msg === Message.SpeechEnd
      )
    ).to.be.true
  })

  it("VADMisfire fires if speech is too short", async () => {
    const parts = [
      { name: "silence1", isSpeech: false, durationMs: 200 },
      {
        name: "speech1",
        isSpeech: true,
        durationMs: defaultFrameProcessorOptions.minSpeechMs / 4,
      },
      {
        name: "silence2",
        isSpeech: false,
        durationMs: defaultFrameProcessorOptions.redemptionMs * 2,
      },
    ] as const
    const seq = sequenceInMs(parts)
    const isSpeechSequence = sequencePartsToBoolArray(seq)

    await process(isSpeechSequence)

    // VADMisfire should fire at the first frame after redemption period in silence2
    const redemptionFrames = Math.floor(
      defaultFrameProcessorOptions.redemptionMs / msPerFrame
    )
    const expectedMisfireFrame = seq.named.silence2.start + redemptionFrames - 1

    expect(
      events.some(
        (e) =>
          e.frame === expectedMisfireFrame && e.event.msg === Message.VADMisfire
      )
    ).to.be.true
  })

  it("Speech resets redemption counter and VADMisfire is not sent when SpeechRealStart has already fired", async () => {
    const redemptionMs = defaultFrameProcessorOptions.redemptionMs
    const minSpeechMs = defaultFrameProcessorOptions.minSpeechMs

    const silenceShortMs = redemptionMs / 2
    const silenceFillMs = redemptionMs + 100

    const parts = [
      {
        name: "silence1",
        isSpeech: false,
        durationMs: defaultFrameProcessorOptions.preSpeechPadMs * 2,
      },
      { name: "speech1", isSpeech: true, durationMs: minSpeechMs * 2 },
      { name: "silence2", isSpeech: false, durationMs: silenceShortMs },
      { name: "shortspeech1", isSpeech: true, durationMs: minSpeechMs / 4 },
      { name: "silence3", isSpeech: false, durationMs: silenceShortMs },
      { name: "shortspeech2", isSpeech: true, durationMs: minSpeechMs / 4 },
      { name: "finalsilence", isSpeech: false, durationMs: silenceFillMs },
    ] as const

    const seq = sequenceInMs(parts)
    const isSpeechSequence = sequencePartsToBoolArray(seq)

    await process(isSpeechSequence)

    const fullAudio = float32ArrayFromParts(parts)
    const speechEndFrame =
      seq.named.finalsilence.start + Math.floor(redemptionMs / msPerFrame) - 1
    const audioStartFrame =
      seq.named.speech1.start -
      Math.floor(defaultFrameProcessorOptions.preSpeechPadMs / msPerFrame)
    const expectedAudio = fullAudio.slice(audioStartFrame, speechEndFrame + 1)
    expect(events).to.deep.equal([
      { frame: seq.named.speech1.start, event: { msg: Message.SpeechStart } },
      {
        frame:
          seq.named.speech1.start + Math.floor(minSpeechMs / msPerFrame) - 1,
        event: { msg: Message.SpeechRealStart },
      },
      // Redemption counter reset here. SpeechEnd should fire only after final silence.
      {
        frame: speechEndFrame,
        event: { msg: Message.SpeechEnd, audio: expectedAudio },
      },
    ])
  })

  it("EMIT_CHUNK fires when framesToEmitMs is set and only after SPEECH_REAL_START", async () => {
    const testOptions: Partial<FrameProcessorOptions> = {
      framesToEmitMs: msPerFrame,
    }
    const parts = [
      { name: "silence1", isSpeech: false, durationMs: 200 },
      {
        name: "speech1",
        isSpeech: true,
        durationMs: defaultFrameProcessorOptions.minSpeechMs / 4,
      },
      {
        name: "silence2",
        isSpeech: false,
        durationMs: defaultFrameProcessorOptions.redemptionMs * 2,
      },
    ] as const
    const seq = sequenceInMs(parts)
    const isSpeechSequence = sequencePartsToBoolArray(seq)

    await process(isSpeechSequence, testOptions)

    const redemptionFrames = Math.floor(
      defaultFrameProcessorOptions.redemptionMs / msPerFrame
    )
    expect(events).to.deep.equal([
      { frame: seq.named.speech1.start, event: { msg: Message.SpeechStart } },
      {
        frame: seq.named.silence2.start + redemptionFrames - 1,
        event: { msg: Message.VADMisfire },
      },
    ])
  })

  it("EMIT_CHUNK 3 times with different durations and remaining audio in SpeechEnd", async () => {
    const redemptionFrames = 5
    const minSpeechFrames = 10
    const preSpeechPadFrames = 2
    const framesToEmitFrames = 4
    const testOptions: Partial<FrameProcessorOptions> = {
      preSpeechPadMs: msPerFrame * preSpeechPadFrames,
      framesToEmitMs: msPerFrame * framesToEmitFrames,
      minSpeechMs: msPerFrame * minSpeechFrames,
      redemptionMs: msPerFrame * redemptionFrames,
    }

    const expectedSecondChunkLength = testOptions.framesToEmitMs!
    const parts = [
      { name: "silence1", isSpeech: false, durationMs: msPerFrame * 4 },
      {
        name: "speech1",
        isSpeech: true,
        durationMs:
          testOptions.minSpeechMs! +
          expectedSecondChunkLength +
          msPerFrame * 2 /* 3. chunk has 2 frames of speech */,
      },
      {
        name: "silence2",
        isSpeech: false,
        durationMs: defaultFrameProcessorOptions.redemptionMs,
      },
    ] as const
    const seq = sequenceInMs(parts)
    const isSpeechSequence = sequencePartsToBoolArray(seq)

    await process(isSpeechSequence, testOptions)

    const fullAudio = float32ArrayFromParts(parts)

    // first chunk is exactly minSpeechMs + preSpeechPadMs if the sum is longer than framesToEmitMs.
    const expectedFirstChunkStart = seq.named.speech1.start - preSpeechPadFrames
    const expectedFirstChunkFrames = minSpeechFrames + preSpeechPadFrames
    const expectedSpeechRealStartFrame =
      seq.named.speech1.start + minSpeechFrames - 1

    console.warn(events)
    expect(events).to.deep.equal([
      { frame: seq.named.speech1.start, event: { msg: Message.SpeechStart } },
      {
        frame: expectedSpeechRealStartFrame,
        event: { msg: Message.SpeechRealStart },
      },
      {
        frame: expectedSpeechRealStartFrame,
        event: {
          msg: Message.EmitChunk,
          audio: fullAudio.slice(
            expectedFirstChunkStart,
            expectedFirstChunkStart + expectedFirstChunkFrames
          ),
        },
      },
      {
        frame: expectedSpeechRealStartFrame + framesToEmitFrames,
        event: {
          msg: Message.EmitChunk,
          audio: fullAudio.slice(
            expectedSpeechRealStartFrame + 1,
            expectedSpeechRealStartFrame + 1 + framesToEmitFrames
          ),
        },
      },
      {
        frame: expectedSpeechRealStartFrame + framesToEmitFrames * 2,
        event: {
          msg: Message.EmitChunk,
          audio: fullAudio.slice(
            expectedSpeechRealStartFrame + 1 + framesToEmitFrames,
            expectedSpeechRealStartFrame + 1 + framesToEmitFrames * 2
          ),
        },
      },
      {
        frame: seq.named.silence2.start + redemptionFrames - 1,
        event: {
          msg: Message.SpeechEnd,
          audio: fullAudio.slice(
            expectedSpeechRealStartFrame + 1 + framesToEmitFrames * 2,
            seq.named.silence2.start + redemptionFrames
          ),
        },
      },
    ])
  })
})
