#!/usr/bin/env bash

rm -rf test-site/dist/*
mkdir -p test-site/dist

(
    cd test-site/src
    find . -name "*.js" -or -name "*.jsx" | \
        xargs -I {} sh -c 'outfile="../dist/{}"; npx esbuild "{}" --bundle --sourcemap --outfile="${outfile%.*}.js"'
)

(
    cd test-site/src
    find . -depth -name "*.html" -print | cpio -pvd ../dist
)

cp test-site/src/*.html test-site/dist
cp \
    node_modules/@ricky0123/vad-web/dist/*.onnx \
    node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js \
    node_modules/@ricky0123/vad-web/dist/bundle.dev.js \
    node_modules/onnxruntime-web/dist/*.wasm \
    test-site/dist
