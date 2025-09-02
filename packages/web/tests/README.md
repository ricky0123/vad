# VAD Web Package Tests

This directory contains tests for the VAD web package.

## Setup

The tests use Jest with TypeScript support and include mocks for the Web Audio API to enable testing in a Node.js environment.

## Running Tests

From the root of the monorepo:
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

From the web package directory:
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `setup.ts` - Jest setup file that mocks Web Audio API and browser globals
- `sanity.test.ts` - Basic sanity checks to ensure package imports and Web Audio API integration work
- `mocks/` - Directory for additional mock files if needed

## Web Audio API Mocking

The test setup includes comprehensive mocks for:
- `AudioContext` and `webkitAudioContext`
- `AudioWorkletNode`
- `MediaStream` and `MediaDevices`
- `navigator.mediaDevices.getUserMedia`
- `fetch` for model loading
- `URL.createObjectURL` and `URL.revokeObjectURL`

This allows the VAD package to be tested without requiring a real browser environment.
