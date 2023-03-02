---
sidebarLabel: React
sidebarPosition: 3
layout: layouts/docs.njk
tags: docs
---

# User guide for use in React projects

Install `@ricky0123/vad-react` with `npm i @ricky0123/vad-react`. This will pull in `@ricky0123/vad-web` as a dependency, and you must serve the `vad.worklet.bundle.min.js` file and the `silero_vad.onnx` file distributed with that package. You also have to serve the wasm files from `onnxruntime-web`, which will also be pulled in as a dependency. See the [bundling](/docs/browser/#bundling) instructions for details.

Only the [useMicVAD](/docs/API/#usemicvad) API is supported.
