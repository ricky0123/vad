---
layout: layouts/docs.njk
sidebarLabel: API Reference
sidebarPosition: 100
tags: docs
---

# API Reference

## MicVAD

The `MicVAD` API is for recording user audio in the browser and running callbacks on speech segments and related events.

### Support

| Package                | Supported                                    |
| ---------------------- | -------------------------------------------- |
| `@ricky0123/vad-web`   | Yes                                          |
| `@ricky0123/vad-node`  | No                                           |
| `@ricky0123/vad-react` | No, use the [useVAD](/docs/API/#usevad) hook |

### Example

```typescript
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

| Option                       | Type                                                          | Description                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalAudioConstraints` |                                                               | [constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) to pass to [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) via the `audio` field |
| `onFrameProcessed`           | `(probabilities: {isSpeech: float; notSpeech: float}) => any` | Callback to run after each frame.                                                                                                                                                                                 |
| `onVADMisfire`               | `() => any`                                                   | Callback to run if speech start was detected but `onSpeechEnd` will not be run because the audio segment is smaller than `minSpeechFrames`                                                                        |
| `onSpeechStart`              | `() => any`                                                   | Callback to run when speech start is detected                                                                                                                                                                     |
| `onSpeechEnd`                | `(audio: Float32Array) => any`                                | Callback to run when speech end is detected. Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000. This will not run if the audio segment is smaller than `minSpeechFrames`           |
| `positiveSpeechThreshold`    | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `negativeSpeechThreshold`    | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `redemptionFrames`           | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `frameSamples`               | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `preSpeechPadFrames`         | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `minSpeechFrames`            | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |

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
| `@ricky0123/vad-node`  | Yes       |
| `@ricky0123/vad-react` | No        |

### Example

```typescript
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

| Option                    | Type     | Description                                                   |
| ------------------------- | -------- | ------------------------------------------------------------- |
| `positiveSpeechThreshold` | `number` | see [algorithm configuration](/docs/algorithm/#configuration) |
| `negativeSpeechThreshold` | `number` | see [algorithm configuration](/docs/algorithm/#configuration) |
| `redemptionFrames`        | `number` | see [algorithm configuration](/docs/algorithm/#configuration) |
| `frameSamples`            | `number` | see [algorithm configuration](/docs/algorithm/#configuration) |
| `preSpeechPadFrames`      | `number` | see [algorithm configuration](/docs/algorithm/#configuration) |
| `minSpeechFrames`         | `number` | see [algorithm configuration](/docs/algorithm/#configuration) |

### Attributes

| Attributes | Type                                                                             | Description                     |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------- |
| `run`      | `async function* (inputAudio: Float32Array, sampleRate: number): AsyncGenerator` | Run the VAD model on your audio |

## useVAD

A React hook wrapper for [`MicVAD`](/docs/API/#micvad). Use this if you want to run the VAD model on mic input in a React application.

### Support

| Package                | Supported                             |
| ---------------------- | ------------------------------------- |
| `@ricky0123/vad-web`   | No, use [`MicVAD`](/docs/API/#micvad) |
| `@ricky0123/vad-node`  | No                                    |
| `@ricky0123/vad-react` | Yes                                   |

### Example

```typescript
import { useVAD } from "@ricky0123/vad-react"

const MyComponent = () => {
  const vad = useVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      console.log("User stopped talking")
    },
  })
  return <div>{vad.userSpeaking && "User is speaking"}</div>
}
```

### Options

The `useVAD` hook takes an options object with the following fields (all optional).

| Option                       | Type                                                          | Description                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `startOnLoad`                | `boolean`                                                     | Should the VAD start listening to mic input when it finishes loading?                                                                                                                                             |
| `additionalAudioConstraints` |                                                               | [constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints) to pass to [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) via the `audio` field |
| `onFrameProcessed`           | `(probabilities: {isSpeech: float; notSpeech: float}) => any` | Callback to run after each frame.                                                                                                                                                                                 |
| `onVADMisfire`               | `() => any`                                                   | Callback to run if speech start was detected but `onSpeechEnd` will not be run because the audio segment is smaller than `minSpeechFrames`                                                                        |
| `onSpeechStart`              | `() => any`                                                   | Callback to run when speech start is detected                                                                                                                                                                     |
| `onSpeechEnd`                | `(audio: Float32Array) => any`                                | Callback to run when speech end is detected. Takes as arg a Float32Array of audio samples between -1 and 1, sample rate 16000. This will not run if the audio segment is smaller than `minSpeechFrames`           |
| `positiveSpeechThreshold`    | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `negativeSpeechThreshold`    | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `redemptionFrames`           | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `frameSamples`               | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `preSpeechPadFrames`         | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |
| `minSpeechFrames`            | `number`                                                      | see [algorithm configuration](/docs/algorithm/#configuration)                                                                                                                                                     |

### Returns

| Attributes     | Type                            | Description                                  |
| -------------- | ------------------------------- | -------------------------------------------- |
| `listening`    | `boolean`                       | Is the VAD currently listening to mic input? |
| `errored`      | `false \| { message: string; }` | Did the VAD fail to load?                    |
| `loading`      | `boolean`                       | Did the VAD finish loading?                  |
| `userSpeaking` | `boolean`                       | Is the user speaking?                        |
| `pause`        | `() => void`                    | Stop the VAD from running on mic input       |
| `start`        | `() => void`                    | Start running the VAD on mic input           |
