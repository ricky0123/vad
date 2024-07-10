export function minFramesForTargetMS(
  targetDuration: number,
  frameSamples: number,
  sr = 16000
): number {
  return Math.ceil((targetDuration * sr) / 1000 / frameSamples)
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = ""
  var bytes = new Uint8Array(buffer)
  var len = bytes.byteLength
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  return btoa(binary)
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
  var bytesPerSample = bitDepth / 8
  var blockAlign = numChannels * bytesPerSample
  var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  var view = new DataView(buffer)
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

function interleave(inputL: Float32Array, inputR: Float32Array) {
  var length = inputL.length + inputR.length
  var result = new Float32Array(length)
  var index = 0
  var inputIndex = 0
  while (index < length) {
    result[index++] = inputL[inputIndex] as number
    result[index++] = inputR[inputIndex] as number
    inputIndex++
  }
  return result
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (var i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i] as number, true)
  }
}

function floatTo16BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array
) {
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i] as number))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
