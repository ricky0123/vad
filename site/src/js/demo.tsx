import { useMicVAD, utils } from "@ricky0123/vad-react"
import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import { motion } from "framer-motion"

const domContainer = document.querySelector("#demo") as Element
const root = createRoot(domContainer)
root.render(<Demo />)

function Demo() {
  const [demoStarted, setDemoStarted] = useState(false)

  return (
    <div className="pb-2">
      {!demoStarted && (
        <StartDemoButton startDemo={() => setDemoStarted(true)} />
      )}
      {demoStarted && <ActiveDemo />}
    </div>
  )
}

function StartDemoButton({ startDemo }: { startDemo: () => void }) {
  return (
    <div className="flex justify-center">
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
  const [audioList, setAudioList] = useState<string[]>([])
  const vad = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => [url, ...old])
    },
  })

  if (vad.loading) {
    return <Loading />
  }

  if (vad.errored) {
    return <Errored />
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-48 flex items-center">
        <div className="w-24 flex justify-center items-center">
          {vad.listening && vad.userSpeaking && <HighEnergyCube />}
          {vad.listening && !vad.userSpeaking && <LowEnergyCube />}
          {!vad.listening && <DeactivatedCube />}
        </div>
        <div className="w-24 flex justify-start items-center">
          <div
            className="underline underline-offset-2 text-rose-600 grow"
            onClick={vad.toggle}
          >
            {vad.listening && "Pause"}
            {!vad.listening && "Start"}
          </div>
        </div>
      </div>
      <ol
        id="playlist"
        className="self-center pl-0 max-h-[400px] overflow-y-auto no-scrollbar list-none"
      >
        {audioList.map((audioURL) => {
          return (
            <li className="pl-0" key={audioItemKey(audioURL)}>
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
  return (
    <div className="flex justify-center">
      <div className="animate-pulse text-2xl text-rose-600">Loading</div>
    </div>
  )
}

function Errored() {
  return (
    <div className="flex justify-center">
      <div className="text-2xl text-rose-600">Something went wrong</div>
    </div>
  )
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
