import { MicVAD, RealTimeVADOptions } from "@ricky0123/vad-web"
import { useEffect, useState } from "react"

export function useVAD(args: Partial<RealTimeVADOptions>) {
  const [vadRunning, setVadRunning] = useState<boolean>(false)
  const [vad, setVAD] = useState<MicVAD | null>(null)
  const pauseVAD = () => {
    vad?.pause()
    setVadRunning(false)
  }
  const startVAD = () => {
    vad?.start()
    setVadRunning(true)
  }
  useEffect(() => {
    ;(async () => {
      const myvad = await MicVAD.new(args)
      setVAD(myvad)
      myvad.start()
      setVadRunning(true)
    })()
    return function cleanUp() {
      pauseVAD()
    }
  }, [])
  return {
    vadRunning,
    pauseVAD,
    startVAD,
  }
}
