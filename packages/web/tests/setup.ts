// Mock Web Audio API
class MockAudioContext {
  state = "running"
  sampleRate = 16000
  currentTime = 0
  destination = {
    connect: jest.fn(),
    disconnect: jest.fn(),
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
}

class MockMediaDevices {
  getUserMedia = jest.fn(() =>
    Promise.resolve({
      getTracks: jest.fn(() => []),
      getAudioTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => []),
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
    })
  )
}

class MockMediaStream {
  getTracks = jest.fn(() => [])
  getAudioTracks = jest.fn(() => [])
  getVideoTracks = jest.fn(() => [])
  addTrack = jest.fn()
  removeTrack = jest.fn()
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
