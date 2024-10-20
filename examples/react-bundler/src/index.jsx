import { useMicVAD, utils } from "@ricky0123/vad-react"
import { useState } from "react"
import ReactDOM from "react-dom"

const domContainer = document.querySelector("#root")
const root = ReactDOM.createRoot(domContainer)
root.render(<App />)

function App() {
  const [audioList, setAudioList] = useState([])
  const vad = useMicVAD({
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
      <button onClick={vad.toggle}>Toggle VAD</button>
      {vad.listening && <div>VAD is running</div>}
      {!vad.listening && <div>VAD is NOT running</div>}
      {vad.userSpeaking && <UserSpeaking />}
      {!vad.userSpeaking && <UserNotSpeaking />}
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
