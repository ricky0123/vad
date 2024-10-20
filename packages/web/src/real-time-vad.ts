import { AudioSegment } from "./audio-segment"
import { FrameProcessor } from "./frame-processor"
import { Message } from "./messages"
import { SileroV5, SpeechProbabilities, configureOrt } from "./models"

const createHTTPModelFetcher = (path: string) => {
  return () => fetch(path).then((model) => model.arrayBuffer())
}

const getStream = async (constraints: Partial<MediaStreamConstraints>) => {
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: true,
      ...constraints,
    },
  })
}

type MicVADEvent =
  | {
      target: MicVAD
      type: "speechstart"
    }
  | {
      target: MicVAD
      type: "speechend"
      audio: AudioSegment
    }
  | {
      target: MicVAD
      type: "misfire"
    }
  | {
      target: MicVAD
      type: "frameprocessed"
      frame: Float32Array
      isSpeechProbability: number
    }
  | {
      target: MicVAD
      type: "initialized"
    }
  | {
      target: MicVAD
      type: "terminated"
    }
  | {
      target: MicVAD
      type: "onpause"
    }
  | {
      target: MicVAD
      type: "onstart"
    }

export type MicVADOptions = Partial<{
  vadAssetsPath: string
  modelFetcher: () => Promise<ArrayBuffer>
  submitUserSpeechOnPause: boolean
}>

export class MicVAD {
  private eventListeners: { [k in MicVADEvent["type"]]: any[] }
  // @ts-ignore
  frameProcessor: FrameProcessor
  // @ts-ignore
  frameProducerNode: AudioWorkletNode
  // @ts-ignore
  sourceNode: MediaStreamAudioSourceNode

  private constructor(
    public options: MicVADOptions,
    public audioContext: AudioContext,
    public stream: MediaStream,
    public paused = true,
    public userSpeaking = false,
  ) {
    this.eventListeners = {
      speechstart: [],
      speechend: [],
      misfire: [],
      frameprocessed: [],
      initialized: [],
      terminated: [],
      onpause: [],
      onstart: [],
    }
  }

  static async new(
    options: MicVADOptions,
    constraints?: Partial<MediaStreamConstraints>,
  ) {
    const stream = await getStream(constraints || {})
    const audioContext = new AudioContext()
    const vad = new MicVAD(options, audioContext, stream)
    return vad
  }

  addEventListener = (type: MicVADEvent["type"], listener) => {
    this.eventListeners[type].push(listener)
  }

  removeEventListener = (type: MicVADEvent["type"], listener) => {
    const index = this.eventListeners[type].indexOf(listener)
    if (index > -1) {
      this.eventListeners[type].splice(index, 1)
    }
  }

  dispatchEvent = (event: MicVADEvent) => {
    this.eventListeners[event.type].forEach((listener) => {
      listener(event)
    })
  }

  init = async () => {
    const vadAssetsPath = (this.options.vadAssetsPath || "").replace(/\/$/, "")
    configureOrt(ortInstance => {
      ortInstance.env.wasm.wasmPaths = vadAssetsPath
    })

    const defaultModelPath = `${vadAssetsPath}/silero_vad.onnx`
    const modelFetcher = this.options.modelFetcher || createHTTPModelFetcher(defaultModelPath)

    let model: SileroV5
    try {
      model = await SileroV5.new(modelFetcher)
    } catch (e) {
      console.error(
        `Encountered error while loading model: ${e}`
      )
      throw e
    }

    const workletURL = `${vadAssetsPath}/vad.worklet.bundle.min.js`
    try {
      await this.audioContext.audioWorklet.addModule(workletURL)
    } catch (e) {
      console.error(
        `Encountered error while loading worklet: ${e}`
      )
      throw e
    }

    this.sourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
      mediaStream: this.stream,
    })

    if (this.audioContext.sampleRate != 16000) {
      throw new Error(`Audio context must have sample rate 16000. Detected ${this.audioContext.sampleRate}`);
    }

    this.frameProducerNode = new AudioWorkletNode(this.audioContext, "vad-helper-worklet", {
      processorOptions: {
        frameSamples: 512, // (Supported values: 256 for 8000 sample rate, 512 for 16000)
      },
    })

    this.frameProcessor = new FrameProcessor(
      this,
      model,
      .4,
      .3,
      700,
      512,
      16000,
      500,
      360
    )

    this.frameProducerNode.port.onmessage = async (ev: MessageEvent) => {
      switch (ev.data?.message) {
        case Message.AudioFrame:
          if (!this.paused) {
            const buffer: ArrayBuffer = ev.data.data
            const frame = new Float32Array(buffer)
            await this.frameProcessor.process(frame)
          }
          break

        default:
          break
      }
    }

    this.sourceNode.connect(this.frameProducerNode)
    this.dispatchEvent({ type: "initialized", target: this })
  }

  pause = () => {
    this.paused = true
    if (this.options.submitUserSpeechOnPause) {
      this.frameProcessor.endSegment()
    } else {
      this.frameProcessor.reset()
    }
    this.dispatchEvent({
      target: this,
      type: "onpause"
    })
  }

  start = () => {
    this.paused = false
    this.dispatchEvent({
      target: this,
      type: "onstart"
    })
  }

  destroy = () => {
    if (!this.paused) {
      this.pause()
    }
    this.stream.getTracks().forEach((track) => track.stop())
    this.audioContext.close()
    this.sourceNode.disconnect()
  }
}
/* 
export class AudioNodeVAD {
  static async new(
    ctx: AudioContext,
    options: Partial<RealTimeVADOptions> = {}
  ) {
    const fullOptions: RealTimeVADOptions = {
      ...defaultRealTimeVADOptions,
      ...options,
    }
    validateOptions(fullOptions)

    if (fullOptions.ortConfig !== undefined) {
      fullOptions.ortConfig(ort)
    }

    try {
      await ctx.audioWorklet.addModule(fullOptions.workletURL)
    } catch (e) {
      console.error(
        `Encountered an error while loading worklet. Please make sure the worklet vad.bundle.min.js included with @ricky0123/vad-web is available at the specified path:
        ${fullOptions.workletURL}
        If need be, you can customize the worklet file location using the \`workletURL\` option.`
      )
      throw e
    }
    const vadNode = new AudioWorkletNode(ctx, "vad-helper-worklet", {
      processorOptions: {
        frameSamples: fullOptions.frameSamples,
      },
    })

    let model: Silero
    try {
      model = await Silero.new(ort, () =>
        fullOptions.modelFetcher(fullOptions.modelURL)
      )
    } catch (e) {
      console.error(
        `Encountered an error while loading model file. Please make sure silero_vad.onnx, included with @ricky0123/vad-web, is available at the specified path:
      ${fullOptions.modelURL}
      If need be, you can customize the model file location using the \`modelsURL\` option.`
      )
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
      message: Message.SpeechStop,
    })
    this.entryNode.disconnect()
  }
}
 */
