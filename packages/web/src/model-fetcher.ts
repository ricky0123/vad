import { assetPath } from "./asset-path"

export const modelFetcher = async () => {
  const modelURL = assetPath("silero_vad.onnx")
  return await fetch(modelURL).then((r) => r.arrayBuffer())
}
