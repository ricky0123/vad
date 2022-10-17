const CopyPlugin = require("copy-webpack-plugin")
const path = require("path")

module.exports = {
  mode: "development",
  entry: {},
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "index.html" },
        { from: "node_modules/vad/dist/*", to: "[name][ext]" },
      ],
    }),
  ],
  output: {
    clean: true,
  },
}
