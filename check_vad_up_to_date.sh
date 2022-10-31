#!/usr/bin/env bash

MODEL_ORIGIN_URL="https://github.com/snakers4/silero-vad/blob/master/files/silero_vad.onnx?raw=true"
LOCAL_MODEL_PATH="./silero_vad.onnx"

ORIGIN_SHA1SUM=$(curl -fsL "$MODEL_ORIGIN_URL" | sha1sum | awk '{ print $1 }')
LOCAL_SHA1SUM=$(sha1sum "$LOCAL_MODEL_PATH" | awk '{ print $1 }')

[[ "$ORIGIN_SHA1SUM" == "$LOCAL_SHA1SUM" ]]
exit $?
