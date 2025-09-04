import type { ReactRealTimeVADOptions } from "@ricky0123/vad-react"
import {
  getDefaultReactRealTimeVADOptions,
  useMicVAD,
  utils,
} from "@ricky0123/vad-react"
import * as ort from "onnxruntime-web"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

React // prevent prettier imports plugin from removing React

ort.env.wasm.wasmPaths = "/"

const domContainer = document.querySelector("#demo")
// @ts-ignore
createRoot(domContainer).render(<App />)

const vadAttributes = ["errored", "loading", "listening", "userSpeaking"]
const vadMethods = ["pause", "start", "toggle"]

// Parameter descriptions for tooltips
const parameterDescriptions: Record<string, string> = {
  model:
    "The VAD model to use. 'v5' is the latest model, 'legacy' is the older version.",
  assetPaths: "Asset path configuration: 'root' for local root, 'subpath' for local subpath, 'cdn' for CDN delivery.",
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
  customStream: "When enabled, supplies custom getStream, pauseStream, and resumeStream functions.",
}

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
const assetPathsConfig: Record<AssetPathsOption, { baseAssetPath: string; onnxWASMBasePath: string }> = {
  root: {
    baseAssetPath: "./",
    onnxWASMBasePath: "./"
  },
  subpath: {
    baseAssetPath: "./subpath/",
    onnxWASMBasePath: "./subpath/"
  },
  cdn: {
    baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@latest/dist/",
    onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/"
  }
}

// Unified parameter system
type SettableParameter = keyof ReactRealTimeVADOptions | 'assetPaths' | 'customStream'

interface SettableParameters {
  // VAD parameters
  model?: string
  submitUserSpeechOnPause?: boolean
  positiveSpeechThreshold?: number
  negativeSpeechThreshold?: number
  redemptionMs?: number
  preSpeechPadMs?: number
  minSpeechMs?: number
  startOnLoad?: boolean
  userSpeakingThreshold?: number
  // Custom parameters
  assetPaths?: AssetPathsOption
  customStream?: boolean
}

// Define which options should be shown in the UI
const configurableOptions: SettableParameter[] = [
  "model",
  "assetPaths",
  "submitUserSpeechOnPause",
  "positiveSpeechThreshold",
  "negativeSpeechThreshold",
  "redemptionMs",
  "preSpeechPadMs",
  "minSpeechMs",
  "startOnLoad",
  "userSpeakingThreshold",
  "customStream",
]

// Default values for settable parameters
const defaultSettableParams: SettableParameters = {
  model: "v5",
  assetPaths: "root",
  customStream: false,
  ...Object.fromEntries(
    Object.entries(getDefaultReactRealTimeVADOptions("v5"))
      .filter(([key, _value]) => {
        return configurableOptions.includes(key as keyof ReactRealTimeVADOptions)
      })
      .map(([key, value]) => {
        return [key, value]
      })
  )
}

const getSettableParamsFromHash = (): SettableParameters => {
  const hash = window.location.hash
  if (!hash) return {}
  const params = new URLSearchParams(hash.slice(1))
  const opts = params.get("opts")
  if (!opts) return {}
  try {
    const out = JSON.parse(decodeURIComponent(opts))
    console.log("Parsed settable params from hash:", out)
    return out
  } catch (e) {
    console.error("Failed to parse settable params from hash:", e)
    return {}
  }
}

// Convert settable parameters to VAD parameters
const settableParamsToVADParams = (settableParams: SettableParameters): Partial<ReactRealTimeVADOptions> => {
  const vadParams: Partial<ReactRealTimeVADOptions> = {}
  
  // Copy VAD parameters directly
  if (settableParams.model !== undefined) vadParams.model = settableParams.model as "v5" | "legacy"
  if (settableParams.submitUserSpeechOnPause !== undefined) vadParams.submitUserSpeechOnPause = settableParams.submitUserSpeechOnPause
  if (settableParams.positiveSpeechThreshold !== undefined) vadParams.positiveSpeechThreshold = settableParams.positiveSpeechThreshold
  if (settableParams.negativeSpeechThreshold !== undefined) vadParams.negativeSpeechThreshold = settableParams.negativeSpeechThreshold
  if (settableParams.redemptionMs !== undefined) vadParams.redemptionMs = settableParams.redemptionMs
  if (settableParams.preSpeechPadMs !== undefined) vadParams.preSpeechPadMs = settableParams.preSpeechPadMs
  if (settableParams.minSpeechMs !== undefined) vadParams.minSpeechMs = settableParams.minSpeechMs
  if (settableParams.startOnLoad !== undefined) vadParams.startOnLoad = settableParams.startOnLoad
  if (settableParams.userSpeakingThreshold !== undefined) vadParams.userSpeakingThreshold = settableParams.userSpeakingThreshold
  
  // Convert asset paths to baseAssetPath and onnxWASMBasePath
  if (settableParams.assetPaths) {
    const assetConfig = assetPathsConfig[settableParams.assetPaths]
    vadParams.baseAssetPath = assetConfig.baseAssetPath
    vadParams.onnxWASMBasePath = assetConfig.onnxWASMBasePath
  }
  
  // Note: frameSamples is calculated internally by the VAD based on the model
  
  return vadParams
}

const initialSettableParams: SettableParameters = {
  ...defaultSettableParams,
  ...getSettableParamsFromHash(),
}

// Form component for boolean values (checkboxes)
const BooleanInput = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: SettableParameter
  currentValue: boolean
  onInputChange: (
    optionName: SettableParameter,
    newValue: string | boolean | number
  ) => void
}) => (
  <input
    type="checkbox"
    checked={currentValue}
    onChange={(e) => onInputChange(optionName, e.target.checked)}
    className="rounded mx-5"
  />
)

// Form component for model selection (dropdown)
const ModelSelect = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: SettableParameter
  currentValue: string
  onInputChange: (
    optionName: SettableParameter,
    newValue: string | boolean | number
  ) => void
}) => (
  <select
    value={currentValue}
    onChange={(e) => onInputChange(optionName, e.target.value)}
    className="rounded mx-5"
  >
    <option value="legacy">legacy</option>
    <option value="v5">v5</option>
  </select>
)

// Form component for asset paths selection (dropdown)
const AssetPathsSelect = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: SettableParameter
  currentValue: AssetPathsOption
  onInputChange: (
    optionName: SettableParameter,
    newValue: string | boolean | number
  ) => void
}) => (
  <select
    value={currentValue}
    onChange={(e) => onInputChange(optionName, e.target.value as AssetPathsOption)}
    className="rounded mx-5"
  >
    <option value="root">root</option>
    <option value="subpath">subpath</option>
    <option value="cdn">cdn</option>
  </select>
)

// Form component for number values
const NumberInput = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: SettableParameter
  currentValue: number
  onInputChange: (
    optionName: SettableParameter,
    newValue: string | boolean | number
  ) => void
}) => (
  <input
    type="number"
    value={currentValue}
    onChange={(e) => onInputChange(optionName, parseFloat(e.target.value) || 0)}
    className="rounded mx-5"
  />
)

// Form component for float values (thresholds)
const FloatInput = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: SettableParameter
  currentValue: number
  onInputChange: (
    optionName: SettableParameter,
    newValue: string | boolean | number
  ) => void
}) => (
  <input
    type="number"
    step="0.01"
    value={currentValue}
    onChange={(e) => onInputChange(optionName, parseFloat(e.target.value) || 0)}
    className="rounded mx-5"
  />
)

// Form component for text values
const TextInput = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: SettableParameter
  currentValue: string
  onInputChange: (
    optionName: SettableParameter,
    newValue: string | boolean | number
  ) => void
}) => (
  <input
    type="text"
    value={currentValue}
    onChange={(e) => onInputChange(optionName, e.target.value)}
    className="rounded mx-5"
  />
)

function App() {
  const [settableParams, setSettableParams] = useState<SettableParameters>(initialSettableParams)
  const [demo, setDemo] = useState(true)
  
  // Convert settable parameters to VAD parameters
  const vadParams = settableParamsToVADParams(settableParams)

  const handleInputChange = (
    optionName: SettableParameter,
    newValue: string | boolean | number
  ) => {
    setSettableParams((prevValues) => {
      const updatedValues = {
        ...prevValues,
        [optionName]: newValue,
      }

      return updatedValues
    })
  }

  // Helper function to determine the appropriate form component
  const getFormComponent = (
    optionName: SettableParameter,
    currentValue: any
  ) => {
    const newValue = settableParams[optionName as keyof SettableParameters] ?? currentValue

    if (
      optionName === "startOnLoad" ||
      optionName === "submitUserSpeechOnPause" ||
      optionName === "customStream"
    ) {
      return (
        <BooleanInput
          optionName={optionName}
          currentValue={newValue}
          onInputChange={handleInputChange}
        />
      )
    }

    if (optionName === "model") {
      return (
        <ModelSelect
          optionName={optionName}
          currentValue={newValue}
          onInputChange={handleInputChange}
        />
      )
    }

    if (optionName === "assetPaths") {
      return (
        <AssetPathsSelect
          optionName={optionName}
          currentValue={newValue}
          onInputChange={handleInputChange}
        />
      )
    }

    // Use FloatInput for threshold values
    if (
      optionName === "positiveSpeechThreshold" ||
      optionName === "negativeSpeechThreshold" ||
      optionName === "userSpeakingThreshold"
    ) {
      return (
        <FloatInput
          optionName={optionName}
          currentValue={newValue}
          onInputChange={handleInputChange}
        />
      )
    }

    if (typeof currentValue === "number") {
      return (
        <NumberInput
          optionName={optionName}
          currentValue={newValue}
          onInputChange={handleInputChange}
        />
      )
    }

    return (
      <TextInput
        optionName={optionName}
        currentValue={newValue}
        onInputChange={handleInputChange}
      />
    )
  }

  const handleRestart = async () => {
    setDemo(false)

    // Convert current settable parameters to VAD parameters
    const params = settableParamsToVADParams(settableParams)

    // Add custom stream functions if enabled
    if (settableParams.customStream) {
      console.log("Getting custom stream")
      const customStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      })
      params.getStream = async () => {
        return customStream
      }
      params.pauseStream = async (stream: MediaStream) => {
        console.log("Custom pauseStream called", stream)
      }
      params.resumeStream = async (_stream: MediaStream) => {
        return customStream
      }
    }

    // Save settable parameters to URL hash
    const opts = JSON.stringify(settableParams)
    window.location.hash = `#opts=${encodeURIComponent(opts)}`

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
            {configurableOptions.map((optionName) => {
              const currentValue = settableParams[optionName as keyof SettableParameters] ?? defaultSettableParams[optionName as keyof SettableParameters]
              const description = parameterDescriptions[optionName]

              return (
                <tr key={optionName}>
                  <th>
                    <div className="flex items-center gap-2">
                      {optionName}
                      {description && (
                        <Tooltip content={description}>
                          <span className="text-gray-500 hover:text-gray-700 cursor-help">
                            ?
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </th>
                  <th>{currentValue?.toString()}</th>
                  <th>{getFormComponent(optionName, currentValue)}</th>
                </tr>
              )
            })}
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
            Click to select all - these are the actual parameters passed to the VAD
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
        {demo && (
          <VADDemo initializationParameters={vadParams} />
        )}
      </div>
    </div>
  )
}

function VADDemo({
  initializationParameters,
}: {
  initializationParameters: Partial<ReactRealTimeVADOptions>
}) {
  const [audioList, setAudioList] = useState<string[]>([])
  const fullParams: Partial<ReactRealTimeVADOptions> = {
    ...initializationParameters,
    onVADMisfire: () => {
      console.log("Vad misfire")
    },
    onFrameProcessed: (_probabilities, _frame) => {},
    onSpeechStart: () => {
      console.log("Speech start")
    },
    onSpeechRealStart: () => {
      console.log("Speech real start")
    },
    onSpeechEnd: (audio) => {
      console.log("Speech end")
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => [url, ...old])
    },
    ortConfig: (ort) => {
      console.log("Setting ort config")
      ort.env.logLevel = "warning"
    },
  }
  const vad = useMicVAD(fullParams)
  useEffect(() => {
    console.log("Created VAD with params", fullParams)
  }, [initializationParameters])

  console.log("test re-render")

  return (
    <div>
      <h3>Controls</h3>
      {vadMethods.map((methodName) => {
        return (
          <button
            className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2 mx-1"
            onClick={() => {
              ;(vad as any)[methodName]()
            }}
            key={methodName}
          >
            {methodName}
          </button>
        )
      })}

      <h3>VAD state</h3>
      <table className="mx-auto w-60">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {vadAttributes.map((attribute) => {
            return (
              <tr key={attribute}>
                <th>{attribute}</th>
                <th>{(vad as any)[attribute].toString()}</th>
              </tr>
            )
          })}
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
