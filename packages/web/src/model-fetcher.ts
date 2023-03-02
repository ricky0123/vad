// @ts-ignore
const modelUrl = "/silero_vad.onnx"
export const modelFetcher = async () => {
  return await fetch(modelUrl).then((r) => r.arrayBuffer())
}
