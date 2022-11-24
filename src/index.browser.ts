import * as _utils from "./utils"
export const utils = {
  minFramesForTargetMS: _utils.minFramesForTargetMS,
  arrayBufferToBase64: _utils.arrayBufferToBase64,
  audioFileToArray: _utils.audioFileToArray,
  encodeWAV: _utils.encodeWAV,
}

export { NonRealTimeVAD } from "./non-real-time-vad"
export type { NonRealTimeVADOptions } from "./non-real-time-vad"
export { FrameProcessor } from "./frame-processor"
export type { FrameProcessorOptions } from "./frame-processor"
export { AudioNodeVAD, MicVAD } from "./real-time-vad"
export type { RealTimeVADOptions } from "./real-time-vad"
export { Message } from "./messages"
