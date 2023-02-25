import React, { useReducer } from "react"
import ReactDOM from "react-dom"
import { useVAD } from "@ricky0123/vad-react"

const domContainer = document.querySelector("#root")
const root = ReactDOM.createRoot(domContainer)
root.render(<App />)

function reduceProbability(state, isSpeechProb) {
  if (isSpeechProb > 0.8) {
    return true
  } else {
    return false
  }
}

function App() {
  const [isSpeaking, dispatchProbability] = useReducer(reduceProbability, false)
  const { vadRunning, pauseVAD, startVAD } = useVAD({
    onFrameProcessed: (probs) => {
      dispatchProbability(probs.isSpeech)
    },
  })
  return (
    <div>
      <h1>Hello</h1>
      {isSpeaking && "user is speaking"}
      {!isSpeaking && "user is not speaking"}
    </div>
  )
}
