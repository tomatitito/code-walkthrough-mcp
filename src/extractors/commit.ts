/**
 * Extract commit information and diffs from git repositories.
 */

import { simpleGit, SimpleGit } from 'simple-git';
import * as path from 'path';
import { CommitInfo, FileChange, DiffInfo } from '../types/analysis.js';

/**
 * Extract detailed information about a specific commit.
 */
export async function extractCommitInfo(
  repoPath: string,
  commitHash: string
): Promise<CommitInfo> {
  const git = simpleGit(repoPath);

  // Get commit details
  const log = await git.show([commitHash, "--stat", "--format=%H%n%an%n%ai%n%s%n%b"]);
  const diff = await git.show([commitHash, "--unified=3"]);

  // Parse commit info
  const lines = log.split('\n');
  const commitInfo: CommitInfo = {
    hash: lines[0],
    author: lines[1],
    date: lines[2],
    message: lines.slice(3).join('\n').trim(),
    files: [],
  };

  // Check if this is the initial commit
  const parents = await git.raw(['rev-list', '--parents', '-n', '1', commitHash]);
  const isInitialCommit = parents.split(' ').length === 1;

  if (isInitialCommit) {
    // For initial commit, all files are additions
    const files = await git.show([commitHash, '--pretty=format:', '--name-only']);
    commitInfo.files = files.split('\n').filter(f => f).map(f => ({
      path: f,
      status: 'added',
      additions: 0, // Not easily available for initial commit
      deletions: 0,
      diff: extractFileDiff(diff, f)
    }));
  } else {
    // For normal commits, use diff summary
    const diffSummary = await git.diffSummary([`${commitHash}^`, commitHash]);
    commitInfo.files = diffSummary.files.map(file => {
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
  }

  return commitInfo;
}



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
