import type { MicVADOptions } from "@ricky0123/vad-web"
import { MicVAD } from "@ricky0123/vad-web"
import React, { useEffect, useReducer, useRef, useState } from "react"

interface ReactOptions {
  startOnLoad: boolean
  userSpeakingThreshold: number
}

export type ReactRealTimeVADOptions = MicVADOptions & ReactOptions

export function useMicVAD(options: Partial<ReactRealTimeVADOptions>) {
  const vadIdRef = useRef((Math.random() + 1).toString(36).substring(7))
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState<false | { message: string }>(false)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    const _effect = async () => {
      window[vadIdRef.current] = await MicVAD.new({})
    }
    return function cleanUp() {
      
    }
  }, [])
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

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined" &&
  typeof window.document.createElement !== "undefined"
    ? React.useLayoutEffect
    : React.useEffect
