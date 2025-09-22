import * as ortInstance from "onnxruntime-web"
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
  getStream: () => Promise<MediaStream>
  pauseStream: (stream: MediaStream) => Promise<void>
  resumeStream: (stream: MediaStream) => Promise<MediaStream>
  startOnLoad: boolean
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
    getStream: async () => {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })
    },
    pauseStream: async (_stream: MediaStream) => {
      _stream.getTracks().forEach((track) => {
        track.stop()
      })
    },
    resumeStream: async (_stream: MediaStream) => {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })
    },
    ortConfig: (ort) => {
      ort.env.logLevel = "error"
    },
    startOnLoad: true,
  }
}

export class MicVAD {
  public stream?: MediaStream
  private sourceNode?: MediaStreamAudioSourceNode
  private initialized = false

  static async new(options: Partial<RealTimeVADOptions> = {}) {
    const fullOptions: RealTimeVADOptions = {
      ...getDefaultRealTimeVADOptions(options.model ?? DEFAULT_MODEL),
      ...options,
    }
    validateOptions(fullOptions)

    const audioContext = new AudioContext()
    const audioNodeVAD = await AudioNodeVAD.new(audioContext, fullOptions)

    const micVad = new MicVAD(fullOptions, audioContext, audioNodeVAD)

    if (fullOptions.startOnLoad) {
      try {
        await micVad.start()
      } catch (e) {
        console.error("Error starting micVad", e)
      }
    }

    return micVad
  }

  private constructor(
    public options: RealTimeVADOptions,
    private audioContext: AudioContext,
    private audioNodeVAD: AudioNodeVAD,
    private listening = false
  ) {}

  pause = () => {
    if (this.stream) {
      this.options.pauseStream(this.stream)
    }
    this.audioNodeVAD.pause()
    this.listening = false
  }

  resume = async () => {
    if (!this.stream) {
      console.warn("Stream not initialized")
      return
    }
    this.stream = await this.options.resumeStream(this.stream)
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }
    this.sourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
      mediaStream: this.stream,
    })
    this.audioNodeVAD.receive(this.sourceNode)
  }

  start = async () => {
    if (!this.initialized) {
      this.initialized = true
      this.stream = await this.options.getStream()
      this.sourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
        mediaStream: this.stream,
      })
      this.audioNodeVAD.receive(this.sourceNode)
    }

    if (!this.stream?.active) {
      await this.resume()
      this.audioNodeVAD.start()
      this.listening = true
    } else {
      this.audioNodeVAD.start()
      this.listening = true
    }
  }

  destroy = () => {
    if (this.listening) {
      this.pause()
    }
    if (this.stream) {
      this.options.pauseStream(this.stream)
    } else {
      console.warn("Stream not initialized")
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    } else {
      console.warn("Source node not initialized")
    }
    this.audioNodeVAD.destroy()
    this.audioContext.close()
  }

  setOptions = (options: Partial<FrameProcessorOptions>) => {
    this.audioNodeVAD.setFrameProcessorOptions(options)
  }
}

export class AudioNodeVAD {
  private audioNode!: AudioWorkletNode | ScriptProcessorNode
  private frameProcessor: FrameProcessor
  private gainNode?: GainNode
  private resampler?: Resampler

  static async new(
    ctx: AudioContext,
    options: Partial<RealTimeVADOptions> = {}
  ) {
    const fullOptions: RealTimeVADOptions = {
      ...getDefaultRealTimeVADOptions(options.model ?? DEFAULT_MODEL),
      ...options,
    } as RealTimeVADOptions
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

    const audioNodeVAD = new AudioNodeVAD(
      ctx,
      fullOptions,
      frameProcessor,
      frameSamples,
      msPerFrame
    )
    await audioNodeVAD.setupAudioNode()
    return audioNodeVAD
  }

  constructor(
    public ctx: AudioContext,
    public options: RealTimeVADOptions,
    frameProcessor: FrameProcessor,
    public frameSamples: number,
    public msPerFrame: number
  ) {
    this.frameProcessor = frameProcessor
  }

  private async setupAudioNode() {
    const hasAudioWorklet =
      "audioWorklet" in this.ctx && typeof AudioWorkletNode === "function"
    if (hasAudioWorklet) {
      try {
        const workletURL = this.options.baseAssetPath + workletFile
        await this.ctx.audioWorklet.addModule(workletURL)

        const workletOptions = this.options.workletOptions ?? {}
        workletOptions.processorOptions = {
          ...(workletOptions.processorOptions ?? {}),
          frameSamples: this.frameSamples,
        }

        this.audioNode = new AudioWorkletNode(
          this.ctx,
          "vad-helper-worklet",
          workletOptions
        )
        ;(this.audioNode as AudioWorkletNode).port.onmessage = async (
          ev: MessageEvent
        ) => {
          switch (ev.data?.message) {
            case Message.AudioFrame:
              let buffer: ArrayBuffer = ev.data.data
              if (!(buffer instanceof ArrayBuffer)) {
                buffer = new ArrayBuffer(ev.data.data.byteLength)
                new Uint8Array(buffer).set(new Uint8Array(ev.data.data))
              }
              const frame = new Float32Array(buffer)
              await this.processFrame(frame)
              break
          }
        }

        return
      } catch (e) {
        console.log(
          "AudioWorklet setup failed, falling back to ScriptProcessor",
          e
        )
      }
    }

    // Initialize resampler for ScriptProcessor
    this.resampler = new Resampler({
      nativeSampleRate: this.ctx.sampleRate,
      targetSampleRate: 16000, // VAD models expect 16kHz
      targetFrameSize: this.frameSamples ?? 480,
    })

    // Fallback to ScriptProcessor
    const bufferSize = 4096 // Increased for more stable processing
    this.audioNode = this.ctx.createScriptProcessor(bufferSize, 1, 1)

    // Create a gain node with zero gain to handle the audio chain
    this.gainNode = this.ctx.createGain()
    this.gainNode.gain.value = 0

    let processingAudio = false

    ;(this.audioNode as ScriptProcessorNode).onaudioprocess = async (
      e: AudioProcessingEvent
    ) => {
      if (processingAudio) return
      processingAudio = true

      try {
        const input = e.inputBuffer.getChannelData(0)
        const output = e.outputBuffer.getChannelData(0)
        output.fill(0)

        // Process through resampler
        if (this.resampler) {
          const frames = this.resampler.process(input)
          for (const frame of frames) {
            await this.processFrame(frame)
          }
        }
      } catch (error) {
        console.error("Error processing audio:", error)
      } finally {
        processingAudio = false
      }
    }

    // Connect the audio chain
    this.audioNode.connect(this.gainNode)
    this.gainNode.connect(this.ctx.destination)
  }

  pause = () => {
    this.frameProcessor.pause(this.handleFrameProcessorEvent)
  }

  start = () => {
    this.frameProcessor.resume()
  }

  receive = (node: AudioNode) => {
    node.connect(this.audioNode)
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

  destroy = () => {
    if (this.audioNode instanceof AudioWorkletNode) {
      this.audioNode.port.postMessage({
        message: Message.SpeechStop,
      })
    }
    this.audioNode.disconnect()
    this.gainNode?.disconnect()
  }

  setFrameProcessorOptions = (options: Partial<FrameProcessorOptions>) => {
    this.frameProcessor.options = {
      ...this.frameProcessor.options,
      ...options,
    }
  }
}
