/*
Some of the code in this file was copied from https://github.com/linto-ai/WebVoiceSDK
Particularly: https://github.com/linto-ai/WebVoiceSDK/blob/master/src/webvoicesdk/workers/downsampler.blob.js
*/

interface ResamplerOptions {
  nativeSampleRate: number
  targetSampleRate: number
  targetFrameSize: number
}

export class Resampler {
  inputBuffer: Array<number>

  constructor(public options: ResamplerOptions) {
    this.inputBuffer = []
  }

  process = (audioFrame: Float32Array): Float32Array[] => {
    const outputFrames: Array<Float32Array> = []

    this.inputBuffer.push(...audioFrame)

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
          sum += this.inputBuffer[inputIndex]
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
