/**
 * Video generation stage - orchestrates frame, audio, and video compilation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisResult, PresentationStyle, Theme } from '../types/state.js';
import { VideoScript } from '../types/script.js';
import { FrameGenerator } from '../generators/frames.js';
import { AudioGenerator } from '../generators/audio.js';
import { VideoCompiler } from '../generators/compiler.js';
import { calculateFrameDurations, createTimingSegments } from '../utils/timing.js';

export interface VideoGenerationResult {
  videoPath: string;
  duration: number;
  frameCount: number;
  hasAudio: boolean;
  tempFiles: string[]; // Files to clean up
}

/**
 * Generate complete video walkthrough from analysis and script
 */
export async function generateVideo(
  analysis: AnalysisResult,
  script: VideoScript,
  style: PresentationStyle,
  theme: Theme,
  outputPath: string
): Promise<VideoGenerationResult> {
  console.log('Starting video generation pipeline...');

  // Create temporary directory for intermediate files
  const tempDir = path.join(path.dirname(outputPath), '.temp-video-' + Date.now());
  await fs.mkdir(tempDir, { recursive: true });

  const tempFiles: string[] = [tempDir];

  try {
    // Step 1: Generate HTML frames
    console.log('\n=== Step 1: Generating HTML Frames ===');
    const frameGenerator = new FrameGenerator({ theme });
    const framesDir = path.join(tempDir, 'frames-html');
    const htmlFrames = await frameGenerator.generateFrames(analysis, script, framesDir);

    console.log(`Generated ${htmlFrames.length} HTML frames`);
    tempFiles.push(...htmlFrames);

    // Step 2: Generate audio narration
    console.log('\n=== Step 2: Generating Audio Narration ===');
    const audioGenerator = new AudioGenerator({ style });
    const audioPath = path.join(tempDir, 'narration.mp3');

    let audioDuration = 0;
    let hasAudio = false;

    try {
      const audioResult = await audioGenerator.generateAudio(script, audioPath);
      audioDuration = audioResult.duration;
      hasAudio = await audioGenerator.validateAudio(audioPath);

      if (hasAudio) {
        console.log(`Audio generated successfully: ${audioDuration.toFixed(2)}s`);
        tempFiles.push(audioPath);
      } else {
        console.warn('Audio generation failed, proceeding without audio');
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      console.log('Continuing without audio...');
      hasAudio = false;
    }

    // Step 3: Calculate frame durations based on audio timing
    console.log('\n=== Step 3: Calculating Frame Timing ===');
    let frameDurations: number[];

    if (hasAudio && audioDuration > 0) {
      // Create timing segments from narration
      const segments = createTimingSegments(script.fullNarrative, style);
      frameDurations = calculateFrameDurations(htmlFrames.length, segments);
      console.log(`Frame durations synchronized with audio (${segments.length} segments)`);
    } else {
      // Use default durations (3 seconds per frame for title/outro, 5 for content)
      frameDurations = htmlFrames.map((_, i) => {
        if (i === 0 || i === htmlFrames.length - 1) {
          return 3; // Title and outro: 3 seconds
        }
        return 5; // Content frames: 5 seconds
      });
      console.log('Using default frame durations (no audio)');
    }

    console.log(`Total video duration: ${frameDurations.reduce((a, b) => a + b, 0).toFixed(2)}s`);

    // Step 4: Convert HTML frames to PNG
    console.log('\n=== Step 4: Converting Frames to PNG ===');
    const compiler = new VideoCompiler({
      width: 1920,
      height: 1080,
      fps: 30,
      quality: 'high',
    });

    await compiler.initialize();

    const pngDir = path.join(tempDir, 'frames-png');
    const pngFrames = await compiler.convertFramesToPng(htmlFrames, pngDir);
    tempFiles.push(...pngFrames);

    console.log(`Converted ${pngFrames.length} frames to PNG`);

    // Step 5: Compile final video
    console.log('\n=== Step 5: Compiling Final Video ===');

    // Check FFmpeg availability
    const ffmpegAvailable = await compiler.checkFFmpeg();
    if (!ffmpegAvailable) {
      await compiler.close();
      throw new Error('FFmpeg is not installed or not available in PATH. Please install FFmpeg to continue.');
    }

    const ffmpegVersion = await compiler.getFFmpegVersion();
    console.log(`Using ${ffmpegVersion}`);

    // Compile video
    await compiler.compileVideo(
      pngFrames,
      frameDurations,
      hasAudio ? audioPath : null,
      outputPath
    );

    await compiler.close();

    // Calculate total duration
    const totalDuration = frameDurations.reduce((sum, d) => sum + d, 0);

    console.log('\n=== Video Generation Complete ===');
    console.log(`Output: ${outputPath}`);
    console.log(`Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`Frames: ${htmlFrames.length}`);
    console.log(`Audio: ${hasAudio ? 'Yes' : 'No'}`);

    return {
      videoPath: outputPath,
      duration: totalDuration,
      frameCount: htmlFrames.length,
      hasAudio,
      tempFiles,
    };

  } catch (error) {
    // Clean up temp files on error
    await cleanupTempFiles(tempFiles);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(tempFiles: string[]): Promise<void> {
  console.log('\nCleaning up temporary files...');

  for (const file of tempFiles) {
    try {
      const stats = await fs.stat(file);
      if (stats.isDirectory()) {
        await fs.rm(file, { recursive: true, force: true });
      } else {
        await fs.unlink(file);
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  console.log('Cleanup complete');
}
