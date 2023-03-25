import { useMicVAD } from "@ricky0123/vad-react"

export const Demo = () => {
  const vad = useMicVAD({})
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
      <button onClick={vad.toggle}>Toggle</button>
    </div>
  )
}

export default Demo
