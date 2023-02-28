import type { RealTimeVADOptions } from "@ricky0123/vad-web"
import { defaultRealTimeVADOptions, MicVAD } from "@ricky0123/vad-web"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

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

/*
###############################################################################
                          @ricky0123/vad-react
###############################################################################
*/

interface ReactOptions {
  startOnLoad: boolean
}

export interface ReactRealTimeVADOptions
  extends RealTimeVADOptions,
    ReactOptions {}

const defaultReactOptions = {
  startOnLoad: true,
}

export const defaultReactRealTimeVADOptions = {
  ...defaultRealTimeVADOptions,
  ...defaultReactOptions,
}

const reactOptionKeys = Object.keys(defaultReactOptions)
const vadOptionKeys = Object.keys(defaultRealTimeVADOptions)

const _filter = (keys: string[], obj: any) => {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {})
}

function useOptions(
  options: Partial<ReactRealTimeVADOptions>
): [ReactOptions, RealTimeVADOptions] {
  options = { ...defaultReactRealTimeVADOptions, ...options }
  const reactOptions = _filter(reactOptionKeys, options) as ReactOptions
  const vadOptions = _filter(vadOptionKeys, options) as RealTimeVADOptions
  return [reactOptions, vadOptions]
}

export function useVAD(options: Partial<ReactRealTimeVADOptions>) {
  const [reactOptions, vadOptions] = useOptions(options)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState<false | { message: string }>(false)
  const [listening, setListening] = useState(false)
  const [vad, setVAD] = useState<MicVAD | null>(null)
  useEffect(() => {
    ;(async () => {
      const userOnSpeechStart = vadOptions.onSpeechStart
      vadOptions.onSpeechStart = () => {
        setUserSpeaking(true)
        userOnSpeechStart()
      }
      const userOnSpeechEnd = vadOptions.onSpeechEnd
      vadOptions.onSpeechEnd = (audio) => {
        setUserSpeaking(false)
        userOnSpeechEnd(audio)
      }
      const userOnVADMisfire = vadOptions.onVADMisfire
      vadOptions.onVADMisfire = () => {
        setUserSpeaking(false)
        userOnVADMisfire()
      }

      let myvad: MicVAD | null
      try {
        myvad = await MicVAD.new(vadOptions)
      } catch (e) {
        setLoading(false)
        if (e instanceof Error) {
          setErrored({ message: e.message })
        } else {
          setErrored({ message: e })
        }
        return
      }
      setVAD(myvad)
      setLoading(false)
      if (reactOptions.startOnLoad) {
        myvad?.start()
        setListening(true)
      }
    })()
    return function cleanUp() {
      if (!loading && !errored) {
        vad?.pause()
        setListening(false)
      }
    }
  }, [])
  const pause = () => {
    if (!loading && !errored) {
      vad?.pause()
      setListening(false)
    }
  }
  const start = () => {
    if (!loading && !errored) {
      vad?.start()
      setListening(true)
    }
  }
  return {
    listening,
    errored,
    loading,
    userSpeaking,
    pause,
    start,
  }
}

export { utils } from "@ricky0123/vad-web"
