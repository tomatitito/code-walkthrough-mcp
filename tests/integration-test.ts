/**
 * Basic integration test for Phase 1 implementation.
 *
 * This test verifies that:
 * 1. The server can be instantiated
 * 2. Type definitions are correctly exported
 * 3. Core modules load without errors
 *
 * Note: Full MCP sampling integration tests require a running MCP client,
 * which is beyond the scope of this basic test.
 */

import { extractCommitInfo } from '../src/extractors/commit.js';
import type { WalkthroughState, TargetSpec, PresentationStyle } from '../src/types/state.js';
import type { AnalysisResult } from '../src/types/state.js';
import type { VideoScript } from '../src/types/script.js';

async function runTests() {
  console.log("Running Phase 1 Integration Tests...\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Type definitions are accessible
  console.log("Test 1: Type definitions are accessible");
  try {
    const targetSpec: TargetSpec = {
      type: "commit",
      commitHash: "abc123"
    };

    const style: PresentationStyle = "technical";

    console.log("✓ Type definitions loaded successfully");
    passed++;
  } catch (error) {
    console.log("✗ Failed to load type definitions:", error);
    failed++;
  }

  // Test 2: Extract commit info from current repo
  console.log("\nTest 2: Extract commit info from current repo");
  try {
    // Get the most recent commit from the current repo
    const repoPath = process.cwd();
    const { default: simpleGit } = await import('simple-git');
    const git = simpleGit(repoPath);

    const log = await git.log({ maxCount: 1 });
    if (log.latest) {
      const commitInfo = await extractCommitInfo(repoPath, log.latest.hash);

      if (commitInfo.hash && commitInfo.author && commitInfo.date) {
        console.log(`✓ Successfully extracted commit ${commitInfo.hash.slice(0, 8)}`);
        console.log(`  Author: ${commitInfo.author}`);
        console.log(`  Files: ${commitInfo.files.length}`);
        passed++;
      } else {
        throw new Error("Commit info missing required fields");
      }
    } else {
      console.log("⊘ No commits found in repository (skipped)");
    }
  } catch (error) {
    console.log("✗ Failed to extract commit info:", error);
    failed++;
  }

  // Test 3: Verify prompt generation
  console.log("\nTest 3: Verify prompt generation");
  try {
    const { generateCommitAnalysisPrompt } = await import('../src/utils/prompts.js');

    const mockCommitInfo = {
      hash: "abc123",
      author: "Test Author",
      date: "2025-01-01",
      message: "Test commit",
      files: [
        {
          path: "test.ts",
          status: "modified" as const,
          additions: 10,
          deletions: 5,
          diff: "diff content"
        }
      ]
    };

    const prompt = generateCommitAnalysisPrompt(mockCommitInfo);

    if (prompt.includes("Analyze the following git commit") &&
      prompt.includes("Return your analysis in the following JSON format")) {
      console.log("✓ Prompt generation working correctly");
      console.log(`  Prompt length: ${prompt.length} characters`);
      passed++;
    } else {
      throw new Error("Prompt missing expected content");
    }
  } catch (error) {
    console.log("✗ Failed to generate prompt:", error);
    failed++;
  }

  // Test 4: Verify all stage modules load
  console.log("\nTest 4: Verify all stage modules load");
  try {
    await import('../src/stages/analysis.js');
    await import('../src/stages/script.js');

    console.log("✓ All stage modules loaded successfully");
    passed++;
  } catch (error) {
    console.log("✗ Failed to load stage modules:", error);
    failed++;
  }

  // Test 5: Verify server can be instantiated
  console.log("\nTest 5: Verify server can be instantiated");
  try {
    const { GitCommitVideoServer } = await import('../src/index.js');
    const server = new GitCommitVideoServer();

    if (server) {
      console.log("✓ Server instantiated successfully");
      passed++;
    } else {
      throw new Error("Server instantiation returned null");
    }
  } catch (error) {
    console.log("✗ Failed to instantiate server:", error);
    failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. Please review the errors above.");
    process.exit(1);
  } else {
    console.log("\n✓ All tests passed!");
    console.log("\nPhase 1 implementation is ready for testing with MCP clients.");
    console.log("Note: Full sampling integration requires a running MCP client that supports sampling.");
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Test suite failed with error:", error);
  process.exit(1);
});
