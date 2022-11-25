# Voice Activity Detection for the Browser

[![npm version](https://badge.fury.io/js/@ricky0123%2Fvad.svg)](https://badge.fury.io/js/@ricky0123%2Fvad)

This package aims to provide an accurate, user-friendly voice activity detector (VAD) that runs in the browser. It also has limited support for node. Currently, it runs [Silero VAD](https://github.com/snakers4/silero-vad) [[1]](#1) using [ONNX Runtime Web](https://github.com/microsoft/onnxruntime/tree/main/js/web) / [ONNX Runtime Node.js](https://github.com/microsoft/onnxruntime/tree/main/js/node).

## Installation

### Script tags

To use the VAD via a script tag in the browser, include the following script tags:

```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@ricky0123/vad/dist/index.browser.js"></script>
<script>
  async function main() {
    const myvad = await vad.MicVAD.new()
    ...
  }
  main()
</script>
```

### Bundler

To use the VAD in a webpack project, run

```sh
npm i @ricky0123/vad onnxruntime-web
```

and add the following to your webpack.config.js:

```js
const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
  // ...
  plugins: [
    // ...
    new CopyPlugin({
      patterns: [
        // ...
        {
          from: "node_modules/@ricky0123/vad/dist/*.worklet.js",
          to: "[name][ext]",
        },
        { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "[name][ext]" },
      ],
    }),
  ],
}
```

With other bundlers, you will have to make sure that you are serving the onnxruntime-web wasm files and the worklet file from this project.

### Node

For a server-side node project, run

```sh
npm i @ricky0123 onnxruntime-node
```

and in your code

```js
const vad = require("@ricky0123/vad/dist/index.node")
const myvad = await vad.NonRealTimeVad.new()
// ...
```

Note the weird import and that we install `onnxruntime-node` instead of `onnxruntime-web`.

## Customizing the behavior of the VAD algorithm

The VAD algorithm works as follows:

1. Sample rate conversion is performed on input audio so that the processed audio has a sample rate of 16000.
1. The converted samples are batched into "frames" of size `frameSamples` samples.
1. The Silero vad model is run on each frame and produces a number between 0 and 1 indicating the probability that the sample contains speech.
1. If the algorithm has not detected speech lately, then it is in a state of `not speaking`. Once it encounters a frame with speech probability greater than `positiveSpeechThreshold`, it is changed into a state of `speaking`. When it encounters `redemptionFrames` frames with speech probability less than `negativeSpeechThreshold` without having encounterd a frame with speech probability greater than `positiveSpeechThreshold`, the speech audio segment is considered to have ended and the algorithm returns to a state of `not speaking`. Frames with speech probability in between `negativeSpeechThreshold` and `positiveSpeechThreshold` are effectively ignored.
1. When the algorithm detects the end of a speech audio segment (i.e. goes from the state of `speaking` to `not speaking`), it counts the number of frames with speech probability greater than `positiveSpeechThreshold` in the audio segment. If the count is less than `minSpeechFrames`, then the audio segment is considered a false positive. Otherwise, `preSpeechPadFrames` frames are prepended to the audio segment and the segment is made accessible through the higher-level API.

The high-level API's that follow all accept certain common configuration parameters that modify the VAD algorithm.

- `positiveSpeechThreshold: number` - determines the threshold over which a probability is considered to indicate the presence of speech.
- `negativeSpeechThreshold: number` - determines the threshold under which a probability is considered to indicate the absence of speech.
- `redemptionFrames: number` - number of speech-negative frames to wait before ending a speech segment.
- `frameSamples: number` - the size of a frame in samples - 1536 by default and probably should not be changed.
- `preSpeechPadFrames: number` - number of audio frames to prepend to a speech segment.
- `minSpeechFrames: number` - minimum number of speech-positive frames for a speech segment.

## API

### NonRealTimeVAD (Node + Browser)

This API can be used if you have a `Float32Array` of audio samples and would like to extract chunks of speech audio with timestamps. This is useful if you want to run the VAD on audio from a file instead of real-time audio from a microphone.

The API works as follows:

```typescript
const options: Partial<vad.NonRealTimeVADOptions> = { /* ... */ }
const myvad = await vad.MicVAD.new(options)
const audioFileData, nativeSampleRate = ... // get audio and sample rate from file
for await (const {audio, start, end} of myvad.run(audioFileData, nativeSampleRate)) {
   // do stuff with audio, start, end
}
```

This API only takes the options that customize the VAD algorithm, discussed [above](#customizing-the-behavior-of-the-vad-algorithm).

The speech segments and timestamps are made accessible through an async iterator. In the example above, `audio` is a `Float32Array` of audio samples (of sample rate 16000) of a segment of speech, `start` is a number indicating the milliseconds since the start of the audio that the speech segment began, and `end` is a number indicating the milliseconds since the start of the audio that the speech segment ended.

### MicVAD (Browser only)

This API is used to run the VAD in real-time on microphone input in a browser. It has a callback-based API. It works as follows:

```typescript
const myvad = await vad.MicVAD.new({
  onFrameProcessed: (probabilities) => { ... },
  onSpeechStart: () => { ... },
  onVADMisfire: () => { ... },
  onSpeechEnd: (audio) => { ... },
})
myvad.start()
// myvad.pause, myvad.start, ...
```

It also takes the algorithm-modifying parameters defined [above](#customizing-the-behavior-of-the-vad-algorithm).

## References

<a id="1">[1]</a>
Silero Team. (2021).
Silero VAD: pre-trained enterprise-grade Voice Activity Detector (VAD), Number Detector and Language Classifier.
GitHub, GitHub repository, https://github.com/snakers4/silero-vad, hello@silero.ai.
