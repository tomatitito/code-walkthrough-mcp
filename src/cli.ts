#!/usr/bin/env node

import { GitCommitVideoServer } from './index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Git Commit Video Walkthrough Generator

Usage:
  git-commit-video <commit-hash> [options]

Options:
  --repo <path>          Path to git repository (default: current directory)
  --output <path>        Output directory (default: ./video_output)
  --style <style>        Presentation style: beginner, technical, overview (default: beginner)
  --theme <theme>        Visual theme: dark, light, github (default: dark)
  --fps <number>         Frames per second (default: 0.5)
  --help, -h             Show this help message

Examples:
  git-commit-video abc123
  git-commit-video abc123 --style technical --theme light
  git-commit-video abc123 --repo /path/to/repo --output ./my-video
`);
    process.exit(0);
  }

  const commitHash = args[0];
  const repoPath = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : process.cwd();
  const outputDir = args.includes('--output') ? args[args.indexOf('--output') + 1] : path.join(process.cwd(), 'video_output');
  const style = args.includes('--style') ? args[args.indexOf('--style') + 1] : 'beginner';
  const theme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : 'dark';
  const fps = args.includes('--fps') ? parseFloat(args[args.indexOf('--fps') + 1]) : 0.5;

  const server = new GitCommitVideoServer();
  const framesDir = path.join(outputDir, 'frames');
  const audioPath = path.join(outputDir, 'narration.mp3');
  const videoPath = path.join(outputDir, 'walkthrough.mp4');

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(framesDir, { recursive: true });
    console.log(`Output directory: ${outputDir}\n`);

    console.log(`Analyzing commit: ${commitHash}`);
    const analyzeResult = await (server as any).analyzeCommit(repoPath, commitHash);
    const commitInfo = JSON.parse(analyzeResult.content[0].text);
    console.log('✓ Commit analysis complete\n');

    console.log('Generating video script...');
    const scriptResult = await (server as any).generateFullScript(commitInfo, style);
    const scriptData = JSON.parse(scriptResult.content[0].text);
    console.log(`✓ Script generated (estimated duration: ${scriptData.totalDuration}s)\n`);

    console.log('Creating video frames...');
    await (server as any).createFrames(commitInfo, framesDir, theme);
    console.log('✓ Frames created\n');

    console.log('Generating audio narration...');
    await (server as any).generateAudio(scriptData.narrative, audioPath);
    console.log('✓ Audio generated\n');

    console.log('Compiling video...');
    await (server as any).compileVideo(framesDir, videoPath, audioPath, fps);
    console.log(`\n✓ Video created: ${videoPath}`);
    console.log(`\nYou can play it with: open ${videoPath}`);

  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
