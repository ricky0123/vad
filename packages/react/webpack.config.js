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

module.exports = {
  mode: "development",
  entry: { index: "./src/index.ts" },
  resolve: {
    extensions: [".ts", ".js", ".json", ".wasm"],
  },
  module: {
    rules: [babelRule],
  },
  externals: {
    "onnxruntime-web": {
      commonjs: "onnxruntime-web",
      commonjs2: "onnxruntime-web",
      amd: "onnxruntime-web",
      root: "ort",
    },
    react: "react",
    "@ricky0123/vad-web": "vad",
  },
  output: {
    clean: true,
    filename: "index.js",
    library: { name: "reactVAD", type: "umd" },
  },
}
