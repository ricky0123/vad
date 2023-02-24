import * as ort from "onnxruntime-web"
import {
  utils as _utils,
  NonRealTimeVAD as _NonRealTimeVAD,
  FrameProcessor,
  FrameProcessorOptions,
  Message,
  NonRealTimeVADOptions,
} from "@ricky0123/vad-common"
import { modelFetcher } from "./model-fetcher"
import { audioFileToArray } from "./utils"

class NonRealTimeVAD extends _NonRealTimeVAD {
  configure() {
    this.ort = ort
    this.modelFetcher = modelFetcher
  }
}

export const utils = { audioFileToArray, ..._utils }

export { FrameProcessor, Message, NonRealTimeVAD }
export type { FrameProcessorOptions, NonRealTimeVADOptions }
export { MicVAD, AudioNodeVAD } from "./real-time-vad"
export type { RealTimeVADOptions } from "./real-time-vad"
