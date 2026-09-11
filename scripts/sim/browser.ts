// Runs in a headless browser. Drives FrameProcessor over a fixed audio buffer
// and hands the per-frame probabilities and events back to the node driver.
import * as ort from "onnxruntime-web/wasm"
import {
  FrameProcessor,
  FrameProcessorEvent,
} from "../../packages/web/src/frame-processor"
import { Message } from "../../packages/web/src/messages"
import { Silero, SileroLegacy } from "../../packages/web/src/models"

export interface SimParams {
  model: "v5" | "v6" | "legacy"
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  redemptionMs: number
  preSpeechPadMs: number
  minSpeechMs: number
  audioUrl: string
  modelUrl: string
  wasmBasePath: string
}

export interface SimEvent {
  msg: string
  /** Index of the frame being processed when the event fired. */
  frame: number
  /** For SpeechEnd, the frame range the emitted audio covers, inclusive. */
  startFrame?: number
  endFrame?: number
}

export interface SimResult {
  probs: number[]
  events: SimEvent[]
  frameSamples: number
  msPerFrame: number
}

async function runSim(params: SimParams): Promise<SimResult> {
  ort.env.wasm.wasmPaths = params.wasmBasePath
  ort.env.logLevel = "error"

  const audioResponse = await fetch(params.audioUrl)
  const audio = new Float32Array(await audioResponse.arrayBuffer())

  const modelFetcher = async () =>
    await (await fetch(params.modelUrl)).arrayBuffer()
  const modelFactory = params.model === "legacy" ? SileroLegacy.new : Silero.new
  const model = await modelFactory(ort, modelFetcher)

  const frameSamples = params.model === "legacy" ? 1536 : 512
  const msPerFrame = frameSamples / 16

  const frameProcessor = new FrameProcessor(
    model.process,
    model.reset_state,
    {
      positiveSpeechThreshold: params.positiveSpeechThreshold,
      negativeSpeechThreshold: params.negativeSpeechThreshold,
      redemptionMs: params.redemptionMs,
      preSpeechPadMs: params.preSpeechPadMs,
      minSpeechMs: params.minSpeechMs,
      submitUserSpeechOnPause: false,
    },
    msPerFrame
  )
  frameProcessor.resume()

  const probs: number[] = []
  const events: SimEvent[] = []
  let frame = 0

  const handleEvent = (ev: FrameProcessorEvent) => {
    if (ev.msg === Message.FrameProcessed) {
      probs.push(ev.probs.isSpeech)
      return
    }
    if (ev.msg === Message.SpeechEnd) {
      // The emitted audio spans a whole number of frames ending at the current
      // one, so the start frame can be recovered from its length.
      const frameCount = ev.audio.length / frameSamples
      events.push({
        msg: ev.msg,
        frame,
        startFrame: frame - frameCount + 1,
        endFrame: frame,
      })
      return
    }
    events.push({ msg: ev.msg, frame })
  }

  for (let i = 0; i + frameSamples <= audio.length; i += frameSamples) {
    await frameProcessor.process(audio.slice(i, i + frameSamples), handleEvent)
    frame++
  }

  await model.release()
  return { probs, events, frameSamples, msPerFrame }
}

declare global {
  interface Window {
    runSim: typeof runSim
  }
}

window.runSim = runSim
