import * as ort from "onnxruntime-web"
import { log } from "../logging"
import { ModelFactory, ModelFetcher, SpeechProbabilities } from "./common"

function getNewState(ortInstance: typeof ort) {
  const zeroes = Array(2 * 128).fill(0)
  return new ortInstance.Tensor("float32", zeroes, [2, 1, 128])
}

export class SileroV5 {
  constructor(
    private _session: ort.InferenceSession,
    private _state: ort.Tensor,
    private _sr: ort.Tensor,
    private ortInstance: typeof ort
  ) {}

  static new: ModelFactory = async (
    ortInstance: typeof ort,
    modelFetcher: ModelFetcher
  ) => {
    log.debug("Loading VAD...")
    const modelArrayBuffer = await modelFetcher()
    const _session = await ortInstance.InferenceSession.create(modelArrayBuffer)
    // @ts-ignore
    const _sr = new ortInstance.Tensor("int64", [16000n])
    const _state = getNewState(ortInstance)
    log.debug("...finished loading VAD")
    return new SileroV5(_session, _state, _sr, ortInstance)
  }

  reset_state = () => {
    this._state = getNewState(this.ortInstance)
  }

  process = async (audioFrame: Float32Array): Promise<SpeechProbabilities> => {
    const t = new this.ortInstance.Tensor("float32", audioFrame, [
      1,
      audioFrame.length,
    ])
    const inputs = {
      input: t,
      state: this._state,
      sr: this._sr,
    }
    const out = await this._session.run(inputs)

    // @ts-ignore
    this._state = out["stateN"]

    // @ts-ignore
    const [isSpeech] = out["output"]?.data
    const notSpeech = 1 - isSpeech
    return { notSpeech, isSpeech }
  }
}
