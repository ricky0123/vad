import { Message } from "./messages"
import { log } from "./logging"
import { Resampler } from "./resampler"

interface WorkletOptions {
  frameSamples: number
}

class Processor extends AudioWorkletProcessor {
  resampler: Resampler
  _initialized = false
  options: WorkletOptions

  constructor(options) {
    super()
    this.options = options.processorOptions as WorkletOptions
    this.init()
  }
  init = async () => {
    log.debug("initializing worklet")
    this.resampler = new Resampler({
      nativeSampleRate: sampleRate,
      targetSampleRate: 16000,
      targetFrameSize: this.options.frameSamples,
    })
    this._initialized = true
    log.debug("initialized worklet")
  }
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const arr = inputs[0][0]

    if (this._initialized && arr instanceof Float32Array) {
      const frames = this.resampler.process(arr)
      for (const frame of frames) {
        this.port.postMessage(
          { message: Message.AudioFrame, data: frame.buffer },
          [frame.buffer]
        )
      }
    }
    return true
  }
}

registerProcessor("vad-helper-worklet", Processor)
