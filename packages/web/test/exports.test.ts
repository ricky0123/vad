import { assert } from "@esm-bundle/chai"
import { MicVAD } from "../src/index"

it("should export MicVAD", async function () {
  this.timeout(5000)
  const vad = await MicVAD.new({
    onnxWASMBasePath:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    baseAssetPath:
      "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.28/dist/",
    startOnLoad: false,
  })
  assert.isFalse(vad.listening)
})
