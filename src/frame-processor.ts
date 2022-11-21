/*
Some of this code, together with the default options found in index.ts,
were taken (or took inspiration) from https://github.com/snakers4/silero-vad
*/

import { SpeechProbabilities } from "./models"

interface _CommonFrameProcessorOptions {
  onFrameProcessed: (probabilities: SpeechProbabilities) => any
  signalMisfire: () => any
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  redemptionFrames: number
  preSpeechPadFrames: number
  minSpeechFrames: number
}

export interface RealTimeFrameProcessorOptions
  extends _CommonFrameProcessorOptions {
  signalSpeechStart: () => any
  signalSpeechEnd: (audio: Float32Array) => any
}

export interface SegmentFrameProcessorOptions
  extends _CommonFrameProcessorOptions {
  signalSpeechStart: (startMS: number) => any
  signalSpeechEnd: (audio: Float32Array, endMS: number) => any
}

export interface RealTimeFrameProcessorInterface {
  resume: () => void
  process: (arr: Float32Array) => void
  endSegment: () => void
}

export interface SegmentFrameProcessorInterface {
  resume: () => void
  process: (arr: Float32Array, frameData: FrameData) => Promise<void>
  endSegment: () => void
}

export interface FrameData {
  start: number
  end: number
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

abstract class _FrameProcessor {
  speaking: boolean = false
  audioBuffer: Float32Array[]
  redemptionCounter = 0
  active = false

  constructor(
    public modelProcessFunc: (
      frame: Float32Array
    ) => Promise<SpeechProbabilities>,
    public modelResetFunc: () => any,
    public options: _CommonFrameProcessorOptions
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

  endSegment = () => {
    const audioBuffer = this.audioBuffer
    this.audioBuffer = []

    if (this.speaking) {
      if (audioBuffer.length >= this.options.minSpeechFrames) {
        const audio = concatArrays(audioBuffer)
        this.speechEndCallback(audio)
      } else {
        this.options.signalMisfire()
      }
    }

    this.reset()
  }

  abstract speechStartCallback(start?: number): any
  abstract speechEndCallback(audio: Float32Array, end?: number): any

  process = async (
    frame: Float32Array,
    frameData?: FrameData
  ): Promise<void> => {
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
      this.speechStartCallback(frameData?.start)
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
        const audio = concatArrays(audioBuffer)
        this.speechEndCallback(audio, frameData?.end)
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

export class RealTimeFrameProcessor
  extends _FrameProcessor
  implements RealTimeFrameProcessorInterface
{
  constructor(
    public modelProcessFunc: (
      frame: Float32Array
    ) => Promise<SpeechProbabilities>,
    public modelResetFunc: () => any,
    public options: RealTimeFrameProcessorOptions
  ) {
    super(modelProcessFunc, modelResetFunc, options)
  }

  speechStartCallback(start?: number) {
    this.options.signalSpeechStart()
  }

  speechEndCallback(audio: Float32Array, end?: number) {
    this.options.signalSpeechEnd(audio)
  }
}

export class SegmentFrameProcessor
  extends _FrameProcessor
  implements SegmentFrameProcessorInterface
{
  constructor(
    public modelProcessFunc: (
      frame: Float32Array
    ) => Promise<SpeechProbabilities>,
    public modelResetFunc: () => any,
    public options: SegmentFrameProcessorOptions
  ) {
    super(modelProcessFunc, modelResetFunc, options)
  }

  speechStartCallback(start?: number) {
    this.options.signalSpeechStart(start)
  }

  speechEndCallback(audio: Float32Array, end?: number) {
    this.options.signalSpeechEnd(audio, end)
  }
}
