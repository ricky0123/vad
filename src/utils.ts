export function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = ""
  var bytes = new Uint8Array(buffer)
  var len = bytes.byteLength
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function audioFileToArray(audioFileData: Blob) {
  const ctx = new OfflineAudioContext(1, 1, 44100)
  const reader = new FileReader()
  let audioBuffer: AudioBuffer | null = null
  await new Promise<void>((res) => {
    reader.addEventListener("loadend", (ev) => {
      const audioData = reader.result as ArrayBuffer
      ctx.decodeAudioData(
        audioData,
        (buffer) => {
          audioBuffer = buffer
          ctx
            .startRendering()
            .then((renderedBuffer) => {
              console.log("Rendering completed successfully")
              res()
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
    reader.readAsArrayBuffer(audioFileData)
  })
  if (audioBuffer === null) {
    throw Error("some shit")
  }
  let _audioBuffer = audioBuffer as AudioBuffer
  let out = new Float32Array(_audioBuffer.length)
  for (let i = 0; i < _audioBuffer.length; i++) {
    for (let j = 0; j < _audioBuffer.numberOfChannels; j++) {
      out[i] += _audioBuffer.getChannelData(j)[i]
    }
  }
  return { audio: out, sampleRate: _audioBuffer.sampleRate }
}
