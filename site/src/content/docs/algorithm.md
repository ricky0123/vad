---
sidebarLabel: Algorithm
sidebarPosition: 50
layout: layouts/docs.njk
tags: docs
---

# Algorithmic details

The VAD algorithm works as follows:

1. Sample rate conversion is performed on input audio so that the processed audio has a sample rate of 16000.
1. The converted samples are batched into "frames" of size `frameSamples` samples.
1. The Silero vad model is run on each frame and produces a number between 0 and 1 indicating the probability that the sample contains speech.
1. If the algorithm has not detected speech lately, then it is in a state of `not speaking`. Once it encounters a frame with speech probability greater than `positiveSpeechThreshold`, it is changed into a state of `speaking`. When it encounters `redemptionFrames` frames with speech probability less than `negativeSpeechThreshold` without having encountered a frame with speech probability greater than `positiveSpeechThreshold`, the speech audio segment is considered to have ended and the algorithm returns to a state of `not speaking`. Frames with speech probability in between `negativeSpeechThreshold` and `positiveSpeechThreshold` are effectively ignored.
1. When the algorithm detects the end of a speech audio segment (i.e. goes from the state of `speaking` to `not speaking`), it counts the number of frames with speech probability greater than `positiveSpeechThreshold` in the audio segment. If the count is less than `minSpeechFrames`, then the audio segment is considered a false positive. Otherwise, `preSpeechPadFrames` frames are prepended to the audio segment and the segment is made accessible through the higher-level API.

All of the main APIs accept certain common configuration parameters that modify the VAD algorithm.

- `positiveSpeechThreshold: number` - determines the threshold over which a probability is considered to indicate the presence of speech.
- `negativeSpeechThreshold: number` - determines the threshold under which a probability is considered to indicate the absence of speech.
- `redemptionFrames: number` - number of speech-negative frames to wait before ending a speech segment.
- `frameSamples: number` - the size of a frame in samples - 1536 by default and probably should not be changed.
- `preSpeechPadFrames: number` - number of audio frames to prepend to a speech segment.
- `minSpeechFrames: number` - minimum number of speech-positive frames for a speech segment.
