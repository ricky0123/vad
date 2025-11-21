export function minFramesForTargetMS(
  targetDuration: number,
  frameSamples: number,
  sr = 16000
): number {
  return Math.ceil((targetDuration * sr) / 1000 / frameSamples)
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  const binary = new Array(len)
  for (let i = 0; i < len; i++) {
    const byte = bytes[i]
    if (byte === undefined) {
      break
    }
    binary[i] = String.fromCharCode(byte)
  }
  return btoa(binary.join(""))
}

/*
This rest of this was mostly copied from https://github.com/linto-ai/WebVoiceSDK
*/

export function encodeWAV(
  samples: Float32Array,
  format: number = 3,
  sampleRate: number = 16000,
  numChannels: number = 1,
  bitDepth: number = 32
) {
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)
  /* RIFF identifier */
  writeString(view, 0, "RIFF")
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  /* RIFF type */
  writeString(view, 8, "WAVE")
  /* format chunk identifier */
  writeString(view, 12, "fmt ")
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, format, true)
  /* channel count */
  view.setUint16(22, numChannels, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true)
  /* bits per sample */
  view.setUint16(34, bitDepth, true)
  /* data chunk identifier */
  writeString(view, 36, "data")
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true)
  if (format === 1) {
    // Raw PCM
    floatTo16BitPCM(view, 44, samples)
  } else {
    writeFloat32(view, 44, samples)
  }
  return buffer
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i] as number, true)
  }
}

function floatTo16BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array
) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i] as number))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

export async function audioFileToArray(audioFileData: Blob) {
  const ctx = new OfflineAudioContext(1, 1, 44100)
  const reader = new FileReader()
  let audioBuffer: AudioBuffer | null = null
  await new Promise<void>((res) => {
    reader.addEventListener("loadend", () => {
      const audioData = reader.result as ArrayBuffer
      void ctx.decodeAudioData(
        audioData,
        (buffer) => {
          audioBuffer = buffer
          ctx
            .startRendering()
            .then(() => {
              console.log("Rendering completed successfully")
              res()
            })
            .catch((err: unknown) => {
              console.error("Rendering failed: ", err)
            })
        },
        (e) => {
          console.log("Error with decoding audio data: ", e)
        }
      )
    })
    reader.readAsArrayBuffer(audioFileData)
  })
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (audioBuffer === null) {
    throw Error("some shit")
  }
  const _audioBuffer = audioBuffer as AudioBuffer
  const out = new Float32Array(_audioBuffer.length)
  for (let i = 0; i < _audioBuffer.length; i++) {
    for (let j = 0; j < _audioBuffer.numberOfChannels; j++) {
      const sample = _audioBuffer.getChannelData(j)[i]
      const current = out[i]
      if (sample === undefined || current === undefined) {
        throw new Error("sample or out[i] is undefined")
      }
      out[i] = current + sample
    }
  }
  return { audio: out, sampleRate: _audioBuffer.sampleRate }
}
