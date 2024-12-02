# Hacking

If you would like to help out in developing this project and aren't sure where to start, reach out to Ricky on Discord.

Here are some tips to get started.

## Setting up a dev environment

After cloning the repository, the following commands will install dependencies for the project and run the automated tests. They should all be run from the top level of the repository.

1. `npm install` to install dependencies.
2. `npm run build` to build all of the packages.

## Manual testing

There is a test site to run the VAD with different parameters for manual testing purposes. It is in fact deployed at [test.vad.ricky0123.com](https://test.vad.ricky0123.com). You can run it locally by running `npm run dev`. When you open a PR, Vercel should deploy a preview version of the test site so that reviewers can test your changes.

## Quick notes about playing with the VAD model interactively in the browser console

Go to [test.vad.ricky0123.com](https://test.vad.ricky0123.com) and open the browser console. Then run the following line by line:

```js linenums="1"
script = this.document.createElement("script")
script.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.js" 
document.body.appendChild(script)
// wait a few seconds
modelarraybuffer = await fetch(`${location}silero_vad_v5.onnx`).then((model) => model.arrayBuffer())
session = await ort.InferenceSession.create(modelarraybuffer)
state_zeroes = Array(2 * 128).fill(0)
state = new this.ort.Tensor("float32", state_zeroes, [2, 1, 128])  // https://github.com/snakers4/silero-vad/blob/fdbb0a3a81e0f9d95561d6b388d67dce5d9e3f1b/utils_vad.py#L58
audio_zeros = Array(512).fill(0) 
audio = new this.ort.Tensor("float32", audio_zeros, [1, audio_zeros.length])
sr = new this.ort.Tensor("int64", [16000n])
inputs = {
    sr,
    state,
    input: audio
}
out = await session.run(inputs)
```
