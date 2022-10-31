# Voice Activity Detection for the Browser

[![npm version](https://badge.fury.io/js/@ricky0123%2Fvad.svg)](https://badge.fury.io/js/@ricky0123%2Fvad)

This package aims to provide an accurate, user-friendly voice activity detector that runs in the browser. Currently, it runs [Silero VAD](https://github.com/snakers4/silero-vad) [[1]](#1) in the browser using [ONNX Runtime Web](https://github.com/microsoft/onnxruntime/tree/main/js/web).

A demo is hosted at [vad-demo-script.vercel.app](https://vad-demo-script.vercel.app/). The source code for the demo can be found [here](./examples/demo/). A separate demo showing how to use the VAD with a bundler like webpack can be found [here](./examples/file-upload/).

The API works as follows:

1. Create the VAD object with a line such as

   ```javascript
   const myvad = await vad.MicVAD.new(options)
   ```

   `options` can include any of the parameters defined [here](./src/index.ts#L14). It essentially consists of callbacks that run on every audio frame, whenever a speech start is detected, whenever speech ends, etc, as well as parameters that control the voice activity detection algorithm.

2. Start and pause the VAD object as needed with `myvad.start()` and `myvad.pause()`. The object starts in the paused state.

# References

<a id="1">[1]</a>
Silero Team. (2021).
Silero VAD: pre-trained enterprise-grade Voice Activity Detector (VAD), Number Detector and Language Classifier.
GitHub, GitHub repository, https://github.com/snakers4/silero-vad, hello@silero.ai.
