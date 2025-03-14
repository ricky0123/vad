import type { ReactRealTimeVADOptions } from "@ricky0123/vad-react"
import { getDefaultReactRealTimeVADOptions, useMicVAD, utils } from "@ricky0123/vad-react"
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

const parsers: Partial<
  Record<keyof ReactRealTimeVADOptions, (val: string) => string | boolean | number>
> = {
  model: (val: string) => val,
  baseAssetPath: (val: string) => val,
  onnxWASMBasePath: (val: string) => val,
  submitUserSpeechOnPause: (val: string) => val === 'true',
  positiveSpeechThreshold: (val: string) => parseFloat(val),
  negativeSpeechThreshold: (val: string) => parseFloat(val),
  frameSamples: (val: string) => parseInt(val),
  redemptionFrames: (val: string) => parseInt(val),
  preSpeechPadFrames: (val: string) => parseInt(val),
  minSpeechFrames: (val: string) => parseInt(val),
  startOnLoad: (val: string) => val === 'true',
  userSpeakingThreshold: (val: string) => parseFloat(val),
}

const defaultParams: Partial<ReactRealTimeVADOptions> = Object.fromEntries(
  Object.entries(getDefaultReactRealTimeVADOptions("legacy")).filter(
    ([key, value]) => {
      return key in parsers
    }
  ).map(([key, value]) => {
    return [key, value]
  })
)

const getOptionsFromHash = () => {
  const hash = window.location.hash
  if (!hash) return {}
  const params = new URLSearchParams(hash.slice(1))
  const opts = params.get('opts')
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
  ...getOptionsFromHash()
}

function App() {
  const [initializationParameters, setVadParams] = useState(opts)
  const [newVadParams, setNewVadParams] = useState({})
  const [demo, setDemo] = useState(true)

  const handleInputChange = (optionName, newValue) => {
    setNewVadParams((prevValues) => ({
      ...prevValues,
      [optionName]: parsers[optionName](newValue)
    }))
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

    await new Promise(resolve => setTimeout(resolve, 1000));
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
            {Object.keys(initializationParameters).map((optionName) => {
              return (
                <tr key={optionName}>
                  <th>{optionName}</th>
                  <th>{initializationParameters[optionName].toString()}</th>
                  <th>
                    <input
                      className="rounded mx-5"
                      type="text"
                      onChange={(e) =>
                        handleInputChange(optionName, e.target.value)
                      }
                    />
                  </th>
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
        {demo && <VADDemo initializationParameters={initializationParameters} />}
      </div>
    </div>
  )
}

function VADDemo({ initializationParameters }) {
  const [audioList, setAudioList] = useState<string[]>([])
  const vad = useMicVAD({
    ...initializationParameters,
    onVADMisfire: () => {
      console.log("Vad misfire")
    },
    onFrameProcessed: (probabilities, frame) => {
    },
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
              vad[methodName]()
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
                <th>{vad[attribute].toString()}</th>
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
