/**
 * Types for commit and codebase analysis results.
 */

export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: FileChange[];
}

export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "binary";
  additions: number;
  deletions: number;
  diff: string;
}

export interface DiffInfo {
  type: "staged" | "unstaged";
  files: FileChange[];
  totalStats: {
    additions: number;
    deletions: number;
    filesChanged: number;
  };
}

export interface CodebaseInfo {
  rootPath: string;
  files: CodebaseFile[];
  structure: DirectoryNode;
  totalFiles: number;
  languages: string[];
}

export interface CodebaseFile {
  path: string;
  relativePath: string;
  language: string;
  size: number;
  lines: number;
}

export interface DirectoryNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: DirectoryNode[];
}
