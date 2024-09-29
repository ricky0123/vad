import { log } from "./logging"

interface ResamplerOptions {
  nativeSampleRate: number
  targetSampleRate: number
  targetFrameSize: number
}

export class Resampler {
  inputBuffer: Array<number>

  constructor(public options: ResamplerOptions) {
    if (options.nativeSampleRate < 16000) {
      log.error(
        "nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate"
      )
    }
    this.inputBuffer = []
  }

  process = (audioFrame: Float32Array): Float32Array[] => {
    const outputFrames: Array<Float32Array> = []
    this.fillInputBuffer(audioFrame)

    while (this.hasEnoughDataForFrame()) {
      const outputFrame = this.generateOutputFrame()
      outputFrames.push(outputFrame)
    }

    return outputFrames
  }

  stream = async function* (audioFrame: Float32Array) {
    this.fillInputBuffer(audioFrame)

    while (this.hasEnoughDataForFrame()) {
      const outputFrame = this.generateOutputFrame()
      yield outputFrame
    }
  }

  private fillInputBuffer(audioFrame: Float32Array) {
    for (const sample of audioFrame) {
      this.inputBuffer.push(sample)
    }
  }

  private hasEnoughDataForFrame(): boolean {
    return (
      (this.inputBuffer.length * this.options.targetSampleRate) /
        this.options.nativeSampleRate >=
      this.options.targetFrameSize
    )
  }

  private generateOutputFrame(): Float32Array {
    const outputFrame = new Float32Array(this.options.targetFrameSize)
    let outputIndex = 0
    let inputIndex = 0

    while (outputIndex < this.options.targetFrameSize) {
      let sum = 0
      let num = 0
      while (
        inputIndex <
        Math.min(
          this.inputBuffer.length,
          ((outputIndex + 1) * this.options.nativeSampleRate) /
            this.options.targetSampleRate
        )
      ) {
        const value = this.inputBuffer[inputIndex]
        if (value !== undefined) {
          sum += value
          num++
        }
        inputIndex++
      }
      outputFrame[outputIndex] = sum / num
      outputIndex++
    }

    this.inputBuffer = this.inputBuffer.slice(inputIndex)
    return outputFrame
  }
}
