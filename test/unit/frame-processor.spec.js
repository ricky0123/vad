function getOptions(overrides) {
  let modelFunc = sinon.stub()
  modelFunc.returnValue = { notSpeech: 0.1, isSpeech: 0.9 }
  modelFunc.callsFake(async () => modelFunc.returnValue)
  return [
    modelFunc,
    sinon.stub(),
    {
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
    },
  ]
}

describe("frame processor", function () {
  it("onFrameProcessed called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnce(options.onFrameProcessed)
  })

  it("signalSpeechStart called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnce(options.signalSpeechStart)
  })

  it("signalSpeechEnd called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    await callProcess(frameProcessor, options.minSpeechFrames)
    modelFunc.returnValue = { isSpeech: 0.1, notSpeech: 0.9 }
    await callProcess(frameProcessor, options.redemptionFrames - 1)
    sinon.assert.notCalled(options.signalSpeechEnd)
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnce(options.signalSpeechEnd)
  })

  it("signalMisfire called", async function () {
    let [modelFunc, resetFunc, options] = getOptions()
    const frameProcessor = new vad.FrameProcessor(modelFunc, resetFunc, options)
    frameProcessor.resume()
    await frameProcessor.process(new Float32Array())
    sinon.assert.calledOnce(options.signalSpeechStart)
    modelFunc.returnValue = { isSpeech: 0.1, notSpeech: 0.9 }
    await callProcess(frameProcessor, options.redemptionFrames - 1)
    sinon.assert.notCalled(options.signalSpeechEnd)
    sinon.assert.notCalled(options.signalMisfire)
    await callProcess(frameProcessor, options.minSpeechFrames)
    sinon.assert.calledOnce(options.signalMisfire)
  })
})

async function callProcess(frameProcessor, n) {
  for (const i of Array(n).fill(0)) {
    await frameProcessor.process(new Float32Array())
  }
}
