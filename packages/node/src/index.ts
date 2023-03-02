import * as ort from "onnxruntime-node"
import {
  utils,
  PlatformAgnosticNonRealTimeVAD,
  FrameProcessor,
  FrameProcessorOptions,
  Message,
  NonRealTimeVADOptions,
} from "./_common"
import * as fs from "fs/promises"

const modelPath = `${__dirname}/silero_vad.onnx`

const modelFetcher = async (): Promise<ArrayBuffer> => {
  const contents = await fs.readFile(modelPath)
  return contents.buffer
}

class NonRealTimeVAD extends PlatformAgnosticNonRealTimeVAD {
  static async new(
    options: Partial<NonRealTimeVADOptions> = {}
  ): Promise<NonRealTimeVAD> {
    return await this._new(modelFetcher, ort, options)
  }
}

export { utils, FrameProcessor, Message, NonRealTimeVAD }
export type { FrameProcessorOptions, NonRealTimeVADOptions }
