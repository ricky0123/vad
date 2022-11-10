import * as vad from "@ricky0123/vad"

async function main() {
  // Feed audio to vad through websocket
  const ctx = new AudioContext()

  const gainNode = new GainNode(ctx)

  const myvad = await vad.AudioSegmentVAD.new({
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

  window.submitFile = async (ev) => {
    ev.preventDefault()
    const audioForm = document.getElementById("file-upload").files[0]
    const { audio, sampleRate } = await vad.audioFileToArray(audioForm)
    await myvad.run(audio, sampleRate)
  }
}
main()
