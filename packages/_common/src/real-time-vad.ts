import * as vad from '../';
import { EventEmitter } from 'events';

export interface RealTimeVADOptions {
  sampleRate?: number;
  minBufferDuration?: number;
  maxBufferDuration?: number;
  overlapDuration?: number;
  silenceThreshold?: number;
}

export interface SpeechSegmentStart {
  start: number;
}

export interface SpeechSegmentData {
  audio: Float32Array | Buffer;
  start: number;
  end: number;
}

export interface SpeechSegmentEnd {
  end: number;
}

export class RealTimeVAD extends EventEmitter {
  private sampleRateHertz: number;
  private minBufferSize: number;
  private maxBufferSize: number;
  private overlapDuration: number;
  private audioBuffer: Float32Array;
  private vadInstance: vad.NonRealTimeVAD | null;
  private inputType: 'float32' | 'buffer' | null;
  private isSpeechOngoing: boolean;
  private silenceThreshold: number;
  private lastSpeechEnd: number;
  private currentTime: number;

  constructor(options: RealTimeVADOptions = {}) {
    super();
    this.sampleRateHertz = options.sampleRate || 16000;
    this.minBufferSize = this.sampleRateHertz * (options.minBufferDuration || 1);
    this.maxBufferSize = this.sampleRateHertz * (options.maxBufferDuration || 5);
    this.overlapDuration = options.overlapDuration || 0.1;
    this.audioBuffer = new Float32Array(0);
    this.vadInstance = null;
    this.inputType = null;
    this.isSpeechOngoing = false;
    this.silenceThreshold = options.silenceThreshold || 0.5; // seconds
    this.lastSpeechEnd = 0;
    this.currentTime = 0;
  }

  async init(): Promise<void> {
    this.vadInstance = await vad.NonRealTimeVAD.new();
  }

  async processAudio(audioChunk: Float32Array | Buffer): Promise<void> {
    let newAudioData: Float32Array;
    if (audioChunk instanceof Float32Array) {
      this.inputType = 'float32';
      newAudioData = audioChunk;
    } else if (audioChunk instanceof Buffer) {
      this.inputType = 'buffer';
      newAudioData = new Float32Array(audioChunk.length / 2);
      for (let i = 0; i < audioChunk.length; i += 2) {
        newAudioData[i / 2] = audioChunk.readInt16LE(i) / 32768;
      }
    } else {
      throw new Error('Unsupported audio format. Please provide Float32Array or Buffer.');
    }

    this.audioBuffer = Float32Array.from([...this.audioBuffer, ...newAudioData]);
    this.currentTime += newAudioData.length / this.sampleRateHertz;

    if (this.audioBuffer.length > this.maxBufferSize) {
      this.audioBuffer = this.audioBuffer.slice(-this.maxBufferSize);
    }

    if (this.audioBuffer.length >= this.minBufferSize) {
      if (!this.vadInstance) {
        await this.init();
      }

      try {
        const vadResult = await this.vadInstance!.run(this.audioBuffer, this.sampleRateHertz);

        let hasSpeech = false;
        if (vadResult && typeof vadResult[Symbol.asyncIterator] === "function") {
          for await (const segment of vadResult) {
            hasSpeech = true;
            const startTime = this.currentTime - (this.audioBuffer.length / this.sampleRateHertz) + (segment.start / this.sampleRateHertz);
            const endTime = this.currentTime - (this.audioBuffer.length / this.sampleRateHertz) + (segment.end / this.sampleRateHertz);
            
            if (!this.isSpeechOngoing) {
              this.isSpeechOngoing = true;
              this.emit('start', { start: startTime } as SpeechSegmentStart);
            }

            const audio = this.convertAudioToInputType(segment.audio);
            this.emit('data', { audio, start: startTime, end: endTime } as SpeechSegmentData);

            this.lastSpeechEnd = endTime;
          }
        }

        if (!hasSpeech && this.isSpeechOngoing && 
            (this.currentTime - this.lastSpeechEnd) > this.silenceThreshold) {
          this.isSpeechOngoing = false;
          this.emit('end', { end: this.lastSpeechEnd } as SpeechSegmentEnd);
        }

        const overlapSize = Math.floor(this.overlapDuration * this.sampleRateHertz);
        this.audioBuffer = this.audioBuffer.slice(-overlapSize);
      } catch (error) {
        this.emit('error', error);
      }
    }
  }

  private convertAudioToInputType(audio: Float32Array): Float32Array | Buffer {
    if (this.inputType === 'float32') {
      return audio;
    } else if (this.inputType === 'buffer') {
      const buffer = Buffer.alloc(audio.length * 2);
      for (let i = 0; i < audio.length; i++) {
        buffer.writeInt16LE(Math.floor(audio[i] ?? 0 * 32767), i * 2);
      }
      return buffer;
    }
    throw new Error('Invalid input type');
  }
}
