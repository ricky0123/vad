# Voice Activity Detection for Javascript

[![npm vad-web](https://img.shields.io/npm/v/@ricky0123/vad-web?color=blue&label=%40ricky0123%2Fvad-web&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-web)
[![npm vad-node](https://img.shields.io/npm/v/@ricky0123/vad-node?color=blue&label=%40ricky0123%2Fvad-node&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-node)
[![npm vad-react](https://img.shields.io/npm/v/@ricky0123/vad-react?color=blue&label=%40ricky0123%2Fvad-react&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-react)

> Run callbacks on segments of user speech in a few lines of code

This package aims to provide an accurate, user-friendly voice activity detector (VAD) that runs in the browser. It also has limited support for node. By using this package, you can prompt the user for microphone permissions, start recording audio, send segments of audio with speech to your server for processing, or show a certain animation or indicator when the user is speaking.

* See a live [demo](https://www.vad.ricky0123.com)
* Join us on[Discord](https://discord.gg/4WPeGEaSpF)
* Browse or contribute to [documentation](https://wiki.vad.ricky0123.com/)
* If you would like to contribute, I have started writing some documentation on how to get started hacking on these packages [here](https://wiki.vad.ricky0123.com/en/docs/developer/hacking). If you have any questions, you can open an issue here or leave a message on Discord.

Under the hood, these packages run [Silero VAD](https://github.com/snakers4/silero-vad) [[1]](#1) using [ONNX Runtime Web](https://github.com/microsoft/onnxruntime/tree/main/js/web) / [ONNX Runtime Node.js](https://github.com/microsoft/onnxruntime/tree/main/js/node). Thanks a lot to those folks for making this possible.

## Sponsorship

Please contribute to the project financially - especially if your commercial product relies on this package. [![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=d42f2d)](https://github.com/sponsors/ricky0123)

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
