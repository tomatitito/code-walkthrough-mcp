/**
 * Audio narration generation using Edge TTS
 */

import * as fs from 'fs/promises';
import { TextToSpeechConverter } from '../tts.js';
import { VideoScript } from '../types/script.js';
import { calculateTotalDuration } from '../utils/timing.js';

export interface AudioGeneratorOptions {
  style: 'beginner' | 'technical' | 'overview';
  voice?: string;
  rate?: string;
}

export class AudioGenerator {
  private tts: TextToSpeechConverter;
  private style: 'beginner' | 'technical' | 'overview';
  private voice: string;
  private rate: string;

  constructor(options: AudioGeneratorOptions) {
    this.tts = new TextToSpeechConverter();
    this.style = options.style;

    // Voice selection based on style
    this.voice = options.voice || 'en-US-JennyNeural';

    // Rate adjustment based on style
    // Beginner: slower (-10%), Technical: default (-5%), Overview: faster (+5%)
    if (options.rate) {
      this.rate = options.rate;
    } else {
      switch (options.style) {
        case 'beginner':
          this.rate = '-10%';
          break;
        case 'overview':
          this.rate = '+5%';
          break;
        case 'technical':
        default:
          this.rate = '-5%';
          break;
      }
    }
  }

  /**
   * Generate audio from video script
   */
  async generateAudio(
    script: VideoScript,
    outputPath: string
  ): Promise<{ path: string; duration: number }> {
    console.log('Generating audio narration...');
    console.log(`Style: ${this.style}, Voice: ${this.voice}, Rate: ${this.rate}`);

    // Use the full narrative which includes pause markers
    const narrationText = script.fullNarrative;

    // Generate audio using TTS
    await this.tts.generateAudio(narrationText, outputPath);

    // Calculate actual duration
    const duration = calculateTotalDuration(narrationText, this.style);

    console.log(`Audio generated: ${outputPath}`);
    console.log(`Estimated duration: ${duration.toFixed(2)}s`);

    return {
      path: outputPath,
      duration,
    };
  }

  /**
   * Generate audio for a specific narration segment
   */
  async generateSegmentAudio(
    text: string,
    outputPath: string
  ): Promise<{ path: string; duration: number }> {
    await this.tts.generateAudio(text, outputPath);
    const duration = calculateTotalDuration(text, this.style);

    return {
      path: outputPath,
      duration,
    };
  }

  /**
   * Validate that audio file was created successfully
   */
  async validateAudio(audioPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(audioPath);
      return stats.size > 0;
    } catch {
      return false;
    }
  }
}
