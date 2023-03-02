// @ts-ignore
const modelUrl = new URL("silero_vad.onnx", import.meta.url)
export const modelFetcher = async () => {
  return await fetch(modelUrl).then((r) => r.arrayBuffer())
}
