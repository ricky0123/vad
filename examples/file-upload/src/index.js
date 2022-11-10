import * as vad from "@ricky0123/vad"

async function main() {
  const offlineCtx = new OfflineAudioContext(2, 44100 * 40, 44100)

  const myvad = await vad.AudioNodeVAD.new(offlineCtx, {
    onFrameProcessed: (probs) => {
      const element = document.getElementById("frameCounter")
      const val = parseInt(element.textContent)
      element.textContent = val + 1
    },
    onSpeechStart: () => {
      const element = document.getElementById("speechStartCounter")
      const val = parseInt(element.textContent)
      element.textContent = val + 1
    },
    onSpeechEnd: (arr) => {
      const element = document.getElementById("speechEndCounter")
      const val = parseInt(element.textContent)
      element.textContent = val + 1
    },
  })
  myvad.start()

  window.submitFile = (ev) => {
    ev.preventDefault()
    const audioForm = document.getElementById("file-upload").files[0]
    const source = offlineCtx.createBufferSource()
    const reader = new FileReader()
    reader.addEventListener("loadend", (ev) => {
      const audioData = reader.result
      offlineCtx.decodeAudioData(
        audioData,
        (buffer) => {
          source.buffer = buffer
          myvad.receive(source)
          source.start()
          offlineCtx
            .startRendering()
            .then((renderedBuffer) => {
              console.log("Rendering completed successfully")
            })
            .catch((err) => {
              console.error(`Rendering failed: ${err}`)
            })
        },
        (e) => {
          console.log(`Error with decoding audio data: ${e}`)
        }
      )
    })
    reader.readAsArrayBuffer(audioForm)
  }
}
main()
