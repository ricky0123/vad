import type { RealTimeVadOptions } from "./index-common"
import { defaultRealtimeVadOptions, validateOptions } from "./index-common"
import { RealTimeFrameProcessor } from "./frame-processor"
import { log } from "./logging"
import { Message } from "./messages"
import { Silero } from "./models"
export * from "./index-common"
export type { RealTimeVadOptions as VadOptions }

declare var __webpack_public_path__: string

export class MicVAD {
  audioContext: AudioContext
  stream: MediaStream
  audioNodeVAD: AudioNodeVAD
  listening = false

  static async new(options: Partial<RealTimeVadOptions> = {}) {
    const vad = new MicVAD({ ...defaultRealtimeVadOptions, ...options })
    await vad.init()
    return vad
  }

  constructor(public options: RealTimeVadOptions) {
    validateOptions(options)
  }

  init = async () => {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
      },
    })

    this.audioContext = new AudioContext()
    const source = new MediaStreamAudioSourceNode(this.audioContext, {
      mediaStream: this.stream,
    })

    this.audioNodeVAD = await AudioNodeVAD.new(this.audioContext, this.options)
    this.audioNodeVAD.receive(source)
  }

  pause = () => {
    this.listening = false
    this.audioNodeVAD.pause()
  }

  start = () => {
    this.listening = true
    this.audioNodeVAD.start()
  }
}

export class AudioNodeVAD {
  listening: boolean = false
  speaking: boolean = false
  frameProcessor: RealTimeFrameProcessor
  entryNode: AudioNode

  static async new(
    ctx: AudioContext,
    options: Partial<RealTimeVadOptions> = {}
  ) {
    const vad = new AudioNodeVAD(ctx, {
      ...defaultRealtimeVadOptions,
      ...options,
    })
    await vad.init()
    return vad
  }

  constructor(public ctx: AudioContext, public options: RealTimeVadOptions) {
    validateOptions(options)
  }

  pause = () => {
    log.debug("pausing vad")
    this.frameProcessor.pause()
    this.listening = false
  }

  start = () => {
    log.debug("starting vad")
    this.frameProcessor.resume()
    this.listening = true
  }

  receive = (node: AudioNode) => {
    node.connect(this.entryNode)
  }

  init = async () => {
    const workletPath = __webpack_public_path__ + `vad.worklet.js`
    await this.ctx.audioWorklet.addModule(workletPath)
    const vadNode = new AudioWorkletNode(this.ctx, "vad-helper-worklet", {
      processorOptions: {
        frameSamples: this.options.frameSamples,
      },
    })
    this.entryNode = vadNode

    const model = await Silero.new()

    this.frameProcessor = new RealTimeFrameProcessor(
      model.process,
      model.reset_state,
      {
        onFrameProcessed: this.options.onFrameProcessed,
        signalSpeechStart: () => {
          this.speaking = true
          this.options.onSpeechStart()
        },
        signalSpeechEnd: (audio) => {
          this.speaking = false
          this.options.onSpeechEnd(audio)
        },
        signalMisfire: this.options.signalMisfire,
        positiveSpeechThreshold: this.options.positiveSpeechThreshold,
        negativeSpeechThreshold: this.options.negativeSpeechThreshold,
        redemptionFrames: this.options.redemptionFrames,
        preSpeechPadFrames: this.options.preSpeechPadFrames,
        minSpeechFrames: this.options.minSpeechFrames,
      }
    )

    vadNode.port.onmessage = async (ev: MessageEvent) => {
      switch (ev.data?.message) {
        case Message.AudioFrame:
          const buffer: ArrayBuffer = ev.data.data
          const frame = new Float32Array(buffer)
          await this.frameProcessor.process(frame)
          break

        default:
          break
      }
    }
  }
}
