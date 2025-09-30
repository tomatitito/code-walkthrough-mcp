#!/usr/bin/env bun

/**
 * Integration test for git-commit-video tool
 * Tests the full workflow from commit analysis to video generation
 */

import { GitCommitVideoServer } from './src/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_OUTPUT_DIR = 'test_output';
const TEST_COMMIT = 'HEAD~1'; // Test with second-to-last commit

async function cleanup() {
  try {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
}

async function runTest() {
  console.log('🧪 Running integration test...\n');

  const server = new GitCommitVideoServer();
  const framesDir = path.join(TEST_OUTPUT_DIR, 'frames');
  const audioPath = path.join(TEST_OUTPUT_DIR, 'narration.mp3');
  const videoPath = path.join(TEST_OUTPUT_DIR, 'walkthrough.mp4');

  try {
    // Setup
    await cleanup();
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    await fs.mkdir(framesDir, { recursive: true });

    // Test 1: Commit Analysis
    console.log('✓ Test 1: Analyzing commit...');
    const analyzeResult = await (server as any).analyzeCommit(process.cwd(), TEST_COMMIT);
    const commitInfo = JSON.parse(analyzeResult.content[0].text);
    
    if (!commitInfo.hash || !commitInfo.author || !commitInfo.files) {
      throw new Error('Commit analysis failed: missing required fields');
    }
    console.log(`  ✓ Commit ${commitInfo.hash.slice(0, 8)} by ${commitInfo.author}`);
    console.log(`  ✓ Found ${commitInfo.files.length} file(s)\n`);

    // Test 2: Script Generation
    console.log('✓ Test 2: Generating video script...');
    const scriptResult = await (server as any).generateFullScript(commitInfo, 'overview');
    const scriptData = JSON.parse(scriptResult.content[0].text);
    
    if (!scriptData.narrative || scriptData.narrative.length === 0) {
      throw new Error('Script generation failed: empty narrative');
    }
    console.log(`  ✓ Generated script (${scriptData.narrative.length} chars)\n`);

    // Test 3: Frame Creation
    console.log('✓ Test 3: Creating video frames...');
    await (server as any).createFrames(commitInfo, framesDir, 'dark');
    
    const frames = await fs.readdir(framesDir);
    const htmlFrames = frames.filter(f => f.endsWith('.html'));
    
    if (htmlFrames.length === 0) {
      throw new Error('Frame creation failed: no frames generated');
    }
    console.log(`  ✓ Created ${htmlFrames.length} frame(s)\n`);

    // Test 4: Audio Generation
    console.log('✓ Test 4: Generating audio narration...');
    await (server as any).generateAudio(scriptData.narrative, audioPath);
    
    const audioStats = await fs.stat(audioPath);
    if (audioStats.size === 0) {
      throw new Error('Audio generation failed: empty file');
    }
    console.log(`  ✓ Generated audio (${(audioStats.size / 1024).toFixed(0)} KB)\n`);

    // Test 5: Video Compilation
    console.log('✓ Test 5: Compiling video...');
    await (server as any).compileVideo(framesDir, videoPath, audioPath, 1);
    
    const videoStats = await fs.stat(videoPath);
    if (videoStats.size === 0) {
      throw new Error('Video compilation failed: empty file');
    }
    console.log(`  ✓ Compiled video (${(videoStats.size / 1024 / 1024).toFixed(2)} MB)\n`);

    // Success
    console.log('✅ All tests passed!\n');
    console.log(`Test output saved to: ${TEST_OUTPUT_DIR}/`);
    console.log(`You can view the video: open ${videoPath}`);
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run test
runTest();
