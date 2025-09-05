const CopyPlugin = require("copy-webpack-plugin")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, {}) => {
    config.resolve.extensions.push(".ts", ".tsx")
    config.resolve.fallback = { fs: false }

    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "node_modules/onnxruntime-web/dist/*.wasm",
            to: "../public/[name][ext]",
          },
          {
            from: "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
            to: "../public/[name][ext]",
          },
          {
            from: "node_modules/@ricky0123/vad-web/dist/*.onnx",
            to: "../public/[name][ext]",
          },
          {
            from: "node_modules/onnxruntime-web/dist/*.mjs",
            to: "../public/[name][ext]",
          },
        ],
      })
    )

    return config
  },
}

module.exports = nextConfig
