import { AudioSegment } from "./audio-segment"
import { log } from "./logging"
import type { SileroV5 } from "./models"
import type { MicVAD } from "./real-time-vad"

export class FrameProcessor {
  speaking: boolean = false
  audioBuffer: { frame: Float32Array; isSpeech: boolean }[]
  redemptionCounter = 0
  redemptionFrames: number
  preSpeechPadFrames: number
  minSpeechFrames: number

  constructor(
    public vad: MicVAD,
    public model: SileroV5,
    public positiveSpeechThreshold: number,
    public negativeSpeechThreshold: number,
    public redemptionMilliseconds: number,
    public frameSamples: number,
    public sampleRate: number,
    public preSpeechPadMilliseconds: number,
    public minSpeechMilliseconds: number
  ) {
    this.redemptionFrames = Math.round(
      (redemptionMilliseconds * sampleRate) / frameSamples / 1000
    )
    this.preSpeechPadFrames = Math.round(
      (preSpeechPadMilliseconds * sampleRate) / frameSamples / 1000
    )
    this.minSpeechFrames = Math.round(
      (minSpeechMilliseconds * sampleRate) / frameSamples / 1000
    )

    const actualRedemptionMilliseconds =
      ((this.redemptionFrames * frameSamples) / sampleRate) * 1000
    const actualPreSpeechPadMilliseconds =
      ((this.preSpeechPadFrames * frameSamples) / sampleRate) * 1000
    const actualMinSpeechMilliseconds =
      ((this.minSpeechFrames * frameSamples) / sampleRate) * 1000

    log.debug(`Actual redemption milliseconds: ${actualRedemptionMilliseconds}
Actual pre-speech pad milliseconds: ${actualPreSpeechPadMilliseconds}
Actual min speech milliseconds: ${actualMinSpeechMilliseconds}`)

    this.audioBuffer = []
    this.reset()
  }

  reset = () => {
    this.speaking = false
    this.audioBuffer = []
    this.model.reset_state()
    this.redemptionCounter = 0
  }

  endSegment = () => {
    const audioBuffer = this.audioBuffer
    const speaking = this.speaking
    this.reset()

    const speechFrameCount = audioBuffer.reduce((acc, item) => {
      return acc + +item.isSpeech
    }, 0)

    if (speaking) {
      if (speechFrameCount >= this.minSpeechFrames) {
        const audio = concatArrays(audioBuffer.map((item) => item.frame))
        this.vad.dispatchEvent({
          type: "speechend",
          target: this.vad,
          audio: new AudioSegment(audio)
        })
      } else {
        this.vad.dispatchEvent({
          type: "misfire",
          target: this.vad
        })
      }
    }
    return {}
  }

  process = async (frame: Float32Array) => {
    const probs = await this.model.process(frame)
    this.vad.dispatchEvent({
      type: "frameprocessed",
      target: this.vad,
      frame: frame,
      isSpeechProbability: probs.isSpeech
    })

    this.audioBuffer.push({
      frame,
      isSpeech: probs.isSpeech >= this.positiveSpeechThreshold,
    })

    if (
      probs.isSpeech >= this.positiveSpeechThreshold &&
      this.redemptionCounter
    ) {
      this.redemptionCounter = 0
    }

    if (
      probs.isSpeech >= this.positiveSpeechThreshold &&
      !this.speaking
    ) {
      this.speaking = true
      this.vad.dispatchEvent({
        type: "speechstart",
        target: this.vad,
      })
    }

    if (
      probs.isSpeech < this.negativeSpeechThreshold &&
      this.speaking &&
      ++this.redemptionCounter >= this.redemptionFrames
    ) {
      this.redemptionCounter = 0
      this.speaking = false

      const audioBuffer = this.audioBuffer
      this.audioBuffer = []

      const speechFrameCount = audioBuffer.reduce((acc, item) => {
        return acc + +item.isSpeech
      }, 0)

      if (speechFrameCount >= this.minSpeechFrames) {
        const audio = concatArrays(audioBuffer.map((item) => item.frame))
        this.vad.dispatchEvent({
          type: "speechend",
          target: this.vad,
          audio: new AudioSegment(audio)
        })
      } else {
        this.vad.dispatchEvent({
          type: "misfire",
          target: this.vad
        })
      }
    }

    if (!this.speaking) {
      while (this.audioBuffer.length > this.preSpeechPadFrames) {
        this.audioBuffer.shift()
      }
    }
  }
}
const concatArrays = (arrays: Float32Array[]): Float32Array => {
  const sizes = arrays.reduce(
    (out, next) => {
      out.push((out.at(-1) as number) + next.length)
      return out
    },
    [0]
  )
  const outArray = new Float32Array(sizes.at(-1) as number)
  arrays.forEach((arr, index) => {
    const place = sizes[index]
    outArray.set(arr, place)
  })
  return outArray
}
