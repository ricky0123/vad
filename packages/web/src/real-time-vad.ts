import * as ortInstance from "onnxruntime-web"
import { defaultModelFetcher } from "./default-model-fetcher"
import {
  FrameProcessor,
  FrameProcessorOptions,
  defaultLegacyFrameProcessorOptions,
  defaultV5FrameProcessorOptions,
  validateOptions,
} from "./frame-processor"
import { log } from "./logging"
import { Message } from "./messages"
import {
  Model,
  ModelFactory,
  OrtOptions,
  SileroLegacy,
  SileroV5,
  SpeechProbabilities,
} from "./models"

interface RealTimeVADCallbacks {
  /** Callback to run after each frame. The size (number of samples) of a frame is given by `frameSamples`. */
  onFrameProcessed: (
    probabilities: SpeechProbabilities,
    frame: Float32Array
  ) => any

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

type AssetOptions = {
  workletOptions: AudioWorkletNodeOptions
  baseAssetPath: string
  onnxWASMBasePath: string
}

type ModelOptions = {
  model: "v5" | "legacy"
}

interface RealTimeVADOptionsWithoutStream
  extends FrameProcessorOptions,
    RealTimeVADCallbacks,
    OrtOptions,
    AssetOptions,
    ModelOptions {
  additionalAudioConstraints?: AudioConstraints
  stream: undefined
}

interface RealTimeVADOptionsWithStream
  extends FrameProcessorOptions,
    RealTimeVADCallbacks,
    OrtOptions,
    AssetOptions,
    ModelOptions {
  stream: MediaStream
}

export const ort = ortInstance

export type RealTimeVADOptions =
  | RealTimeVADOptionsWithStream
  | RealTimeVADOptionsWithoutStream

const workletFile = "vad.worklet.bundle.min.js"
const sileroV5File = "silero_vad_v5.onnx"
const sileroLegacyFile = "silero_vad_legacy.onnx"

export const getDefaultRealTimeVADOptions: (
  model: "v5" | "legacy"
) => RealTimeVADOptions = (model) => {
  const frameProcessorOptions =
    model === "v5"
      ? defaultV5FrameProcessorOptions
      : defaultLegacyFrameProcessorOptions
  return {
    ...frameProcessorOptions,
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
    baseAssetPath:
      "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.19/dist/",
    onnxWASMBasePath:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/",
    stream: undefined,
    ortConfig: undefined,
    model: "v5",
    workletOptions: {},
  }
}

export class MicVAD {
  static async new(options: Partial<RealTimeVADOptions> = {}) {
    const fullOptions: RealTimeVADOptions = {
      ...getDefaultRealTimeVADOptions(options.model ?? "legacy"),
      ...options,
    }
    validateOptions(fullOptions)

    let stream: MediaStream
    if (fullOptions.stream === undefined)
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...fullOptions.additionalAudioConstraints,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })
    else stream = fullOptions.stream

    const audioContext = new AudioContext()
    const sourceNode = new MediaStreamAudioSourceNode(audioContext, {
      mediaStream: stream,
    })

    const audioNodeVAD = await AudioNodeVAD.new(audioContext, fullOptions)
    audioNodeVAD.receive(sourceNode)

    return new MicVAD(
      fullOptions,
      audioContext,
      stream,
      audioNodeVAD,
      sourceNode
    )
  }

  private constructor(
    public options: RealTimeVADOptions,
    private audioContext: AudioContext,
    private stream: MediaStream,
    private audioNodeVAD: AudioNodeVAD,
    private sourceNode: MediaStreamAudioSourceNode,
    private listening = false
  ) {}

  pause = () => {
    this.audioNodeVAD.pause()
    this.listening = false
  }

  start = () => {
    this.audioNodeVAD.start()
    this.listening = true
  }

  destroy = () => {
    if (this.listening) {
      this.pause()
    }
    if (this.options.stream === undefined) {
      this.stream.getTracks().forEach((track) => track.stop())
    }
    this.sourceNode.disconnect()
    this.audioNodeVAD.destroy()
    this.audioContext.close()
  }
}

export class AudioNodeVAD {
  static async new(
    ctx: AudioContext,
    options: Partial<RealTimeVADOptions> = {}
  ) {
    const fullOptions: RealTimeVADOptions = {
      ...getDefaultRealTimeVADOptions(options.model ?? "legacy"),
      ...options,
    }
    validateOptions(fullOptions)

    ort.env.wasm.wasmPaths = fullOptions.onnxWASMBasePath
    if (fullOptions.ortConfig !== undefined) {
      fullOptions.ortConfig(ort)
    }

    const workletURL = fullOptions.baseAssetPath + workletFile

    try {
      await ctx.audioWorklet.addModule(workletURL)
    } catch (e) {
      console.error(`Encountered an error while loading worklet ${workletURL}`)
      throw e
    }
    let workletOptions = fullOptions.workletOptions
    workletOptions.processorOptions = {
      ...(fullOptions.workletOptions.processorOptions ?? {}),
      frameSamples: fullOptions.frameSamples,
    }
    const vadNode = new AudioWorkletNode(
      ctx,
      "vad-helper-worklet",
      workletOptions
    )

    const modelFile =
      fullOptions.model === "v5" ? sileroV5File : sileroLegacyFile
    const modelURL = fullOptions.baseAssetPath + modelFile
    const modelFactory: ModelFactory =
      fullOptions.model === "v5" ? SileroV5.new : SileroLegacy.new
    let model: Model
    try {
      model = await modelFactory(ort, () => defaultModelFetcher(modelURL))
    } catch (e) {
      console.error(`Encountered an error while loading model file ${modelURL}`)
      throw e
    }

    const frameProcessor = new FrameProcessor(
      model.process,
      model.reset_state,
      {
        frameSamples: fullOptions.frameSamples,
        positiveSpeechThreshold: fullOptions.positiveSpeechThreshold,
        negativeSpeechThreshold: fullOptions.negativeSpeechThreshold,
        redemptionFrames: fullOptions.redemptionFrames,
        preSpeechPadFrames: fullOptions.preSpeechPadFrames,
        minSpeechFrames: fullOptions.minSpeechFrames,
        submitUserSpeechOnPause: fullOptions.submitUserSpeechOnPause,
      }
    )

    const audioNodeVAD = new AudioNodeVAD(
      ctx,
      fullOptions,
      frameProcessor,
      vadNode
    )

    vadNode.port.onmessage = async (ev: MessageEvent) => {
      switch (ev.data?.message) {
        case Message.AudioFrame:
          let buffer: ArrayBuffer = ev.data.data
          if (!(buffer instanceof ArrayBuffer)) {
            buffer = new ArrayBuffer(ev.data.data.byteLength)
            new Uint8Array(buffer).set(new Uint8Array(ev.data.data))
          }
          const frame = new Float32Array(buffer)
          await audioNodeVAD.processFrame(frame)
          break

        default:
          break
      }
    }

    return audioNodeVAD
  }

  constructor(
    public ctx: AudioContext,
    public options: RealTimeVADOptions,
    private frameProcessor: FrameProcessor,
    private entryNode: AudioWorkletNode
  ) {}

  pause = () => {
    const ev = this.frameProcessor.pause()
    this.handleFrameProcessorEvent(ev)
  }

  start = () => {
    this.frameProcessor.resume()
  }

  receive = (node: AudioNode) => {
    node.connect(this.entryNode)
  }

  processFrame = async (frame: Float32Array) => {
    const ev = await this.frameProcessor.process(frame)
    this.handleFrameProcessorEvent(ev)
  }

  handleFrameProcessorEvent = (
    ev: Partial<{
      probs: SpeechProbabilities
      msg: Message
      audio: Float32Array
      frame: Float32Array
    }>
  ) => {
    if (ev.probs !== undefined) {
      this.options.onFrameProcessed(ev.probs, ev.frame as Float32Array)
    }
    switch (ev.msg) {
      case Message.SpeechStart:
        this.options.onSpeechStart()
        break

      case Message.VADMisfire:
        this.options.onVADMisfire()
        break

      case Message.SpeechEnd:
        this.options.onSpeechEnd(ev.audio as Float32Array)
        break

      default:
        break
    }
  }

  destroy = () => {
    this.entryNode.port.postMessage({
      message: Message.SpeechStop,
    })
    this.entryNode.disconnect()
  }
}
