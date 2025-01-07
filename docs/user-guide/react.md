# User guide for use in React projects

1. Install `@ricky0123/vad-react`:

    ```shell linenums="1"
    npm i @ricky0123/vad-react
    ```

2. Use the `useMicVAD` hook to start the voice activity detector:

    ```js linenums="1"
    import { useMicVAD } from "@ricky0123/vad-react"

    const MyComponent = () => {
    const vad = useMicVAD({
        onSpeechEnd: (audio) => {
        console.log("User stopped talking")
        },
    })
    return <div>{vad.userSpeaking && "User is speaking"}</div>
    }
    ```
    See the docs for [useMicVAD](api.md#usemicvad) for details.

3. The package will work out of the box with default CDN settings. For advanced configuration or if you want to serve files locally, you can refer to the [bundling documentation](browser.md#bundling).