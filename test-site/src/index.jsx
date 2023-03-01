import React from "react"
import { createRoot } from "react-dom/client"
import { useVAD } from "@ricky0123/vad-react"

console.log("demo of @ricky0123/vad-react")

const container = document.getElementById("root")

console.log("found container", container)
const root = createRoot(container)
root.render(<App />)

function App() {
  const vad = useVAD({})
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
      <h6>Start/Pause</h6>
      <button onClick={vad.pause}>Pause</button>
      <button onClick={vad.start}>Start</button>
    </div>
  )
}
