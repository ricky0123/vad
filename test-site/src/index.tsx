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

// Define which options should be shown in the UI
const configurableOptions: (keyof ReactRealTimeVADOptions)[] = [
  "model",
  "baseAssetPath",
  "onnxWASMBasePath",
  "submitUserSpeechOnPause",
  "positiveSpeechThreshold",
  "negativeSpeechThreshold",
  "frameSamples",
  "redemptionFrames",
  "preSpeechPadFrames",
  "minSpeechFrames",
  "startOnLoad",
  "userSpeakingThreshold",
]

const defaultParams: Partial<ReactRealTimeVADOptions> = Object.fromEntries(
  Object.entries(getDefaultReactRealTimeVADOptions("legacy"))
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
}

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
    setNewVadParams((prevValues) => ({
      ...prevValues,
      [optionName]: newValue,
    }))
  }

  // Form component for boolean values (checkboxes)
  const BooleanInput = ({
    optionName,
    currentValue,
  }: {
    optionName: keyof ReactRealTimeVADOptions
    currentValue: boolean
  }) => (
    <input
      type="checkbox"
      checked={currentValue}
      onChange={(e) => handleInputChange(optionName, e.target.checked)}
      className="rounded mx-5"
    />
  )

  // Form component for model selection (dropdown)
  const ModelSelect = ({
    optionName,
    currentValue,
  }: {
    optionName: keyof ReactRealTimeVADOptions
    currentValue: string
  }) => (
    <select
      value={currentValue}
      onChange={(e) => handleInputChange(optionName, e.target.value)}
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
  }: {
    optionName: keyof ReactRealTimeVADOptions
    currentValue: number
  }) => (
    <input
      type="number"
      value={currentValue}
      onChange={(e) =>
        handleInputChange(optionName, parseFloat(e.target.value) || 0)
      }
      className="rounded mx-5"
    />
  )

  // Form component for float values (thresholds)
  const FloatInput = ({
    optionName,
    currentValue,
  }: {
    optionName: keyof ReactRealTimeVADOptions
    currentValue: number
  }) => (
    <input
      type="number"
      step="0.01"
      value={currentValue}
      onChange={(e) =>
        handleInputChange(optionName, parseFloat(e.target.value) || 0)
      }
      className="rounded mx-5"
    />
  )

  // Form component for text values
  const TextInput = ({
    optionName,
    currentValue,
  }: {
    optionName: keyof ReactRealTimeVADOptions
    currentValue: string
  }) => (
    <input
      type="text"
      value={currentValue}
      onChange={(e) => handleInputChange(optionName, e.target.value)}
      className="rounded mx-5"
    />
  )

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
      return <BooleanInput optionName={optionName} currentValue={newValue} />
    }

    if (optionName === "model") {
      return <ModelSelect optionName={optionName} currentValue={newValue} />
    }

    // Use FloatInput for threshold values
    if (
      optionName === "positiveSpeechThreshold" ||
      optionName === "negativeSpeechThreshold" ||
      optionName === "userSpeakingThreshold"
    ) {
      return <FloatInput optionName={optionName} currentValue={newValue} />
    }

    if (typeof currentValue === "number") {
      return <NumberInput optionName={optionName} currentValue={newValue} />
    }

    return <TextInput optionName={optionName} currentValue={newValue} />
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

              return (
                <tr key={optionName}>
                  <th>{optionName}</th>
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
