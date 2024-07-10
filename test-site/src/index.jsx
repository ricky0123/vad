// @ts-nocheck

import { useMicVAD, utils } from "@ricky0123/vad-react"
import * as ort from "onnxruntime-web"
import { useState } from "react"
import { createRoot } from "react-dom/client"

ort.env.wasm.wasmPaths = {
  "ort-wasm-simd-threaded.wasm": "/ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
  "ort-wasm.wasm": "/ort-wasm.wasm",
  "ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
}

const domContainer = document.querySelector("#root")
const root = createRoot(domContainer)
root.render(<App />)

function App() {
  const [audioList, setAudioList] = useState([])
  const vad = useMicVAD({
    workletURL: "http://localhost:8080/vad.worklet.bundle.min.js",
    modelURL: "http://localhost:8080/silero_vad.onnx",
    onVADMisfire: () => {
      console.log("Vad misfire")
    },
    onSpeechStart: () => {
      console.log("Speech start")
    },
    onSpeechEnd: (audio) => {
      console.log("Speech end")
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => [url, ...old])
    },
  })
  return (
    <div>
      <h1>Basic vad-react functionality</h1>

      <div>
        <button
          disabled={vad.errored || vad.loading}
          onClick={() => {
            console.log("run toggle vad")
            vad.toggle()
          }}
        >
          Toggle VAD
        </button>
      </div>

      <div>
        <ul>
          {audioList.map((audioURL) => {
            return (
              <li key={audioURL.substring(-10)}>
                <audio controls src={audioURL} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
