#!/usr/bin/env bash

rm -rf dist
mkdir dist
npx tsc
cp ../../silero_vad.onnx dist
