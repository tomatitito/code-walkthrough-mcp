/**
 * Extract unstaged changes from git repositories (working directory).
 */

import { simpleGit } from 'simple-git';
import { DiffInfo, FileChange } from '../types/analysis.js';

/**
 * Determine file status from diff summary.
 */
function getFileStatus(file: any): "added" | "modified" | "deleted" | "binary" {
  if (file.binary) return "binary";
  if (file.insertions > 0 && file.deletions === 0) return "added";
  if (file.insertions === 0 && file.deletions > 0) return "deleted";
  return "modified";
}

/**
 * Extract diff for a specific file from full diff output.
 */
function extractFileDiff(fullDiff: string, filePath: string): string {
  const fileMarker = `diff --git a/${filePath}`;
  const startIdx = fullDiff.indexOf(fileMarker);
  if (startIdx === -1) return "";

  const nextFileIdx = fullDiff.indexOf("diff --git", startIdx + 1);
  return nextFileIdx === -1
    ? fullDiff.slice(startIdx)
    : fullDiff.slice(startIdx, nextFileIdx);
}

/**
 * Extract unstaged changes (working directory).
 */
export async function extractUnstagedChanges(repoPath: string): Promise<DiffInfo> {
  const git = simpleGit(repoPath);

  try {
    // Get diff for unstaged changes
    const diff = await git.diff();
    const diffSummary = await git.diffSummary();

    // Handle case where there are no changes
    if (!diffSummary || !diffSummary.files || diffSummary.files.length === 0) {
      return {
        type: "unstaged",
        files: [],
        totalStats: {
          additions: 0,
          deletions: 0,
          filesChanged: 0,
        },
      };
    }

    const files: FileChange[] = diffSummary.files.map(file => {
      if ('insertions' in file && 'deletions' in file) {
        return {
          path: file.file,
          status: getFileStatus(file),
          additions: file.insertions,
          deletions: file.deletions,
          diff: extractFileDiff(diff, file.file),
        };
      }
      return {
        path: file.file,
        status: 'binary',
        additions: 0,
        deletions: 0,
        diff: ''
      };
    });

    const totalStats = {
      additions: diffSummary.insertions || 0,
      deletions: diffSummary.deletions || 0,
      filesChanged: diffSummary.files.length,
    };

    return {
      type: "unstaged",
      files,
      totalStats,
    };
  } catch (error) {
    // Handle errors gracefully
    throw new Error(
      `Failed to extract unstaged changes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
