import type { RealTimeVADOptions } from "@ricky0123/vad-web"
import { MicVAD, getDefaultRealTimeVADOptions } from "@ricky0123/vad-web"
import React, { useEffect, useReducer, useState } from "react"

export { utils } from "@ricky0123/vad-web"

interface ReactOptions {
  startOnLoad: boolean
  userSpeakingThreshold: number
}

export type ReactRealTimeVADOptions = RealTimeVADOptions & ReactOptions

const defaultReactOptions: ReactOptions = {
  startOnLoad: true,
  userSpeakingThreshold: 0.6,
}

export const defaultReactRealTimeVADOptions = {
  ...getDefaultRealTimeVADOptions("v5"),
  ...defaultReactOptions,
}

const reactOptionKeys = Object.keys(defaultReactOptions)
const vadOptionKeys = Object.keys(getDefaultRealTimeVADOptions("v5"))

const _filter = (keys: string[], obj: any) => {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {} as { [key: string]: any })
}

function useOptions(
  options: Partial<ReactRealTimeVADOptions>
): [ReactOptions, RealTimeVADOptions] {
  options = { ...defaultReactRealTimeVADOptions, ...options }
  const reactOptions = _filter(reactOptionKeys, options) as ReactOptions
  const vadOptions = _filter(vadOptionKeys, options) as RealTimeVADOptions
  return [reactOptions, vadOptions]
}

function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref: any = React.useRef(fn)

  // we copy a ref to the callback scoped to the current state/props on each render
  useIsomorphicLayoutEffect(() => {
    ref.current = fn
  })

  return React.useCallback(
    (...args: any[]) => ref.current.apply(void 0, args),
    []
  ) as T
}

export function useMicVAD(options: Partial<ReactRealTimeVADOptions>) {
  const [reactOptions, vadOptions] = useOptions(options)
  const [userSpeaking, updateUserSpeaking] = useReducer(
    (state: boolean, isSpeechProbability: number) =>
      isSpeechProbability > reactOptions.userSpeakingThreshold,
    false
  )
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState<false | string>(false)
  const [listening, setListening] = useState(false)
  const [vad, setVAD] = useState<MicVAD | null>(null)

  const userOnFrameProcessed = useEventCallback(vadOptions.onFrameProcessed)
  vadOptions.onFrameProcessed = useEventCallback((probs, frame) => {
    updateUserSpeaking(probs.isSpeech)
    userOnFrameProcessed(probs, frame)
  })
  const { onSpeechEnd, onSpeechStart, onVADMisfire } = vadOptions
  const _onSpeechEnd = useEventCallback(onSpeechEnd)
  const _onSpeechStart = useEventCallback(onSpeechStart)
  const _onVADMisfire = useEventCallback(onVADMisfire)
  vadOptions.onSpeechEnd = _onSpeechEnd
  vadOptions.onSpeechStart = _onSpeechStart
  vadOptions.onVADMisfire = _onVADMisfire

  useEffect(() => {
    let myvad: MicVAD | null
    let canceled = false
    const setup = async (): Promise<void> => {
      try {
        myvad = await MicVAD.new(vadOptions)
        if (canceled) {
          myvad.destroy()
          return
        }
      } catch (e) {
        setLoading(false)
        if (e instanceof Error) {
          setErrored(e.message)
        } else {
          setErrored(String(e))
        }
        return
      }
      setVAD(myvad)
      setLoading(false)
      if (reactOptions.startOnLoad) {
        myvad?.start()
        setListening(true)
      }
    }
    setup().catch((e) => {
      console.log("Well that didn't work")
    })
    return function cleanUp() {
      myvad?.destroy()
      canceled = true
      if (!loading && !errored) {
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
  const toggle = () => {
    if (listening) {
      pause()
    } else {
      start()
    }
  }
  return {
    listening,
    errored,
    loading,
    userSpeaking,
    pause,
    start,
    toggle,
  }
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined" &&
  typeof window.document.createElement !== "undefined"
    ? React.useLayoutEffect
    : React.useEffect
