// @ts-nocheck

import * as vad from "@ricky0123/vad-web"

function getToggleButton() {
  return document.getElementById("toggleVAD")
}

async function main() {
  try {
    const myvad = await vad.MicVAD.new({
      workletURL: "http://localhost:8080/vad.worklet.bundle.min.js",
      modelURL: "http://localhost:8080/silero_vad.onnx",
      onSpeechStart: () => {
        console.log("Speech start")
      },
      onSpeechEnd: (arr) => {
        console.log("Speech end")
        const wavBuffer = vad.utils.encodeWAV(arr)
        const base64 = vad.utils.arrayBufferToBase64(wavBuffer)
        const url = `data:audio/wav;base64,${base64}`
        const el = addAudio(url)
        const speechList = document.getElementById("audio-list")
        speechList.prepend(el)
      },
    })

    window.myvad = myvad
    getToggleButton().classList.remove("is-loading")

    window.toggleVAD = () => {
      if (myvad.listening === false) {
        console.log("run start vad")
        myvad.start()
        getToggleButton().textContent = "Stop VAD"
      } else {
        console.log("run pause vad")
        myvad.pause()
        getToggleButton().textContent = "Start VAD"
      }
    }
    window.toggleVAD()
    getToggleButton().disabled = false
  } catch (e) {
    console.error("Failed:", e)
  }

  function addAudio(audioUrl) {
    const entry = document.createElement("li")
    const audio = document.createElement("audio")
    audio.controls = true
    audio.src = audioUrl
    entry.appendChild(audio)
    return entry
  }
}

main()
