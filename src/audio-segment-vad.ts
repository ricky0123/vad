import {
  defaultFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorInterface,
  FrameProcessorOptions,
  validateOptions,
} from "./frame-processor"
import { log } from "./logging"
import { Message } from "./messages"
import { Silero } from "./models"
import { Resampler } from "./resampler"

interface SegmentVadSpeechData {
  audio: Float32Array
  start: number
  end: number
}

export interface SegmentVadOptions extends FrameProcessorOptions {}

export const defaultSegmentVadOptions: SegmentVadOptions = {
  ...defaultFrameProcessorOptions,
}

export class AudioSegmentVAD {
  frameProcessor: FrameProcessorInterface

  static async new(options: Partial<SegmentVadOptions> = {}) {
    const vad = new AudioSegmentVAD({ ...defaultSegmentVadOptions, ...options })
    await vad.init()
    return vad
  }

  constructor(public options: SegmentVadOptions) {
    validateOptions(options)
  }

  init = async () => {
    const model = await Silero.new()

    this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
      frameSamples: this.options.frameSamples,
      positiveSpeechThreshold: this.options.positiveSpeechThreshold,
      negativeSpeechThreshold: this.options.negativeSpeechThreshold,
      redemptionFrames: this.options.redemptionFrames,
      preSpeechPadFrames: this.options.preSpeechPadFrames,
      minSpeechFrames: this.options.minSpeechFrames,
    })
    this.frameProcessor.resume()
  }

  run = async function* (
    inputAudio: Float32Array,
    sampleRate: number
  ): AsyncGenerator<SegmentVadSpeechData> {
    const resamplerOptions = {
      nativeSampleRate: sampleRate,
      targetSampleRate: 16000,
      targetFrameSize: this.options.frameSamples,
    }
    const resampler = new Resampler(resamplerOptions)
    const frames = resampler.process(inputAudio)
    let start: number, end: number
    for (const i of [...Array(frames.length)].keys()) {
      const f = frames[i]
      const { msg, audio } = await this.frameProcessor.process(f)
      switch (msg) {
        case Message.SpeechStart:
          start = (i * this.options.frameSamples) / 16
          break

        case Message.SpeechEnd:
          end = ((i + 1) * this.options.frameSamples) / 16
          yield { audio, start, end }
          break

        default:
          break
      }
    }
    const { msg, audio } = this.frameProcessor.endSegment()
    if (msg == Message.SpeechEnd) {
      yield {
        audio,
        start,
        end: (frames.length * this.options.frameSamples) / 16,
      }
    }
  }
}
