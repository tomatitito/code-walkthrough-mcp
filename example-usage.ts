#!/usr/bin/env node

/**
 * Example script showing how to use the Git Commit Video MCP Server
 * This demonstrates the complete workflow from commit analysis to video generation
 */

import { GitCommitVideoServer } from './index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const commitHash = '3e4c2f0'; // Latest commit with Phase 2 enhancements

async function main() {
  const server = new GitCommitVideoServer();
  const outputDir = path.join(process.cwd(), 'video_output');
  const framesDir = path.join(outputDir, 'frames');
  const audioPath = path.join(outputDir, 'narration.mp3');
  const videoPath = path.join(outputDir, 'walkthrough.mp4');

  try {
    // 1. Setup directories
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(framesDir, { recursive: true });
    console.log(`Output directory created at: ${outputDir}`);

    // 2. Analyze the commit
    console.log(`Analyzing commit: ${commitHash}`);
    const analyzeResult = await (server as any).analyzeCommit(process.cwd(), commitHash);
    const commitInfo = JSON.parse(analyzeResult.content[0].text);
    console.log('Commit analysis complete.');

    // 3. Generate enhanced video script with full narrative
    console.log('Generating enhanced video script...');
    const scriptResult = await (server as any).generateFullScript(commitInfo, 'beginner'); // Try 'technical', 'beginner', or 'overview'
    const scriptData = JSON.parse(scriptResult.content[0].text);
    console.log(`Video script generated. Estimated duration: ${scriptData.totalDuration} seconds`);

    // 4. Create video frames
    console.log('Creating video frames...');
    await (server as any).createFrames(commitInfo, framesDir, 'dark');
    console.log(`Video frames created in: ${framesDir}`);

    // 5. Generate audio narration using enhanced narrative
    console.log('Generating audio narration...');
    await (server as any).generateAudio(scriptData.narrative, audioPath);
    console.log(`Audio narration saved to: ${audioPath}`);

    // 6. Compile the video with audio
    console.log('Compiling video with audio...');
    const result = await (server as any).compileVideo(framesDir, videoPath, audioPath, 0.5); // 0.5 fps = 2 seconds per frame
    console.log('Video compilation result:', result.content[0].text);

  } catch (error) {
    console.error('An error occurred during the video generation process:', error);
  }
}

main();
