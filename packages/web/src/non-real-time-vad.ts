import * as ortInstance from "onnxruntime-web"

import { baseAssetPath } from "./asset-path"
import { defaultModelFetcher } from "./default-model-fetcher"
import {
  defaultFrameProcessorOptions,
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
  ...defaultFrameProcessorOptions,
  modelURL: baseAssetPath + "silero_vad_legacy.onnx",
  modelFetcher: defaultModelFetcher,
}

export class NonRealTimeVAD {
  frameSamples: number = 1536

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
        positiveSpeechThreshold: fullOptions.positiveSpeechThreshold,
        negativeSpeechThreshold: fullOptions.negativeSpeechThreshold,
        redemptionMs: fullOptions.redemptionMs,
        preSpeechPadMs: fullOptions.preSpeechPadMs,
        minSpeechMs: fullOptions.minSpeechMs,
        submitUserSpeechOnPause: fullOptions.submitUserSpeechOnPause,
      },
      1536 / 16
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
      targetFrameSize: this.frameSamples,
    }
    const resampler = new Resampler(resamplerOptions)
    let start = 0
    let end = 0
    let frameIndex = 0

    for await (const frame of resampler.stream(inputAudio)) {
      const messageContainer: FrameProcessorEvent[] = []

      await this.frameProcessor.process(frame, (event) => {
        messageContainer.push(event)
      })

      for (const event of messageContainer) {
        switch (event.msg) {
          case Message.SpeechStart:
            start = (frameIndex * this.frameSamples) / 16
            break

          case Message.SpeechEnd:
            end = ((frameIndex + 1) * this.frameSamples) / 16
            yield { audio: event.audio, start, end }
            break

          default:
            break
        }
      }
      frameIndex++
    }

    const messageContainer: FrameProcessorEvent[] = []
    this.frameProcessor.endSegment((event) => {
      messageContainer.push(event)
    })

    for (const event of messageContainer) {
      switch (event.msg) {
        case Message.SpeechEnd:
          yield {
            audio: event.audio,
            start,
            end: (frameIndex * this.frameSamples) / 16,
          }
      }
    }
  }
}
