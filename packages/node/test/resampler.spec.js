const vad = require("@ricky0123/vad-node")
const { assert } = require("chai")
const { audioSamplePath } = require("./utils")
const fs = require("fs")
const wav = require("wav-decoder")
const crypto = require('crypto');

function loadAudio(audioPath) {
  let buffer = fs.readFileSync(audioPath)
  let result = wav.decode.sync(buffer)
  let audioData = new Float32Array(result.channelData[0].length)
  for (let i = 0; i < audioData.length; i++) {
    audioData[i] = result.channelData[0][i] // Assuming mono channel for simplicity
  }
  return [audioData, result.sampleRate]
}

function calculateChecksum(frames) {
  const hash = crypto.createHash('md5');
  for (const frame of frames) {
    hash.update(frame);
  }
  return hash.digest('hex');
}

describe("Resampler", function () {
  const testCases = [
    { targetSampleRate: 8000, targetFrameSize: 160, expectedNumberOfFrames: 256, expectedChecksum: '94932620f6779362614ecb0fd488a439'},
    { targetSampleRate: 16000, targetFrameSize: 320, expectedNumberOfFrames: 256, expectedChecksum: 'cc6cfee05d7f0117d0d1b03b561380fa'},
    { targetSampleRate: 22050, targetFrameSize: 441, expectedNumberOfFrames: 256, expectedChecksum: '074cc9ffaf685298f1d94277f2473387'},
    { targetSampleRate: 44100, targetFrameSize: 882, expectedNumberOfFrames: 256, expectedChecksum: 'e94ed059238fbc0331747e1642290a33'},
  ];

  function assertFramesAreResampled(outputFrames, expectedNumberOfFrames, expectedFrameSize) {
    assert.equal(
      outputFrames.length,
      expectedNumberOfFrames,
      "Number of output frames does not match expected"
    )

    outputFrames.forEach(frame => {
      assert.equal(
        frame.length,
        expectedFrameSize,
        `Each frame should be exactly ${expectedFrameSize} samples long`
      );
    });
  }

  describe("process", function () {
    testCases.forEach(({ targetSampleRate, targetFrameSize, expectedNumberOfFrames, expectedChecksum }) => {
      it(`should correctly resample audio to ${targetSampleRate} Hz with frame size ${targetFrameSize}`, async function () {
        const [audioData, nativeSampleRate] = loadAudio(audioSamplePath)

        const resampler = new vad.Resampler({
          nativeSampleRate: nativeSampleRate,
          targetSampleRate: targetSampleRate,
          targetFrameSize: targetFrameSize,
        })

        const resampledAudio = resampler.process(audioData)
        assertFramesAreResampled(resampledAudio, expectedNumberOfFrames, targetFrameSize)

        const checksum = calculateChecksum(resampledAudio);
        assert.equal(checksum, expectedChecksum, 'Resampled audio checksum does not match expected');
      })
    })
  })

  describe("stream", function () {
    testCases.forEach(({ targetSampleRate, targetFrameSize, expectedNumberOfFrames, expectedChecksum }) => {
      it(`should stream resampled audio frames correctly at ${targetSampleRate} Hz with frame size ${targetFrameSize}`, async function () {
        const [audioData, nativeSampleRate] = loadAudio(audioSamplePath)

        const resampler = new vad.Resampler({
          nativeSampleRate: nativeSampleRate,
          targetSampleRate: targetSampleRate,
          targetFrameSize: targetFrameSize,
        })

        const frameStream = resampler.stream(audioData)
        let frameCount = 0
        let allFramesCorrectSize = true
        let resampledAudio = []

        for await (const frame of frameStream) {
          frameCount++
          resampledAudio.push(frame)
          if (frame.length !== targetFrameSize) {
            allFramesCorrectSize = false
            break
          }
        }

        assertFramesAreResampled(resampledAudio, expectedNumberOfFrames, targetFrameSize)

        const checksum = calculateChecksum(resampledAudio);
        assert.equal(checksum, expectedChecksum, 'Resampled audio checksum does not match expected');
      })
    })
  })
})
