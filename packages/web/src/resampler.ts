import { log } from "./logging"

interface ResamplerOptions {
  nativeSampleRate: number
  targetSampleRate: number
  targetFrameSize: number
}

export class Resampler {
  inputBuffer: Array<number>
  private lastFilteredValue: number = 0
  private readonly FILTER_COEFFICIENT = 0.2 // Hardcoded for 8kHz to 16kHz case

  constructor(public options: ResamplerOptions) {
    if (options.nativeSampleRate < 16000) {
      log.debug(
        "nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate, will be upsampled"
      )
    }
    this.inputBuffer = []
  }

  process = (audioFrame: Float32Array): Float32Array[] => {
    const outputFrames: Array<Float32Array> = []

    for (const sample of audioFrame) {
      this.inputBuffer.push(sample)

      while (this.hasEnoughDataForFrame()) {
        const outputFrame = this.generateOutputFrame()
        outputFrames.push(outputFrame)
      }
    }

    return outputFrames
  }

  async *stream(audioInput: Float32Array) {
    for (const sample of audioInput) {
      this.inputBuffer.push(sample)

      while (this.hasEnoughDataForFrame()) {
        const outputFrame = this.generateOutputFrame()
        yield outputFrame
      }
    }
  }

  private hasEnoughDataForFrame(): boolean {
    return (
      (this.inputBuffer.length * this.options.targetSampleRate) /
        this.options.nativeSampleRate >=
      this.options.targetFrameSize
    )
  }

  private lowPassFilter(sample: number): number {
    this.lastFilteredValue =
      this.lastFilteredValue +
      this.FILTER_COEFFICIENT * (sample - this.lastFilteredValue)
    return this.lastFilteredValue
  }

  private generateOutputFrame(): Float32Array {
    const outputFrame = new Float32Array(this.options.targetFrameSize)
    const ratio = this.options.nativeSampleRate / this.options.targetSampleRate

    if (ratio < 1) {
      // Upsampling case
      const inputToOutputRatio =
        this.options.targetSampleRate / this.options.nativeSampleRate

      for (
        let outputIndex = 0;
        outputIndex < this.options.targetFrameSize;
        outputIndex++
      ) {
        const inputPosition = outputIndex / inputToOutputRatio
        const inputIndex = Math.floor(inputPosition)
        const fraction = inputPosition - inputIndex

        if (inputIndex + 1 < this.inputBuffer.length) {
          const sample1 = this.lowPassFilter(this.inputBuffer[inputIndex] || 0)
          const sample2 = this.lowPassFilter(
            this.inputBuffer[inputIndex + 1] || 0
          )
          outputFrame[outputIndex] = sample1 + fraction * (sample2 - sample1)
        } else {
          outputFrame[outputIndex] = this.lowPassFilter(
            this.inputBuffer[inputIndex] || 0
          )
        }
      }

      const samplesUsed = Math.ceil(
        this.options.targetFrameSize / inputToOutputRatio
      )
      this.inputBuffer = this.inputBuffer.slice(samplesUsed)
    } else {
      // If ratio >= 1, we're downsampling
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
    }

    return outputFrame
  }
}
