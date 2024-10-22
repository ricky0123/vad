// @ts-nocheck
import { useMicVAD, utils } from "@ricky0123/vad-react"
import type { ReactRealTimeVADOptions } from "@ricky0123/vad-react"
import * as ort from "onnxruntime-web"
import React, { useState } from "react"
import { createRoot } from "react-dom/client"

React // prevent prettier imports plugin from removing React

ort.env.wasm.wasmPaths = {
  "ort-wasm-simd-threaded.wasm": "/ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
  "ort-wasm.wasm": "/ort-wasm.wasm",
  "ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
}

const domContainer = document.querySelector("#root")
const root = createRoot(domContainer)
root.render(<App />)

const vadAttributes = ["errored", "loading", "listening", "userSpeaking"]
const vadMethods = ["pause", "start", "toggle"]
const defaultVadParams: ReactRealTimeVADOptions = {
  workletURL: "vad.worklet.bundle.min.js",
  modelURL: "silero_vad.onnx",
  submitUserSpeechOnPause: false
}

function App() {
  const [initializtionParameters, setVadParams] = useState(defaultVadParams)
  const [newVadParams, setNewVadParams] = useState({})

  const handleInputChange = (optionName, newValue) => {
    setNewVadParams((prevValues) => ({
      ...prevValues,
      [optionName]: newValue,
    }))
  }

  const handleRestart = () => {
    setVadParams((prevParams) => ({
      ...prevParams,
      ...newVadParams,
    }))
  }

  return (
    <div className="mb-3">
      <h3>Initialization parameters</h3>
      <table className="mx-auto">
        <thead>
          <tr>
            <th>Option</th>
            <th>Current Value</th>
            <th>New Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(initializtionParameters).map((optionName) => {
            return (
              <tr key={optionName}>
                <th>{optionName}</th>
                <th>{initializtionParameters[optionName].toString()}</th>
                <th>
                  <input
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
      <button
        className="bg-violet-100 hover:bg-violet-200 rounded-full px-4 py-2"
        onClick={handleRestart}
      >
        Restart
      </button>
      <VADDemo initializtionParameters={initializtionParameters} />
    </div>
  )
}

function VADDemo({ initializtionParameters }) {
  const [audioList, setAudioList] = useState([])
  const vad = useMicVAD({
    ...initializtionParameters,
    onVADMisfire: () => {
      console.log("Vad misfire")
    },
    onSpeechStart: () => {
      console.log("Speech start")
    },
    onSpeechEnd: (audio) => {
      console.log("Speech end")
      const wavBuffer = utils.encodeWAV(audio)
      const base64 = utils.arrayBufferToBase64(wavBuffer)
      const url = `data:audio/wav;base64,${base64}`
      setAudioList((old) => [url, ...old])
    },
  })
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
