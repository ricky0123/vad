# Voice Activity Detection for Javascript

[![npm vad-web](https://img.shields.io/npm/v/@ricky0123/vad-web?color=blue&label=%40ricky0123%2Fvad-web&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-web)
[![npm vad-node](https://img.shields.io/npm/v/@ricky0123/vad-node?color=blue&label=%40ricky0123%2Fvad-node&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-node)
[![npm vad-react](https://img.shields.io/npm/v/@ricky0123/vad-react?color=blue&label=%40ricky0123%2Fvad-react&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-react)

### 🎉 New contributors, Discord channel, and more 🚀

This project has seen a number of exciting updates recently. A growing number of people and startups are using these Javascript packages to create innovative speech-enabled products and personal projects. I would like to highlight that we now have

* A [Discord server](https://discord.gg/4WPeGEaSpF) for the community.
* New documentation at [wiki.vad.ricky0123.com](https://wiki.vad.ricky0123.com/). This documentation can be *edited by anyone with a GitHub account*. Just log in and create a new page or revise a current one.
* A growing number of generous and talented people have contributed code or opened PRs that I am working my way through. The startup [Pleap](https://pleap.jp/) has also kindly taken on some of the work of reviewing PRs.
* If you would like to contribute, I have started writing some documentation on how to get started hacking on these packages [here](https://wiki.vad.ricky0123.com/en/docs/developer/hacking). If you have any questions, you can open an issue here or leave a message on Discord.
* If you appreciate this work, you can now [support me on Github sponsors](https://github.com/sponsors/ricky0123)!
* If you want to share a project, commercial or otherwise, that you made using these packages, let me know and we can mention it in a new section in this readme.

## Overview

This package aims to provide an accurate, user-friendly voice activity detector (VAD) that runs in the browser. It also has limited support for node. Currently, it runs [Silero VAD](https://github.com/snakers4/silero-vad) [[1]](#1) using [ONNX Runtime Web](https://github.com/microsoft/onnxruntime/tree/main/js/web) / [ONNX Runtime Node.js](https://github.com/microsoft/onnxruntime/tree/main/js/node).

For documentation and a demo, visit [vad.ricky0123.com](https://www.vad.ricky0123.com).

### Quick Start

To use the VAD via a script tag in the browser, include the following script tags:

```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.7/dist/bundle.min.js"></script>
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
