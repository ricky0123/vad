import * as ort from "onnxruntime-web/wasm"
import { log } from "../logging"
import { ModelFactory, ModelFetcher, SpeechProbabilities } from "./common"

export class SileroLegacy {
  constructor(
    private ortInstance: typeof ort,
    private _session: ort.InferenceSession,
    private _h: ort.Tensor,
    private _c: ort.Tensor,
    private _sr: ort.Tensor
  ) {}

  static new: ModelFactory = async (
    ortInstance: typeof ort,
    modelFetcher: ModelFetcher
  ) => {
    log.debug("initializing vad")
    const modelArrayBuffer = await modelFetcher()
    const _session = await ortInstance.InferenceSession.create(modelArrayBuffer)

    const _sr = new ortInstance.Tensor("int64", [16000n])
    const zeroes = Array(2 * 64).fill(0)
    const _h = new ortInstance.Tensor("float32", zeroes, [2, 1, 64])
    const _c = new ortInstance.Tensor("float32", zeroes, [2, 1, 64])
    log.debug("vad is initialized")
    const model = new SileroLegacy(ortInstance, _session, _h, _c, _sr)
    return model
  }

  reset_state = () => {
    const zeroes = Array(2 * 64).fill(0)
    this._h = new this.ortInstance.Tensor("float32", zeroes, [2, 1, 64])
    this._c = new this.ortInstance.Tensor("float32", zeroes, [2, 1, 64])
  }

  process = async (audioFrame: Float32Array): Promise<SpeechProbabilities> => {
    const t = new this.ortInstance.Tensor("float32", audioFrame, [
      1,
      audioFrame.length,
    ])
    const inputs = {
      input: t,
      h: this._h,
      c: this._c,
      sr: this._sr,
    }
    const out = await this._session.run(inputs)
    this._h = out["hn"] as ort.Tensor
    this._c = out["cn"] as ort.Tensor
    const [isSpeech] = out["output"]?.data as unknown as [number]
    const notSpeech = 1 - isSpeech
    return { notSpeech, isSpeech }
  }

  release = async () => {
    await this._session.release()
    this._h.dispose()
    this._c.dispose()
    this._sr.dispose()
  }
}
