#!/usr/bin/env bash

npx tsc
cp ../../silero_vad.onnx ../web/dist/vad.worklet.bundle.min.js dist
npx webpack
(
    cd dist
    ln -s index.d.ts bundle.node.d.ts
)
