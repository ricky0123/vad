#!/usr/bin/env bash

rm -rf test-site/dist/*
mkdir -p test-site/dist/subpath

(
    cd test-site/src
    find . -name "*.js" -or -name "*.jsx" -or -name "*.ts" -or -name "*.tsx" | \
        xargs -I {} sh -c 'outfile="../dist/{}"; npx esbuild "{}" --bundle --sourcemap --outfile="${outfile%.*}.js"'
)

(
    cd test-site/src
    find . -name "*.html" -exec cp --parents {} ../dist \;
)

cp test-site/src/*.html test-site/dist
cp \
    node_modules/@ricky0123/vad-web/dist/*.onnx \
    node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js \
    node_modules/@ricky0123/vad-web/dist/bundle.min.js \
    node_modules/onnxruntime-web/dist/*.wasm \
    node_modules/onnxruntime-web/dist/*.mjs \
    test-site/dist

cp \
    node_modules/@ricky0123/vad-web/dist/*.onnx \
    node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js \
    node_modules/onnxruntime-web/dist/*.wasm \
    node_modules/onnxruntime-web/dist/*.mjs \
    test-site/dist/subpath
