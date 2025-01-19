import * as ortInstance from "onnxruntime-web"

import { baseAssetPath } from "./asset-path"
import { defaultModelFetcher } from "./default-model-fetcher"
import {
  defaultLegacyFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorEvent,
  FrameProcessorInterface,
  FrameProcessorOptions,
  validateOptions,
} from "./frame-processor"
import { Message } from "./messages"
import { ModelFetcher, OrtModule, OrtOptions, SileroLegacy } from "./models"
import { Resampler } from "./resampler"

interface NonRealTimeVADSpeechData {
  audio: Float32Array
  start: number
  end: number
}

export interface NonRealTimeVADOptions
  extends FrameProcessorOptions,
    OrtOptions {
  modelURL: string
  modelFetcher: (path: string) => Promise<ArrayBuffer>
}

export const defaultNonRealTimeVADOptions: NonRealTimeVADOptions = {
  ...defaultLegacyFrameProcessorOptions,
  ortConfig: undefined,
  modelURL: baseAssetPath + "silero_vad_legacy.onnx",
  modelFetcher: defaultModelFetcher,
}

export class NonRealTimeVAD {
  static async new(options: Partial<NonRealTimeVADOptions> = {}) {
    const fullOptions = {
      ...defaultNonRealTimeVADOptions,
      ...options,
    }
    validateOptions(fullOptions)

    if (fullOptions.ortConfig !== undefined) {
      fullOptions.ortConfig(ortInstance)
    }
    const modelFetcher = () => fullOptions.modelFetcher(fullOptions.modelURL)
    const model = await SileroLegacy.new(ortInstance, modelFetcher)

    const frameProcessor = new FrameProcessor(
      model.process,
      model.reset_state,
      {
        frameSamples: fullOptions.frameSamples,
        positiveSpeechThreshold: fullOptions.positiveSpeechThreshold,
        negativeSpeechThreshold: fullOptions.negativeSpeechThreshold,
        redemptionFrames: fullOptions.redemptionFrames,
        preSpeechPadFrames: fullOptions.preSpeechPadFrames,
        minSpeechFrames: fullOptions.minSpeechFrames,
        submitUserSpeechOnPause: fullOptions.submitUserSpeechOnPause,
      }
    )
    frameProcessor.resume()

    const vad = new this(modelFetcher, ortInstance, fullOptions, frameProcessor)
    return vad
  }

  constructor(
    public modelFetcher: ModelFetcher,
    public ort: OrtModule,
    public options: NonRealTimeVADOptions,
    public frameProcessor: FrameProcessorInterface
  ) {}

  async *run(
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

    let messageContainer: FrameProcessorEvent[] = []

    for await (const frame of resampler.stream(inputAudio)) {
      await this.frameProcessor.process(frame, (event) => {
        messageContainer.push(event)
      })
      for (const event of messageContainer) {
        switch (event.msg) {
          case Message.SpeechStart:
            start = (frameIndex * this.options.frameSamples) / 16
            break

          case Message.SpeechEnd:
            end = ((frameIndex + 1) * this.options.frameSamples) / 16
            yield { audio: event.audio, start, end }
            break

          default:
            break
        }
      }
      frameIndex++
    }

    const { msg, audio } = this.frameProcessor.endSegment((event) => {
      messageContainer.push(event)
    })
    for (const event of messageContainer) {
      switch (event.msg) {
        case Message.SpeechEnd:
          yield {
            audio: event.audio,
            start,
            end: (frameIndex * this.options.frameSamples) / 16,
          }
      }
    }
  }
}
