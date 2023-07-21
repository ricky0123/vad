import {
  defaultFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorInterface,
  FrameProcessorOptions,
  validateOptions,
} from "./frame-processor"
import { Message } from "./messages"
import { ModelFetcher, ONNXRuntimeAPI, Silero } from "./models"
import { Resampler } from "./resampler"

interface NonRealTimeVADSpeechData {
  audio: Float32Array
  start: number
  end: number
}

export interface NonRealTimeVADOptions extends FrameProcessorOptions {
  sampleRate: number
}

export const defaultNonRealTimeVADOptions: NonRealTimeVADOptions = {
  ...defaultFrameProcessorOptions,
  sampleRate: 16000
}

export class PlatformAgnosticNonRealTimeVAD {
  frameProcessor: FrameProcessorInterface | undefined

  static async _new<T extends PlatformAgnosticNonRealTimeVAD>(
    modelFetcher: ModelFetcher,
    ort: ONNXRuntimeAPI,
    options: Partial<NonRealTimeVADOptions> = {}
  ): Promise<T> {
    const vad = new this(modelFetcher, ort, {
      ...defaultNonRealTimeVADOptions,
      ...options,
    })
    await vad.init()
    return vad as T
  }

  constructor(
    public modelFetcher: ModelFetcher,
    public ort: ONNXRuntimeAPI,
    public options: NonRealTimeVADOptions
  ) {
    validateOptions(options)
  }

  init = async () => {
    const model = await Silero.new(this.ort, this.modelFetcher, this.options.sampleRate)

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
    sampleRate: number,
    targetSampleRate: number,
  ): AsyncGenerator<NonRealTimeVADSpeechData> {
    const resamplerOptions = {
      nativeSampleRate: sampleRate,
      targetSampleRate: targetSampleRate,
      targetFrameSize: this.options.frameSamples,
    }

    const resampler = new Resampler(resamplerOptions)
    const frames = resampler.process(inputAudio)
    const divider = (targetSampleRate / 1000);
    let start: number, end: number
    for (const i of [...Array(frames.length)].keys()) {
      const f = frames[i]
      const { msg, audio } = await this.frameProcessor.process(f)
      switch (msg) {
        case Message.SpeechStart:
          start = (i * this.options.frameSamples) / divider
          break

        case Message.SpeechEnd:
          end = ((i + 1) * this.options.frameSamples) / divider
          // @ts-ignore
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
        // @ts-ignore
        start,
        end: (frames.length * this.options.frameSamples) / divider,
      }
    }
  }
}
