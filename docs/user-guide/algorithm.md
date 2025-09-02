# Algorithm

The VAD algorithm works as follows:

1. Sample rate conversion is performed on input audio so that the processed audio has a sample rate of 16000.
2. The converted samples are batched into "frames" of size determined automatically by the model (512 samples for "v5" model, 1536 samples for "legacy" model).
3. The Silero vad model is run on each frame and produces a number between 0 and 1 indicating the probability that the sample contains speech.
4. If the algorithm has not detected speech lately, then it is in a state of `not speaking`. Once it encounters a frame with speech probability greater than `positiveSpeechThreshold`, it is changed into a state of `speaking`. When it encounters frames for `redemptionMs` milliseconds with speech probability less than `negativeSpeechThreshold` without having encountered a frame with speech probability greater than `positiveSpeechThreshold`, the speech audio segment is considered to have ended and the algorithm returns to a state of `not speaking`. Frames with speech probability in between `negativeSpeechThreshold` and `positiveSpeechThreshold` are effectively ignored.
5. When the algorithm detects the end of a speech audio segment (i.e. goes from the state of `speaking` to `not speaking`), it counts the number of frames with speech probability greater than `positiveSpeechThreshold` in the audio segment. If the duration is less than `minSpeechMs`, then the audio segment is considered a false positive. Otherwise, `preSpeechPadMs` milliseconds of audio are prepended to the audio segment and the segment is made accessible through the higher-level API.


## Configuration

All of the main APIs accept certain common configuration parameters that modify the VAD algorithm.

* `positiveSpeechThreshold: number` - determines the threshold over which a probability is considered to indicate the presence of speech. default: `0.5`
* `negativeSpeechThreshold: number` - determines the threshold under which a probability is considered to indicate the absence of speech. default: `0.35`
* `redemptionMs: number` - number of milliseconds of speech-negative frames to wait before ending a speech segment. default: `500`
* `preSpeechPadMs: number` - number of milliseconds of audio to prepend to a speech segment. default: `30`
* `minSpeechMs: number` - minimum duration in milliseconds for a speech segment. default: `250`
