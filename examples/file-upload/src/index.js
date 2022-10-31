import * as vad from "@ricky0123/vad"

async function main() {
  // Feed audio to vad through websocket
  const ctx = new AudioContext()

  const gainNode = new GainNode(ctx)

  const myvad = await vad.AudioNodeVAD.new(ctx, {
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
  myvad.receive(gainNode)
  myvad.start()

  window.submitFile = (ev) => {
    ev.preventDefault()
    const audioForm = document.getElementById("file-upload").files[0]
    const audioDataUrl = URL.createObjectURL(audioForm)
    const audio = new Audio(audioDataUrl)
    const audioNode = ctx.createMediaElementSource(audio)
    audioNode.connect(gainNode)
    audio.play()
  }
}
main()
