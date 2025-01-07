# @ricky0123/vad-web Changelog

## 0.0.23

* add support to change VAD parameters dynamically [#137] https://github.com/ricky0123/vad/issues/173
* add onRealSpeechStart callback - "not a misfire" event (https://github.com/ricky0123/vad/issues/67)

## 0.0.22

* add support for some mobile Safari browsers that do not support AudioWorkletNode [37?] https://github.com/ricky0123/vad/issues/37


## 0.0.21

* initial support for silero v5
* baseAssetPath + onnxWASMBasePath method of specifying onnx/worklet/wasm files

## 0.0.19

* options for AudioWorkletNode can be passed in to MicVAD constructor
* audio frame is converted to an instance of Float32Array when running in a Firefox extension [#141] https://github.com/ricky0123/vad/issues/141
* Fix userOnFrameProcessed callback (https://github.com/ricky0123/vad/pull/131)
* fix typos
* make arrayBufferToBase64 faster https://github.com/ricky0123/vad/pull/111
* fix blocking issue in resampler.stream (https://github.com/ricky0123/vad/pull/110)
* fix positiveSpeechThreshold validation (https://github.com/ricky0123/vad/pull/105)
* add frame to onFrameProcessedCallback

## 0.0.18

* use modified resampler

## 0.0.17

* look, by default, in web root for silero_vad.onnx and vad.bundle.min.js
* add error message in console with information about expected worklet/model location when missing
* add support for ONNX Runtime configuration
* add Dockerfile for testing in non-Ubuntu environments

## 0.0.16

* stop stream after destroy is called ([#72](https://github.com/ricky0123/vad/pull/72))
