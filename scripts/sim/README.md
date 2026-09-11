# sim

Generates speech with known boundaries, runs it through the VAD, and reports
what it detected.

```
npm run sim
npm run sim -- --text="the quick brown fox" --gain=0.05 --noise=0.005
npm run sim -- --help
```

## Options

| | |
| --- | --- |
| `--text` | phrase to speak, repeat the flag for multiple phrases |
| `--gap` | silence between and around phrases, default 2000ms |
| `--voice` | piper voice, default `en_US-lessac-medium` |
| `--gain` `--noise` `--seed` | amplitude scale, noise floor amplitude, noise seed |
| `--model` | `v5` or `legacy` |
| `--positive` `--negative` `--redemption` `--pre-speech-pad` `--min-speech` | the matching `FrameProcessorOptions`, defaulted to the library's own defaults |
| `--out` | output directory, default `sim-out` |
| `--compare` | an earlier `run.json` to overlay on the chart and summary |
| `--json` | print the summary as JSON |

## Output

A summary on stdout, and four files in `--out`:

| | |
| --- | --- |
| `sim.mp4` | the chart with the audio muxed in. GitHub won't take a bare `.wav`, so this is what you attach to an issue or PR |
| `chart.svg` | probability over time, thresholds marked, known speech shaded green, detected segments shaded blue |
| `audio.wav` | the generated audio |
| `run.json` | settings, known speech boundaries, every per-frame probability, and every event |

To compare two versions of the code, run against different `--out` directories
and point `--compare` at the earlier `run.json`.

## Notes

Phrases are synthesized separately with piper and laid out with `--gap` silence
between and around them, so the speech boundaries are known rather than
measured. Ground truth is per phrase, not per word, so probability dips between
words are expected. The voice downloads on first use into `.sim-cache/` (~60MB)
and synthesized phrases are cached there, which makes the first run much slower
than the rest.

piper's `--noise-scale` and `--noise-w-scale` are pinned to 0, because piper's
default sampling is random and the same text would otherwise give different
audio on every run.

`--gain` scales the speech and the noise floor together, so on its own it makes
the audio quieter without making detection harder. What makes it harder is the
signal-to-noise ratio: `--gain=0.05` alone is around 21 dB, and adding
`--noise=0.005` puts it near 7 dB.

Segment boundaries are reported but not scored, because `FrameProcessor`
prepends `preSpeechPadMs` and holds on for at least `redemptionMs` after the
last speech frame, so a correctly detected utterance comes out more than two
seconds longer than the speech itself.

Requires `piper` and `ffmpeg` on PATH. Chromium comes from playwright.
