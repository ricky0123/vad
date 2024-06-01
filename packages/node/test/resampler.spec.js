const vad = require("@ricky0123/vad-node")
const { assert } = require("chai")
const { audioSamplePath } = require("./utils")
const fs = require("fs")
const wav = require("wav-decoder")

function loadAudio(audioPath) {
  let buffer = fs.readFileSync(audioPath)
  let result = wav.decode.sync(buffer)
  let audioData = new Float32Array(result.channelData[0].length)
  for (let i = 0; i < audioData.length; i++) {
    audioData[i] = result.channelData[0][i] // Assuming mono channel for simplicity
  }
  return [audioData, result.sampleRate]
}

describe("Resampler", function () {
  const testCases = [
    { targetSampleRate: 8000, targetFrameSize: 160 },
    { targetSampleRate: 16000, targetFrameSize: 320 },
    { targetSampleRate: 22050, targetFrameSize: 441 },
    { targetSampleRate: 44100, targetFrameSize: 882 }
  ];

  describe("process", function() {
    const testCases = [
      { targetSampleRate: 8000, targetFrameSize: 160 },
      { targetSampleRate: 16000, targetFrameSize: 320 },
      { targetSampleRate: 22050, targetFrameSize: 441 },
      { targetSampleRate: 44100, targetFrameSize: 882 }
    ];

    testCases.forEach(({ targetSampleRate, targetFrameSize }) => {
      it(`should correctly resample audio to ${targetSampleRate} Hz with frame size ${targetFrameSize}`, async function () {
        const [audioData, nativeSampleRate] = loadAudio(audioSamplePath);

        const resampler = new vad.Resampler({
          nativeSampleRate: nativeSampleRate,
          targetSampleRate: targetSampleRate,
          targetFrameSize: targetFrameSize
        });

        const outputFrames = resampler.process(audioData);

        // Calculate expected number of frames, discarding partial frame at the end
        const duration = audioData.length / nativeSampleRate;
        const expectedNumberOfFrames = Math.floor(duration * targetSampleRate / targetFrameSize);

        assert.equal(outputFrames.length, expectedNumberOfFrames, "Number of output frames does not match expected");

        // Check if the frame size is correct
        outputFrames.forEach(frame => {
          assert.equal(frame.length, targetFrameSize, "Output frame size is incorrect");
        });
      });
    });
  });

  describe("stream", function () {
    const testCases = [
      { targetSampleRate: 8000, targetFrameSize: 160 },
      { targetSampleRate: 16000, targetFrameSize: 320 },
      { targetSampleRate: 22050, targetFrameSize: 441 },
      { targetSampleRate: 44100, targetFrameSize: 882 }
    ];

    testCases.forEach(({ targetSampleRate, targetFrameSize }) => {
      it(`should stream resampled audio frames correctly at ${targetSampleRate} Hz with frame size ${targetFrameSize}`, async function () {
        const [audioData, nativeSampleRate] = loadAudio(audioSamplePath);

        const resampler = new vad.Resampler({
          nativeSampleRate: nativeSampleRate,
          targetSampleRate: targetSampleRate,
          targetFrameSize: targetFrameSize
        });

        const frameStream = resampler.stream(audioData);
        let frameCount = 0;
        let allFramesCorrectSize = true;

        for await (const frame of frameStream) {
          frameCount++;
          if (frame.length !== targetFrameSize) {
            allFramesCorrectSize = false;
            break;
          }
        }

        const expectedNumberOfFrames = Math.floor(audioData.length / nativeSampleRate * targetSampleRate / targetFrameSize);
        assert.equal(frameCount, expectedNumberOfFrames, "Number of streamed frames does not match expected");
        assert.isTrue(allFramesCorrectSize, "Not all frames are of the correct size");
      });
    });
  });
});
