import * as ort from "onnxruntime-web/wasm"

export type ModelFetcher = () => Promise<ArrayBuffer>

export interface SpeechProbabilities {
  notSpeech: number
  isSpeech: number
}

export type OrtConfigurer = (ortInstance: typeof ort) => void
export type OrtModule = typeof ort

export type ModelFactory = (
  ortInstance: typeof ort,
  modelFetcher: ModelFetcher
) => Promise<Model>

export interface Model {
  reset_state: () => void
  process: (arr: Float32Array) => Promise<SpeechProbabilities>
  release: () => Promise<void>
}
