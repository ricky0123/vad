import { log } from "./logging"
import { Message } from "./messages"
import { Resampler } from "./resampler"

interface WorkletOptions {
  frameSamples: number
}

class Processor extends AudioWorkletProcessor {
  resampler: Resampler
  _stopProcessing = false
  options: WorkletOptions

  constructor(options: AudioWorkletNodeOptions) {
    super()
    this.options = options.processorOptions as WorkletOptions

    this.port.onmessage = (ev) => {
      if (ev.data === Message.SpeechStop) {
        log.debug("Worklet received speech stop message")
        this._stopProcessing = true
      }
    }

    this.resampler = new Resampler({
      nativeSampleRate: sampleRate,
      targetSampleRate: 16000,
      targetFrameSize: this.options.frameSamples,
    })
  }
  process(inputs: Float32Array[][]): boolean {
    if (this._stopProcessing) {
      // This will not stop process from running, just a prerequisite for the browser to garbage collect
      return false
    }

    const r = inputs[0]
    if (r === undefined) {
      return true
    }
    const arr = r[0]
    if (arr === undefined) {
      return true
    }

    const frames = this.resampler.process(arr)
    for (const frame of frames) {
      this.port.postMessage(
        { message: Message.AudioFrame, data: frame.buffer },
        [frame.buffer]
      )
    }

    return true
  }
}

registerProcessor("vad-helper-worklet", Processor)
