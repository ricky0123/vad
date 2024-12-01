import * as ort from "onnxruntime-web"
import { baseAssetPath } from "./asset-path"
import { defaultModelFetcher } from "./default-model-fetcher"
import { FrameProcessor, FrameProcessorOptions } from "./frame-processor"
import { Message } from "./messages"
import {
  NonRealTimeVADOptions,
  PlatformAgnosticNonRealTimeVAD,
} from "./non-real-time-vad"
import {
  arrayBufferToBase64,
  audioFileToArray,
  encodeWAV,
  minFramesForTargetMS,
} from "./utils"

export interface NonRealTimeVADOptionsWeb extends NonRealTimeVADOptions {
  modelURL: string
  modelFetcher: (path: string) => Promise<ArrayBuffer>
}

export const defaultNonRealTimeVADOptions = {
  modelURL: baseAssetPath + "silero_vad_legacy.onnx",
  modelFetcher: defaultModelFetcher,
}

class NonRealTimeVAD extends PlatformAgnosticNonRealTimeVAD {
  static async new(
    options: Partial<NonRealTimeVADOptionsWeb> = {}
  ): Promise<NonRealTimeVAD> {
    const { modelURL, modelFetcher } = {
      ...defaultNonRealTimeVADOptions,
      ...options,
    }
    return await this._new(() => modelFetcher(modelURL), ort, options)
  }
}

export const utils = {
  audioFileToArray,
  minFramesForTargetMS,
  arrayBufferToBase64,
  encodeWAV,
}

export {
  AudioNodeVAD,
  DEFAULT_MODEL,
  MicVAD,
  getDefaultRealTimeVADOptions,
} from "./real-time-vad"
export type { RealTimeVADOptions } from "./real-time-vad"
export { FrameProcessor, Message, NonRealTimeVAD }
export type { FrameProcessorOptions, NonRealTimeVADOptions }
