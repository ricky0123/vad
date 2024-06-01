import {
  defaultFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorInterface,
  FrameProcessorOptions,
  validateOptions,
} from "./frame-processor"
import { Message } from "./messages"
import { ModelFetcher, OrtOptions, ONNXRuntimeAPI, Silero } from "./models"
import { Resampler } from "./resampler"

interface NonRealTimeVADSpeechData {
  audio: Float32Array
  start: number
  end: number
}

export interface NonRealTimeVADOptions
  extends FrameProcessorOptions,
    OrtOptions {}

export const defaultNonRealTimeVADOptions: NonRealTimeVADOptions = {
  ...defaultFrameProcessorOptions,
  ortConfig: undefined,
}

export class PlatformAgnosticNonRealTimeVAD {
  frameProcessor: FrameProcessorInterface | undefined

  static async _new<T extends PlatformAgnosticNonRealTimeVAD>(
    modelFetcher: ModelFetcher,
    ort: ONNXRuntimeAPI,
    options: Partial<NonRealTimeVADOptions> = {}
  ): Promise<T> {
    const fullOptions = {
      ...defaultNonRealTimeVADOptions,
      ...options,
    }

    if (fullOptions.ortConfig !== undefined) {
      fullOptions.ortConfig(ort)
    }

    const vad = new this(modelFetcher, ort, fullOptions)
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
    const model = await Silero.new(this.ort, this.modelFetcher)

    this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
      frameSamples: this.options.frameSamples,
      positiveSpeechThreshold: this.options.positiveSpeechThreshold,
      negativeSpeechThreshold: this.options.negativeSpeechThreshold,
      redemptionFrames: this.options.redemptionFrames,
      preSpeechPadFrames: this.options.preSpeechPadFrames,
      minSpeechFrames: this.options.minSpeechFrames,
      submitUserSpeechOnPause: this.options.submitUserSpeechOnPause,
    })
    this.frameProcessor.resume()
  }

  run = async function* (
    inputAudio: Float32Array,
    sampleRate: number
  ): AsyncGenerator<NonRealTimeVADSpeechData> {
    const resamplerOptions = {
      nativeSampleRate: sampleRate,
      targetSampleRate: 16000,
      targetFrameSize: this.options.frameSamples,
    }
    const resampler = new Resampler(resamplerOptions)
    let start = 0
    let end = 0
    let frameIndex = 0

    for await (const frame of resampler.stream(inputAudio)) {
      const { msg, audio } = await this.frameProcessor.process(frame)
      switch (msg) {
        case Message.SpeechStart:
          start = (frameIndex * this.options.frameSamples) / 16
          break

        case Message.SpeechEnd:
          end = ((frameIndex + 1) * this.options.frameSamples) / 16
          yield { audio, start, end }
          break

        default:
          break
      }
      frameIndex++
    }

    const { msg, audio } = this.frameProcessor.endSegment()
    if (msg == Message.SpeechEnd) {
      yield {
        audio,
        start,
        end: (frameIndex * this.options.frameSamples) / 16,
      }
    }
  }
}
