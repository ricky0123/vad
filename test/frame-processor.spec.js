const sinon = require("sinon")
const vad = require("../dist/index.node")

function getOptions(overrides) {
  const opts = {
    onFrameProcessed: sinon.stub(),
    signalSpeechStart: sinon.stub(),
    signalSpeechEnd: sinon.stub(),
    signalMisfire: sinon.stub(),
    positiveSpeechThreshold: 0.6,
    negativeSpeechThreshold: 0.4,
    redemptionFrames: 4,
    preSpeechPadFrames: 5,
    minSpeechFrames: 6,
    ...overrides,
  }
  let modelFunc = sinon.stub()
  modelFunc.callsFake(async () => modelFunc.returnValue)
  returnSpeech(modelFunc, opts.positiveSpeechThreshold)
  return [modelFunc, sinon.stub(), opts]
}

function returnNotSpeech(modelFunc, negativeThreshold) {
  const isSpeech = negativeThreshold / 2
  modelFunc.returnValue = { isSpeech, notSpeech: 1 - isSpeech }
}

function returnSpeech(modelFunc, positiveThreshold) {
  const isSpeech = positiveThreshold + (1 - positiveThreshold) / 2
  modelFunc.returnValue = { isSpeech, notSpeech: 1 - isSpeech }
}

async function callProcess(frameProcessor, n) {
  for (const _ of Array(n).fill(0)) {
    await frameProcessor.process(new Float32Array())
  }
}

describe("frame processor algorithm", function () {
  it("preSpeechPadFrames", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    const frameProcessor = new vad.RealTimeFrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    const arr = [
      ...Array(
        options.preSpeechPadFrames + options.redemptionFrames + 1
      ).keys(),
    ]
    for (const x of arr.slice(0, options.preSpeechPadFrames)) {
      await frameProcessor.process(new Float32Array([x]))
    }
    returnSpeech(modelFunc, options.positiveSpeechThreshold)
    await frameProcessor.process(new Float32Array([options.preSpeechPadFrames]))
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    for (const x of arr.slice(
      options.preSpeechPadFrames + 1,
      options.preSpeechPadFrames + options.redemptionFrames
    )) {
      await frameProcessor.process(new Float32Array([x]))
    }
    sinon.assert.notCalled(options.signalSpeechEnd)
    await frameProcessor.process(
      new Float32Array([options.preSpeechPadFrames + options.redemptionFrames])
    )
    sinon.assert.calledOnceWithExactly(
      options.signalSpeechEnd,
      new Float32Array(arr)
    )
  })
})

describe("frame processor callbacks", function () {
  it("onFrameProcessed called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.RealTimeFrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnce(options.onFrameProcessed)
  })

  it("signalSpeechStart called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.RealTimeFrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnce(options.signalSpeechStart)
  })

  it("signalSpeechEnd called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.RealTimeFrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    const arr1 = [...Array(options.minSpeechFrames).keys()]
    for (const i of arr1) {
      await frameProcessor.process(new Float32Array([i]))
    }
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    const arr2 = Array.from(
      { length: options.redemptionFrames - 1 },
      (_, i) => i + options.minSpeechFrames
    )
    for (const i of arr2) {
      await frameProcessor.process(new Float32Array([i]))
    }
    sinon.assert.notCalled(options.signalSpeechEnd)
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnceWithExactly(
      options.signalSpeechEnd,
      new Float32Array([...arr1, ...arr2])
    )
  })

  it("signalMisfire called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.RealTimeFrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnce(options.signalSpeechStart)
    returnNotSpeech(modelFunc, options.negativeSpeechThreshold)
    await callProcess(frameProcessor, options.redemptionFrames - 1)
    sinon.assert.notCalled(options.signalSpeechEnd)
    sinon.assert.notCalled(options.signalMisfire)
    await callProcess(frameProcessor, options.minSpeechFrames)
    sinon.assert.calledOnce(options.signalMisfire)
  })
})
