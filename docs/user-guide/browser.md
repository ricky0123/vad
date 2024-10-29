# User guide for browser use

The `@ricky0123/vad-web` package aims to provide an accurate, user-friendly voice activity detector (VAD) that runs in the browser.

## Script tags quick start
The VAD can be used via script tags as follows:
```html linenums="1"
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.7/dist/bundle.min.js"></script>
<script>
  async function main() {
    const myvad = await vad.MicVAD.new({
      onSpeechEnd: (audio) => {
        // do something with `audio` (Float32Array of audio samples at sample rate 16000)...
      },
    })
    myvad.start()
  }
  main()
</script>
```

## Bundling
To use the VAD in a frontend project managed by a bundler like Webpack, install @ricky0123/vad-web with a command like
```bash linenums="1"
npm i @ricky0123/vad-web
```

and use an import like:
```js linenums="1"
import { MicVAD } from "@ricky0123/vad-web"
const myvad = await MicVAD.new({
  onSpeechEnd: (audio) => {
    // do something with `audio` (Float32Array of audio samples at sample rate 16000)...
  },
})
myvad.start()
```

You will also need to

1. serve the `silero_vad.onnx` file that comes distributed with `@ricky0123/vad-web`
2. serve the `vad.worklet.bundle.min.js` file that comes distributed with `@ricky0123/vad-web`
3. serve the wasm files that come distributed with the package `onnxruntime-web`

One way to accomplish this is to run a shell script that copies these files into your `dist` directory (or whatever you have named your output directory) during your build process - see the [build script](https://github.com/ricky0123/vad-site/blob/master/scripts/build.sh) for this website for an example. Or, if you are using Webpack 5, this can be acheived by adding the following to your webpack.config.js (other bundlers may have similar options/plugins):
```js linenums="1"
const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
  // ...
  plugins: [
    // ...
    new CopyPlugin({
      patterns: [
        // ...
        {
          from: "node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
          to: "[name][ext]",
        },
        {
          from: "node_modules/@ricky0123/vad-web/dist/*.onnx",
          to: "[name][ext]",
        },
        { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "[name][ext]" },
      ],
    }),
  ],
}
```

Note that you will need to install `copy-webpack-plugin` in order for the webpack config snippet above to work (`npm i -D copy-webpack-plugin` if using npm).

### If you use Vite, refer to the following configuration:
```js linenums="1"
export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js',
          dest: './'
        },
        {
          src: 'node_modules/@ricky0123/vad-web/dist/silero_vad.onnx',
          dest: './'
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: './'
        }
      ]
    })],
})
```

The "desc" path is relative to the root directory after build.
(Chinese: "desc" 路径 是相对于 build 后的根目录的。)

The "desc" path can be adjusted by itself, but you need to configure the modelURL and workletURL when calling the "MicVad. new()" method for initialization, which correspond to the "desc" path.
(Chinese: 其中的 “desc” 路径可以自行调整，但需要在调用 "MicVad.new()" 方法初始化时配置好 modelURL、workletURL，与 "desc" 路径相对应。)

## API
`@ricky0123/vad-web` supports the [MicVAD](api.md#micvad) and [NonRealTimeVAD](api.md#nonrealtimevad) APIs.
