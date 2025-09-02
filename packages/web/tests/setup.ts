// Mock ONNX Runtime
class MockTensor {
  constructor(public type: string, public data: any, public dims?: number[]) {}
}

class MockInferenceSession {
  async run(_inputs: any) {
    // Mock the inference results that the VAD models expect
    return {
      output: { data: [0.5] }, // Mock speech probability
      hn: new MockTensor("float32", Array(2 * 64).fill(0), [2, 1, 64]), // For legacy model
      cn: new MockTensor("float32", Array(2 * 64).fill(0), [2, 1, 64]), // For legacy model
      stateN: new MockTensor("float32", Array(2 * 128).fill(0), [2, 1, 128]), // For v5 model
    }
  }
}

const mockOrt = {
  Tensor: MockTensor,
  InferenceSession: {
    create: jest.fn(() => Promise.resolve(new MockInferenceSession())),
  },
  env: {
    wasm: {
      wasmPaths: "",
    },
  },
}

// Mock the onnxruntime-web module
jest.mock("onnxruntime-web", () => mockOrt)

// Mock Web Audio API
class MockAudioContext {
  state = "running"
  sampleRate = 16000
  currentTime = 0
  destination = {
    connect: jest.fn(),
    disconnect: jest.fn(),
  }

  // Add audioWorklet mock
  audioWorklet = {
    addModule: jest.fn(() => Promise.resolve()),
  }

  createMediaStreamSource = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }))

  createScriptProcessor = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onaudioprocess: null,
  }))

  createAnalyser = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    frequencyBinCount: 1024,
    getFloatFrequencyData: jest.fn(),
    getFloatTimeDomainData: jest.fn(),
  }))

  createGain = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    gain: { value: 1 },
  }))

  createOscillator = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 },
  }))

  createBuffer = jest.fn(
    (channels: number, length: number, sampleRate: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: jest.fn(() => new Float32Array(length)),
    })
  )

  createBufferSource = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null,
  }))

  resume = jest.fn(() => Promise.resolve())
  suspend = jest.fn(() => Promise.resolve())
  close = jest.fn(() => Promise.resolve())
}

class MockAudioWorkletNode {
  port = {
    postMessage: jest.fn(),
    onmessage: null,
  }
  connect = jest.fn()
  disconnect = jest.fn()
  onprocessorerror = null

  constructor(_context: any, _name: string, _options?: any) {
    // Mock constructor behavior
  }
}

// Add MediaStreamAudioSourceNode mock
class MockMediaStreamAudioSourceNode {
  connect = jest.fn()
  disconnect = jest.fn()
  mediaStream: MediaStream

  constructor(_context: any, options: { mediaStream: MediaStream }) {
    this.mediaStream = options.mediaStream
  }
}

class MockMediaDevices {
  getUserMedia = jest.fn(() =>
    Promise.resolve({
      getTracks: jest.fn(() => []),
      getAudioTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => []),
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      active: true, // Add active property for stream state checking
    })
  )
}

class MockMediaStream {
  getTracks = jest.fn(() => [])
  getAudioTracks = jest.fn(() => [])
  getVideoTracks = jest.fn(() => [])
  addTrack = jest.fn()
  removeTrack = jest.fn()
  active = true // Add active property for stream state checking
}

// Mock navigator.mediaDevices
Object.defineProperty(global, "navigator", {
  value: {
    mediaDevices: new MockMediaDevices(),
  },
  writable: true,
})

// Mock AudioContext
Object.defineProperty(global, "AudioContext", {
  value: MockAudioContext,
  writable: true,
})

Object.defineProperty(global, "webkitAudioContext", {
  value: MockAudioContext,
  writable: true,
})

// Mock AudioWorkletNode
Object.defineProperty(global, "AudioWorkletNode", {
  value: MockAudioWorkletNode,
  writable: true,
})

// Mock MediaStreamAudioSourceNode
Object.defineProperty(global, "MediaStreamAudioSourceNode", {
  value: MockMediaStreamAudioSourceNode,
  writable: true,
})

// Mock MediaStream
Object.defineProperty(global, "MediaStream", {
  value: MockMediaStream,
  writable: true,
})

// Mock URL.createObjectURL
Object.defineProperty(global, "URL", {
  value: {
    createObjectURL: jest.fn(() => "blob:mock-url"),
    revokeObjectURL: jest.fn(),
  },
  writable: true,
})

// Mock fetch for model loading
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  })
) as jest.Mock

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
