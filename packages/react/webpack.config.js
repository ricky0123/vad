module.exports = {
  mode: "production",
  entry: { index: "./dist/index.js" },
  target: "node",
  module: {
    rules: [
      {
        test: /\.onnx/,
        type: "asset/resource",
        generator: {
          filename: "[name][ext]",
        },
      },
      {
        test: /vad\.\worklet\.bundle\..*\.js/,
        type: "asset/resource",
        generator: {
          filename: "[name][ext]",
        },
      },
    ],
  },
  externals: {
    "onnxruntime-web": {
      commonjs: "onnxruntime-web",
      commonjs2: "onnxruntime-web",
      amd: "onnxruntime-web",
      root: "ort",
    },
  },
  output: {
    filename: "bundle.node.js",
    library: {
      type: "commonjs",
    },
  },
}
