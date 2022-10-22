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

module.exports = [
  {
    mode: "production",
    entry: { worklet: "./src/worklet.ts" },
    resolve: {
      extensions: [".ts", ".js", ".json", ".wasm"],
    },
    module: {
      rules: [
        {
          test: /\.(js|ts)$/,
          exclude: /node_modules/,
          use: babelLoader,
        },
      ],
    },
    output: {
      filename: "vad.[name].js",
      clean: true,
    },
  },
  {
    mode: "production",
    entry: { index: "./src/index.ts" },
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
      "onnxruntime-web": {
        commonjs: "onnxruntime-web",
        commonjs2: "onnxruntime-web",
        amd: "onnxruntime-web",
        root: "ort",
      },
    },
    output: {
      filename: "vad.[name].js",
      library: { name: "vad", type: "umd" },
    },
  },
]
