/**
 * Syntax highlighting utilities using highlight.js
 */

import hljs from 'highlight.js';

/**
 * Language mapping from file extensions to highlight.js language names
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'mjs': 'javascript',
  'cjs': 'javascript',

  // Web
  'html': 'html',
  'htm': 'html',
  'xml': 'xml',
  'css': 'css',
  'scss': 'scss',
  'sass': 'scss',
  'less': 'less',

  // Python
  'py': 'python',
  'pyw': 'python',

  // Java/JVM
  'java': 'java',
  'kt': 'kotlin',
  'scala': 'scala',
  'groovy': 'groovy',

  // C-family
  'c': 'c',
  'h': 'c',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'hpp': 'cpp',
  'cs': 'csharp',

  // Shell/Config
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',
  'fish': 'bash',
  'yml': 'yaml',
  'yaml': 'yaml',
  'json': 'json',
  'toml': 'toml',
  'ini': 'ini',

  // Ruby/Perl
  'rb': 'ruby',
  'pl': 'perl',
  'pm': 'perl',

  // Go/Rust
  'go': 'go',
  'rs': 'rust',

  // PHP
  'php': 'php',

  // Swift/Objective-C
  'swift': 'swift',
  'm': 'objectivec',

  // Markdown/Docs
  'md': 'markdown',
  'markdown': 'markdown',
  'rst': 'restructuredtext',

  // Other
  'sql': 'sql',
  'r': 'r',
  'lua': 'lua',
  'vim': 'vim',
  'diff': 'diff',
  'patch': 'diff',
};

/**
 * Detect language from file path
 */
export function detectLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_TO_LANGUAGE[extension] || 'plaintext';
}

/**
 * Highlight code with syntax highlighting
 */
export function highlightCode(code: string, language: string): string {
  try {
    if (language === 'plaintext' || !hljs.getLanguage(language)) {
      return hljs.highlightAuto(code).value;
    }
    return hljs.highlight(code, { language }).value;
  } catch (error) {
    // Fallback to auto-detection if specified language fails
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      // Ultimate fallback: escape HTML and return
      return escapeHtml(code);
    }
  }
}

/**
 * Highlight a diff with proper formatting
 */
export function highlightDiff(diff: string, language: string = 'plaintext'): string {
  const lines = diff.split('\n');
  const highlightedLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---')) {
      // File headers
      highlightedLines.push(`<span class="diff-header">${escapeHtml(line)}</span>`);
    } else if (line.startsWith('@@')) {
      // Hunk headers
      highlightedLines.push(`<span class="diff-hunk">${escapeHtml(line)}</span>`);
    } else if (line.startsWith('+')) {
      // Addition
      const content = line.substring(1);
      const highlighted = language !== 'plaintext'
        ? highlightCode(content, language)
        : escapeHtml(content);
      highlightedLines.push(`<span class="diff-add">+${highlighted}</span>`);
    } else if (line.startsWith('-')) {
      // Deletion
      const content = line.substring(1);
      const highlighted = language !== 'plaintext'
        ? highlightCode(content, language)
        : escapeHtml(content);
      highlightedLines.push(`<span class="diff-del">-${highlighted}</span>`);
    } else {
      // Context
      const highlighted = language !== 'plaintext'
        ? highlightCode(line, language)
        : escapeHtml(line);
      highlightedLines.push(`<span class="diff-ctx"> ${highlighted}</span>`);
    }
  }

  return highlightedLines.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get CSS theme styles for highlight.js
 */
export function getThemeStyles(theme: 'dark' | 'light' | 'github'): string {
  switch (theme) {
    case 'dark':
      return `
        /* Dark theme based on GitHub Dark */
        .hljs { background: #0d1117; color: #c9d1d9; }
        .hljs-comment { color: #8b949e; }
        .hljs-keyword { color: #ff7b72; }
        .hljs-string { color: #a5d6ff; }
        .hljs-number { color: #79c0ff; }
        .hljs-function { color: #d2a8ff; }
        .hljs-class { color: #ffa657; }
        .hljs-built_in { color: #ffa657; }
        .hljs-variable { color: #ffa657; }
        .hljs-title { color: #d2a8ff; font-weight: bold; }
        .hljs-attr { color: #79c0ff; }
        .hljs-attribute { color: #79c0ff; }
        .hljs-tag { color: #7ee787; }
        .hljs-name { color: #7ee787; }

        .diff-header { color: #8b949e; font-weight: bold; }
        .diff-hunk { color: #58a6ff; font-weight: bold; }
        .diff-add { background: rgba(46, 160, 67, 0.15); color: #7ee787; }
        .diff-del { background: rgba(248, 81, 73, 0.15); color: #ffa198; }
        .diff-ctx { color: #c9d1d9; }
      `;

    case 'light':
      return `
        /* Light theme based on GitHub Light */
        .hljs { background: #ffffff; color: #24292f; }
        .hljs-comment { color: #6e7781; }
        .hljs-keyword { color: #cf222e; }
        .hljs-string { color: #0a3069; }
        .hljs-number { color: #0550ae; }
        .hljs-function { color: #8250df; }
        .hljs-class { color: #953800; }
        .hljs-built_in { color: #953800; }
        .hljs-variable { color: #953800; }
        .hljs-title { color: #8250df; font-weight: bold; }
        .hljs-attr { color: #0550ae; }
        .hljs-attribute { color: #0550ae; }
        .hljs-tag { color: #116329; }
        .hljs-name { color: #116329; }

        .diff-header { color: #6e7781; font-weight: bold; }
        .diff-hunk { color: #0969da; font-weight: bold; }
        .diff-add { background: rgba(26, 127, 55, 0.1); color: #116329; }
        .diff-del { background: rgba(248, 81, 73, 0.1); color: #cf222e; }
        .diff-ctx { color: #24292f; }
      `;

    case 'github':
      return `
        /* GitHub classic theme */
        .hljs { background: #f6f8fa; color: #24292e; }
        .hljs-comment { color: #6a737d; }
        .hljs-keyword { color: #d73a49; }
        .hljs-string { color: #032f62; }
        .hljs-number { color: #005cc5; }
        .hljs-function { color: #6f42c1; }
        .hljs-class { color: #e36209; }
        .hljs-built_in { color: #e36209; }
        .hljs-variable { color: #e36209; }
        .hljs-title { color: #6f42c1; font-weight: bold; }
        .hljs-attr { color: #005cc5; }
        .hljs-attribute { color: #005cc5; }
        .hljs-tag { color: #22863a; }
        .hljs-name { color: #22863a; }

        .diff-header { color: #6a737d; font-weight: bold; }
        .diff-hunk { color: #005cc5; font-weight: bold; }
        .diff-add { background: #e6ffed; color: #22863a; }
        .diff-del { background: #ffeef0; color: #d73a49; }
        .diff-ctx { color: #24292e; }
      `;
  }
}
