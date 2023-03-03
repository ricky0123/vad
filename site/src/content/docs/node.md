---
sidebarLabel: Node
sidebarPosition: 2
layout: layouts/docs.njk
tags: docs
---

# User guide for node use

1. Install `@ricky0123/vad-node`:
    ```sh
    npm i @ricky0123/vad-node
    ```
   No other setup is necessary.

1. Example usage:
    ```typescript
    const vad = require("@ricky0123/vad-node")
    
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
   See the docs for [NonRealTimeVAD](/docs/API/#nonrealtimevad) for details. That is the only currently supported API in node.
