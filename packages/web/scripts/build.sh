#!/usr/bin/env bash

rm -rf dist
mkdir dist
npx tsc
cp ../../silero_vad.onnx dist
npx webpack -c webpack.config.worklet.js
npx webpack -c webpack.config.index.js
