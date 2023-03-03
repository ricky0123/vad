---
sidebarLabel: React
sidebarPosition: 3
layout: layouts/docs.njk
tags: docs
---

# User guide for use in React projects

1. Install `@ricky0123/vad-react`:
    ```sh
    npm i @ricky0123/vad-react
    ```

1. Follow the [bundling instructions](/docs/browser/#bundling) for `@ricky0123/vad-web`. To recap, you need to serve the worklet and onnx files that come distributed with `@ricky0123/vad-web` and the wasm files from `onnxruntime-web`, which will both be pulled in as dependencies.

1. Use the `useMicVAD` hook to start the voice activity detector:
    ```typescript
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
   See the docs for [useMicVAD](/docs/API/#usemicvad) for details.
