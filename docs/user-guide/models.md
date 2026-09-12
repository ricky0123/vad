# Models

This package ships three versions of the [Silero VAD](https://github.com/snakers4/silero-vad) model, selected with the `model` configuration parameter.

| `model` | Frame size | Model file |
| --- | --- | --- |
| `"legacy"` (default) | 1536 samples | `silero_vad_legacy.onnx` |
| `"v5"` | 512 samples | `silero_vad_v5.onnx` |
| `"v6"` | 512 samples | `silero_vad_v6.onnx` |

`"legacy"` is still the default for backward compatibility, but we will switch the default to `"v6"` soon. Using `"v6"` is recommended.

## Serving the model files

Each model is a separate `.onnx` file fetched at runtime from `baseAssetPath`, so if you serve assets yourself rather than from the CDN, the file for the model you chose has to actually be there.

## NonRealTimeVAD

The `model` parameter has no effect on [NonRealTimeVAD](api.md#nonrealtimevad) at the moment, which always uses the legacy model.
