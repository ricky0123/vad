import { FrameProcessor } from "./frame-processor"
import { log } from "./logging"
import { Message } from "./messages"
import { Silero, SpeechProbabilities } from "./models"
import { Resampler } from "./resampler"

export { encodeWAV } from "./audio"
export { FrameProcessor } from "./frame-processor"
export { arrayBufferToBase64, audioFileToArray } from "./utils"

const RECOMMENDED_FRAME_SAMPLES = [512, 1024, 1536]

/**
 * Options to customize the behavior of the VAD.
 */
export interface VadOptions {
  /** Callback to run when speech start is detected */
  onSpeechStart: () => any

  /**
   * Callback to run when speech end is detected.
   * Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000.
   * This will not run if the audio segment is smaller than `minSpeechFrames`.
   */
  onSpeechEnd: (audio: Float32Array) => any

  /** Callback to run after each frame. The size (number of samples) of a frame is given by `frameSamples`. */
  onFrameProcessed: (probabilities: SpeechProbabilities) => any

  /** Callback to run if speech start was detected but `onSpeechEnd` will not be run because the
   * audio segment is smaller than `minSpeechFrames`.
   */
  signalMisfire: () => any

  /** Threshold over which values returned by the Silero VAD model will be considered as positively indicating speech.
   * The Silero VAD model is run on each frame. This number should be between 0 and 1.
   */
  positiveSpeechThreshold: number

  /** Threshold under which values returned by the Silero VAD model will be considered as indicating an absence of speech.
   * Note that the creators of the Silero VAD have historically set this number at 0.15 less than `positiveSpeechThreshold`.
   */
  negativeSpeechThreshold: number

  /** After a VAD value under the `negativeSpeechThreshold` is observed, the algorithm will wait `redemptionFrames` frames
   * before running `onSpeechEnd`. If the model returns a value over `positiveSpeechThreshold` during this grace period, then
   * the algorithm will consider the previously-detected "speech end" as having been a false negative.
   */
  redemptionFrames: number

  /** Number of audio samples (under a sample rate of 16000) to comprise one "frame" to feed to the Silero VAD model.
   * The `frame` serves as a unit of measurement of lengths of audio segments and many other parameters are defined in terms of
   * frames. The authors of the Silero VAD model offer the following warning:
   * > WARNING! Silero VAD models were trained using 512, 1024, 1536 samples for 16000 sample rate and 256, 512, 768 samples for 8000 sample rate.
   * > Values other than these may affect model perfomance!!
   * In this context, audio fed to the VAD model always has sample rate 16000. It is probably a good idea to leave this at 1536.
   */
  frameSamples: number

  /** Number of frames to prepend to the audio segment that will be passed to `onSpeechEnd`. */
  preSpeechPadFrames: number

  /** If an audio segment is detected as a speech segment according to initial algorithm but it has fewer than `minSpeechFrames`,
   * it will be discarded and `signalMisfire` will be run instead of `onSpeechEnd`.
   */
  minSpeechFrames: number
}

export function minFramesForTargetMS(
  targetDuration: number,
  frameSamples: number,
  sr = 16000
): number {
  return Math.ceil((targetDuration * sr) / 1000 / frameSamples)
}

export const defaultVadOptions: VadOptions = {
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

export function validateOptions(options: VadOptions) {
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
    this.frameProcessor.endSegment()
  }
}
