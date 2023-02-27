---
slug: test
title: Readme
layout: layouts/docs.njk
---

# Voice Activity Detection for the Browser

> :warning: This project no longer publishes to the `@ricky0123/vad` npm package. Please use the new platform-specific packages: `@ricky0123/vad-web`, `@ricky0123/vad-node`, etc.

This package aims to provide an accurate, user-friendly voice activity detector (VAD) that runs in the browser. It also has limited support for node. Currently, it runs [Silero VAD](https://github.com/snakers4/silero-vad) [[1]](#1) using [ONNX Runtime Web](https://github.com/microsoft/onnxruntime/tree/main/js/web) / [ONNX Runtime Node.js](https://github.com/microsoft/onnxruntime/tree/main/js/node).

## Installation

### Script tags

To use the VAD via a script tag in the browser, include the following script tags:

```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@ricky0123/vad-web/dist/index.js"></script>
<script>
  async function main() {
    const myvad = await vad.MicVAD.new({
      onSpeechStart: () => {
        console.log("Speech start detected")
      },
      onSpeechEnd: (audio) => {
        // do something with `audio` (Float32Array of audio samples at sample rate 16000)...
      }
    })
    myvad.start()
  }
  main()
</script>
```

### Bundler

To use the VAD in a frontend project managed by a bundler like Webpack, run

```sh
npm i @ricky0123/vad-web onnxruntime-web
```

and use the following import in your code:

```typescript
import { MicVAD } from "@ricky0123/vad-web"
const myvad = await MicVAD.new({
  // ... callbacks/options
})
myvad.start()
```

You will also need to
1. serve the onnx file that comes distributed with `@ricky0123/vad-web`
1. serve the `vad.worklet.js` file that comes distributed with `@ricky0123/vad-web`
1. serve the wasm files that come distributed with the package `onnxruntime-web`

If you are using Webpack 5, this can be acheived by adding the following to your webpack.config.js:

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
          from: "node_modules/@ricky0123/vad-web/dist/*.worklet.js",
          to: "[name][ext]",
        },
        {
          from: "node_modules/@ricky0123/vad-web/dist/*.onnx",
          to: "[name][ext]",
        },
        { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "[name][ext]" },
      ],
    }),
  ],
}
```

### Node

For a server-side node project, run

```sh
npm i @ricky0123/vad-node onnxruntime-node
```

and in your code

```js
const vad = require("@ricky0123/vad-node")
const myvad = await vad.NonRealTimeVad.new()
// ...
```

Note that we are installing `onnxruntime-node` instead of `onnxruntime-web`.

## Customizing the behavior of the VAD algorithm

The VAD algorithm works as follows:

1. Sample rate conversion is performed on input audio so that the processed audio has a sample rate of 16000.
1. The converted samples are batched into "frames" of size `frameSamples` samples.
1. The Silero vad model is run on each frame and produces a number between 0 and 1 indicating the probability that the sample contains speech.
1. If the algorithm has not detected speech lately, then it is in a state of `not speaking`. Once it encounters a frame with speech probability greater than `positiveSpeechThreshold`, it is changed into a state of `speaking`. When it encounters `redemptionFrames` frames with speech probability less than `negativeSpeechThreshold` without having encountered a frame with speech probability greater than `positiveSpeechThreshold`, the speech audio segment is considered to have ended and the algorithm returns to a state of `not speaking`. Frames with speech probability in between `negativeSpeechThreshold` and `positiveSpeechThreshold` are effectively ignored.
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

It also takes 

* the algorithm-modifying parameters defined [above](#customizing-the-behavior-of-the-vad-algorithm).
* a parameter `additionalAudioConstraints` that is a [`MediaTrackConstraints`](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) object (minus a few keys that are set by default and not currently overridable). You can use this to, eg, force the use of a specific microphone by supplying the argument `additionalAudioConstraints: {devicedId: {exact: "...your.device.id"}}`

## References

<a id="1">[1]</a>
Silero Team. (2021).
Silero VAD: pre-trained enterprise-grade Voice Activity Detector (VAD), Number Detector and Language Classifier.
GitHub, GitHub repository, https://github.com/snakers4/silero-vad, hello@silero.ai.
