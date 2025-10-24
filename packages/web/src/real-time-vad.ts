import * as ortInstance from "onnxruntime-web/wasm"
import { defaultModelFetcher } from "./default-model-fetcher"
import {
  FrameProcessor,
  FrameProcessorEvent,
  FrameProcessorOptions,
  defaultFrameProcessorOptions,
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
import { Resampler } from "./resampler"

export const DEFAULT_MODEL = "legacy"

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

  /** Callback to run when speech is detected as valid. (i.e. not a misfire) */
  onSpeechRealStart: () => any
}

type AssetOptions = {
  workletOptions: AudioWorkletNodeOptions
  baseAssetPath: string
  onnxWASMBasePath: string
}

type ModelOptions = {
  model: "v5" | "legacy"
}

export interface RealTimeVADOptions
  extends FrameProcessorOptions,
    RealTimeVADCallbacks,
    OrtOptions,
    AssetOptions,
    ModelOptions {
  getAudioContext: () => AudioContext
  getStream: () => Promise<MediaStream>
  pauseStream: (stream: MediaStream) => Promise<void>
  resumeStream: (stream: MediaStream) => Promise<MediaStream>
  startOnLoad: boolean
  processorType: "AudioWorklet" | "ScriptProcessor" | "auto"
}

export const ort = ortInstance

const workletFile = "vad.worklet.bundle.min.js"
const sileroV5File = "silero_vad_v5.onnx"
const sileroLegacyFile = "silero_vad_legacy.onnx"

export const getDefaultRealTimeVADOptions = (
  model: "v5" | "legacy"
): RealTimeVADOptions => {
  return {
    ...defaultFrameProcessorOptions,
    onFrameProcessed: (
      _probabilities: SpeechProbabilities,
      _frame: Float32Array
    ) => {},
    onVADMisfire: () => {
      log.debug("VAD misfire")
    },
    onSpeechStart: () => {
      log.debug("Detected speech start")
    },
    onSpeechEnd: () => {
      log.debug("Detected speech end")
    },
    onSpeechRealStart: () => {
      log.debug("Detected real speech start")
    },
    baseAssetPath: "./",
    onnxWASMBasePath: "./",
    model: model,
    workletOptions: {},
    getAudioContext: () => {
      return new AudioContext()
    },
    getStream: async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })
      return stream
    },
    pauseStream: async (_stream: MediaStream) => {
      _stream.getTracks().forEach((track) => {
        track.stop()
      })
    },
    resumeStream: async (_stream: MediaStream) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })
      return stream
    },
    ortConfig: (ort) => {
      ort.env.logLevel = "error"
    },
    startOnLoad: true,
    processorType: "auto",
  }
}

/*

1. user supplies Partial<RealTimeVADOptions>
1. if startOnLoad true:
  1. get stream (before initializing audio context, so that context is not suspended)
  1. if audio context not supplied, create it
  1. create MediaStreamAudioSourceNode from stream
  1. create audio worklet or script processor
  1. connect MediaStreamAudioSourceNode to AudioWorklet or ScriptProcessor with port msg handlers
1. else:
  1. do that when start is called (audio context needed for setup of basically everything)
1. we return control object

*/

const detectProcessorType = (
  ctx: AudioContext
): "AudioWorklet" | "ScriptProcessor" => {
  if ("audioWorklet" in ctx && typeof AudioWorkletNode === "function") {
    return "AudioWorklet"
  }
  return "ScriptProcessor"
}

async function getVADNodeAsWorklet(
  workletURL: string,
  workletOptions: AudioWorkletNodeOptions,
  audioContext: AudioContext,
  frameSamples: number,
  processFrame: ProcessFrameFunc
): Promise<AudioNode> {
  await audioContext.audioWorklet.addModule(workletURL)

  workletOptions.processorOptions = {
    ...(workletOptions.processorOptions ?? {}),
    frameSamples: frameSamples,
  }

  const audioNode = new AudioWorkletNode(
    audioContext,
    "vad-helper-worklet",
    workletOptions
  )
  audioNode.port.onmessage = async (ev: MessageEvent) => {
    switch (ev.data?.message) {
      case Message.AudioFrame:
        let buffer: ArrayBuffer = ev.data.data
        if (!(buffer instanceof ArrayBuffer)) {
          buffer = new ArrayBuffer(ev.data.data.byteLength)
          new Uint8Array(buffer).set(new Uint8Array(ev.data.data))
        }
        const frame = new Float32Array(buffer)
        await processFrame(frame)
        break
    }
  }

  return audioNode
}

async function getVADNodeAsScriptProcessor(
  audioContext: AudioContext,
  frameSamples: number,
  processFrame: ProcessFrameFunc
): Promise<AudioNode> {
  const resampler = new Resampler({
    nativeSampleRate: audioContext.sampleRate,
    targetSampleRate: 16000, // VAD models expect 16kHz
    targetFrameSize: frameSamples ?? 480,
  })

  // Fallback to ScriptProcessor
  const bufferSize = 4096 // Increased for more stable processing
  const audioNode = audioContext.createScriptProcessor(bufferSize, 1, 1)

  let processingAudio = false

  audioNode.onaudioprocess = async (e: AudioProcessingEvent) => {
    if (processingAudio) return
    processingAudio = true

    try {
      const input = e.inputBuffer.getChannelData(0)
      const output = e.outputBuffer.getChannelData(0)
      output.fill(0)

      // Process through resampler
      if (resampler) {
        const frames = resampler.process(input)
        for (const frame of frames) {
          await processFrame(frame)
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error)
    } finally {
      processingAudio = false
    }
  }

  return audioNode
}

type ProcessFrameFunc = (frame: Float32Array) => Promise<void>

export class MicVAD {
  private constructor(
    public options: RealTimeVADOptions,
    private readonly frameProcessor: FrameProcessor,
    private readonly frameSamples: 512 | 1536,
    public listening = false,
    public errored: string | null = null,
    private _stream: MediaStream | null = null,
    private _audioContext: AudioContext | null = null,
    private _vadNode: AudioNode | null = null,
    private _mediaStreamAudioSourceNode: MediaStreamAudioSourceNode | null = null,
    private _audioProcessorAdapterType:
      | "AudioWorklet"
      | "ScriptProcessor"
      | null = null,
    private initializationState:
      | "uninitialized"
      | "initializing"
      | "initialized"
      | "destroyed" = "uninitialized"
  ) {}

  static async new(options: Partial<RealTimeVADOptions> = {}) {
    const fullOptions: RealTimeVADOptions = {
      ...getDefaultRealTimeVADOptions(options.model ?? DEFAULT_MODEL),
      ...options,
    }
    validateOptions(fullOptions)

    ort.env.wasm.wasmPaths = fullOptions.onnxWASMBasePath
    if (fullOptions.ortConfig !== undefined) {
      fullOptions.ortConfig(ort)
    }

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

    const frameSamples = fullOptions.model === "v5" ? 512 : 1536
    const msPerFrame = frameSamples / 16

    const frameProcessor = new FrameProcessor(
      model.process,
      model.reset_state,
      {
        positiveSpeechThreshold: fullOptions.positiveSpeechThreshold,
        negativeSpeechThreshold: fullOptions.negativeSpeechThreshold,
        redemptionMs: fullOptions.redemptionMs,
        preSpeechPadMs: fullOptions.preSpeechPadMs,
        minSpeechMs: fullOptions.minSpeechMs,
        submitUserSpeechOnPause: fullOptions.submitUserSpeechOnPause,
      },
      msPerFrame
    )

    const micVad = new MicVAD(fullOptions, frameProcessor, frameSamples)

    // things would be simpler if we didn't have to startOnLoad by default, but we are locked in
    if (fullOptions.startOnLoad) {
      try {
        await micVad.start()
      } catch (e) {
        console.error("Error starting micVad", e)
      }
    }
    return micVad
  }

  private getAudioInstances = (): {
    stream: MediaStream
    audioContext: AudioContext
    vadNode: AudioNode
    mediaStreamAudioSourceNode: MediaStreamAudioSourceNode
  } => {
    if (
      this._stream === null ||
      this._audioContext === null ||
      this._vadNode == null ||
      this._mediaStreamAudioSourceNode == null
    ) {
      throw new Error(
        "MicVAD has null stream, audio context, or processor adapter"
      )
    }
    return {
      stream: this._stream,
      audioContext: this._audioContext,
      vadNode: this._vadNode,
      mediaStreamAudioSourceNode: this._mediaStreamAudioSourceNode,
    }
  }

  start = async () => {
    switch (this.initializationState) {
      case "uninitialized":
        log.debug("initializing micVAD")
        this.initializationState = "initializing"
        this.frameProcessor.resume()

        this._stream = await this.options.getStream()
        this._audioContext = this.options.getAudioContext()

        this._audioProcessorAdapterType =
          this.options.processorType == "auto"
            ? detectProcessorType(this._audioContext)
            : this.options.processorType

        let _vadNode: AudioNode
        switch (this._audioProcessorAdapterType) {
          case "AudioWorklet":
            _vadNode = await getVADNodeAsWorklet(
              this.options.baseAssetPath + workletFile,
              this.options.workletOptions ?? {},
              this._audioContext,
              this.frameSamples,
              this.processFrame
            )
            break

          case "ScriptProcessor":
            _vadNode = await getVADNodeAsScriptProcessor(
              this._audioContext,
              this.frameSamples,
              this.processFrame
            )
            break

          default:
            throw new Error(
              `Unsupported audio processor adapter type: ${this._audioProcessorAdapterType}`
            )
        }
        this._vadNode = _vadNode

        this._mediaStreamAudioSourceNode = new MediaStreamAudioSourceNode(
          this._audioContext,
          {
            mediaStream: this._stream,
          }
        )
        this._mediaStreamAudioSourceNode.connect(this._vadNode)
        log.debug("started micVAD")

        this.initializationState = "initialized"
        break

      case "initializing":
        log.warn("start called while initializing")
        break

      case "initialized":
        if (this.listening) {
          return
        }
        this.listening = true
        this.frameProcessor.resume()

        const { stream, audioContext, vadNode } = this.getAudioInstances()
        this._stream = await this.options.resumeStream(stream)

        const mediaStreamAudioSourceNode = new MediaStreamAudioSourceNode(
          audioContext,
          { mediaStream: this._stream }
        )
        this._mediaStreamAudioSourceNode = mediaStreamAudioSourceNode

        mediaStreamAudioSourceNode.connect(vadNode)
        break

      case "destroyed":
        log.warn("start called after destroyed")
        break

      default:
        log.warn("weird initialization state")
        break
    }
  }

  pause = async () => {
    if (!this.listening) {
      return
    }
    this.listening = false

    const { stream, mediaStreamAudioSourceNode, vadNode } =
      this.getAudioInstances()
    await this.options.pauseStream(stream)

    if (this._audioProcessorAdapterType == "AudioWorklet") {
      ;(vadNode as any).port.postMessage(Message.SpeechStop)
    }

    mediaStreamAudioSourceNode.disconnect()
    this.frameProcessor.pause(this.handleFrameProcessorEvent)
  }

  destroy = () => {
    log.debug("destroy called")
    if (this.listening) {
      this.pause()
    }
  }

  setOptions = (options: Partial<FrameProcessorOptions>) => {
    this.frameProcessor.options = {
      ...this.frameProcessor.options,
      ...options,
    }
  }

  processFrame = async (frame: Float32Array) => {
    await this.frameProcessor.process(frame, this.handleFrameProcessorEvent)
  }

  handleFrameProcessorEvent = (ev: FrameProcessorEvent) => {
    switch (ev.msg) {
      case Message.FrameProcessed:
        this.options.onFrameProcessed(ev.probs, ev.frame as Float32Array)
        break

      case Message.SpeechStart:
        this.options.onSpeechStart()
        break

      case Message.SpeechRealStart:
        this.options.onSpeechRealStart()
        break

      case Message.VADMisfire:
        this.options.onVADMisfire()
        break

      case Message.SpeechEnd:
        this.options.onSpeechEnd(ev.audio as Float32Array)
        break
    }
  }
}
