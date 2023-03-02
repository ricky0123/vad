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
  entry: { worklet: "./dist/worklet.js" },
  output: {
    filename: "vad.[name].js",
  },
}

const browserConfig = {
  mode: "production",
  entry: { index: "./dist/index.js" },
  externals: {
    "onnxruntime-web": {
      commonjs: "onnxruntime-web",
      commonjs2: "onnxruntime-web",
      amd: "onnxruntime-web",
      root: "ort",
    },
  },
  output: {
    filename: "bundle.min.js",
    library: { name: "vad", type: "umd" },
  },
}

module.exports = addClean([workletConfig, browserConfig])
