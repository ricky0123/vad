import { InferenceSession, Tensor } from "onnxruntime-web"

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
  _session: InferenceSession
  _h: Tensor
  _c: Tensor

  static new = async () => {
    const model = new Silero()
    await model.init()
    return model
  }

  init = async () => {
    log.debug("initializing vad")
    const modelArrayBuffer = await fetch(modelUrl).then((r) => r.arrayBuffer())
    this._session = await InferenceSession.create(modelArrayBuffer)
    this.reset_state()
    log.debug("vad is initialized")
  }

  reset_state = () => {
    const zeroes = Array(2 * 64).fill(0)
    this._h = new Tensor("float32", zeroes, [2, 1, 64])
    this._c = new Tensor("float32", zeroes, [2, 1, 64])
  }

  process = async (audioFrame: Float32Array): Promise<SpeechProbabilities> => {
    const t = new Tensor("float32", audioFrame, [1, audioFrame.length])
    const inputs = {
      input: t,
      h0: this._h,
      c0: this._c,
    }
    const out = await this._session.run(inputs)
    this._h = out.hn
    this._c = out.cn
    const [notSpeech, isSpeech] = out.output.data as Float32Array
    return { notSpeech, isSpeech }
  }
}
