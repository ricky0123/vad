/*
Some of this code, together with the default options found in index.ts,
were taken (or took inspiration) from https://github.com/snakers4/silero-vad
*/

import { log } from "./logging"
import { Message } from "./messages"
import { SpeechProbabilities } from "./models"

export interface FrameProcessorOptions {
  /** Threshold over which values returned by the Silero VAD model will be considered as positively indicating speech.
   * The Silero VAD model is run on each frame. This number should be between 0 and 1.
   */
  positiveSpeechThreshold: number

  /** Threshold under which values returned by the Silero VAD model will be considered as indicating an absence of speech.
   * Note that the creators of the Silero VAD have historically set this number at 0.15 less than `positiveSpeechThreshold`.
   */
  negativeSpeechThreshold: number

  /** After a VAD value under the `negativeSpeechThreshold` is observed, the algorithm will wait `redemptionMs` ms
   * before running `onSpeechEnd`. If the model returns a value over `positiveSpeechThreshold` during this grace period, then
   * the algorithm will consider the previously-detected "speech end" as having been a false negative.
   */
  redemptionMs: number

  /** Number of ms to prepend to the audio segment that will be passed to `onSpeechEnd`. */
  preSpeechPadMs: number

  /** If an audio segment is detected as a speech segment according to initial algorithm but it is shorter than `minSpeechMs`,
   * it will be discarded and `onVADMisfire` will be run instead of `onSpeechEnd`.
   */
  minSpeechMs: number

  /**
   * If true, when the user pauses the VAD, it may trigger `onSpeechEnd`.
   */
  submitUserSpeechOnPause: boolean
}

export const defaultFrameProcessorOptions: FrameProcessorOptions = {
  positiveSpeechThreshold: 0.3,
  negativeSpeechThreshold: 0.25,
  preSpeechPadMs: 800,
  redemptionMs: 1400,
  minSpeechMs: 400,
  submitUserSpeechOnPause: false,
}

export function validateOptions(options: FrameProcessorOptions) {
  if (
    options.positiveSpeechThreshold < 0 ||
    options.positiveSpeechThreshold > 1
  ) {
    log.error("positiveSpeechThreshold should be a number between 0 and 1")
  }
  if (
    options.negativeSpeechThreshold < 0 ||
    options.negativeSpeechThreshold > options.positiveSpeechThreshold
  ) {
    log.error(
      "negativeSpeechThreshold should be between 0 and positiveSpeechThreshold"
    )
  }
  if (options.preSpeechPadMs < 0) {
    log.error("preSpeechPadMs should be positive")
  }
  if (options.redemptionMs < 0) {
    log.error("redemptionMs should be positive")
  }
  if (options.minSpeechMs < 0) {
    log.error("minSpeechMs should be positive")
  }
}

export interface FrameProcessorInterface {
  resume: () => void
  process: (
    arr: Float32Array,
    handleEvent: (event: FrameProcessorEvent) => any
  ) => Promise<any>
  endSegment: (handleEvent: (event: FrameProcessorEvent) => any) => {
    msg?: Message
    audio?: Float32Array
  }
}

const concatArrays = (arrays: Float32Array[]): Float32Array => {
  const sizes = arrays.reduce(
    (out, next) => {
      out.push((out.at(-1) as number) + next.length)
      return out
    },
    [0]
  )
  const outArray = new Float32Array(sizes.at(-1) as number)
  arrays.forEach((arr, index) => {
    const place = sizes[index]
    outArray.set(arr, place)
  })
  return outArray
}

export class FrameProcessor implements FrameProcessorInterface {
  redemptionFrames: number
  preSpeechPadFrames: number
  minSpeechFrames: number
  speaking: boolean = false
  audioBuffer: { frame: Float32Array; isSpeech: boolean }[]
  redemptionCounter = 0
  speechFrameCount = 0
  active = false
  speechRealStartFired = false

  constructor(
    public modelProcessFunc: (
      frame: Float32Array
    ) => Promise<SpeechProbabilities>,
    public modelResetFunc: () => any,
    public options: FrameProcessorOptions,
    public msPerFrame: number
  ) {
    this.audioBuffer = []
    this.redemptionFrames = Math.floor(options.redemptionMs / this.msPerFrame)
    this.preSpeechPadFrames = Math.floor(
      options.preSpeechPadMs / this.msPerFrame
    )
    this.minSpeechFrames = Math.floor(options.minSpeechMs / this.msPerFrame)
    this.reset()
  }

  reset = () => {
    this.speaking = false
    this.speechRealStartFired = false
    this.audioBuffer = []
    this.modelResetFunc()
    this.redemptionCounter = 0
    this.speechFrameCount = 0
  }

  pause = (handleEvent: (event: FrameProcessorEvent) => any) => {
    this.active = false
    if (this.options.submitUserSpeechOnPause) {
      this.endSegment(handleEvent)
    } else {
      this.reset()
    }
  }

  resume = () => {
    this.active = true
  }

  endSegment = (handleEvent: (event: FrameProcessorEvent) => any) => {
    const audioBuffer = this.audioBuffer
    this.audioBuffer = []
    const speaking = this.speaking
    this.reset()

    if (speaking) {
      const speechFrameCount = audioBuffer.reduce((acc, item) => {
        return item.isSpeech ? acc + 1 : acc
      }, 0)
      if (speechFrameCount >= this.minSpeechFrames) {
        const audio = concatArrays(audioBuffer.map((item) => item.frame))
        handleEvent({ msg: Message.SpeechEnd, audio })
      } else {
        handleEvent({ msg: Message.VADMisfire })
      }
    }
    return {}
  }

  process = async (
    frame: Float32Array,
    handleEvent: (event: FrameProcessorEvent) => any
  ) => {
    if (!this.active) {
      return
    }

    const probs = await this.modelProcessFunc(frame)
    const isSpeech = probs.isSpeech >= this.options.positiveSpeechThreshold

    handleEvent({ probs, msg: Message.FrameProcessed, frame })

    this.audioBuffer.push({
      frame,
      isSpeech,
    })

    if (isSpeech) {
      this.speechFrameCount++
      this.redemptionCounter = 0
    }

    if (isSpeech && !this.speaking) {
      this.speaking = true
      handleEvent({ msg: Message.SpeechStart })
    }

    if (
      this.speaking &&
      this.speechFrameCount === this.minSpeechFrames &&
      !this.speechRealStartFired
    ) {
      this.speechRealStartFired = true
      handleEvent({ msg: Message.SpeechRealStart })
    }

    if (
      probs.isSpeech < this.options.negativeSpeechThreshold &&
      this.speaking &&
      ++this.redemptionCounter >= this.redemptionFrames
    ) {
      this.redemptionCounter = 0
      this.speechFrameCount = 0
      this.speaking = false
      this.speechRealStartFired = false
      const audioBuffer = this.audioBuffer
      this.audioBuffer = []

      const speechFrameCount = audioBuffer.reduce((acc, item) => {
        return item.isSpeech ? acc + 1 : acc
      }, 0)

      if (speechFrameCount >= this.minSpeechFrames) {
        const audio = concatArrays(audioBuffer.map((item) => item.frame))
        handleEvent({ msg: Message.SpeechEnd, audio })
      } else {
        handleEvent({ msg: Message.VADMisfire })
      }
    }

    if (!this.speaking) {
      while (this.audioBuffer.length > this.preSpeechPadFrames) {
        this.audioBuffer.shift()
      }
      this.speechFrameCount = 0
    }
  }
}

export type FrameProcessorEvent =
  | {
      msg: Message.VADMisfire
    }
  | {
      msg: Message.SpeechStart
    }
  | {
      msg: Message.SpeechRealStart
    }
  | {
      msg: Message.SpeechEnd
      audio: Float32Array
    }
  | {
      msg: Message.FrameProcessed
      probs: SpeechProbabilities
      frame: Float32Array
    }
