const prod = { mode: "production", suffix: "min" }
const dev = { mode: "development", suffix: "dev" }

const bundleConfig = ({ mode, suffix }) => {
  return {
    mode,
    entry: { index: "./dist/index.js" },
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
      filename: `bundle.${suffix}.js`,
      library: { name: "vad", type: "umd" },
    },
  }
}

module.exports = [bundleConfig(dev), bundleConfig(prod)]