import * as ort from "onnxruntime-web"
import {
  utils as _utils,
  PlatformAgnosticNonRealTimeVAD,
  FrameProcessor,
  FrameProcessorOptions,
  Message,
  NonRealTimeVADOptions,
} from "./_common"
import { modelFetcher } from "./model-fetcher"
import { audioFileToArray } from "./utils"

class NonRealTimeVAD extends PlatformAgnosticNonRealTimeVAD {
  static async new(
    options: Partial<NonRealTimeVADOptions> = {}
  ): Promise<NonRealTimeVAD> {
    return await this._new(modelFetcher, ort, options)
  }
}

export const utils = { audioFileToArray, ..._utils }

export { FrameProcessor, Message, NonRealTimeVAD }
export type { FrameProcessorOptions, NonRealTimeVADOptions }
export {
  MicVAD,
  AudioNodeVAD,
  defaultRealTimeVADOptions,
} from "./real-time-vad"
export type { RealTimeVADOptions } from "./real-time-vad"
