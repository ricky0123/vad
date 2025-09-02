import {
  AudioNodeVAD,
  DEFAULT_MODEL,
  MicVAD,
  NonRealTimeVAD,
  getDefaultRealTimeVADOptions,
  utils,
} from "../src/index"

describe("VAD Web Package Sanity Tests", () => {
  describe("Package Import", () => {
    test("should import main exports successfully", () => {
      expect(AudioNodeVAD).toBeDefined()
      expect(MicVAD).toBeDefined()
      expect(NonRealTimeVAD).toBeDefined()
      expect(DEFAULT_MODEL).toBeDefined()
      expect(getDefaultRealTimeVADOptions).toBeDefined()
      expect(utils).toBeDefined()
    })

    test("should have expected default model", () => {
      expect(DEFAULT_MODEL).toBe("legacy")
    })

    test("should have utility functions", () => {
      expect(utils.audioFileToArray).toBeDefined()
      expect(utils.minFramesForTargetMS).toBeDefined()
      expect(utils.arrayBufferToBase64).toBeDefined()
      expect(utils.encodeWAV).toBeDefined()
    })
  })

  describe("Web Audio API Integration", () => {
    test("should create AudioContext successfully", () => {
      const audioContext = new AudioContext()
      expect(audioContext).toBeDefined()
      expect(audioContext.sampleRate).toBe(16000)
      expect(audioContext.state).toBe("running")
    })

    test("should create AudioWorkletNode successfully", () => {
      const workletNode = new AudioWorkletNode(
        new AudioContext(),
        "test-processor"
      )
      expect(workletNode).toBeDefined()
      expect(workletNode.port).toBeDefined()
      expect(workletNode.connect).toBeDefined()
      expect(workletNode.disconnect).toBeDefined()
    })

    test("should create MediaStream successfully", () => {
      const stream = new MediaStream()
      expect(stream).toBeDefined()
      expect(stream.getTracks).toBeDefined()
      expect(stream.getAudioTracks).toBeDefined()
    })

    test("should access navigator.mediaDevices", () => {
      expect(navigator.mediaDevices).toBeDefined()
      expect(navigator.mediaDevices.getUserMedia).toBeDefined()
    })
  })

  describe("VAD Classes", () => {
    test("should have NonRealTimeVAD class available", () => {
      expect(NonRealTimeVAD).toBeDefined()
      expect(typeof NonRealTimeVAD.new).toBe("function")
    })

    test("should get default real-time VAD options", () => {
      const options = getDefaultRealTimeVADOptions("legacy")
      expect(options).toBeDefined()
      expect(typeof options).toBe("object")
    })

    test("should create MicVAD with default options", async () => {
      const vad = await MicVAD.new({ model: "legacy" })
      expect(vad).toBeDefined()
      expect(typeof vad.start).toBe("function")
      expect(typeof vad.pause).toBe("function")
      expect(typeof vad.destroy).toBe("function")
    })

    test("should create AudioNodeVAD with default options", async () => {
      const audioContext = new AudioContext()
      const vad = await AudioNodeVAD.new(audioContext, { model: "legacy" })
      expect(vad).toBeDefined()
      expect(typeof vad.start).toBe("function")
      expect(typeof vad.pause).toBe("function")
      expect(typeof vad.destroy).toBe("function")
    })
  })

  describe("Utility Functions", () => {
    test("should calculate min frames for target milliseconds", () => {
      const frames = utils.minFramesForTargetMS(100, 1600, 16000)
      expect(frames).toBe(1) // 100ms * 16kHz / 1600 frame samples = 1 frame
    })

    test("should convert array buffer to base64", () => {
      const buffer = new ArrayBuffer(4)
      const view = new Uint8Array(buffer)
      view[0] = 65 // 'A'
      view[1] = 66 // 'B'
      view[2] = 67 // 'C'
      view[3] = 68 // 'D'

      const base64 = utils.arrayBufferToBase64(buffer)
      expect(base64).toBe("QUJDRA==")
    })

    test("should encode WAV data", () => {
      const audioData = new Float32Array([0.1, -0.2, 0.3, -0.4])
      const wavBuffer = utils.encodeWAV(audioData, 16000)
      expect(wavBuffer).toBeDefined()
      expect(wavBuffer.byteLength).toBeGreaterThan(0)
    })
  })

  describe("Model Loading", () => {
    test("should handle fetch for model loading", async () => {
      const mockFetch = global.fetch as jest.Mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      })

      const response = await fetch("test-model.onnx")
      const buffer = await response.arrayBuffer()

      expect(response.ok).toBe(true)
      expect(buffer).toBeDefined()
      expect(buffer.byteLength).toBe(8)
    })
  })
})
