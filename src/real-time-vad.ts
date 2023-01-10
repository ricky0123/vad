import {
  defaultFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorOptions,
  validateOptions,
} from "./frame-processor"
import { log } from "./logging"
import { Message } from "./messages"
import { Silero, SpeechProbabilities } from "./models"

declare var __webpack_public_path__: string

interface RealTimeVADCallbacks {
  /** Callback to run after each frame. The size (number of samples) of a frame is given by `frameSamples`. */
  onFrameProcessed: (probabilities: SpeechProbabilities) => any

  /** Callback to run if speech start was detected but `onSpeechEnd` will not be run because the
   * audio segment is smaller than `minSpeechFrames`.
   */
  onVADMisfire: () => any

  /** Callback to run when speech start is detected */
  onSpeechStart: () => any

  /**
   * Callback to run when speech end is detected.
   * Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000.
   * This will not run if the audio segment is smaller than `minSpeechFrames`.
   */
  onSpeechEnd: (audio: Float32Array) => any
}
export interface RealTimeVADOptions
  extends FrameProcessorOptions,
    RealTimeVADCallbacks {
      deviceId?: string
    }

export const defaultRealtimeVADOptions: RealTimeVADOptions = {
  ...defaultFrameProcessorOptions,
  onFrameProcessed: (probabilities) => {},
  onVADMisfire: () => {
    log.debug("VAD misfire")
  },
  onSpeechStart: () => {
    log.debug("Detected speech start")
  },
  onSpeechEnd: () => {
    log.debug("Detected speech end")
  },
}

export class MicVAD {
  audioContext: AudioContext
  stream: MediaStream
  audioNodeVAD: AudioNodeVAD
  listening = false

  static async new(
    options: Partial<RealTimeVADOptions> = {},
  ) {
    const vad = new MicVAD({ ...defaultRealtimeVADOptions, ...options })
    await vad.init(options.deviceId)
    return vad
  }

  constructor(public options: RealTimeVADOptions) {
    validateOptions(options)
  }

  init = async (deviceId?: string) => {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...(deviceId && { deviceId }),
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
    this.audioNodeVAD.pause()
    this.listening = false
  }

  start = () => {
    this.audioNodeVAD.start()
    this.listening = true
  }
}

export class AudioNodeVAD {
  frameProcessor: FrameProcessor
  entryNode: AudioNode

  static async new(
    ctx: AudioContext,
    options: Partial<RealTimeVADOptions> = {}
  ) {
    const vad = new AudioNodeVAD(ctx, {
      ...defaultRealtimeVADOptions,
      ...options,
    })
    await vad.init()
    return vad
  }

  constructor(public ctx: AudioContext, public options: RealTimeVADOptions) {
    validateOptions(options)
  }

  pause = () => {
    this.frameProcessor.pause()
  }

  start = () => {
    this.frameProcessor.resume()
  }

  receive = (node: AudioNode) => {
    node.connect(this.entryNode)
  }

  processFrame = async (frame: Float32Array) => {
    const { probs, msg, audio } = await this.frameProcessor.process(frame)
    if (probs !== undefined) {
      this.options.onFrameProcessed(probs)
    }
    switch (msg) {
      case Message.SpeechStart:
        this.options.onSpeechStart()
        break

      case Message.VADMisfire:
        this.options.onVADMisfire()
        break

      case Message.SpeechEnd:
        this.options.onSpeechEnd(audio)
        break

      default:
        break
    }
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

    this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
      frameSamples: this.options.frameSamples,
      positiveSpeechThreshold: this.options.positiveSpeechThreshold,
      negativeSpeechThreshold: this.options.negativeSpeechThreshold,
      redemptionFrames: this.options.redemptionFrames,
      preSpeechPadFrames: this.options.preSpeechPadFrames,
      minSpeechFrames: this.options.minSpeechFrames,
    })

    vadNode.port.onmessage = async (ev: MessageEvent) => {
      switch (ev.data?.message) {
        case Message.AudioFrame:
          const buffer: ArrayBuffer = ev.data.data
          const frame = new Float32Array(buffer)
          await this.processFrame(frame)
          break

        default:
          break
      }
    }
  }
}
