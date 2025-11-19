import * as ort from "onnxruntime-web/wasm"
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

    if (!out["stateN"]) {
      throw new Error("No state from model")
    }
    this._state = out["stateN"]

    if (!out["output"]?.data) {
      throw new Error("No output from model")
    }
    const isSpeech = out["output"].data[0]
    if (typeof isSpeech != "number") {
      throw new Error("Weird output data")
    }
    const notSpeech = 1 - isSpeech
    return { notSpeech, isSpeech }
  }

  release = async () => {
    await this._session.release()
    this._state.dispose()
    this._sr.dispose()
  }
}
