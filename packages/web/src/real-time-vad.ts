import * as ort from "onnxruntime-web"
import {
  log,
  Message,
  Silero,
  SpeechProbabilities,
  defaultFrameProcessorOptions,
  FrameProcessor,
  FrameProcessorOptions,
  validateOptions
} from "./_common"
import { assetPath } from "./asset-path"
import { defaultModelFetcher } from "./default-model-fetcher"

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
type AudioConstraints = Omit<MediaTrackConstraints,
  "channelCount" | "echoCancellation" | "autoGainControl" | "noiseSuppression">

type AssetOptions = {
  workletURL: string
  modelURL: string
  modelFetcher: (path: string) => Promise<ArrayBuffer>
}

interface RealTimeVADOptionsWithoutStream
  extends FrameProcessorOptions,
    RealTimeVADCallbacks,
    AssetOptions {
  additionalAudioConstraints?: AudioConstraints
  stream: undefined
}

interface RealTimeVADOptionsWithStream
  extends FrameProcessorOptions,
    RealTimeVADCallbacks,
    AssetOptions {
  stream: MediaStream
}

export type RealTimeVADOptions =
  | RealTimeVADOptionsWithStream
  | RealTimeVADOptionsWithoutStream

export const defaultRealTimeVADOptions: RealTimeVADOptions = {
  ...defaultFrameProcessorOptions,
  onFrameProcessed: (probabilities) => {
  },
  onVADMisfire: () => {
    log.debug("VAD misfire")
  },
  onSpeechStart: () => {
    log.debug("Detected speech start")
  },
  onSpeechEnd: () => {
    log.debug("Detected speech end")
  },
  workletURL: assetPath("vad.worklet.bundle.min.js"),
  modelURL: assetPath("silero_vad.onnx"),
  modelFetcher: defaultModelFetcher,
  stream: undefined
}

export class MicVAD {
  static async new(options: Partial<RealTimeVADOptions> = {}) {
    const fullOptions: RealTimeVADOptions = {
      ...defaultRealTimeVADOptions,
      ...options
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
          noiseSuppression: true
        }
      })
    else stream = fullOptions.stream

    const audioContext = new AudioContext()
    const sourceNode = new MediaStreamAudioSourceNode(audioContext, {
      mediaStream: stream
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
  ) {
  }

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
      ...defaultRealTimeVADOptions,
      ...options
    }
    validateOptions(fullOptions)
    try {
      await ctx.audioWorklet.addModule(fullOptions.workletURL)
    } catch (e) {
      const currentPath = window.location.pathname;
      const trimmedPath = currentPath.replace(/\/[^/]+$/, '');
      console.error(
        `Cannot find files in this path ${trimmedPath}. 
      You can add your model related files 
      (ort-wasm.wasm, ort-wasm-simd.wasm, ort-wasm-threaded.wasm, silero vad.onnx, vad.worklet.bundle.min.js) 
      to this path.`
      );
    }


    const vadNode = new AudioWorkletNode(ctx, "vad-helper-worklet", {
      processorOptions: {
        frameSamples: fullOptions.frameSamples
      }
    })

    const model = await Silero.new(ort, () =>
      fullOptions.modelFetcher(fullOptions.modelURL)
    )

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
        submitUserSpeechOnPause: fullOptions.submitUserSpeechOnPause
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
          const buffer: ArrayBuffer = ev.data.data
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
  ) {
  }

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
    }>
  ) => {
    if (ev.probs !== undefined) {
      this.options.onFrameProcessed(ev.probs)
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
      message: Message.SpeechStop
    })
    this.entryNode.disconnect()
  }
}
