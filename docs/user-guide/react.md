# User guide for use in React projects

1. Install `@ricky0123/vad-react`:

    ```shell linenums="1"
    npm i @ricky0123/vad-react
    ```

2. Follow the [bundling instructions](browser.md#bundling) for `@ricky0123/vad-web`. To recap, you need to serve the worklet and onnx files that come distributed with `@ricky0123/vad-web` and the wasm files from `onnxruntime-web`, which will both be pulled in as dependencies.

3. Use the `useMicVAD` hook to start the voice activity detector:

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
    See the docs for [useMicVAD](api.md#usemicvad) for details.
