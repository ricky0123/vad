let configs = []

let inputs = [
  { mode: "production", suffix: "min" },
  { mode: "development", suffix: "dev" },
]

inputs.forEach(({ mode, suffix }) => {
  const workletConfig = {
    mode,
    entry: { worklet: "./dist/worklet.js" },
    output: {
      filename: `vad.worklet.bundle.${suffix}.js`,
    },
  }

  const browserConfig = {
    mode,
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
      filename: `bundle.${suffix}.js`,
      library: { name: "vad", type: "umd" },
    },
  }

  configs.push(workletConfig, browserConfig)
})

module.exports = configs
