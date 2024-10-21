import { useMicVAD, utils } from "@ricky0123/vad-react"
import { useState } from "react"

export const Demo = () => {
  const [audioList, setAudioList] = useState<string[]>([])
  const vad = useMicVAD({
    ortConfig(ort) {
      ort.env.wasm.wasmPaths = "/";
    },
    workletURL: "/vad.worklet.bundle.min.js",
    modelURL: "/silero_vad.onnx",
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => {
        return [url, ...old]
      })
    },
  })
  return (
    <div>
      <h6>Listening</h6>
      {!vad.listening && "Not"} listening
      <h6>Loading</h6>
      {!vad.loading && "Not"} loading
      <h6>Errored</h6>
      {!vad.errored && "Not"} errored
      <h6>User Speaking</h6>
      {!vad.userSpeaking && "Not"} speaking
      <h6>Audio count</h6>
      {audioList.length}
      <h6>Start/Pause</h6>
      <button onClick={vad.pause}>Pause</button>
      <button onClick={vad.start}>Start</button>
      <button onClick={vad.toggle}>Toggle</button>
    </div>
  )
}

export default Demo
