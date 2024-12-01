const prod = { mode: "production", suffix: "min" }
const dev = { mode: "development", suffix: "dev" }
const workletConfig = ({ mode, suffix }) => {
  return {
    mode,
    entry: { worklet: "./dist/worklet.js" },
    output: {
      filename: `vad.worklet.bundle.${suffix}.js`,
    },
  }
}
module.exports = [workletConfig(dev), workletConfig(prod)]