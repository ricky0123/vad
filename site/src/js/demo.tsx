import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import { useVAD } from "@ricky0123/vad-react"

const domContainer = document.querySelector("#demo") as Element
const root = createRoot(domContainer)
root.render(<Demo />)

function Demo() {
  const [demoStarted, setDemoStarted] = useState(false)

  if (!demoStarted) {
    return <InactiveDemo startDemo={() => setDemoStarted(true)} />
  } else {
    return <ActiveDemo />
  }
}

function InactiveDemo({ startDemo }: { startDemo: () => void }) {
  return (
    <div className="flex justify-center mt-[100px]">
      <button
        onClick={startDemo}
        className="text-xl text-black font-bold px-3 py-2 rounded bg-gradient-to-r from-pink-600 to-rose-600 hover:from-slate-800 hover:to-neutral-800 hover:text-white"
      >
        Start demo
      </button>
    </div>
  )
}

function ActiveDemo() {
  const vad = useVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      console.log("speech ended")
    },
  })

  if (vad.loading) {
    return <Loading />
  }

  if (vad.errored) {
    return <Errored />
  }

  return (
    <div>
      {vad.listening && "going"}
      {!vad.listening && "paused"}
      {vad.userSpeaking && "speaking"}
      {!vad.userSpeaking && "not speaking"}
    </div>
  )
}

function Loading() {
  return <div>Loading</div>
}

function Errored() {
  return <div>Errored</div>
}
