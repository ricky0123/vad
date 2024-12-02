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

## NPM

If you are managing your dependencies with NPM, install @ricky0123/vad-web with a command like
```bash linenums="1"
npm i @ricky0123/vad-web
```

## Bundling

Bundling your project should not require any special configuration, because the onnx and other files will be loaded from the CDN by default.

However, if you want to serve the onnx, wasm, and worklet files yourself, you can do the following. First, use the `baseAssetPath` and `onnxWASMBasePath` options to control where the files are to be loaded from:

```js linenums="1"
import { MicVAD } from "@ricky0123/vad-web"
const myvad = await MicVAD.new({
  baseAssetPath: "/", // or whatever you want
  onnxWASMBasePath: "/", // or whatever you want
  onSpeechEnd: (audio) => {
    // do something with `audio` (Float32Array of audio samples at sample rate 16000)...
  },
})
myvad.start()
```

Then, make sure these files are available under the paths you specified:

1. serve the `silero_vad_legacy.onnx` and `silero_vad_v5.onnx` files that come distributed with `@ricky0123/vad-web` (under `baseAssetPath`)
2. serve the `vad.worklet.bundle.min.js` file that comes distributed with `@ricky0123/vad-web` (under `baseAssetPath`)
3. serve the wasm files that come distributed with the package `onnxruntime-web` (under `onnxWASMBasePath`)

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
          src: 'node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx',
          dest: './'
        },
        {
          src: 'node_modules/@ricky0123/vad-web/dist/silero_vad_legacy.onnx',
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

## Serving the worklet/onnx/wasm files

There are a number of files that the VAD loads from the browser when it is invoked - the worklet file, the onnx (model weights/architecture) file, and various files that onnxruntime needs. As the configuration associated with serving these files correctly has made it difficult for some people to get started with using the package, I decided to try a new approach to this.

There are now exactly two configuration parameters that control where VAD looks for these files. 

* `baseAssetPath` - the base path under which VAD looks for the worklet file and onnx files. The worklet file name is `vad.worklet.bundle.min.js`. Therefore, if you have set `baseAssetPath` to `example.com`, it will try to load the worklet file from `example.com/vad.worklet.bundle.min.js`. Similarly, it uses this same base path to look for `silero_vad_legacy.onnx` or `silero_vad_v5.onnx`.
* `onnxWASMBasePath` - the base path under which VAD looks for wasm files needed for onnxruntime.

By default, these are both set to the appropriate CDN paths. In other words, unless you have overridden these options, the worklet/onnx/wasm files will be loaded from a CDN. If you want to serve these files yourself, you have to specifiy those options yourself and make sure that you have made the files available at the correct location. Hopefully, this both makes it easy to get started with the package and also clears up any ambiguity about where the files are supposed to be.

## API
`@ricky0123/vad-web` supports the [MicVAD](api.md#micvad) and [NonRealTimeVAD](api.md#nonrealtimevad) APIs.
