# Voice Activity Detection for Javascript

[![npm vad-web](https://img.shields.io/npm/v/@ricky0123/vad-web?color=blue&label=%40ricky0123%2Fvad-web&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-web)
[![npm vad-node](https://img.shields.io/npm/v/@ricky0123/vad-node?color=blue&label=%40ricky0123%2Fvad-node&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-node)
[![npm vad-react](https://img.shields.io/npm/v/@ricky0123/vad-react?color=blue&label=%40ricky0123%2Fvad-react&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-react)

> :warning: This project no longer publishes to the `@ricky0123/vad` npm package. Please use the new platform-specific packages: `@ricky0123/vad-web`, `@ricky0123/vad-node`, etc.

This package aims to provide an accurate, user-friendly voice activity detector (VAD) that runs in the browser. It also has limited support for node. Currently, it runs [Silero VAD](https://github.com/snakers4/silero-vad) [[1]](#1) using [ONNX Runtime Web](https://github.com/microsoft/onnxruntime/tree/main/js/web) / [ONNX Runtime Node.js](https://github.com/microsoft/onnxruntime/tree/main/js/node).

For documentation and a demo, visit [vad.ricky0123.com](https://www.vad.ricky0123.com).

### Quick Start

To use the VAD via a script tag in the browser, include the following script tags:

```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@ricky0123/vad-web/dist/index.js"></script>
<script>
  async function main() {
    const myvad = await vad.MicVAD.new({
      onSpeechStart: () => {
        console.log("Speech start detected")
      },
      onSpeechEnd: (audio) => {
        // do something with `audio` (Float32Array of audio samples at sample rate 16000)...
      }
    })
    myvad.start()
  }
  main()
</script>
```

Documentation for bundling the voice activity detector for the browser or using it in node or React projects can be found on [vad.ricky0123.com](https://www.vad.ricky0123.com).

## References

<a id="1">[1]</a>
Silero Team. (2021).
Silero VAD: pre-trained enterprise-grade Voice Activity Detector (VAD), Number Detector and Language Classifier.
GitHub, GitHub repository, https://github.com/snakers4/silero-vad, hello@silero.ai.
