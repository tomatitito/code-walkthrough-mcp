/**
 * Video compilation using FFmpeg
 * Combines PNG frames with audio narration into final MP4 video
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HtmlToPngConverter } from '../html-to-png.js';
import { synchronizeFrames } from '../utils/timing.js';

const execAsync = promisify(exec);

export interface CompilerOptions {
  width?: number;
  height?: number;
  fps?: number;
  quality?: 'low' | 'medium' | 'high';
}

export class VideoCompiler {
  private width: number;
  private height: number;
  private fps: number;
  private quality: 'low' | 'medium' | 'high';
  private converter: HtmlToPngConverter;

  constructor(options: CompilerOptions = {}) {
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.fps = options.fps || 30;
    this.quality = options.quality || 'high';
    this.converter = new HtmlToPngConverter();
  }

  /**
   * Initialize the HTML to PNG converter
   */
  async initialize(): Promise<void> {
    await this.converter.initialize();
  }

  /**
   * Close the converter
   */
  async close(): Promise<void> {
    await this.converter.close();
  }

  /**
   * Convert HTML frames to PNG images
   */
  async convertFramesToPng(
    htmlFrames: string[],
    outputDir: string
  ): Promise<string[]> {
    console.log(`Converting ${htmlFrames.length} HTML frames to PNG...`);

    await fs.mkdir(outputDir, { recursive: true });

    const pngPaths: string[] = [];

    for (let i = 0; i < htmlFrames.length; i++) {
      const htmlPath = htmlFrames[i];
      const pngPath = path.join(outputDir, `frame-${i.toString().padStart(3, '0')}.png`);

      await this.converter.convertFile(htmlPath, pngPath, {
        width: this.width,
        height: this.height,
        deviceScaleFactor: 2,
      });

      pngPaths.push(pngPath);
      console.log(`  Converted frame ${i + 1}/${htmlFrames.length}`);
    }

    console.log('PNG conversion complete!');
    return pngPaths;
  }

  /**
   * Compile video from PNG frames and audio
   */
  async compileVideo(
    pngFrames: string[],
    frameDurations: number[],
    audioPath: string | null,
    outputPath: string
  ): Promise<void> {
    console.log('Compiling video with FFmpeg...');

    if (pngFrames.length === 0) {
      throw new Error('No frames to compile');
    }

    if (frameDurations.length !== pngFrames.length) {
      throw new Error(`Frame count mismatch: ${pngFrames.length} frames, ${frameDurations.length} durations`);
    }

    // Create a concat file for FFmpeg with duration for each frame
    const concatFilePath = path.join(path.dirname(pngFrames[0]), 'concat.txt');
    await this.createConcatFile(pngFrames, frameDurations, concatFilePath);

    // Build FFmpeg command
    const ffmpegArgs: string[] = [];

    // Input: concat file
    ffmpegArgs.push('-f concat');
    ffmpegArgs.push('-safe 0');
    ffmpegArgs.push(`-i "${concatFilePath}"`);

    // Input: audio (if provided)
    if (audioPath) {
      ffmpegArgs.push(`-i "${audioPath}"`);
    }

    // Video encoding settings based on quality
    const crf = this.quality === 'high' ? '18' : this.quality === 'medium' ? '23' : '28';
    const preset = this.quality === 'high' ? 'slow' : this.quality === 'medium' ? 'medium' : 'fast';

    ffmpegArgs.push('-c:v libx264');
    ffmpegArgs.push(`-crf ${crf}`);
    ffmpegArgs.push(`-preset ${preset}`);
    ffmpegArgs.push('-pix_fmt yuv420p');
    ffmpegArgs.push(`-r ${this.fps}`);

    // Audio settings (if audio is provided)
    if (audioPath) {
      ffmpegArgs.push('-c:a aac');
      ffmpegArgs.push('-b:a 192k');
      ffmpegArgs.push('-shortest'); // End video when audio ends
    }

    // Output
    ffmpegArgs.push('-y'); // Overwrite output file
    ffmpegArgs.push(`"${outputPath}"`);

    const command = `ffmpeg ${ffmpegArgs.join(' ')}`;

    console.log('Running FFmpeg...');
    console.log(`Command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // FFmpeg outputs to stderr by default
      if (stderr) {
        console.log('FFmpeg output:', stderr.substring(0, 500));
      }

      // Verify output file exists
      const stats = await fs.stat(outputPath);
      console.log(`Video compiled successfully: ${outputPath}`);
      console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Clean up concat file
      await fs.unlink(concatFilePath);

    } catch (error) {
      console.error('FFmpeg error:', error);
      throw new Error(`Failed to compile video: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create FFmpeg concat file with frame durations
   */
  private async createConcatFile(
    pngFrames: string[],
    frameDurations: number[],
    outputPath: string
  ): Promise<void> {
    const lines: string[] = [];

    for (let i = 0; i < pngFrames.length; i++) {
      lines.push(`file '${pngFrames[i]}'`);
      lines.push(`duration ${frameDurations[i]}`);
    }

    // FFmpeg requires the last frame to be listed again without duration
    if (pngFrames.length > 0) {
      lines.push(`file '${pngFrames[pngFrames.length - 1]}'`);
    }

    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
  }

  /**
   * Compile video without audio (silent video)
   */
  async compileSilentVideo(
    pngFrames: string[],
    frameDurations: number[],
    outputPath: string
  ): Promise<void> {
    await this.compileVideo(pngFrames, frameDurations, null, outputPath);
  }

  /**
   * Check if FFmpeg is installed
   */
  async checkFFmpeg(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get FFmpeg version info
   */
  async getFFmpegVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      const firstLine = stdout.split('\n')[0];
      return firstLine;
    } catch {
      return 'FFmpeg not found';
    }
  }
}

/**
 * Quick compile function for simple use cases
 */
export async function compileVideo(
  htmlFrames: string[],
  frameDurations: number[],
  audioPath: string | null,
  outputPath: string,
  options: CompilerOptions = {}
): Promise<void> {
  const compiler = new VideoCompiler(options);

  try {
    await compiler.initialize();

    // Convert HTML to PNG
    const pngDir = path.join(path.dirname(outputPath), 'frames-png');
    const pngFrames = await compiler.convertFramesToPng(htmlFrames, pngDir);

    // Compile video
    await compiler.compileVideo(pngFrames, frameDurations, audioPath, outputPath);

    // Clean up PNG frames
    console.log('Cleaning up temporary PNG frames...');
    for (const pngPath of pngFrames) {
      await fs.unlink(pngPath).catch(() => { });
    }
    await fs.rmdir(pngDir).catch(() => { });

  } finally {
    await compiler.close();
  }
}
