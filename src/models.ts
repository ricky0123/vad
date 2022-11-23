let ort
// @ts-ignore
if (IN_BROWSER) {
  ort = require("onnxruntime-web")
} else {
  ort = require("onnxruntime-node")
}

// @ts-ignore
import modelUrl from "../silero_vad.onnx"
import { log } from "./logging"

export interface SpeechProbabilities {
  notSpeech: number
  isSpeech: number
}

export interface Model {
  reset_state: () => void
  process: (arr: Float32Array) => Promise<SpeechProbabilities>
}

export class Silero {
  _session
  _h
  _c
  _sr

  static new = async () => {
    const model = new Silero()
    await model.init()
    return model
  }

  init = async () => {
    log.debug("initializing vad")
    const modelArrayBuffer = await fetch(modelUrl).then((r) => r.arrayBuffer())
    this._session = await ort.InferenceSession.create(modelArrayBuffer)
    this._sr = new ort.Tensor("int64", [16000n])
    this.reset_state()
    log.debug("vad is initialized")
  }

  reset_state = () => {
    const zeroes = Array(2 * 64).fill(0)
    this._h = new ort.Tensor("float32", zeroes, [2, 1, 64])
    this._c = new ort.Tensor("float32", zeroes, [2, 1, 64])
  }

  process = async (audioFrame: Float32Array): Promise<SpeechProbabilities> => {
    const t = new ort.Tensor("float32", audioFrame, [1, audioFrame.length])
    const inputs = {
      input: t,
      h: this._h,
      c: this._c,
      sr: this._sr,
    }
    const out = await this._session.run(inputs)
    this._h = out.hn
    this._c = out.cn
    const [isSpeech] = out.output.data as Float32Array
    const notSpeech = 1 - isSpeech
    return { notSpeech, isSpeech }
  }
}
