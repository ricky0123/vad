# API Reference


## MicVAD

The `MicVAD` API is for recording user audio in the browser and running callbacks on speech segments and related events.

### Support
| Package                | Supported                                      |
| ---------------------- | ---------------------------------------------- |
| `@ricky0123/vad-web`   | Yes                                            |
| `@ricky0123/vad-react` | No, use the [useMicVAD](api.md#usemicvad) hook |

### Example
```js linenums="1"
import { MicVAD } from "@ricky0123/vad-web"
const myvad = await MicVAD.new({
    onSpeechEnd: (audio) => {
        // do something with `audio` (Float32Array of audio samples at sample rate 16000)...
    },
})
myvad.start()
```

### Options
New instances of `MicVAD` are created by calling the async static method `MicVAD.new(options)`. The options object can contain the following fields (all are optional).

| Option                        | Type                                                          | Description                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalAudioConstraints`  | `Partial<MediaTrackConstraints>`                              | Additional [constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) to pass to [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) via the `audio` field. Note that some constraints (channelCount, echoCancellation, autoGainControl, noiseSuppression) are set by default. |
| `onFrameProcessed`            | `(probabilities: {isSpeech: float; notSpeech: float}, frame: Float32Array) => any` | Callback to run after each frame. The frame parameter contains the raw audio data for that frame.                                                                                                                    |
| `onVADMisfire`                | `() => any`                                                   | Callback to run if speech start was detected but `onSpeechEnd` will not be run because the audio segment is smaller than `minSpeechFrames`                                                                        |
| `onSpeechStart`               | `() => any`                                                   | Callback to run when speech start is detected                                                                                                                                                                     |
| `onSpeechEnd`                 | `(audio: Float32Array) => any`                                | Callback to run when speech end is detected. Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000. This will not run if the audio segment is smaller than `minSpeechFrames`           |
| `positiveSpeechThreshold`     | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `negativeSpeechThreshold`     | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `redemptionFrames`            | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `frameSamples`                | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `preSpeechPadFrames`          | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `minSpeechFrames`             | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `model` | `"v5" or "legacy"` (default `"legacy"`) | whether to use the new Silero model or not |
| `baseAssetPath` | `string`) | URL or path relative to webroot where `vad.worklet.bundle.min.js`, `silero_vad_legacy.onnx`, and `silero_vad_v5.onnx` will be loaded from |
| `onnxWASMBasePath` | `string`) | URL or path relative to webroot where wasm files for onnxruntime-web will be loaded from |

### Attributes
| Attributes  | Type         | Description                                        |
| ----------- | ------------ | -------------------------------------------------- |
| `listening` | `boolean`    | Is the VAD listening to mic input or is it paused? |
| `pause`     | `() => void` | Stop listening to mic input                        |
| `start`     | `() => void` | Start listening to mic input                       |


## NonRealTimeVAD
The `NonRealTimeVAD` API is for identifying segments of user speech if you already have a Float32Array of audio samples.

### Support
| Package                | Supported |
| ---------------------- | --------- |
| `@ricky0123/vad-web`   | Yes       |
| `@ricky0123/vad-react` | No        |

### Example
```js linenums="1"
const vad = require("@ricky0123/vad-node") // or @ricky0123/vad-web

const options: Partial<vad.NonRealTimeVADOptions> = { /* ... */ }
const myvad = await vad.NonRealTimeVAD.new(options)
const audioFileData, nativeSampleRate = ... // get audio and sample rate from file or something
for await (const {audio, start, end} of myvad.run(audioFileData, nativeSampleRate)) {
   // do stuff with
   //   audio (float32array of audio)
   //   start (milliseconds into audio where speech starts)
   //   end (milliseconds into audio where speech ends)
}
```

### Options
New instances of `MicVAD` are created by calling the async static method `MicVAD.new(options)`. The options object can contain the following fields (all are optional).

| Option                    | Type     | Description                                               |
| ------------------------- | -------- | --------------------------------------------------------- |
| `positiveSpeechThreshold` | `number` | [see algorithm configuration](algorithm.md#configuration) |
| `negativeSpeechThreshold` | `number` | [see algorithm configuration](algorithm.md#configuration) |
| `redemptionFrames`        | `number` | [see algorithm configuration](algorithm.md#configuration) |
| `frameSamples`            | `number` | [see algorithm configuration](algorithm.md#configuration) |
| `preSpeechPadFrames`      | `number` | [see algorithm configuration](algorithm.md#configuration) |
| `minSpeechFrames`         | `number` | [see algorithm configuration](algorithm.md#configuration) |

### Attributes
| Attributes  | Type                                                                             | Description                     |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------- |
| `run`       | `async function* (inputAudio: Float32Array, sampleRate: number): AsyncGenerator` | Run the VAD model on your audio |


## useMicVAD
A React hook wrapper for [MicVAD](api.md#micvad). Use this if you want to run the VAD model on mic input in a React application.

### Support
| Package                | Supported                       |
| ---------------------- | ------------------------------- |
| `@ricky0123/vad-web`   | No, use [MicVAD](api.md#micvad) |
| `@ricky0123/vad-react` | Yes                             |

### Example
```js linenums="1"
import { useMicVAD } from "@ricky0123/vad-react"

const MyComponent = () => {
  const vad = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      console.log("User stopped talking")
    },
  })
  return <div>{vad.userSpeaking && "User is speaking"}</div>
}
```

### Options
The `useMicVAD` hook takes an options object with the following fields (all optional).

| Option                        | Type                                                          | Description                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startOnLoad`                 | `boolean`                                                     | Should the VAD start listening to mic input when it finishes loading?                                                                                                                                             |
| `additionalAudioConstraints`  | `Partial<MediaTrackConstraints>`                              | Additional [constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) to pass to [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) via the `audio` field. Note that some constraints (channelCount, echoCancellation, autoGainControl, noiseSuppression) are set by default. |
| `onFrameProcessed`            | `(probabilities: {isSpeech: float; notSpeech: float}, frame: Float32Array) => any` | Callback to run after each frame. The frame parameter contains the raw audio data for that frame.                                                                                                                    |
| `onVADMisfire`                | `() => any`                                                   | Callback to run if speech start was detected but `onSpeechEnd` will not be run because the audio segment is smaller than `minSpeechFrames`                                                                        |
| `onSpeechStart`               | `() => any`                                                   | Callback to run when speech start is detected                                                                                                                                                                     |
| `onSpeechEnd`                 | `(audio: Float32Array) => any`                                | Callback to run when speech end is detected. Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000. This will not run if the audio segment is smaller than `minSpeechFrames`           |
| `positiveSpeechThreshold`     | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `negativeSpeechThreshold`     | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `redemptionFrames`            | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `frameSamples`                | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `preSpeechPadFrames`          | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |
| `minSpeechFrames`             | `number`                                                      | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         |

### Returns
| Attributes     | Type                            | Description                                  |
| -------------- | ------------------------------- | -------------------------------------------- |
| `listening`    | `boolean`                       | Is the VAD currently listening to mic input? |
| `errored`      | `false \| { message: string; }` | Did the VAD fail to load?                    |
| `loading`      | `boolean`                       | Did the VAD finish loading?                  |
| `userSpeaking` | `boolean`                       | Is the user speaking?                        |
| `pause`        | `() => void`                    | Stop the VAD from running on mic input       |
| `start`        | `() => void`                    | Start running the VAD on mic input           |
