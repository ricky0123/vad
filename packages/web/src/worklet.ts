import { Message } from "./messages"

interface WorkletOptions {
  frameSamples: number
}

class Processor extends AudioWorkletProcessor {
  // @ts-ignore
  options: WorkletOptions

  _inputBuffer: Array<number>
  _initialized = false
  _stopProcessing = false

  constructor(options) {
    super()
    this.options = options.processorOptions as WorkletOptions

    this.port.onmessage = (ev) => {
      if (ev.data.message === Message.SpeechStop) {
        this._stopProcessing = true
      }
    }
    this._inputBuffer = []
    this._initialized = true
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    // @ts-ignore
    const inData = inputs[0][0]

    if (this._stopProcessing) {
      return false
    }

    if (!inData || !this._initialized || !(inData instanceof Float32Array)) {
      return true
    }

    for (const sample of inData) {
      this._inputBuffer.push(sample)
    }

    while (this._inputBuffer.length >= this.options.frameSamples) {
      const outputFrameValues = this._inputBuffer.slice(0, this.options.frameSamples)
      const outputFrame = new Float32Array(outputFrameValues)
      this._inputBuffer = this._inputBuffer.slice(this.options.frameSamples);
      this.port.postMessage(
        { message: Message.AudioFrame, data: outputFrame.buffer },
        [outputFrame.buffer]
      )
    }

    return true
  }
}

registerProcessor("vad-helper-worklet", Processor)
