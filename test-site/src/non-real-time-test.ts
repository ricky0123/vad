import { NonRealTimeVAD, utils } from "@ricky0123/vad-web"

;(window as any).testNonRealTime = async () => {
  const myvad = await NonRealTimeVAD.new()
  const fileEl = document.getElementById("file-upload") as HTMLInputElement
  const audioFile = (fileEl.files as FileList)[0] as File
  const { audio, sampleRate } = await utils.audioFileToArray(audioFile)
  let nSpeechSegments = 0
  for await (const { start, end } of myvad.run(audio, sampleRate)) {
    nSpeechSegments++
  }
  console.log(`Found ${nSpeechSegments} speech segments`)
}
