const CopyPlugin = require("copy-webpack-plugin")

const babelLoader = {
  loader: "babel-loader",
  options: {
    presets: [
      ["@babel/preset-env"],
      ["@babel/preset-typescript", { targets: "defaults" }],
    ],
  },
}

const onnxAsDataUrl = {
  test: /\.onnx$/i,
  type: "asset/inline",
  generator: {
    dataUrl: {
      encoding: "base64",
      mimetype: "application/octet-stream",
    },
  },
}

const onnxAsResource = {
  test: /\.onnx$/i,
  type: "asset/resource",
}

module.exports = {
  mode: "development",
  entry: { index: "./src/index.ts", worklet: "./src/worklet.ts" },
  resolve: {
    extensions: [".ts", ".js", ".json", ".wasm"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "[name][ext]" },
      ],
    }),
  ],
  module: {
    rules: [
      onnxAsResource,
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: babelLoader,
      },
    ],
  },
  output: {
    filename: "vad.[name].js",
    library: "vad",
    clean: true,
  },
}
