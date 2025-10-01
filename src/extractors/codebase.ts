/**
 * Extract codebase structure from git repositories.
 */

import { simpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CodebaseInfo, CodebaseFile, DirectoryNode } from '../types/analysis.js';

/**
 * Determine programming language from file extension.
 */
function getLanguageFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.cxx': 'C++',
    '.h': 'C/C++ Header',
    '.hpp': 'C++ Header',
    '.cs': 'C#',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.sh': 'Shell',
    '.bash': 'Bash',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.json': 'JSON',
    '.xml': 'XML',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.md': 'Markdown',
    '.sql': 'SQL',
    '.r': 'R',
    '.m': 'Objective-C',
    '.dart': 'Dart',
    '.lua': 'Lua',
    '.pl': 'Perl',
    '.vim': 'VimScript',
  };
  return languageMap[ext] || 'Unknown';
}

/**
 * Count lines in a file.
 */
async function countLines(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Build a directory tree structure.
 */
async function buildDirectoryTree(
  dirPath: string,
  relativePath: string = '',
  trackedFiles: Set<string>
): Promise<DirectoryNode> {
  const name = path.basename(dirPath) || path.basename(relativePath) || 'root';
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const children: DirectoryNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

    // Skip if not tracked by git
    if (!trackedFiles.has(relPath) && entry.isFile()) {
      continue;
    }

    if (entry.isDirectory()) {
      // Check if directory contains any tracked files
      const hasTrackedFiles = Array.from(trackedFiles).some(f => f.startsWith(relPath + '/'));
      if (hasTrackedFiles) {
        const childNode = await buildDirectoryTree(fullPath, relPath, trackedFiles);
        children.push(childNode);
      }
    } else if (entry.isFile()) {
      children.push({
        name: entry.name,
        type: 'file',
        path: relPath,
      });
    }
  }

  // Sort: directories first, then files, both alphabetically
  children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return {
    name,
    type: 'directory',
    path: relativePath || '.',
    children,
  };
}

/**
 * Extract codebase structure and metadata.
 */
export async function extractCodebaseInfo(repoPath: string): Promise<CodebaseInfo> {
  const git = simpleGit(repoPath);

  try {
    // Get all tracked files from git
    const lsFiles = await git.raw(['ls-files']);
    const trackedFilePaths = lsFiles
      .split('\n')
      .filter(f => f.trim().length > 0)
      .map(f => f.trim());

    const trackedFilesSet = new Set(trackedFilePaths);

    // Build file metadata
    const files: CodebaseFile[] = [];
    const languageSet = new Set<string>();

    for (const relativePath of trackedFilePaths) {
      const fullPath = path.join(repoPath, relativePath);

      try {
        const stats = await fs.stat(fullPath);
        const language = getLanguageFromExtension(relativePath);
        const lines = await countLines(fullPath);

        files.push({
          path: fullPath,
          relativePath,
          language,
          size: stats.size,
          lines,
        });

        if (language !== 'Unknown') {
          languageSet.add(language);
        }
      } catch (error) {
        // Skip files that can't be read (symlinks, etc.)
        continue;
      }
    }

    // Build directory structure
    const structure = await buildDirectoryTree(repoPath, '', trackedFilesSet);

    return {
      rootPath: repoPath,
      files,
      structure,
      totalFiles: files.length,
      languages: Array.from(languageSet).sort(),
    };
  } catch (error) {
    throw new Error(
      `Failed to extract codebase info: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
