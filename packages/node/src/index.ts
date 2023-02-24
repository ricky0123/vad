// @ts-ignore
import modelUrl from "../../../silero_vad.onnx"
import * as ort from "onnxruntime-node"
import {
  utils,
  NonRealTimeVAD as _NonRealTimeVAD,
  FrameProcessor,
  FrameProcessorOptions,
  Message,
  NonRealTimeVADOptions,
} from "@ricky0123/vad-common"

const modelFetcher = async () => {
  return await fetch(modelUrl).then((r) => r.arrayBuffer())
}

class NonRealTimeVAD extends _NonRealTimeVAD {
  configure() {
    this.ort = ort
    this.modelFetcher = modelFetcher
  }
}

export { utils, FrameProcessor, Message, NonRealTimeVAD }
export type { FrameProcessorOptions, NonRealTimeVADOptions }
