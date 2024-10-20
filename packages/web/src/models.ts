import { log } from "./logging"
import * as ort from 'onnxruntime-web'

export type ModelFetcher = () => Promise<ArrayBuffer>

export interface SpeechProbabilities {
  notSpeech: number
  isSpeech: number
}

export const configureOrt = (f: (ortInstance: typeof ort) => any) => {
  f(ort)
}

function getNewState() {
  const zeroes = Array(2 * 128).fill(0)
  return new ort.Tensor("float32", zeroes, [2, 1, 128])
}

export class SileroV5 {
  constructor(
    private _session: ort.InferenceSession,
    private _state: ort.Tensor,
    private _sr: ort.Tensor
  ) {}

  static new = async (modelFetcher: ModelFetcher) => {
    log.debug("Loading VAD...")
    const modelArrayBuffer = await modelFetcher()
    const _session = await ort.InferenceSession.create(modelArrayBuffer)
    const _sr = new ort.Tensor("int64", [16000n])
    const _state = getNewState()
    log.debug("...finished loading VAD")
    return new SileroV5(_session, _state, _sr)
  }

  reset_state = () => {
    this._state = getNewState()
  }

  process = async (audioFrame: Float32Array): Promise<SpeechProbabilities> => {
    const t = new ort.Tensor("float32", audioFrame, [1, audioFrame.length])
    const inputs = {
      input: t,
      state: this._state,
      sr: this._sr,
    }
    const out = await this._session.run(inputs)
    
    // @ts-ignore
    this._state = out['stateN']
    
    // @ts-ignore
    const [isSpeech] = out['output']?.data 
    const notSpeech = 1 - isSpeech
    return { notSpeech, isSpeech }
  }
}
