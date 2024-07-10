import * as fs from "fs/promises"
import * as ort from "onnxruntime-node"
import { FrameProcessor, FrameProcessorOptions } from "./frame-processor"
import { Message } from "./messages"
import {
  NonRealTimeVADOptions,
  PlatformAgnosticNonRealTimeVAD,
} from "./non-real-time-vad"
import { Resampler } from "./resampler"
import * as utils from "./utils"

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

export { FrameProcessor, Message, NonRealTimeVAD, Resampler, utils }
export type { FrameProcessorOptions, NonRealTimeVADOptions }
