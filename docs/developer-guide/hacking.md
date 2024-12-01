# Hacking

## Setting up a dev environment

After cloning the repository, the following commands will install dependencies for the project and run the automated tests. They should all be run from the top level of the repository.

1. `npm install` to install dependencies.
2. `npm run build` to build all of the packages.
3. `npm run test` to run the automated tests.

## Manual testing

The automated tests are useful, but manual testing is even more important. There is now a site included in the source code that you can add to in order to test your changes. I would like to make this an open "playground" for people to put whatever helps them test their changes. You can run the test site by running `npm run dev`. If you make any changes to `vad-web`, `vad-react`, or the source code for the test site, you can wait a few seconds and the test site should refresh in your browser with the changes you made.

## Project Management

I set up a [Github project for VAD](https://github.com/users/ricky0123/projects/1) to track work related to the project.

## Playing with VAD model in browser console

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
