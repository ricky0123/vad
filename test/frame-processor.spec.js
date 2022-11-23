const sinon = require("sinon")
const vad = require("../dist/index.node")
const { assert } = require("chai")

/**
 * @param {vad.FrameProcessorOptions} overrides
 */
function getOptions(overrides) {
  /**
   * @type {vad.FrameProcessorOptions}
   */
  const options = {
    frameSamples: 1536,
    positiveSpeechThreshold: 0.6,
    negativeSpeechThreshold: 0.4,
    redemptionFrames: 4,
    preSpeechPadFrames: 5,
    minSpeechFrames: 6,
    ...overrides,
  }
  let modelFunc = sinon.stub()
  modelFunc.callsFake(async () => modelFunc.returnValue)
  returnSpeech(modelFunc, options.positiveSpeechThreshold)
  return { modelFunc, resetFunc: sinon.stub(), options }
}

function returnNotSpeech(modelFunc, negativeThreshold) {
  const isSpeech = negativeThreshold / 2
  modelFunc.returnValue = { isSpeech, notSpeech: 1 - isSpeech }
}

function returnSpeech(modelFunc, positiveThreshold) {
  const isSpeech = positiveThreshold + (1 - positiveThreshold) / 2
  modelFunc.returnValue = { isSpeech, notSpeech: 1 - isSpeech }
}

function assertArrayEqual(arrX, arrY) {
  for (let i = 0; i <= Math.max(arrY.length - 1, arrX.length - 1); i++) {
    assert.strictEqual(arrY[i], arrX[i])
  }
}

describe("frame processor algorithm", function () {
  it("prepend `preSpeechPadFrames` of audio", async function () {
    let msg, audio

    let { modelFunc, resetFunc, options } = getOptions()
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    const arr = [
      ...Array(
        options.preSpeechPadFrames + options.redemptionFrames + 1
      ).keys(),
    ]
    for (const x of arr.slice(0, options.preSpeechPadFrames)) {
      ;({ msg, audio } = await frameProcessor.process(new Float32Array([x])))
      assert.isNotOk(msg)
      assert.isNotOk(audio)
    }
    returnSpeech(modelFunc, options.positiveSpeechThreshold)
    ;({ msg, audio } = await frameProcessor.process(
      new Float32Array([options.preSpeechPadFrames])
    ))
    assert.strictEqual(msg, vad.Message.SpeechStart)
    assert.isNotOk(audio)
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    for (const x of arr.slice(
      options.preSpeechPadFrames + 1,
      options.preSpeechPadFrames + options.redemptionFrames
    )) {
      ;({ msg, audio } = await frameProcessor.process(new Float32Array([x])))
      assert.isNotOk(msg)
      assert.isNotOk(audio)
    }
    ;({ msg, audio } = await frameProcessor.process(
      new Float32Array([options.preSpeechPadFrames + options.redemptionFrames])
    ))
    assert.strictEqual(msg, vad.Message.SpeechEnd)
    assertArrayEqual(audio, new Float32Array(arr))
  })

  it("messages.SpeechStart sent", async function () {
    let { modelFunc, resetFunc, options } = getOptions()
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    const { msg } = await frameProcessor.process(new Float32Array())
    assert.strictEqual(msg, vad.Message.SpeechStart)
  })

  it("messages.SpeechEnd sent", async function () {
    let msg, audio

    let { modelFunc, resetFunc, options } = getOptions()
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    const arr = [
      ...Array(options.minSpeechFrames + options.redemptionFrames).keys(),
    ]
    ;({ msg } = await frameProcessor.process([arr[0]]))
    assert.strictEqual(msg, vad.Message.SpeechStart)
    for (const i of arr.slice(1, options.minSpeechFrames)) {
      ;({ msg } = await frameProcessor.process(new Float32Array([i])))
      assert.isNotOk(msg)
    }
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    for (const i of arr.slice(options.minSpeechFrames, -1)) {
      ;({ msg } = await frameProcessor.process(new Float32Array([i])))
      assert.isNotOk(msg)
    }
    ;({ msg, audio } = await frameProcessor.process(
      new Float32Array([arr[arr.length - 1]])
    ))
    assert.strictEqual(msg, vad.Message.SpeechEnd)
    assertArrayEqual(audio, arr)
  })

  it("onVadMisfire called", async function () {
    let msg, audio
    let { modelFunc, resetFunc, options } = getOptions({
      minSpeechFrames: 5,
      redemptionFrames: 2,
    })
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    ;({ msg } = await frameProcessor.process(new Float32Array([1])))
    assert.strictEqual(msg, vad.Message.SpeechStart)
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    for (let i = 1; i <= options.redemptionFrames - 1; i++) {
      ;({ msg } = await frameProcessor.process(new Float32Array([1])))
      assert.isNotOk(msg)
    }
    ;({ msg, audio } = await frameProcessor.process(new Float32Array([1])))
    assert.strictEqual(msg, vad.Message.SpeechMisfire)
    assert.isNotOk(audio)
  })
})
