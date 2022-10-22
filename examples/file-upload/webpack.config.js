const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
  mode: "development",
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/index.html" },
        {
          from: "node_modules/@ricky0123/vad/dist/*.worklet.js",
          to: "[name][ext]",
        },
        { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "[name][ext]" },
      ],
    }),
  ],
  output: {
    clean: true,
  },
}
