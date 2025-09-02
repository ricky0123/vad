# API Reference


## MicVAD

The `MicVAD` API is for recording user audio in the browser and running callbacks on speech segments and related events.

### Support
| Package                | Type       | Supported                                      | Description |
| ---------------------- | ---------- | ---------------------------------------------- | ----------- |
| `@ricky0123/vad-web`   | `package`  | Yes                                            |             |
| `@ricky0123/vad-react` | `package`  | No, use the [useMicVAD](api.md#usemicvad) hook |             |

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

| Option                        | Type                                                          | Default                                      | Description                                                                                                                                                                                                       | 
| ----------------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | 
| `getStream`                   | `() => Promise<MediaStream>`                                  | Default getUserMedia with standard audio constraints | Function that returns a Promise resolving to a MediaStream. By default, creates a stream with standard audio constraints (channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true). Override this to use custom audio constraints or provide your own stream. | 
| `pauseStream`                 | `(stream: MediaStream) => Promise<void>`                      | Stops all tracks in the stream | Function called when the VAD is paused. By default, stops all tracks in the provided stream. Override this to implement custom pause behavior. | 
| `resumeStream`                | `(stream: MediaStream) => Promise<MediaStream>`               | Creates new stream with standard audio constraints | Function called when the VAD is resumed. By default, creates a new stream with standard audio constraints. Override this to implement custom resume behavior. | 
| `onFrameProcessed`            | `(probabilities: {isSpeech: float; notSpeech: float}, frame: Float32Array) => any` | `() => {}`                                      | Callback to run after each frame. The frame parameter contains the raw audio data for that frame.                                                                                                                    | 
| `onVADMisfire`                | `() => any`                                                   | `() => {}`                                      | Callback to run if speech start was detected but `onSpeechEnd` will not be run because the audio segment is smaller than `minSpeechMs`                                                                        | 
| `onSpeechStart`               | `() => any`                                                   | `() => {}`                                      | Callback to run when speech start is detected                                                                                                                                                                     | 
| `onSpeechRealStart`           | `() => any`                                                   | `() => {}`                                      | Callback to run when actual speech positive frames exceeds min speech frames threshold is detected                                                                                                                                                                     |
| `onSpeechEnd`                 | `(audio: Float32Array) => any`                                | `() => {}`                                      | Callback to run when speech end is detected. Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000. This will not run if the audio segment is smaller than `minSpeechMs`           | 
| `positiveSpeechThreshold`     | `number`                                                      | `0.5`                                            | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
| `negativeSpeechThreshold`     | `number`                                                      | `0.35`                                           | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
| `redemptionMs`                | `number`                                                      | `500`                                            | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
 
| `preSpeechPadMs`              | `number`                                                      | `30`                                             | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
| `minSpeechMs`                 | `number`                                                      | `250`                                            | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
| `submitUserSpeechOnPause`     | `boolean`                                                     | `false`                                          | If true, pausing the VAD triggers `onSpeechEnd` (if speaking with sufficient frames) or `onVADMisfire`                                                                                                           | 
| `model` | `"v5" or "legacy"` | `"legacy"` | whether to use the new Silero model or not | 
| `baseAssetPath` | `string` | `/` | URL or path relative to webroot where `vad.worklet.bundle.min.js`, `silero_vad_legacy.onnx`, and `silero_vad_v5.onnx` will be loaded from | 
| `onnxWASMBasePath` | `string` | `/` | URL or path relative to webroot where wasm files for onnxruntime-web will be loaded from | 
| `workletOptions`             | `AudioWorkletNodeOptions`                                     | `{}`                                           | Options to pass to the [AudioWorkletNode constructor](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/AudioWorkletNode#options).                                                                                                                                                               |

### Attributes
| Attributes  | Type         | Default | Description                                        | 
| ----------- | ------------ | ------- | -------------------------------------------------- | 
| `listening` | `boolean`    | `false` | Is the VAD listening to mic input or is it paused? | 
| `pause`     | `() => void` |         | Stop listening to mic input                        | 
| `start`     | `() => void` |         | Start listening to mic input                       | 


## NonRealTimeVAD
The `NonRealTimeVAD` API is for identifying segments of user speech if you already have a Float32Array of audio samples.

### Support
| Package                | Type       | Supported | Description |
| ---------------------- | ---------- | --------- | ----------- |
| `@ricky0123/vad-web`   | `package`  | Yes       |             |
| `@ricky0123/vad-react` | `package`  | No        |             |

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

| Option                    | Type     | Default | Description                                               | 
| ------------------------- | -------- | ------- | --------------------------------------------------------- | 
| `positiveSpeechThreshold` | `number` | `0.5`   | [see algorithm configuration](algorithm.md#configuration) | 
| `negativeSpeechThreshold` | `number` | `0.35`  | [see algorithm configuration](algorithm.md#configuration) | 
| `redemptionMs`            | `number` | `500`   | [see algorithm configuration](algorithm.md#configuration) | 
 
| `preSpeechPadMs`          | `number` | `30`    | [see algorithm configuration](algorithm.md#configuration) | 
| `minSpeechMs`             | `number` | `250`   | [see algorithm configuration](algorithm.md#configuration) | 

### Attributes
| Attributes  | Type                                                                             | Default | Description                     | 
| ----------- | -------------------------------------------------------------------------------- | ------- | ------------------------------- | 
| `run`       | `async function* (inputAudio: Float32Array, sampleRate: number): AsyncGenerator` |         | Run the VAD model on your audio | 


## useMicVAD
A React hook wrapper for [MicVAD](api.md#micvad). Use this if you want to run the VAD model on mic input in a React application.

### Support
| Package                | Type       | Supported                       | Description |
| ---------------------- | ---------- | ------------------------------- | ----------- |
| `@ricky0123/vad-web`   | `package`  | No, use [MicVAD](api.md#micvad) |             |
| `@ricky0123/vad-react` | `package`  | Yes                             |             |

### Example
```js linenums="1"
import { useMicVAD } from "@ricky0123/vad-react"

const MyComponent = () => {
  const vad = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      console.log("User stopped speaking")
    },
  })
  return <div>User speaking: {vad.userSpeaking}</div>
}
```

### Options
The `useMicVAD` hook takes an options object with the following fields (all are optional).

| Option                        | Type                                                          | Default                                      | Description                                                                                                                                                                                                       | 
| ----------------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | 
| `startOnLoad`                 | `boolean`                                                     | `true`                                         | Whether to start the VAD automatically when the component loads.                                                                                                                                                | 
| `getStream`                   | `() => Promise<MediaStream>`                                  | Default getUserMedia with standard audio constraints | Function that returns a Promise resolving to a MediaStream. By default, creates a stream with standard audio constraints (channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true). Override this to use custom audio constraints or provide your own stream. | 
| `pauseStream`                 | `(stream: MediaStream) => Promise<void>`                      | Stops all tracks in the stream | Function called when the VAD is paused. By default, stops all tracks in the provided stream. Override this to implement custom pause behavior. | 
| `resumeStream`                | `(stream: MediaStream) => Promise<MediaStream>`               | Creates new stream with standard audio constraints | Function called when the VAD is resumed. By default, creates a new stream with standard audio constraints. Override this to implement custom resume behavior. | 
| `onFrameProcessed`            | `(probabilities: {isSpeech: float; notSpeech: float}, frame: Float32Array) => any` | `() => {}`                                      | Callback to run after each frame. The frame parameter contains the raw audio data for that frame.                                                                                                                    | 
| `onVADMisfire`                | `() => any`                                                   | `() => {}`                                      | Callback to run if speech start was detected but `onSpeechEnd` will not be run because the audio segment is smaller than `minSpeechMs`                                                                        | 
| `onSpeechStart`               | `() => any`                                                   | `() => {}`                                      | Callback to run when speech start is detected                                                                                                                                                                     | 
| `onSpeechEnd`                 | `(audio: Float32Array) => any`                                | `() => {}`                                      | Callback to run when speech end is detected. Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000. This will not run if the audio segment is smaller than `minSpeechMs`           | 
| `positiveSpeechThreshold`     | `number`                                                      | `0.5`                                            | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
| `negativeSpeechThreshold`     | `number`                                                      | `0.35`                                           | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
| `redemptionMs`                | `number`                                                      | `500`                                            | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
 
| `preSpeechPadMs`              | `number`                                                      | `30`                                             | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 
| `minSpeechMs`                 | `number`                                                      | `250`                                            | [see algorithm configuration](algorithm.md#configuration)                                                                                                                                                         | 

### Returns
| Attributes     | Type                            | Default | Description                                  | 
| -------------- | ------------------------------- | ------- | -------------------------------------------- | 
| `listening`    | `boolean`                       | `false` | Is the VAD currently listening to mic input? | 
| `errored`      | `false or { message: string}` |         | Did the VAD fail to load?                    | 
| `loading`      | `boolean`                       | `true`  | Did the VAD finish loading?                  | 
| `userSpeaking` | `boolean`                       | `false` | Is the user speaking?                        | 
| `pause`        | `() => void`                    |         | Stop the VAD from running on mic input       | 
| `start`        | `() => void`                    |         | Start the VAD running on mic input           | 
