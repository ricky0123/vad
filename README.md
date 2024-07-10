# Voice Activity Detection for Javascript

[![npm vad-web](https://img.shields.io/npm/v/@ricky0123/vad-web?color=blue&label=%40ricky0123%2Fvad-web&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-web)
[![npm vad-node](https://img.shields.io/npm/v/@ricky0123/vad-node?color=blue&label=%40ricky0123%2Fvad-node&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-node)
[![npm vad-react](https://img.shields.io/npm/v/@ricky0123/vad-react?color=blue&label=%40ricky0123%2Fvad-react&style=flat-square)](https://www.npmjs.com/package/@ricky0123/vad-react)

> Run callbacks on segments of audio with user speech in a few lines of code

This package aims to provide an accurate, user-friendly voice activity detector (VAD) that runs in the browser. By using this package, you can prompt the user for microphone permissions, start recording audio, send segments of audio with speech to your server for processing, or show a certain animation or indicator when the user is speaking. Note that I have decided [discontinue node support](#important-update-about-node-support---july-2024) in order to focus on the browser use case.

* See a live [demo](https://www.vad.ricky0123.com)
* Join us on [Discord](https://discord.gg/4WPeGEaSpF)!
* Browse or contribute to [documentation](https://wiki.vad.ricky0123.com/)
* If you would like to contribute, I have started writing some documentation on how to get started hacking on these packages [here](https://wiki.vad.ricky0123.com/en/docs/developer/hacking). If you have any questions, you can open an issue here or leave a message on Discord.
* **NEW**: Please fill out this [survey](https://uaux2a2ppfv.typeform.com/to/iJG2gCQv) to let me know what you are building with these packages and how you are using them!
* **NEW**: We have upgraded to [Silero VAD v5](https://github.com/snakers4/silero-vad/releases/tag/v5.0)!

Under the hood, these packages run [Silero VAD](https://github.com/snakers4/silero-vad) [[1]](#1) using [ONNX Runtime Web](https://github.com/microsoft/onnxruntime/tree/main/js/web) / [ONNX Runtime Node.js](https://github.com/microsoft/onnxruntime/tree/main/js/node). Thanks a lot to those folks for making this possible.

## Sponsorship

Please contribute to the project financially - especially if your commercial product relies on this package. [![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=d42f2d)](https://github.com/sponsors/ricky0123)

## Important update about node support - July 2024

I am going to wind down support for `ricky0123/vad-node`, the voice activity detection package for server-side node environments. I do not plan to publish any updates to the node package from here on out. I made this decision for the following reasons:

- My original use case for this project was client-side voice activity detection. I added node support because someone requested it and I wanted to be helpful. However, I don't have a lot of time to work on this project, and deprecating `ricky0123/vad-node` will give me more time to focus on `ricky0123/vad-web`.
- It is much easier for individual developers to create custom server-side voice activity detection solutions than it is for developers to learn how to work with onnxruntime-web, audio worklets, and other technologies to produce a client-side solution. Therefore, I see `ricky0123/vad-web` as providing more value to the community.
- Sharing code between the browser and node packages is fairly awkward because the environments are different in ways that are relevant to running and using the voice activity detection model.
- Most users, according to the [survey](https://uaux2a2ppfv.typeform.com/to/iJG2gCQv), are using `ricky0123/vad-web` (possibly with `ricky0123/vad-react`).

I'm not going to mark `ricky0123/vad-node` as deprecated on npm just yet, but I don't plan to publish any updates.

## Quick Start

To use the VAD via a script tag in the browser, include the following script tags:

```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort.js"></script>
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
