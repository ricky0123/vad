/*
Some of this code, together with the default options found in index.ts,
were taken (or took inspiration) from https://github.com/snakers4/silero-vad
*/

import { log } from "./logging"
import { Message } from "./messages"
import { SpeechProbabilities } from "./models"

const RECOMMENDED_FRAME_SAMPLES = [512, 1024, 1536]

export interface FrameProcessorOptions {
  /** Threshold over which values returned by the Silero VAD model will be considered as positively indicating speech.
   * The Silero VAD model is run on each frame. This number should be between 0 and 1.
   */
  positiveSpeechThreshold: number

  /** Threshold under which values returned by the Silero VAD model will be considered as indicating an absence of speech.
   * Note that the creators of the Silero VAD have historically set this number at 0.15 less than `positiveSpeechThreshold`.
   */
  negativeSpeechThreshold: number

  /** After a VAD value under the `negativeSpeechThreshold` is observed, the algorithm will wait `redemptionFrames` frames
   * before running `onSpeechEnd`. If the model returns a value over `positiveSpeechThreshold` during this grace period, then
   * the algorithm will consider the previously-detected "speech end" as having been a false negative.
   */
  redemptionFrames: number

  /** Number of audio samples (under a sample rate of 16000) to comprise one "frame" to feed to the Silero VAD model.
   * The `frame` serves as a unit of measurement of lengths of audio segments and many other parameters are defined in terms of
   * frames. The authors of the Silero VAD model offer the following warning:
   * > WARNING! Silero VAD models were trained using 512, 1024, 1536 samples for 16000 sample rate and 256, 512, 768 samples for 8000 sample rate.
   * > Values other than these may affect model perfomance!!
   * In this context, audio fed to the VAD model always has sample rate 16000. It is probably a good idea to leave this at 1536.
   */
  frameSamples: number

  /** Number of frames to prepend to the audio segment that will be passed to `onSpeechEnd`. */
  preSpeechPadFrames: number

  /** If an audio segment is detected as a speech segment according to initial algorithm but it has fewer than `minSpeechFrames`,
   * it will be discarded and `onVADMisfire` will be run instead of `onSpeechEnd`.
   */
  minSpeechFrames: number

  /**
   * If true, when the user pauses the VAD, it may trigger `onSpeechEnd`.
   */
  submitUserSpeechOnPause: boolean
}

export const defaultLegacyFrameProcessorOptions: FrameProcessorOptions = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.5 - 0.15,
  preSpeechPadFrames: 1,
  redemptionFrames: 8,
  frameSamples: 1536,
  minSpeechFrames: 3,
  submitUserSpeechOnPause: false,
}

export const defaultV5FrameProcessorOptions: FrameProcessorOptions = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.5 - 0.15,
  preSpeechPadFrames: 3,
  redemptionFrames: 24,
  frameSamples: 512,
  minSpeechFrames: 9,
  submitUserSpeechOnPause: false,
}

export function validateOptions(options: FrameProcessorOptions) {
  if (!RECOMMENDED_FRAME_SAMPLES.includes(options.frameSamples)) {
    log.warn("You are using an unusual frame size")
  }
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
  if (options.preSpeechPadFrames < 0) {
    log.error("preSpeechPadFrames should be positive")
  }
  if (options.redemptionFrames < 0) {
    log.error("redemptionFrames should be positive")
  }
}

export interface FrameProcessorInterface {
  resume: () => void
  process: (arr: Float32Array) => Promise<{
    probs?: SpeechProbabilities
    msg?: Message
    audio?: Float32Array
  }>
  endSegment: () => { msg?: Message; audio?: Float32Array }
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
  speaking: boolean = false
  audioBuffer: { frame: Float32Array; isSpeech: boolean }[]
  redemptionCounter = 0
  speechFrameCount = 0
  active = false

  constructor(
    public modelProcessFunc: (
      frame: Float32Array
    ) => Promise<SpeechProbabilities>,
    public modelResetFunc: () => any,
    public options: FrameProcessorOptions
  ) {
    this.audioBuffer = []
    this.reset()
  }

  reset = () => {
    this.speaking = false
    this.audioBuffer = []
    this.modelResetFunc()
    this.redemptionCounter = 0
    this.speechFrameCount = 0
  }

  pause = () => {
    this.active = false
    if (this.options.submitUserSpeechOnPause) {
      return this.endSegment()
    } else {
      this.reset()
      return {}
    }
  }

  resume = () => {
    this.active = true
  }

  endSegment = () => {
    const audioBuffer = this.audioBuffer
    this.audioBuffer = []
    const speaking = this.speaking
    this.reset()

    const speechFrameCount = audioBuffer.reduce((acc, item) => {
      return acc + +item.isSpeech
    }, 0)

    if (speaking) {
      if (speechFrameCount >= this.options.minSpeechFrames) {
        const audio = concatArrays(audioBuffer.map((item) => item.frame))
        return { msg: Message.SpeechEnd, audio }
      } else {
        return { msg: Message.VADMisfire }
      }
    }
    return {}
  }

  process = async (frame: Float32Array) => {
    if (!this.active) {
      return {}
    }

    const probs = await this.modelProcessFunc(frame)
    const isSpeech = probs.isSpeech >= this.options.positiveSpeechThreshold

    this.audioBuffer.push({
      frame,
      isSpeech,
    })

    if (isSpeech) {
      this.speechFrameCount++
    }

    if (
      probs.isSpeech >= this.options.positiveSpeechThreshold &&
      this.redemptionCounter
    ) {
      this.redemptionCounter = 0
    }

    if (
      probs.isSpeech >= this.options.positiveSpeechThreshold &&
      !this.speaking
    ) {
      this.speaking = true
      return { probs, msg: Message.SpeechStart, frame }
    }

    if (
      this.speaking &&
      this.speechFrameCount === this.options.minSpeechFrames
    ) {
      return { probs, msg: Message.SpeechRealStart, frame }
    }

    if (
      probs.isSpeech < this.options.negativeSpeechThreshold &&
      this.speaking &&
      ++this.redemptionCounter >= this.options.redemptionFrames
    ) {
      this.redemptionCounter = 0
      this.speechFrameCount = 0
      this.speaking = false

      const audioBuffer = this.audioBuffer
      this.audioBuffer = []

      const speechFrameCount = audioBuffer.reduce((acc, item) => {
        return acc + +item.isSpeech
      }, 0)

      if (speechFrameCount >= this.options.minSpeechFrames) {
        const audio = concatArrays(audioBuffer.map((item) => item.frame))
        return { probs, msg: Message.SpeechEnd, audio, frame }
      } else {
        return { probs, msg: Message.VADMisfire, frame }
      }
    }

    if (!this.speaking) {
      while (this.audioBuffer.length > this.options.preSpeechPadFrames) {
        this.audioBuffer.shift()
      }
      this.speechFrameCount = 0
    }
    return { probs, frame }
  }
}
