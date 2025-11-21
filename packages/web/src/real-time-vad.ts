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
  ) => Promise<void> | void

  /** Callback to run if speech start was detected but `onSpeechEnd` will not be run because the
   * audio segment is smaller than `minSpeechFrames`.
   */
  onVADMisfire: () => Promise<void> | void

  /** Callback to run when speech start is detected */
  onSpeechStart: () => Promise<void> | void

  /**
   * Callback to run when speech end is detected.
   * Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000.
   * This will not run if the audio segment is smaller than `minSpeechFrames`.
   */
  onSpeechEnd: (audio: Float32Array) => Promise<void> | void

  /** Callback to run when speech is detected as valid. (i.e. not a misfire) */
  onSpeechRealStart: () => Promise<void> | void
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
  audioContext?: AudioContext
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
    onFrameProcessed: () => {},
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
    resumeStream: async () => {
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
): Promise<AudioWorkletNode> {
  await audioContext.audioWorklet.addModule(workletURL)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    const data: unknown = ev.data

    if (!(typeof data === "object" && data && "message" in data)) {
      console.error("Invalid message event", data)
      return
    }

    switch (data.message) {
      case Message.AudioFrame: {
        if (!("data" in data && data.data instanceof ArrayBuffer)) {
          console.log("Audio frame message has no data")
          return
        }
        const frame = new Float32Array(data.data)
        await processFrame(frame)
        break
      }
    }
  }

  return audioNode
}

async function getVADNodeAsScriptProcessor(
  audioContext: AudioContext,
  frameSamples: number,
  processFrame: ProcessFrameFunc
): Promise<ScriptProcessorNode> {
  const resampler = new Resampler({
    nativeSampleRate: audioContext.sampleRate,
    targetSampleRate: 16000, // VAD models expect 16kHz
    targetFrameSize: frameSamples,
  })
  log.debug("using script processor")

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
      const frames = resampler.process(input)
      for (const frame of frames) {
        await processFrame(frame)
      }
    } catch (error) {
      console.error("Error processing audio:", error)
    } finally {
      processingAudio = false
    }
  }

  // https://github.com/WebAudio/web-audio-api/issues/345
  // -> we need to connect an output or will not work due to chrome bug
  audioNode.connect(audioContext.destination)

  return audioNode
}

type ProcessFrameFunc = (frame: Float32Array) => Promise<void>

export class MicVAD {
  private constructor(
    public options: RealTimeVADOptions,
    private readonly frameProcessor: FrameProcessor,
    private readonly model: Model,
    private readonly frameSamples: 512 | 1536,
    public listening = false,
    public errored: string | null = null,
    private _stream: MediaStream | null = null,
    private _audioContext: AudioContext | null = null,
    private _vadNode: AudioWorkletNode | ScriptProcessorNode | null = null,
    private _mediaStreamAudioSourceNode: MediaStreamAudioSourceNode | null = null,
    private _audioProcessorAdapterType:
      | "AudioWorklet"
      | "ScriptProcessor"
      | null = null,
    private initializationState:
      | "uninitialized"
      | "initializing"
      | "initialized"
      | "destroyed"
      | "errored" = "uninitialized",
    private ownsAudioContext = false
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

    const micVad = new MicVAD(fullOptions, frameProcessor, model, frameSamples)

    // things would be simpler if we didn't have to startOnLoad by default, but we are locked in
    if (fullOptions.startOnLoad) {
      try {
        await micVad.start()
      } catch (e) {
        console.error("Error starting micVad", e)
        throw e
      }
    }
    return micVad
  }

  private getAudioInstances = (): {
    stream: MediaStream
    audioContext: AudioContext
    vadNode: AudioWorkletNode | ScriptProcessorNode
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

  setErrored = (error: string) => {
    this.initializationState = "errored"
    this.errored = error
  }

  start = async () => {
    switch (this.initializationState) {
      case "uninitialized": {
        log.debug("initializing micVAD")
        this.initializationState = "initializing"
        this.frameProcessor.resume()

        try {
          this._stream = await this.options.getStream()
        } catch (error) {
          if (error instanceof Error) {
            this.setErrored(error.message)
          } else {
            this.setErrored(String(error))
          }
          throw error
        }
        if (this.options.audioContext) {
          console.log("using custom audio context")
          this._audioContext = this.options.audioContext
        } else {
          console.log("using default audio context")
          this._audioContext = new AudioContext()
          this.ownsAudioContext = true
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!this._audioContext) {
          this.setErrored("Audio context is null")
          throw Error("Audio context is null")
        }

        this._audioProcessorAdapterType =
          this.options.processorType == "auto"
            ? detectProcessorType(this._audioContext)
            : this.options.processorType

        switch (this._audioProcessorAdapterType) {
          case "AudioWorklet":
            {
              this._vadNode = await getVADNodeAsWorklet(
                this.options.baseAssetPath + workletFile,
                this.options.workletOptions,
                this._audioContext,
                this.frameSamples,
                this.processFrame
              )
            }
            break

          case "ScriptProcessor":
            {
              this._vadNode = await getVADNodeAsScriptProcessor(
                this._audioContext,
                this.frameSamples,
                this.processFrame
              )
            }
            break

          default: {
            throw new Error(
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              `Unsupported audio processor adapter type: ${this._audioProcessorAdapterType}`
            )
          }
        }

        this._mediaStreamAudioSourceNode = new MediaStreamAudioSourceNode(
          this._audioContext,
          {
            mediaStream: this._stream,
          }
        )
        this._mediaStreamAudioSourceNode.connect(this._vadNode)
        log.debug("started micVAD")

        this.listening = true
        this.initializationState = "initialized"
        break
      }

      case "initializing": {
        log.warn("start called while initializing")
        break
      }

      case "initialized": {
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
      }

      case "destroyed": {
        log.warn("start called after destroyed")
        break
      }

      case "errored": {
        log.error("start called after errored")
        break
      }

      default: {
        log.warn("weird initialization state")
        break
      }
    }
  }

  pause = async () => {
    if (!this.listening) {
      return
    }
    this.listening = false

    const { stream, mediaStreamAudioSourceNode } = this.getAudioInstances()
    await this.options.pauseStream(stream)

    mediaStreamAudioSourceNode.disconnect()
    this.frameProcessor.pause(this.handleFrameProcessorEvent)
  }

  destroy = async () => {
    log.debug("destroy called")
    this.initializationState = "destroyed"

    const { vadNode } = this.getAudioInstances()
    if (vadNode instanceof AudioWorkletNode) {
      vadNode.port.postMessage(Message.SpeechStop)
    }

    if (this.listening) {
      await this.pause()
    }
    await this.model.release()
    if (this.ownsAudioContext) {
      await this._audioContext?.close()
    }
  }

  setOptions = (update: Partial<FrameProcessorOptions>) => {
    this.frameProcessor.setOptions(update)
  }

  processFrame = async (frame: Float32Array) => {
    await this.frameProcessor.process(frame, this.handleFrameProcessorEvent)
  }

  handleFrameProcessorEvent = (ev: FrameProcessorEvent) => {
    switch (ev.msg) {
      case Message.FrameProcessed:
        void this.options.onFrameProcessed(ev.probs, ev.frame)
        break

      case Message.SpeechStart:
        void this.options.onSpeechStart()
        break

      case Message.SpeechRealStart:
        void this.options.onSpeechRealStart()
        break

      case Message.VADMisfire:
        void this.options.onVADMisfire()
        break

      case Message.SpeechEnd:
        void this.options.onSpeechEnd(ev.audio)
        break
    }
  }
}
