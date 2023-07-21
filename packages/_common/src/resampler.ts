import { log } from "./logging"

interface ResamplerOptions {
  nativeSampleRate: number
  targetSampleRate: number
  targetFrameSize: number
}

export class Resampler {
  inputBuffer: Array<number>

  constructor(public options: ResamplerOptions) {
    if (options.nativeSampleRate < 8000) {
      log.error(
        "nativeSampleRate is too low. Should have 8000 = targetSampleRate <= nativeSampleRate"
      )
    }
    this.inputBuffer = []
  }

  process = (audioFrame: Float32Array): Float32Array[] => {
    const outputFrames: Array<Float32Array> = []

    for (const sample of audioFrame) {
      this.inputBuffer.push(sample)
    }

    while (
      (this.inputBuffer.length * this.options.targetSampleRate) /
        this.options.nativeSampleRate >
      this.options.targetFrameSize
    ) {
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
          sum += this.inputBuffer[inputIndex] as number
          num++
          inputIndex++
        }
        outputFrame[outputIndex] = sum / num
        outputIndex++
      }
      this.inputBuffer = this.inputBuffer.slice(inputIndex)
      outputFrames.push(outputFrame)
    }
    return outputFrames
  }
}
