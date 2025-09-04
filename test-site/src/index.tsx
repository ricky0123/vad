import type { ReactRealTimeVADOptions } from "@ricky0123/vad-react"
import {
  getDefaultReactRealTimeVADOptions,
  useMicVAD,
  utils,
} from "@ricky0123/vad-react"
import { SpeechProbabilities } from "@ricky0123/vad-web/dist/models/common"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import NonRealTimeTest from "./non-real-time-test"

React // prevent prettier imports plugin from removing React

const domContainer = document.querySelector("#demo")
const nonRealTimeContainer = document.querySelector("#non-real-time-test")

// @ts-ignore
createRoot(domContainer).render(<App />)
// @ts-ignore
createRoot(nonRealTimeContainer).render(<NonRealTimeTest />)

interface SettableParameters {
  // Directly translatable VAD parameters
  model: "v5" | "legacy"
  submitUserSpeechOnPause: boolean
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  redemptionMs: number
  preSpeechPadMs: number
  minSpeechMs: number
  startOnLoad: boolean
  userSpeakingThreshold: number

  // Custom parameters
  assetPaths: AssetPathsOption
  customStream: boolean
}

type SettableParameter = keyof SettableParameters

// Parameter descriptions for tooltips
const settableParameterDescriptions: Record<SettableParameter, string> = {
  model:
    "The VAD model to use. 'v5' is the latest model, 'legacy' is the older version.",
  assetPaths:
    "Asset path configuration: 'root' for local root, 'subpath' for local subpath, 'cdn' for CDN delivery.",
  submitUserSpeechOnPause:
    "Whether to submit speech segments when VAD is paused.",
  positiveSpeechThreshold:
    "Threshold (0-1) above which a frame is considered to contain speech.",
  negativeSpeechThreshold:
    "Threshold (0-1) below which a frame is considered to not contain speech.",
  redemptionMs:
    "Number of milliseconds of non-speech frames to wait before ending a speech segment.",
  preSpeechPadMs:
    "Number of milliseconds of audio to prepend to a speech segment.",
  minSpeechMs:
    "Minimum duration in milliseconds for a speech segment to be considered valid.",
  startOnLoad: "Whether to start VAD automatically when the component loads.",
  userSpeakingThreshold:
    "Threshold for determining when user is speaking (used for UI state).",
  customStream:
    "When enabled, supplies custom getStream, pauseStream, and resumeStream functions.",
}

const settableParameterValidators: Record<
  SettableParameter,
  (value: any) => boolean
> = {
  model: (value) => value === "v5" || value === "legacy",
  assetPaths: (value) =>
    value === "root" || value === "subpath" || value === "cdn",
  submitUserSpeechOnPause: (value) => typeof value === "boolean",
  positiveSpeechThreshold: (value) => typeof value === "number",
  negativeSpeechThreshold: (value) => typeof value === "number",
  redemptionMs: (value) => typeof value === "number",
  preSpeechPadMs: (value) => typeof value === "number",
  minSpeechMs: (value) => typeof value === "number",
  startOnLoad: (value) => typeof value === "boolean",
  userSpeakingThreshold: (value) => typeof value === "number",
  customStream: (value) => typeof value === "boolean",
}

type SettableParameterFormElement = {
  [K in keyof SettableParameters]: (
    newValue: SettableParameters[K],
    setSettableParamsFn: (
      fn: (prevValues: SettableParameters) => SettableParameters
    ) => void
  ) => JSX.Element
}

const settableParameterFormElement: SettableParameterFormElement = {
  model: (newValue, setSettableParamsFn) => (
    <ModelSelect
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  assetPaths: (newValue, setSettableParamsFn) => (
    <AssetPathsSelect
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  submitUserSpeechOnPause: (newValue, setSettableParamsFn) => (
    <BooleanInput
      optionName="submitUserSpeechOnPause"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  positiveSpeechThreshold: (newValue, setSettableParamsFn) => (
    <FloatInput
      optionName="positiveSpeechThreshold"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  negativeSpeechThreshold: (newValue, setSettableParamsFn) => (
    <FloatInput
      optionName="negativeSpeechThreshold"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  redemptionMs: (newValue, setSettableParamsFn) => (
    <NumberInput
      optionName="redemptionMs"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  preSpeechPadMs: (newValue, setSettableParamsFn) => (
    <NumberInput
      optionName="preSpeechPadMs"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  minSpeechMs: (newValue, setSettableParamsFn) => (
    <NumberInput
      optionName="minSpeechMs"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  startOnLoad: (newValue, setSettableParamsFn) => (
    <BooleanInput
      optionName="startOnLoad"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  userSpeakingThreshold: (newValue, setSettableParamsFn) => (
    <FloatInput
      optionName="userSpeakingThreshold"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
  customStream: (newValue, setSettableParamsFn) => (
    <BooleanInput
      optionName="customStream"
      newValue={newValue}
      setSettableParamsFn={setSettableParamsFn}
    />
  ),
}

const ModelSelect = ({
  newValue,
  setSettableParamsFn,
}: {
  newValue: "v5" | "legacy"
  setSettableParamsFn: (
    fn: (prevValues: SettableParameters) => SettableParameters
  ) => void
}) => (
  <select
    value={newValue}
    onChange={(e) =>
      setSettableParamsFn((prevValues) => {
        if (e.target.value != "legacy" && e.target.value != "v5") {
          console.error(`Invalid value for model: ${e.target.value}`)
          return prevValues
        }
        return {
          ...prevValues,
          model: e.target.value,
        }
      })
    }
    className="rounded mx-5"
  >
    <option value="legacy">legacy</option>
    <option value="v5">v5</option>
  </select>
)

const AssetPathsSelect = ({
  newValue,
  setSettableParamsFn,
}: {
  newValue: AssetPathsOption
  setSettableParamsFn: (
    fn: (prevValues: SettableParameters) => SettableParameters
  ) => void
}) => (
  <select
    value={newValue}
    onChange={(e) =>
      setSettableParamsFn((prevValues) => {
        if (
          e.target.value != "root" &&
          e.target.value != "subpath" &&
          e.target.value != "cdn"
        ) {
          console.error(`Invalid value for assetPaths: ${e.target.value}`)
          return prevValues
        }
        return {
          ...prevValues,
          assetPaths: e.target.value,
        }
      })
    }
    className="rounded mx-5"
  >
    <option value="root">root</option>
    <option value="subpath">subpath</option>
    <option value="cdn">cdn</option>
  </select>
)

// Tooltip component using DaisyUI
const Tooltip = ({
  children,
  content,
}: {
  children: React.ReactNode
  content: string
}) => (
  <div className="tooltip tooltip-top" data-tip={content}>
    {children}
  </div>
)

// Asset paths configuration
type AssetPathsOption = "root" | "subpath" | "cdn"
const assetPathsConfig: Record<
  AssetPathsOption,
  { baseAssetPath: string; onnxWASMBasePath: string }
> = {
  root: {
    baseAssetPath: "./",
    onnxWASMBasePath: "./",
  },
  subpath: {
    baseAssetPath: "./subpath/",
    onnxWASMBasePath: "./subpath/",
  },
  cdn: {
    baseAssetPath:
      "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@latest/dist/",
    onnxWASMBasePath:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
  },
}

const defaultVADOptions: ReactRealTimeVADOptions =
  getDefaultReactRealTimeVADOptions("v5")

const defaultSettableParams: SettableParameters = {
  model: defaultVADOptions.model,
  assetPaths: "root",
  submitUserSpeechOnPause: defaultVADOptions.submitUserSpeechOnPause,
  positiveSpeechThreshold: defaultVADOptions.positiveSpeechThreshold,
  negativeSpeechThreshold: defaultVADOptions.negativeSpeechThreshold,
  redemptionMs: defaultVADOptions.redemptionMs,
  preSpeechPadMs: defaultVADOptions.preSpeechPadMs,
  minSpeechMs: defaultVADOptions.minSpeechMs,
  startOnLoad: defaultVADOptions.startOnLoad,
  userSpeakingThreshold: defaultVADOptions.userSpeakingThreshold,
  customStream: false,
}

const getSettableParamsFromHash = (): SettableParameters => {
  const hash = window.location.hash
  if (!hash) return defaultSettableParams
  const params = new URLSearchParams(hash.slice(1))
  const opts = params.get("opts")
  if (!opts) return defaultSettableParams
  try {
    const out = JSON.parse(decodeURIComponent(opts))
    console.log("Parsed settable params from hash:", out)

    // Validate the settable parameters
    for (const [key, validator] of Object.entries(
      settableParameterValidators
    )) {
      if (!validator(out[key])) {
        console.error(
          `Invalid value for ${key}: ${out[key as SettableParameter]}`
        )
        return defaultSettableParams
      }
    }

    return out
  } catch (e) {
    console.error("Failed to parse settable params from hash:", e)
    return defaultSettableParams
  }
}

const initialSettableParams = getSettableParamsFromHash()

// Convert settable parameters to VAD parameters
const settableParamsToVADParams = async (
  settableParams: SettableParameters
): Promise<ReactRealTimeVADOptions> => {
  const assetConfig = assetPathsConfig[settableParams.assetPaths]

  const defaultVADParams = getDefaultReactRealTimeVADOptions(
    settableParams.model
  )

  let getStream = defaultVADParams.getStream
  let pauseStream = defaultVADParams.pauseStream
  let resumeStream = defaultVADParams.resumeStream

  if (settableParams.customStream) {
    const stream = await defaultVADParams.getStream()
    getStream = async () => {
      console.log("called getStream")
      return stream
    }
    pauseStream = async (_stream: MediaStream) => {
      console.log("called pauseStream")
    }
    resumeStream = async (_stream: MediaStream) => {
      console.log("called resumeStream")
      return stream
    }
  }

  const vadParams: ReactRealTimeVADOptions = {
    positiveSpeechThreshold: settableParams.positiveSpeechThreshold,
    negativeSpeechThreshold: settableParams.negativeSpeechThreshold,
    redemptionMs: settableParams.redemptionMs,
    preSpeechPadMs: settableParams.preSpeechPadMs,
    minSpeechMs: settableParams.minSpeechMs,
    submitUserSpeechOnPause: settableParams.submitUserSpeechOnPause,

    // From RealTimeVADCallbacks
    onFrameProcessed: (
      _probabilities: SpeechProbabilities,
      _frame: Float32Array
    ) => {},
    onVADMisfire: () => {
      console.log("VAD misfire")
    },
    onSpeechStart: () => {
      console.log("Speech start")
    },
    onSpeechEnd: (_audio: Float32Array) => {
      console.log("Speech end")
    },
    onSpeechRealStart: () => {
      console.log("Speech real start")
    },

    // From OrtOptions
    ortConfig: (ortInstance) => {
      console.log("Setting ort config")
      ortInstance.env.logLevel = "warning"
    },

    // From AssetOptions
    workletOptions: {},
    baseAssetPath: assetConfig.baseAssetPath,
    onnxWASMBasePath: assetConfig.onnxWASMBasePath,

    // From ModelOptions
    model: settableParams.model,

    // From RealTimeVADOptions (direct fields)
    getStream: getStream,
    pauseStream: pauseStream,
    resumeStream: resumeStream,

    // From ReactOptions
    startOnLoad: settableParams.startOnLoad,
    userSpeakingThreshold: settableParams.userSpeakingThreshold,
  }

  return vadParams
}

// Form component for boolean values (checkboxes)
const BooleanInput = ({
  optionName,
  newValue,
  setSettableParamsFn,
}: {
  optionName: SettableParameter
  newValue: boolean
  setSettableParamsFn: (
    fn: (prevValues: SettableParameters) => SettableParameters
  ) => void
}) => (
  <input
    type="checkbox"
    checked={newValue}
    onChange={(e) =>
      setSettableParamsFn((prevValues) => {
        return {
          ...prevValues,
          [optionName]: e.target.checked,
        }
      })
    }
    className="rounded mx-5"
  />
)

// Form component for number values
const NumberInput = ({
  optionName,
  newValue,
  setSettableParamsFn,
}: {
  optionName: SettableParameter
  newValue: number
  setSettableParamsFn: (
    fn: (prevValues: SettableParameters) => SettableParameters
  ) => void
}) => (
  <input
    type="number"
    value={newValue}
    onChange={(e) =>
      setSettableParamsFn((prevValues) => {
        const parsedValue = parseFloat(e.target.value)
        if (isNaN(parsedValue)) {
          console.error(`Invalid value for ${optionName}: ${e.target.value}`)
          return prevValues
        }
        return {
          ...prevValues,
          [optionName]: parsedValue,
        }
      })
    }
    className="rounded mx-5"
  />
)

// Form component for float values (thresholds)
const FloatInput = ({
  optionName,
  newValue,
  setSettableParamsFn,
}: {
  optionName: SettableParameter
  newValue: number
  setSettableParamsFn: (
    fn: (prevValues: SettableParameters) => SettableParameters
  ) => void
}) => (
  <input
    type="number"
    step="0.01"
    value={newValue}
    onChange={(e) =>
      setSettableParamsFn((prevValues) => {
        const parsedValue = parseFloat(e.target.value)
        if (isNaN(parsedValue)) {
          console.error(`Invalid value for ${optionName}: ${e.target.value}`)
          return prevValues
        }
        return {
          ...prevValues,
          [optionName]: parsedValue,
        }
      })
    }
    className="rounded mx-5"
  />
)

function App() {
  const [settableParams, setSettableParams] = useState<SettableParameters>(
    initialSettableParams
  )
  const [demo, setDemo] = useState(false)
  const [vadParams, setVadParams] =
    useState<ReactRealTimeVADOptions>(defaultVADOptions)

  useEffect(() => {
    const setup = async () => {
      setVadParams(await settableParamsToVADParams(settableParams))
      setDemo(true)
    }
    setup().catch((e) => {
      console.error("Failed to setup VAD:", e)
    })
  }, [])

  const handleRestart = async () => {
    setDemo(false)

    // Save settable parameters to URL hash
    const opts = JSON.stringify(settableParams)
    window.location.hash = `#opts=${encodeURIComponent(opts)}`

    setVadParams(await settableParamsToVADParams(settableParams))

    await new Promise((resolve) => setTimeout(resolve, 1000))
    setDemo(true)
  }

  return (
    <div className="flex">
      <div className="mr-5">
        <h3>Configuration Parameters</h3>
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Current Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            <tr key="model">
              <th>
                <div className="flex items-center gap-2">
                  model
                  <Tooltip content={settableParameterDescriptions.model}>
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.model}</th>
              <th>
                {settableParameterFormElement.model(
                  settableParams.model,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="assetPaths">
              <th>
                <div className="flex items-center gap-2">
                  assetPaths
                  <Tooltip content={settableParameterDescriptions.assetPaths}>
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.assetPaths}</th>
              <th>
                {settableParameterFormElement.assetPaths(
                  settableParams.assetPaths,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="submitUserSpeechOnPause">
              <th>
                <div className="flex items-center gap-2">
                  submitUserSpeechOnPause
                  <Tooltip
                    content={
                      settableParameterDescriptions.submitUserSpeechOnPause
                    }
                  >
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.submitUserSpeechOnPause}</th>
              <th>
                {settableParameterFormElement.submitUserSpeechOnPause(
                  settableParams.submitUserSpeechOnPause,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="positiveSpeechThreshold">
              <th>
                <div className="flex items-center gap-2">
                  positiveSpeechThreshold
                  <Tooltip
                    content={
                      settableParameterDescriptions.positiveSpeechThreshold
                    }
                  >
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.positiveSpeechThreshold}</th>
              <th>
                {settableParameterFormElement.positiveSpeechThreshold(
                  settableParams.positiveSpeechThreshold,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="negativeSpeechThreshold">
              <th>
                <div className="flex items-center gap-2">
                  negativeSpeechThreshold
                  <Tooltip
                    content={
                      settableParameterDescriptions.negativeSpeechThreshold
                    }
                  >
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.negativeSpeechThreshold}</th>
              <th>
                {settableParameterFormElement.negativeSpeechThreshold(
                  settableParams.negativeSpeechThreshold,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="redemptionMs">
              <th>
                <div className="flex items-center gap-2">
                  redemptionMs
                  <Tooltip content={settableParameterDescriptions.redemptionMs}>
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.redemptionMs}</th>
              <th>
                {settableParameterFormElement.redemptionMs(
                  settableParams.redemptionMs,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="preSpeechPadMs">
              <th>
                <div className="flex items-center gap-2">
                  preSpeechPadMs
                  <Tooltip
                    content={settableParameterDescriptions.preSpeechPadMs}
                  >
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.preSpeechPadMs}</th>
              <th>
                {settableParameterFormElement.preSpeechPadMs(
                  settableParams.preSpeechPadMs,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="minSpeechMs">
              <th>
                <div className="flex items-center gap-2">
                  minSpeechMs
                  <Tooltip content={settableParameterDescriptions.minSpeechMs}>
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.minSpeechMs}</th>
              <th>
                {settableParameterFormElement.minSpeechMs(
                  settableParams.minSpeechMs,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="startOnLoad">
              <th>
                <div className="flex items-center gap-2">
                  startOnLoad
                  <Tooltip content={settableParameterDescriptions.startOnLoad}>
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.startOnLoad}</th>
              <th>
                {settableParameterFormElement.startOnLoad(
                  settableParams.startOnLoad,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="userSpeakingThreshold">
              <th>
                <div className="flex items-center gap-2">
                  userSpeakingThreshold
                  <Tooltip
                    content={
                      settableParameterDescriptions.userSpeakingThreshold
                    }
                  >
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.userSpeakingThreshold}</th>
              <th>
                {settableParameterFormElement.userSpeakingThreshold(
                  settableParams.userSpeakingThreshold,
                  setSettableParams
                )}
              </th>
            </tr>

            <tr key="customStream">
              <th>
                <div className="flex items-center gap-2">
                  customStream
                  <Tooltip content={settableParameterDescriptions.customStream}>
                    <span className="text-gray-500 hover:text-gray-700 cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </div>
              </th>
              <th>{settableParams.customStream}</th>
              <th>
                {settableParameterFormElement.customStream(
                  settableParams.customStream,
                  setSettableParams
                )}
              </th>
            </tr>
          </tbody>
        </table>

        <h3>Final VAD Parameters</h3>
        <div className="mb-4">
          <textarea
            value={JSON.stringify(vadParams, null, 2)}
            readOnly
            className="w-full h-40 p-2 border rounded font-mono text-sm bg-gray-50"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <p className="text-sm text-gray-600 mt-1">
            Click to select all - these are the actual parameters passed to the
            VAD
          </p>
        </div>
      </div>
      <div>
        <h3>Run</h3>
        <button
          className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2"
          onClick={handleRestart}
        >
          Restart
        </button>
        {demo && <VADDemo vadParams={vadParams} />}
      </div>
    </div>
  )
}

function VADDemo({ vadParams }: { vadParams: ReactRealTimeVADOptions }) {
  const [audioList, setAudioList] = useState<string[]>([])
  const vad = useMicVAD({
    ...vadParams,
    onSpeechEnd: (audio) => {
      console.log("Speech end")
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => [url, ...old])
    },
  })

  console.log("test re-render")

  return (
    <div>
      <h3>Controls</h3>

      <button
        className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2 mx-1"
        onClick={() => {
          vad.start()
        }}
      >
        start
      </button>

      <button
        className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2 mx-1"
        onClick={() => {
          vad.pause()
        }}
      >
        pause
      </button>

      <button
        className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2 mx-1"
        onClick={() => {
          vad.toggle()
        }}
      >
        toggle
      </button>

      <h3>VAD state</h3>
      <table className="mx-auto w-60">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr key="listening">
            <th>listening</th>
            <th>{vad.listening.toString()}</th>
          </tr>
          <tr key="errored">
            <th>errored</th>
            <th>{vad.errored.toString()}</th>
          </tr>
          <tr key="loading">
            <th>loading</th>
            <th>{vad.loading.toString()}</th>
          </tr>
          <tr key="userSpeaking">
            <th>userSpeaking</th>
            <th>{vad.userSpeaking.toString()}</th>
          </tr>
        </tbody>
      </table>

      <h3>Audio segments with speech</h3>
      <div>
        {audioList.map((audioURL) => {
          return (
            <div className="mb-1" key={audioURL.substring(-10)}>
              <audio controls src={audioURL} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
