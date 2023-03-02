#!/usr/bin/env bash

npx eleventy --input=src/content --output dist
npx tailwindcss -i ./src/css/input.css -o ./dist/style.css
npx esbuild src/js/demo.tsx --bundle --outfile=dist/demo.js --format=esm
cp \
    node_modules/@ricky0123/vad-web/dist/silero_vad.onnx \
    node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js \
    node_modules/onnxruntime-web/dist/*.wasm \
    dist
