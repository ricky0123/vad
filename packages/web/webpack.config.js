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

const onnxResourceRule = {
  test: /\.onnx$/i,
  type: "asset/resource",
}

/**
 *
 * @param {any[]} configs
 */
function addClean(configs) {
  return configs.map((cfg, i) => {
    if (i == 0) {
      cfg.output.clean = true
    }
    return cfg
  })
}

const workletConfig = {
  mode: "production",
  entry: { worklet: "./src/worklet.ts" },
  resolve: {
    extensions: [".ts", ".js", ".json", ".wasm"],
  },
  module: {
    rules: [babelRule],
  },
  output: {
    filename: "vad.[name].js",
  },
}

const browserConfig = {
  mode: "production",
  entry: { index: "./src/index.ts" },
  resolve: {
    extensions: [".ts", ".js", ".json", ".wasm"],
  },
  module: {
    rules: [onnxResourceRule, babelRule],
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
    filename: "index.js",
    library: { name: "vad", type: "umd" },
  },
}

module.exports = addClean([workletConfig, browserConfig])
