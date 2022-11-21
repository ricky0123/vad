const sinon = require("sinon")
const vad = require("../dist/index.node")
const wav = require("wav-decoder")
const { audioSamplePath } = require("./utils")
const fs = require("fs")
const { assert } = require("chai")

function loadAudio(audioPath) {
  let buffer = fs.readFileSync(audioPath)
  let result = wav.decode.sync(buffer)
  let audioData = new Float32Array(result.channelData[0].length)
  for (let i = 0; i < audioData.length; i++) {
    for (let j = 0; j < result.channelData.length; j++) {
      audioData[i] += result.channelData[j][i]
    }
  }
  return [audioData, result.sampleRate]
}

describe("audio segment api", function () {
  it("process wav file", async function () {
    const [audioData, sampleRate] = loadAudio(audioSamplePath)
    let endpoints = []
    const options = {
      onSpeechEnd: (audio) => {
        endpoints.push(audio)
      },
    }
    const myvad = await vad.AudioSegmentVAD.new(options)
    await myvad.run(audioData, sampleRate)
    assert.equal(endpoints.length, 1)
  })
})
