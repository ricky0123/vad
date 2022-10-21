const babelLoader = {
  loader: "babel-loader",
  options: {
    presets: [
      ["@babel/preset-env"],
      ["@babel/preset-typescript", { targets: "defaults" }],
    ],
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
  externals: {
    "onnxruntime-web": "ort",
  },
  output: {
    filename: "vad.[name].js",
    library: "vad",
    clean: true,
  },
}
