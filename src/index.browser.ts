import * as _utils from "./utils"
export const utils = {
  minFramesForTargetMS: _utils.minFramesForTargetMS,
  arrayBufferToBase64: _utils.arrayBufferToBase64,
  audioFileToArray: _utils.audioFileToArray,
}

export { AudioSegmentVAD } from "./audio-segment-vad"
export type { SegmentVadOptions } from "./audio-segment-vad"
export { FrameProcessor } from "./frame-processor"
export type { FrameProcessorOptions } from "./frame-processor"
export { AudioNodeVAD, MicVAD } from "./real-time-vad"
export type { RealTimeVadOptions } from "./real-time-vad"
export { Message } from "./messages"
