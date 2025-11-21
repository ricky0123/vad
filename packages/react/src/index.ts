import type { RealTimeVADOptions } from "@ricky0123/vad-web"
import {
  DEFAULT_MODEL,
  MicVAD,
  getDefaultRealTimeVADOptions,
} from "@ricky0123/vad-web"
import { SpeechProbabilities } from "@ricky0123/vad-web/dist/models"
import { useCallback, useEffect, useRef, useState } from "react"

export { utils } from "@ricky0123/vad-web"

interface ReactOptions {
  userSpeakingThreshold: number
}

export type ReactRealTimeVADOptions = RealTimeVADOptions & ReactOptions

const defaultReactOptions: ReactOptions = {
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

function useOptions(
  options: Partial<ReactRealTimeVADOptions>
): [ReactOptions, RealTimeVADOptions] {
  const model = options.model ?? DEFAULT_MODEL
  const fullOptions: ReactRealTimeVADOptions = {
    ...getDefaultReactRealTimeVADOptions(model),
    ...options,
  }
  const reactOptions: ReactOptions = {
    userSpeakingThreshold: fullOptions.userSpeakingThreshold,
  }
  const vadOptions: RealTimeVADOptions = {
    positiveSpeechThreshold: fullOptions.positiveSpeechThreshold,
    negativeSpeechThreshold: fullOptions.negativeSpeechThreshold,
    redemptionMs: fullOptions.redemptionMs,
    preSpeechPadMs: fullOptions.preSpeechPadMs,
    minSpeechMs: fullOptions.minSpeechMs,
    submitUserSpeechOnPause: fullOptions.submitUserSpeechOnPause,
    onFrameProcessed: fullOptions.onFrameProcessed,
    onVADMisfire: fullOptions.onVADMisfire,
    onSpeechStart: fullOptions.onSpeechStart,
    onSpeechEnd: fullOptions.onSpeechEnd,
    onSpeechRealStart: fullOptions.onSpeechRealStart,
    baseAssetPath: fullOptions.baseAssetPath,
    onnxWASMBasePath: fullOptions.onnxWASMBasePath,
    model: fullOptions.model,
    workletOptions: fullOptions.workletOptions,
    getStream: fullOptions.getStream,
    pauseStream: fullOptions.pauseStream,
    resumeStream: fullOptions.resumeStream,
    startOnLoad: fullOptions.startOnLoad,
    processorType: fullOptions.processorType,
  }
  if (fullOptions.ortConfig) {
    vadOptions.ortConfig = fullOptions.ortConfig
  }
  if (fullOptions.audioContext) {
    vadOptions.audioContext = fullOptions.audioContext
  }
  return [reactOptions, vadOptions]
}

export function useMicVAD(options: Partial<ReactRealTimeVADOptions>) {
  const [reactOptions, vadOptions] = useOptions(options)
  const model = options["model"] ?? DEFAULT_MODEL
  const [userSpeaking, updateUserSpeaking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState<false | string>(false)
  const [listening, setListening] = useState(false)
  const [vad, setVAD] = useState<MicVAD | null>(null)

  // Use refs to store the latest callbacks so they can be called without recreating the VAD
  const onFrameProcessedRef = useRef(vadOptions.onFrameProcessed)
  const onSpeechEndRef = useRef(vadOptions.onSpeechEnd)
  const onSpeechStartRef = useRef(vadOptions.onSpeechStart)
  const onSpeechRealStartRef = useRef(vadOptions.onSpeechRealStart)
  const onVADMisfireRef = useRef(vadOptions.onVADMisfire)
  const getStreamRef = useRef(vadOptions.getStream)

  // Update refs when callbacks change
  useEffect(() => {
    onFrameProcessedRef.current = vadOptions.onFrameProcessed
    onSpeechEndRef.current = vadOptions.onSpeechEnd
    onSpeechStartRef.current = vadOptions.onSpeechStart
    onSpeechRealStartRef.current = vadOptions.onSpeechRealStart
    onVADMisfireRef.current = vadOptions.onVADMisfire
  }, [
    vadOptions.onFrameProcessed,
    vadOptions.onSpeechEnd,
    vadOptions.onSpeechStart,
    vadOptions.onSpeechRealStart,
    vadOptions.onVADMisfire,
  ])

  // Update getStream ref - this is the key fix!
  useEffect(() => {
    getStreamRef.current = vadOptions.getStream
  }, [vadOptions.getStream])

  // Serialize getStream function to detect changes
  // We use a simple approach: convert function to string
  const getStreamKey = vadOptions.getStream.toString()

  useEffect(() => {
    let myvad: MicVAD | null = null
    let canceled = false

    const setup = async (): Promise<void> => {
      try {
        setLoading(true)
        setErrored(false)

        // Create VAD options with stable callback wrappers
        const finalVadOptions: RealTimeVADOptions = {
          ...vadOptions,
          onFrameProcessed: (
            probs: SpeechProbabilities,
            frame: Float32Array
          ) => {
            const isSpeaking =
              probs.isSpeech > reactOptions.userSpeakingThreshold
            updateUserSpeaking(isSpeaking)
            void onFrameProcessedRef.current(probs, frame)
          },
          onSpeechEnd: (audio: Float32Array) => {
            void onSpeechEndRef.current(audio)
          },
          onSpeechStart: () => {
            void onSpeechStartRef.current()
          },
          onSpeechRealStart: () => {
            void onSpeechRealStartRef.current()
          },
          onVADMisfire: () => {
            void onVADMisfireRef.current()
          },
          getStream: () => {
            return getStreamRef.current()
          },
        }

        myvad = await MicVAD.new(finalVadOptions)

        if (canceled) {
          await myvad.destroy()
          return
        }

        setVAD(myvad)

        if (vadOptions.startOnLoad) {
          await myvad.start()
          setListening(true)
        }
        setLoading(false)
      } catch (e) {
        setLoading(false)
        if (e instanceof Error) {
          setErrored(e.message)
        } else {
          setErrored(String(e))
        }
      }
    }

    setup().catch(() => {
      // Error already handled in setup function
    })

    return function cleanUp() {
      canceled = true
      if (myvad) {
        void myvad.destroy()
      }
      if (!loading && !errored) {
        setListening(false)
      }
    }
  }, [getStreamKey, model]) // Recreate when getStream changes or model changes

  const pause = useCallback(async () => {
    if (!loading && !errored) {
      await vad?.pause()
      setListening(false)
    }
  }, [loading, errored, vad])

  const start = useCallback(async () => {
    if (!loading && !errored) {
      await vad?.start()
      setListening(true)
    }
  }, [loading, errored, vad])

  const toggle = useCallback(async () => {
    if (listening) {
      await pause()
    } else {
      await start()
    }
  }, [listening, pause, start])

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
