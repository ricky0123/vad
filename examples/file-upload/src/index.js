import * as vad from "@ricky0123/vad"

async function main() {
  const myvad = await vad.FileVAD.new({
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
    const audio = document.getElementById("file-upload").files[0]
    await myvad.run(audio)
  }
}
main()
