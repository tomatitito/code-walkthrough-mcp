#!/usr/bin/env bun

/**
 * Phase 2 Integration Test - Test all extractors
 */

import { extractCommitInfo } from './src/extractors/commit.js';
import { extractStagedChanges } from './src/extractors/staged.js';
import { extractUnstagedChanges } from './src/extractors/unstaged.js';
import { extractCodebaseInfo } from './src/extractors/codebase.js';
import { simpleGit } from 'simple-git';

const REPO_PATH = process.cwd();

async function testCommitExtractor() {
  console.log('\n📦 Testing Commit Extractor...');
  const git = simpleGit(REPO_PATH);

  try {
    // Get the latest commit
    const log = await git.log({ maxCount: 1 });
    if (log.all.length === 0) {
      console.log('⚠️  No commits found, skipping commit extractor test');
      return;
    }

    const commitHash = log.latest!.hash;
    console.log(`   Using commit: ${commitHash.slice(0, 8)}`);

    const commitInfo = await extractCommitInfo(REPO_PATH, commitHash);

    console.log(`   ✅ Author: ${commitInfo.author}`);
    console.log(`   ✅ Message: ${commitInfo.message.split('\n')[0]}`);
    console.log(`   ✅ Files changed: ${commitInfo.files.length}`);

    if (commitInfo.files.length > 0) {
      console.log(`   ✅ First file: ${commitInfo.files[0].path} (${commitInfo.files[0].status})`);
    }
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

async function testUnstagedExtractor() {
  console.log('\n📦 Testing Unstaged Changes Extractor...');

  try {
    const diffInfo = await extractUnstagedChanges(REPO_PATH);

    console.log(`   ✅ Type: ${diffInfo.type}`);
    console.log(`   ✅ Files changed: ${diffInfo.files.length}`);
    console.log(`   ✅ Total additions: ${diffInfo.totalStats.additions}`);
    console.log(`   ✅ Total deletions: ${diffInfo.totalStats.deletions}`);

    if (diffInfo.files.length > 0) {
      console.log(`   ✅ First file: ${diffInfo.files[0].path} (${diffInfo.files[0].status})`);
    } else {
      console.log('   ℹ️  No unstaged changes found');
    }
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

async function testStagedExtractor() {
  console.log('\n📦 Testing Staged Changes Extractor...');

  try {
    const diffInfo = await extractStagedChanges(REPO_PATH);

    console.log(`   ✅ Type: ${diffInfo.type}`);
    console.log(`   ✅ Files changed: ${diffInfo.files.length}`);
    console.log(`   ✅ Total additions: ${diffInfo.totalStats.additions}`);
    console.log(`   ✅ Total deletions: ${diffInfo.totalStats.deletions}`);

    if (diffInfo.files.length > 0) {
      console.log(`   ✅ First file: ${diffInfo.files[0].path} (${diffInfo.files[0].status})`);
    } else {
      console.log('   ℹ️  No staged changes found');
    }
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

async function testCodebaseExtractor() {
  console.log('\n📦 Testing Codebase Extractor...');

  try {
    const codebaseInfo = await extractCodebaseInfo(REPO_PATH);

    console.log(`   ✅ Root path: ${codebaseInfo.rootPath}`);
    console.log(`   ✅ Total files: ${codebaseInfo.totalFiles}`);
    console.log(`   ✅ Languages: ${codebaseInfo.languages.join(', ')}`);
    console.log(`   ✅ Structure root: ${codebaseInfo.structure.name}`);
    console.log(`   ✅ Top-level items: ${codebaseInfo.structure.children?.length || 0}`);

    if (codebaseInfo.files.length > 0) {
      const file = codebaseInfo.files[0];
      console.log(`   ✅ First file: ${file.relativePath} (${file.language}, ${file.lines} lines)`);
    }

    // Display a sample of the structure
    console.log('\n   📁 Directory structure (top level):');
    codebaseInfo.structure.children?.slice(0, 5).forEach(child => {
      const icon = child.type === 'directory' ? '📁' : '📄';
      console.log(`      ${icon} ${child.name}`);
    });

    if (codebaseInfo.structure.children && codebaseInfo.structure.children.length > 5) {
      console.log(`      ... and ${codebaseInfo.structure.children.length - 5} more`);
    }
  } catch (error) {
    console.error('   ❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log('🧪 Phase 2 Integration Tests');
  console.log('============================');
  console.log(`Repository: ${REPO_PATH}`);

  await testCommitExtractor();
  await testUnstagedExtractor();
  await testStagedExtractor();
  await testCodebaseExtractor();

  console.log('\n✅ All tests completed!');
}

main().catch(console.error);
