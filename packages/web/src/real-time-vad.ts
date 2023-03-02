import * as ort from "onnxruntime-web"
import {
  log,
  Message,
  Silero,
  SpeechProbabilities,
  defaultFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorOptions,
  validateOptions,
} from "./_common"
import { modelFetcher } from "./model-fetcher"

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

/**
 * Customizable audio constraints for the VAD.
 * Excludes certain constraints that are set for the user by default.
 */
type AudioConstraints = Omit<
  MediaTrackConstraints,
  "channelCount" | "echoCancellation" | "autoGainControl" | "noiseSuppression"
>

export interface RealTimeVADOptions
  extends FrameProcessorOptions,
    RealTimeVADCallbacks {
  additionalAudioConstraints?: AudioConstraints
  workletURL: string
}

export const defaultRealTimeVADOptions: RealTimeVADOptions = {
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
  workletURL: "vad.worklet.bundle.min.js",
}

export class MicVAD {
  // @ts-ignore
  audioContext: AudioContext
  // @ts-ignore
  stream: MediaStream
  // @ts-ignore
  audioNodeVAD: AudioNodeVAD
  listening = false

  static async new(options: Partial<RealTimeVADOptions> = {}) {
    const vad = new MicVAD({ ...defaultRealTimeVADOptions, ...options })
    await vad.init()
    return vad
  }

  constructor(public options: RealTimeVADOptions) {
    validateOptions(options)
  }

  init = async () => {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...this.options.additionalAudioConstraints,
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
  // @ts-ignore
  frameProcessor: FrameProcessor
  // @ts-ignore
  entryNode: AudioNode

  static async new(
    ctx: AudioContext,
    options: Partial<RealTimeVADOptions> = {}
  ) {
    const vad = new AudioNodeVAD(ctx, {
      ...defaultRealTimeVADOptions,
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
        // @ts-ignore
        this.options.onSpeechEnd(audio)
        break

      default:
        break
    }
  }

  init = async () => {
    await this.ctx.audioWorklet.addModule(this.options.workletURL)
    const vadNode = new AudioWorkletNode(this.ctx, "vad-helper-worklet", {
      processorOptions: {
        frameSamples: this.options.frameSamples,
      },
    })
    this.entryNode = vadNode

    const model = await Silero.new(ort, modelFetcher)

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
