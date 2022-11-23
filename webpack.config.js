const webpack = require("webpack")

const babelLoader = {
  loader: "babel-loader",
  options: {
    presets: [
      ["@babel/preset-env"],
      ["@babel/preset-typescript", { targets: "defaults" }],
    ],
  },
}

const babelRule = {
  test: /\.(js|ts)$/,
  exclude: /node_modules/,
  use: babelLoader,
}

const onnxRule = {
  test: /\.onnx$/i,
  type: "asset/inline",
  generator: {
    dataUrl: {
      encoding: "base64",
      mimetype: "application/octet-stream",
    },
  },
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
  entry: { index: "./src/index.browser.ts" },
  resolve: {
    extensions: [".ts", ".js", ".json", ".wasm"],
  },
  module: {
    rules: [onnxRule, babelRule],
  },
  plugins: [
    new webpack.DefinePlugin({
      IN_BROWSER: JSON.stringify(true),
    }),
  ],
  externals: {
    "onnxruntime-web": {
      commonjs: "onnxruntime-web",
      commonjs2: "onnxruntime-web",
      amd: "onnxruntime-web",
      root: "ort",
    },
  },
  output: {
    filename: "index.browser.js",
    library: { name: "vad", type: "umd" },
  },
}

const nodeConfig = {
  mode: "production",
  target: "node",
  entry: { index: "./src/index.node.ts" },
  resolve: {
    extensions: [".ts", ".js", ".json", ".wasm"],
  },
  module: {
    rules: [onnxRule, babelRule],
  },
  plugins: [
    new webpack.DefinePlugin({
      IN_BROWSER: JSON.stringify(false),
    }),
  ],
  externals: {
    "onnxruntime-node": {
      commonjs: "onnxruntime-node",
      commonjs2: "onnxruntime-node",
      amd: "onnxruntime-node",
      root: "ort",
    },
  },
  output: {
    filename: "index.node.js",
    library: { name: "vad", type: "umd" },
  },
}

module.exports = addClean([workletConfig, browserConfig, nodeConfig])
