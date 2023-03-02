#!/usr/bin/env bash

npx tsc
cp ../../silero_vad.onnx dist
npx webpack -c webpack.config.worklet.js
npx webpack -c webpack.config.index.js
