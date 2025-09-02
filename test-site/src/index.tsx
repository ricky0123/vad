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
  baseAssetPath: "Base path for VAD model assets.",
  onnxWASMBasePath: "Base path for ONNX WebAssembly files.",
  submitUserSpeechOnPause:
    "Whether to submit speech segments when VAD is paused.",
  positiveSpeechThreshold:
    "Threshold (0-1) above which a frame is considered to contain speech. Default: 0.5",
  negativeSpeechThreshold:
    "Threshold (0-1) below which a frame is considered to not contain speech. Default: 0.35",
  redemptionMs:
    "Number of milliseconds of non-speech frames to wait before ending a speech segment. Default: 500",
  preSpeechPadMs:
    "Number of milliseconds of audio to prepend to a speech segment. Default: 30",
  minSpeechMs:
    "Minimum duration in milliseconds for a speech segment to be considered valid. Default: 250",
  startOnLoad: "Whether to start VAD automatically when the component loads.",
  userSpeakingThreshold:
    "Threshold for determining when user is speaking (used for UI state).",
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

// Define which options should be shown in the UI
const configurableOptions: (keyof ReactRealTimeVADOptions)[] = [
  "model",
  "baseAssetPath",
  "onnxWASMBasePath",
  "submitUserSpeechOnPause",
  "positiveSpeechThreshold",
  "negativeSpeechThreshold",
  "redemptionMs",
  "preSpeechPadMs",
  "minSpeechMs",
  "startOnLoad",
  "userSpeakingThreshold",
]

const defaultParams: Partial<ReactRealTimeVADOptions> = Object.fromEntries(
  Object.entries(getDefaultReactRealTimeVADOptions("v5"))
    .filter(([key, _value]) => {
      return configurableOptions.includes(key as keyof ReactRealTimeVADOptions)
    })
    .map(([key, value]) => {
      return [key, value]
    })
)

const getOptionsFromHash = () => {
  const hash = window.location.hash
  if (!hash) return {}
  const params = new URLSearchParams(hash.slice(1))
  const opts = params.get("opts")
  if (!opts) return {}
  try {
    const out = JSON.parse(decodeURIComponent(opts))
    console.log("Parsed opts from hash:", out)
    return out
  } catch (e) {
    console.error("Failed to parse opts from hash:", e)
    return {}
  }
}

const opts = {
  ...defaultParams,
  ...getOptionsFromHash(),
  // Ensure frameSamples is set based on model
  frameSamples:
    (getOptionsFromHash().model || defaultParams.model) === "v5" ? 512 : 1536,
}

// Form component for boolean values (checkboxes)
const BooleanInput = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: keyof ReactRealTimeVADOptions
  currentValue: boolean
  onInputChange: (
    optionName: keyof ReactRealTimeVADOptions,
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
  optionName: keyof ReactRealTimeVADOptions
  currentValue: string
  onInputChange: (
    optionName: keyof ReactRealTimeVADOptions,
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

// Form component for number values
const NumberInput = ({
  optionName,
  currentValue,
  onInputChange,
}: {
  optionName: keyof ReactRealTimeVADOptions
  currentValue: number
  onInputChange: (
    optionName: keyof ReactRealTimeVADOptions,
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
  optionName: keyof ReactRealTimeVADOptions
  currentValue: number
  onInputChange: (
    optionName: keyof ReactRealTimeVADOptions,
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
  optionName: keyof ReactRealTimeVADOptions
  currentValue: string
  onInputChange: (
    optionName: keyof ReactRealTimeVADOptions,
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
  const [initializationParameters, setVadParams] = useState(opts)
  const [newVadParams, setNewVadParams] = useState<
    Partial<ReactRealTimeVADOptions>
  >({})
  const [demo, setDemo] = useState(true)

  const handleInputChange = (
    optionName: keyof ReactRealTimeVADOptions,
    newValue: string | boolean | number
  ) => {
    setNewVadParams((prevValues) => {
      const updatedValues = {
        ...prevValues,
        [optionName]: newValue,
      }

      return updatedValues
    })
  }

  // Helper function to determine the appropriate form component
  const getFormComponent = (
    optionName: keyof ReactRealTimeVADOptions,
    currentValue: any
  ) => {
    const newValue = newVadParams[optionName] ?? currentValue

    if (
      optionName === "startOnLoad" ||
      optionName === "submitUserSpeechOnPause"
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

    const params = {
      ...initializationParameters,
      ...newVadParams,
    }

    setVadParams(params)

    const opts = JSON.stringify(params)
    window.location.hash = `#opts=${encodeURIComponent(opts)}`

    await new Promise((resolve) => setTimeout(resolve, 1000))
    setDemo(true)
  }

  return (
    <div className="flex">
      <div className="mr-5">
        <h3>Initialization parameters</h3>
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
              const currentValue = initializationParameters[optionName]
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
          <VADDemo initializationParameters={initializationParameters} />
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
  const vad = useMicVAD({
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
  })
  useEffect(() => {
    console.log("Created VAD with params", initializationParameters)
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
