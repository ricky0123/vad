const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
  entry: "./src/index.jsx",
  module: {
    rules: [
      {
        test: /\.m?jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-react"]],
          },
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/@ricky0123/vad-web/dist/*.worklet.js",
          to: "[name][ext]",
        },
        {
          from: "node_modules/@ricky0123/vad-web/dist/*.onnx",
          to: "[name][ext]",
        },
        { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "[name][ext]" },
        { from: "src/index.html", to: "[name][ext]" },
      ],
    }),
  ],
  output: {
    clean: true,
  },
}
