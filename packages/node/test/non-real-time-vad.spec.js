const vad = require("@ricky0123/vad-node")
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

describe("nonrealtime vad api", function () {
  it("process wav file", async function () {
    const [audioData, sampleRate] = loadAudio(audioSamplePath)
    // true endpoint are about 2.1 sec to 3.2 sec
    let endpoints = []
    const myvad = await vad.NonRealTimeVAD.new()
    for await (const { audio, start, end } of myvad.run(
      audioData,
      sampleRate
    )) {
      endpoints.push([start, end])
    }
    assert.equal(endpoints.length, 1)
    const [start, end] = endpoints[0]
    assert.isTrue(1900 <= start && start <= 2400)
    assert.isTrue(3600 <= end && end <= 4600, `Unexpected "end" value: ${end}`)
  })
})
