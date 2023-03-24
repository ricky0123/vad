import { Inter } from "next/font/google"
import { MicVAD } from "@ricky0123/vad-web"

const inter = Inter({ subsets: ["latin"] })

;(async () => {
  if (typeof window !== "undefined") {
    const myvad = await MicVAD.new({})
    myvad.start()
  }
})()

export default function Home() {
  const vad = {} as any
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
