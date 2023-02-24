// @ts-ignore
import modelUrl from "../../../silero_vad.onnx"
export const modelFetcher = async () => {
  return await fetch(modelUrl).then((r) => r.arrayBuffer())
}
