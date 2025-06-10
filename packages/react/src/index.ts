import type { RealTimeVADOptions } from "@ricky0123/vad-web"
import {
  DEFAULT_MODEL,
  MicVAD,
  getDefaultRealTimeVADOptions,
} from "@ricky0123/vad-web"
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

export const getDefaultReactRealTimeVADOptions = (
  model: "legacy" | "v5"
): ReactRealTimeVADOptions => {
  return {
    ...getDefaultRealTimeVADOptions(model),
    ...defaultReactOptions,
  }
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
  const model = options.model ?? DEFAULT_MODEL
  options = { ...getDefaultReactRealTimeVADOptions(model), ...options }
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
  const [userSpeaking, updateUserSpeaking] = useReducer<
    React.Reducer<boolean, number>
  >(
    (state: boolean, isSpeechProbability: number) =>
      isSpeechProbability > reactOptions.userSpeakingThreshold,
    false
  )
  const [loading, setLoading] = useState(false)
  const [errored, setErrored] = useState<false | string>(false)
  const [listening, setListening] = useState(false)
  const vadRef = React.useRef<MicVAD | null>(null)

  const userOnFrameProcessed = useEventCallback(vadOptions.onFrameProcessed)
  vadOptions.onFrameProcessed = useEventCallback((probs, frame) => {
    updateUserSpeaking(probs.isSpeech)
    userOnFrameProcessed(probs, frame)
  })
  const { onSpeechEnd, onSpeechStart, onSpeechRealStart, onVADMisfire } =
    vadOptions
  const _onSpeechEnd = useEventCallback(onSpeechEnd)
  const _onSpeechStart = useEventCallback(onSpeechStart)
  const _onVADMisfire = useEventCallback(onVADMisfire)
  const _onSpeechRealStart = useEventCallback(onSpeechRealStart)
  vadOptions.onSpeechEnd = _onSpeechEnd
  vadOptions.onSpeechStart = _onSpeechStart
  vadOptions.onVADMisfire = _onVADMisfire
  vadOptions.onSpeechRealStart = _onSpeechRealStart

  const setup = async (): Promise<MicVAD | null> => {
    let myvad: MicVAD | null = null
    try {
      myvad = await MicVAD.new(vadOptions)
    } catch (e) {
      setErrored(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setLoading(false)
    }
    vadRef.current = myvad
    return myvad
  }

  useEffect(() => {
    return function cleanUp() {
      if (vadRef.current) {
        vadRef.current.pause()
        setListening(false)
        vadRef.current?.destroy()
      }
    }
  }, [])

  const pause = () => {
    if (!loading && !errored) {
      vadRef.current?.pause()
      setListening(false)
    }
  }

  const stop = () => {
    if (!loading && !errored && listening) {
      vadRef.current?.destroy()
      setListening(false)
      vadRef.current = null
    }
  }

  const start = () => {
    if (!listening) {
      setLoading(true)
      setup().then((vad) => {
        vad?.start()
        setListening(true)
      })
    }
  }

  return {
    listening,
    errored,
    loading,
    userSpeaking,
    start,
    pause,
    stop,
  }
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined" &&
  typeof window.document.createElement !== "undefined"
    ? React.useLayoutEffect
    : React.useEffect
