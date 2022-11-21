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
    // true endpoint are about 2.1 sec to 3.2 sec
    let endpoints = []
    const options = {
      onSpeechStart: (start) => {
        endpoints.push([start])
      },
      signalMisfire: () => {
        endpoints.pop()
      },
      onSpeechEnd: (audio, end) => {
        endpoints[endpoints.length - 1].push(end)
      },
    }
    const myvad = await vad.AudioSegmentVAD.new(options)
    await myvad.run(audioData, sampleRate)
    assert.equal(endpoints.length, 1)
    const [start, end] = endpoints[0]
    assert.isTrue(1900 <= start && start <= 2400)
    assert.isTrue(3200 <= end && end <= 4200)
  })
})
