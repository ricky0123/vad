import { FrameProcessor } from "./frame-processor"
import { log } from "./logging"
import { Message } from "./messages"
import { Silero, SpeechProbabilities } from "./models"
import { Resampler } from "./resampler"

export { encodeWAV } from "./audio"
export { FrameProcessor } from "./frame-processor"
export { arrayBufferToBase64, audioFileToArray } from "./utils"

log.debug("WELCOME TO VAD")

declare var __webpack_public_path__: string

const RECOMMENDED_FRAME_SAMPLES = [512, 1024, 1536]

interface VadOptions {
  onSpeechStart: () => any
  onSpeechEnd: (audio: Float32Array) => any
  onFrameProcessed: (probabilities: SpeechProbabilities) => any
  signalMisfire: () => any
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  redemptionFrames: number
  frameSamples: number
  preSpeechPadFrames: number
  minSpeechFrames: number
}

export function minFramesForTargetMS(
  targetDuration: number,
  frameSamples: number,
  sr = 16000
): number {
  return Math.ceil((targetDuration * sr) / 1000 / frameSamples)
}

const defaultVadOptions: VadOptions = {
  onSpeechStart: () => {
    log.debug("Detected speech start")
  },
  onSpeechEnd: () => {
    log.debug("Detected speech end")
  },
  onFrameProcessed: () => {},
  signalMisfire: () => {},
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.5 - 0.15,
  preSpeechPadFrames: 1,
  redemptionFrames: 2,
  frameSamples: 1536,
  minSpeechFrames: 3,
}

function validateOptions(options: VadOptions) {
  if (!RECOMMENDED_FRAME_SAMPLES.includes(options.frameSamples)) {
    log.warn("You are using an unusual frame size")
  }
  if (
    options.positiveSpeechThreshold < 0 ||
    options.negativeSpeechThreshold > 1
  ) {
    log.error("postiveSpeechThreshold should be a number between 0 and 1")
  }
  if (
    options.negativeSpeechThreshold < 0 ||
    options.negativeSpeechThreshold > options.positiveSpeechThreshold
  ) {
    log.error(
      "negativeSpeechThreshold should be between 0 and postiveSpeechThreshold"
    )
  }
  if (options.preSpeechPadFrames < 0) {
    log.error("preSpeechPadFrames should be positive")
  }
  if (options.redemptionFrames < 0) {
    log.error("preSpeechPadFrames should be positive")
  }
}

export class MicVAD {
  audioContext: AudioContext
  stream: MediaStream
  audioNodeVAD: AudioNodeVAD
  listening = false

  static async new(options: Partial<VadOptions> = {}) {
    const vad = new MicVAD({ ...defaultVadOptions, ...options })
    await vad.init()
    return vad
  }

  constructor(public options: VadOptions) {
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

export class AudioSegmentVAD {
  frameProcessor: FrameProcessor
  speaking: boolean = false

  static async new(options: Partial<VadOptions> = {}) {
    const vad = new AudioSegmentVAD({ ...defaultVadOptions, ...options })
    await vad.init()
    return vad
  }

  constructor(public options: VadOptions) {
    validateOptions(options)
  }

  init = async () => {
    const model = await Silero.new()

    this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
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
    })
    this.frameProcessor.resume()
  }

  run = async (audio: Float32Array, sampleRate: number) => {
    const resampler = new Resampler({
      nativeSampleRate: sampleRate,
      targetSampleRate: 16000,
      targetFrameSize: this.options.frameSamples,
    })
    const frames = resampler.process(audio)
    for (const f of frames) {
      await this.frameProcessor.process(f)
    }
  }
}

export class AudioNodeVAD {
  listening: boolean = false
  speaking: boolean = false
  frameProcessor: FrameProcessor
  entryNode: AudioNode

  static async new(ctx: AudioContext, options: Partial<VadOptions> = {}) {
    const vad = new AudioNodeVAD(ctx, { ...defaultVadOptions, ...options })
    await vad.init()
    return vad
  }

  constructor(public ctx: AudioContext, public options: VadOptions) {
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

    this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
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
    })

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
