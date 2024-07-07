# Real-Time Voice Activity Detection for Node.JS

This is a fork of [@ricky0123/vad](https://github.com/ricky0123/vad) which adds `RealTimeVAD` by building on top of `NonRealTimeVAD` provided.

## Quick Start

To use the VAD via a script tag in the browser, include the following script tags:

```js
const vad = /** import */;

const options = {
  sampleRate: 16000, // Sample rate of input audio
  minBufferDuration: 1, // minimum audio buffer to store 
  maxBufferDuration: 5, // maximum audio buffer to store
  overlapDuration: 0.1,  // how much of the previous buffer exists in the new buffer
  silenceThreshold: 0.5, // threshold for ignoring pauses in speech
};

const rtvad = new vad.RealTimeVAD(/** options */);

rtvad.init();

rtvad.on("start", ({ start }) => {
  // speech segment start
});

rtvad.on("data", ({ audio, start, end}) => {
  // speech segment data
  // start & end here are provided by @ricky0123/vad, this is NOT the same as emitted start & end
});

rtvad.on("end", ({ end }) => {
  // speech segment end
});

```

## References

<a id="1">[1]</a>
Silero Team. (2021).
Silero VAD: pre-trained enterprise-grade Voice Activity Detector (VAD), Number Detector and Language Classifier.
GitHub, GitHub repository, https://github.com/snakers4/silero-vad, hello@silero.ai.
