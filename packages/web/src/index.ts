export { baseAssetPath } from "./asset-path"
export { defaultModelFetcher } from "./default-model-fetcher"
export { FrameProcessor } from "./frame-processor"
export type { FrameProcessorOptions } from "./frame-processor"
export { Message } from "./messages"
export { NonRealTimeVAD } from "./non-real-time-vad"
export type { NonRealTimeVADOptions } from "./non-real-time-vad"
import {
  arrayBufferToBase64,
  audioFileToArray,
  encodeWAV,
  minFramesForTargetMS,
} from "./utils"

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
