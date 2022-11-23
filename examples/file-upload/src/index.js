import * as vad from "@ricky0123/vad"
import Alpine from "alpinejs"
window.Alpine = Alpine
Alpine.start()

const SEC = 1000
const MIN = 60 * SEC
const HRS = 60 * MIN

const formatMS = (ms) => {
  let hrs = Math.floor(ms / HRS)
  let min = Math.floor((ms % HRS) / MIN)
  let sec = Math.floor((ms % MIN) / SEC)
  return `${hrs}:${min}:${sec}`
}

async function main() {
  // Feed audio to vad through websocket
  const ctx = new AudioContext()

  const gainNode = new GainNode(ctx)

  let items = []

  const myvad = await vad.AudioSegmentVAD.new({
    onSpeechEnd: (data) => {
      const wavBuffer = vad.utils.encodeWAV(data.audio)
      const base64 = vad.utils.arrayBufferToBase64(wavBuffer)
      const audioSrc = `data:audio/wav;base64,${base64}`
      items.push({
        audioSrc,
        start: formatMS(data.start),
        end: formatMS(data.end),
      })
    },
  })

  window.submitFile = async (ev) => {
    ev.preventDefault()
    items = []
    const audioForm = document.getElementById("file-upload").files[0]
    const { audio, sampleRate } = await vad.utils.audioFileToArray(audioForm)
    await myvad.run(audio, sampleRate)
    return items
  }
}
main()
