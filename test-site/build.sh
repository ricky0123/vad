rm -rf test-site/dist
mkdir test-site/dist
npx esbuild ./test-site/src/index.jsx --bundle --sourcemap --format=esm --outfile=./test-site/dist/out.js
cp test-site/index.html test-site/dist
cp \
    node_modules/@ricky0123/vad-web/dist/*.onnx \
    node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js \
    node_modules/onnxruntime-web/dist/*.wasm \
    test-site/dist
