const babelRule = {
  test: /\.(js|ts)$/,
  exclude: /node_modules/,
  use: {
    loader: "babel-loader",
    options: {
      presets: [
        ["@babel/preset-env", { targets: "defaults" }],
        ["@babel/preset-typescript"],
      ],
    },
  },
}

const onnxInlineRule = {
  test: /\.onnx$/i,
  type: "asset/inline",
  generator: {
    dataUrl: {
      encoding: "base64",
      mimetype: "application/octet-stream",
    },
  },
}

module.exports = {
  mode: "production",
  target: "node",
  entry: { index: "./src/index.ts" },
  resolve: {
    extensions: [".ts", ".js", ".json", ".wasm"],
  },
  module: {
    rules: [onnxInlineRule, babelRule],
  },
  externals: {
    "onnxruntime-node": {
      commonjs: "onnxruntime-node",
      commonjs2: "onnxruntime-node",
      amd: "onnxruntime-node",
      root: "ort",
    },
  },
  output: {
    clean: true,
    filename: "index.js",
    library: { name: "vad", type: "umd" },
  },
}
