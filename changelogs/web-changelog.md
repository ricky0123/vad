# @ricky0123/vad-web Changelog

## 0.0.19

* options for AudioWorkletNode can be passed in to MicVAD constructor
* audio frame is converted to an instance of Float32Array when running in a Firefox extension [#141] https://github.com/ricky0123/vad/issues/141

## 0.0.18

* use modified resampler

## 0.0.17

* look, by default, in web root for silero_vad.onnx and vad.bundle.min.js
* add error message in console with information about expected worklet/model location when missing
* add support for ONNX Runtime configuration
* add Dockerfile for testing in non-Ubuntu environments

## 0.0.16

* stop stream after destroy is called ([#72](https://github.com/ricky0123/vad/pull/72))
