import * as ortInstance from "onnxruntime-web"
import { defaultModelFetcher } from "./default-model-fetcher"
import {
  FrameProcessor,
  FrameProcessorEvent,
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

interface RealTimeVADOptionsWithoutStream
  extends FrameProcessorOptions,
    RealTimeVADCallbacks,
    OrtOptions,
    AssetOptions,
    ModelOptions {
  additionalAudioConstraints?: MediaTrackConstraints
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
    onFrameProcessed: (probabilities, frame) => {},
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
    baseAssetPath:
      "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@latest/dist/",
    onnxWASMBasePath:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/",
    stream: undefined,
    ortConfig: undefined,
    model: model,
    workletOptions: {},
  }
}

export class MicVAD {
  static async new(options: Partial<RealTimeVADOptions> = {}) {
    const fullOptions: RealTimeVADOptions = {
      ...getDefaultRealTimeVADOptions(options.model ?? DEFAULT_MODEL),
      ...options,
    }
    validateOptions(fullOptions)

    let stream: MediaStream
    if (fullOptions.stream === undefined)
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          ...fullOptions.additionalAudioConstraints,
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
    this.stream.getTracks().forEach((track) => {
      track.stop()
    })
    this.audioNodeVAD.pause()
    this.listening = false
  }

  resume = async () => {
    const additionalAudioConstraints =
      "additionalAudioConstraints" in this.options
        ? this.options.additionalAudioConstraints
        : {}
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
        ...additionalAudioConstraints,
      },
    })
    this.sourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
      mediaStream: this.stream,
    })
    this.audioNodeVAD.receive(this.sourceNode)
  }

  start = () => {
    if (!this.stream.active) {
      this.resume().then(() => {
        this.audioNodeVAD.start()
        this.listening = true
      })
    } else {
      this.audioNodeVAD.start()
      this.listening = true
    }
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

  setOptions = (options) => {
    this.audioNodeVAD.setFrameProcessorOptions(options)
  }
}

export class AudioNodeVAD {
  private audioNode!: AudioWorkletNode | ScriptProcessorNode
  private buffer?: Float32Array
  private bufferIndex: number = 0
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

    const audioNodeVAD = new AudioNodeVAD(ctx, fullOptions, frameProcessor)
    await audioNodeVAD.setupAudioNode()
    return audioNodeVAD
  }

  constructor(
    public ctx: AudioContext,
    public options: RealTimeVADOptions,
    frameProcessor: FrameProcessor
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
          frameSamples: this.options.frameSamples,
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
      targetFrameSize: this.options.frameSamples ?? 480,
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

  setFrameProcessorOptions = (options) => {
    this.frameProcessor.options = {
      ...this.frameProcessor.options,
      ...options,
    }
  }
}
