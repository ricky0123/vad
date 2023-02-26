import React, { useReducer, useState } from "react"
import ReactDOM from "react-dom"
import { useVAD, utils } from "@ricky0123/vad-react"

const domContainer = document.querySelector("#root")
const root = ReactDOM.createRoot(domContainer)
root.render(<App />)

function reduceProbability(state, isSpeechProb) {
  if (isSpeechProb > 0.5) {
    return true
  } else {
    return false
  }
}

function App() {
  const [isSpeaking, dispatchProbability] = useReducer(reduceProbability, false)
  /**
   * @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]}
   */
  const [audioList, setAudioList] = useState([])
  const { vadRunning, pauseVAD, startVAD } = useVAD({
    onFrameProcessed: (probs) => {
      dispatchProbability(probs.isSpeech)
    },
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => [url, ...old])
    },
  })
  return (
    <div>
      <h1>Demo of @ricky0123/vad-react</h1>
      {isSpeaking && <UserSpeaking />}
      {!isSpeaking && <UserNotSpeaking />}
      <ol id="playlist">
        {audioList.map((audioURL) => {
          return (
            <li key={audioURL.substring(-10)}>
              <audio controls src={audioURL} />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function UserSpeaking() {
  return <span style={{ color: "green" }}>user is speaking</span>
}

function UserNotSpeaking() {
  return <span style={{ color: "red" }}>user is not speaking</span>
}
