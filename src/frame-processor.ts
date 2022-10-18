/*
Some of this code, together with the default options found in index.ts,
were taken (or took inspiration) from https://github.com/snakers4/silero-vad
*/

import { Model, Silero, SpeechProbabilities } from "./models"

export interface AggregatorOptions {
  onFrameProcessed: (probabilities: SpeechProbabilities) => any
  signalSpeechStart: () => any
  signalSpeechEnd: (audio: Float32Array) => any
  signalMisfire: () => any
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  redemptionFrames: number
  preSpeechPadFrames: number
  minSpeechFrames: number
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

export class FrameProcessor {
  speaking: boolean = false
  audioBuffer: Float32Array[]
  redemptionCounter = 0
  active = false

  constructor(
    public modelProcessFunc: (
      frame: Float32Array
    ) => Promise<SpeechProbabilities>,
    public modelResetFunc: () => any,
    public options: AggregatorOptions
  ) {
    this.audioBuffer = []
    this.reset()
  }

  reset = () => {
    this.speaking = false
    this.audioBuffer = []
    this.modelResetFunc()
    this.redemptionCounter = 0
  }

  pause = () => {
    this.active = false
    this.reset()
  }

  resume = () => {
    this.active = true
  }

  process = async (frame: Float32Array): Promise<void> => {
    if (!this.active) {
      return
    }
    const probs = await this.modelProcessFunc(frame)
    this.options.onFrameProcessed(probs)
    this.audioBuffer.push(frame)

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
      this.options.signalSpeechStart()
    }

    if (
      probs.isSpeech < this.options.negativeSpeechThreshold &&
      this.speaking &&
      ++this.redemptionCounter >= this.options.redemptionFrames
    ) {
      this.redemptionCounter = 0
      this.speaking = false

      const audioBuffer = this.audioBuffer
      this.audioBuffer = []

      if (audioBuffer.length >= this.options.minSpeechFrames) {
        const audio = concatArrays(this.audioBuffer)
        this.options.signalSpeechEnd(audio)
      } else {
        this.options.signalMisfire()
      }
    }

    if (!this.speaking) {
      while (this.audioBuffer.length > this.options.preSpeechPadFrames) {
        this.audioBuffer.shift()
      }
    }
  }
}
