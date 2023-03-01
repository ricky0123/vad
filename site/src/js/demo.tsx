import { useVAD, utils } from "@ricky0123/vad-react"
import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import { motion } from "framer-motion"

const domContainer = document.querySelector("#demo") as Element
const root = createRoot(domContainer)
root.render(<Demo />)

function Demo() {
  const [demoStarted, setDemoStarted] = useState(false)

  return (
    <div className="mt-[80px] flex justify-center">
      {!demoStarted && (
        <StartDemoButton startDemo={() => setDemoStarted(true)} />
      )}
      {demoStarted && <ActiveDemo />}
    </div>
  )
}

function StartDemoButton({ startDemo }: { startDemo: () => void }) {
  return (
    <button
      onClick={startDemo}
      className="text-xl text-black font-bold px-3 py-2 rounded bg-gradient-to-r from-pink-600 to-rose-600 hover:from-slate-800 hover:to-neutral-800 hover:text-white"
    >
      Start demo
    </button>
  )
}

function ActiveDemo() {
  const [audioList, setAudioList] = useState<string[]>([])
  const vad = useVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => [url, ...old])
    },
  })

  const toggleVAD = () => {
    if (vad.listening) {
      vad.pause()
    } else {
      vad.start()
    }
  }

  if (vad.loading) {
    return <Loading />
  }

  if (vad.errored) {
    return <Errored />
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-evenly">
        {vad.listening && vad.userSpeaking && <HighEnergyCube />}
        {vad.listening && !vad.userSpeaking && <LowEnergyCube />}
        {!vad.listening && <DeactivatedCube />}
        <button
          className="ml-[20px] underline underline-offset-2 text-rose-600"
          onClick={toggleVAD}
        >
          {vad.listening && "Pause"}
          {!vad.listening && "Start"}
        </button>
      </div>
      <ol id="playlist" className="max-h-[400px] overflow-y-auto no-scrollbar">
        {audioList.map((audioURL) => {
          return (
            <li className="flex justify-center" key={audioItemKey(audioURL)}>
              <audio src={audioURL} controls />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const audioItemKey = (audioURL: string) => audioURL.substring(-10)

function Loading() {
  return <div className="animate-pulse text-2xl text-rose-600">Loading</div>
}

function Errored() {
  return <div className="text-2xl text-rose-600">Something went wrong</div>
}

const DeactivatedCube = () => {
  return (
    <div className="bg-gradient-to-l from-[#2A2A2A] to-[#474747] h-10 w-10 rounded-[6px]" />
  )
}

const LowEnergyCube = () => {
  return (
    <motion.div className="bg-gradient-to-l from-[#7928CA] to-[#008080] h-10 w-10 rounded-[6px] low-energy-spin" />
  )
}

const HighEnergyCube = () => {
  return (
    <motion.div className="bg-gradient-to-l from-[#7928CA] to-[#FF0080] h-10 w-10 rounded-[6px] high-energy-spin" />
  )
}
