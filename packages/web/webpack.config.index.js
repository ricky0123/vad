const bundleConfig = ({ format, mode, destination }) => {
  return {
    mode,
    entry: { index: "./dist/index.js" },
    target: format === "commonjs" ? "node" : "web",
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
      filename: destination,
      library: {
        name: format !== "commonjs" ? "vad" : undefined,
        type: format,
      },
    },
  }
}

module.exports = [
  bundleConfig({
    mode: "development",
    format: "umd",
    destination: "bundle.dev.js",
  }),
  bundleConfig({
    mode: "production",
    format: "umd",
    destination: "bundle.min.js",
  }),
  bundleConfig({
    mode: "production",
    format: "commonjs",
    destination: "bundle.node.js",
  }),
]
