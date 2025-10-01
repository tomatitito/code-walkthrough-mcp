/**
 * HTML frame generation for video walkthrough
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisResult } from '../types/state.js';
import { VideoScript } from '../types/script.js';
import { detectLanguage, highlightDiff, getThemeStyles } from '../utils/syntax-highlight.js';

export interface FrameGeneratorOptions {
  theme: 'dark' | 'light' | 'github';
  width?: number;
  height?: number;
}

export class FrameGenerator {
  private theme: 'dark' | 'light' | 'github';
  private width: number;
  private height: number;

  constructor(options: FrameGeneratorOptions) {
    this.theme = options.theme;
    this.width = options.width || 1920;
    this.height = options.height || 1080;
  }

  /**
   * Generate all frames for a video walkthrough
   */
  async generateFrames(
    analysis: AnalysisResult,
    script: VideoScript,
    outputDir: string
  ): Promise<string[]> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const framePaths: string[] = [];

    // Frame 0: Title slide
    const titlePath = path.join(outputDir, 'frame-000-title.html');
    await this.generateTitleFrame(
      analysis.summary.achievement,
      titlePath
    );
    framePaths.push(titlePath);

    // Frames 1-N: File changes
    let frameIndex = 1;
    for (const fileAnalysis of analysis.files) {
      const framePath = path.join(outputDir, `frame-${frameIndex.toString().padStart(3, '0')}-${this.sanitizeFilename(fileAnalysis.path)}.html`);

      await this.generateFileFrame(
        fileAnalysis,
        script.sections.find(s => s.file === fileAnalysis.path),
        framePath
      );

      framePaths.push(framePath);
      frameIndex++;
    }

    // Frame N+1: Outro slide
    const outroPath = path.join(outputDir, `frame-${frameIndex.toString().padStart(3, '0')}-outro.html`);
    await this.generateOutroFrame(
      analysis.summary.approach,
      outroPath
    );
    framePaths.push(outroPath);

    console.log(`Generated ${framePaths.length} HTML frames in ${outputDir}`);
    return framePaths;
  }

  /**
   * Generate title frame
   */
  private async generateTitleFrame(
    title: string,
    outputPath: string
  ): Promise<void> {
    const html = this.createBaseTemplate(`
      <div class="title-slide">
        <div class="title-content">
          <h1 class="main-title">Code Walkthrough</h1>
          <div class="title-divider"></div>
          <h2 class="subtitle">${this.escapeHtml(title)}</h2>
        </div>
      </div>
    `, this.getTitleStyles());

    await fs.writeFile(outputPath, html, 'utf-8');
  }

  /**
   * Generate frame for a file change
   */
  private async generateFileFrame(
    fileAnalysis: any,
    section: any,
    outputPath: string
  ): Promise<void> {
    const language = detectLanguage(fileAnalysis.path);

    // Create diff display
    let diffHtml = '';
    if (fileAnalysis.status === 'added') {
      diffHtml = `<div class="status-badge status-added">Added</div>`;
    } else if (fileAnalysis.status === 'deleted') {
      diffHtml = `<div class="status-badge status-deleted">Deleted</div>`;
    } else if (fileAnalysis.status === 'modified') {
      diffHtml = `<div class="status-badge status-modified">Modified</div>`;
    }

    // Highlight the diff if available
    let codeBlock = '';
    if (fileAnalysis.diff && fileAnalysis.status !== 'binary') {
      const highlighted = highlightDiff(fileAnalysis.diff, language);
      codeBlock = `
        <div class="code-container">
          <pre><code class="hljs language-${language}">${highlighted}</code></pre>
        </div>
      `;
    } else if (fileAnalysis.status === 'binary') {
      codeBlock = `
        <div class="binary-notice">
          <p>Binary file</p>
        </div>
      `;
    }

    const html = this.createBaseTemplate(`
      <div class="file-slide">
        <div class="file-header">
          <div class="file-path">${this.escapeHtml(fileAnalysis.path)}</div>
          ${diffHtml}
        </div>
        <div class="file-description">
          <p><strong>What:</strong> ${this.escapeHtml(fileAnalysis.explanation)}</p>
          <p><strong>Why:</strong> ${this.escapeHtml(fileAnalysis.impact)}</p>
        </div>
        ${codeBlock}
      </div>
    `, this.getFileStyles());

    await fs.writeFile(outputPath, html, 'utf-8');
  }

  /**
   * Generate outro frame
   */
  private async generateOutroFrame(
    approach: string,
    outputPath: string
  ): Promise<void> {
    const html = this.createBaseTemplate(`
      <div class="outro-slide">
        <div class="outro-content">
          <h1 class="outro-title">Summary</h1>
          <div class="outro-divider"></div>
          <p class="outro-text">${this.escapeHtml(approach)}</p>
          <div class="outro-footer">
            <p>End of Walkthrough</p>
          </div>
        </div>
      </div>
    `, this.getOutroStyles());

    await fs.writeFile(outputPath, html, 'utf-8');
  }

  /**
   * Create base HTML template
   */
  private createBaseTemplate(content: string, additionalStyles: string = ''): string {
    const backgroundColor = this.theme === 'dark' ? '#0d1117' : this.theme === 'light' ? '#ffffff' : '#f6f8fa';
    const textColor = this.theme === 'dark' ? '#c9d1d9' : '#24292f';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Walkthrough Frame</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: ${this.width}px;
      height: ${this.height}px;
      background: ${backgroundColor};
      color: ${textColor};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    ${getThemeStyles(this.theme)}
    ${additionalStyles}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }

  /**
   * Get styles for title slide
   */
  private getTitleStyles(): string {
    const accentColor = this.theme === 'dark' ? '#58a6ff' : this.theme === 'light' ? '#0969da' : '#0366d6';

    return `
      .title-slide {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .title-content {
        max-width: 80%;
      }

      .main-title {
        font-size: 96px;
        font-weight: 700;
        margin-bottom: 30px;
        color: ${accentColor};
      }

      .title-divider {
        width: 200px;
        height: 4px;
        background: ${accentColor};
        margin: 0 auto 40px;
        border-radius: 2px;
      }

      .subtitle {
        font-size: 48px;
        font-weight: 400;
        line-height: 1.5;
      }
    `;
  }

  /**
   * Get styles for file slides
   */
  private getFileStyles(): string {
    const borderColor = this.theme === 'dark' ? '#30363d' : this.theme === 'light' ? '#d0d7de' : '#e1e4e8';
    const cardBg = this.theme === 'dark' ? '#161b22' : this.theme === 'light' ? '#f6f8fa' : '#ffffff';

    return `
      .file-slide {
        width: 90%;
        height: 90%;
        display: flex;
        flex-direction: column;
        padding: 40px;
      }

      .file-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid ${borderColor};
      }

      .file-path {
        font-size: 36px;
        font-weight: 600;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
      }

      .status-badge {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 24px;
        font-weight: 600;
      }

      .status-added {
        background: rgba(46, 160, 67, 0.15);
        color: #3fb950;
      }

      .status-modified {
        background: rgba(187, 128, 9, 0.15);
        color: #d29922;
      }

      .status-deleted {
        background: rgba(248, 81, 73, 0.15);
        color: #f85149;
      }

      .file-description {
        background: ${cardBg};
        padding: 25px;
        border-radius: 8px;
        margin-bottom: 30px;
        border: 1px solid ${borderColor};
      }

      .file-description p {
        font-size: 28px;
        line-height: 1.6;
        margin-bottom: 15px;
      }

      .file-description p:last-child {
        margin-bottom: 0;
      }

      .code-container {
        flex: 1;
        overflow: auto;
        background: ${cardBg};
        border: 1px solid ${borderColor};
        border-radius: 8px;
      }

      .code-container pre {
        margin: 0;
        padding: 25px;
      }

      .code-container code {
        font-size: 20px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
        line-height: 1.6;
      }

      .binary-notice {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        color: ${borderColor};
      }
    `;
  }

  /**
   * Get styles for outro slide
   */
  private getOutroStyles(): string {
    const accentColor = this.theme === 'dark' ? '#58a6ff' : this.theme === 'light' ? '#0969da' : '#0366d6';

    return `
      .outro-slide {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .outro-content {
        max-width: 80%;
      }

      .outro-title {
        font-size: 72px;
        font-weight: 700;
        margin-bottom: 30px;
        color: ${accentColor};
      }

      .outro-divider {
        width: 150px;
        height: 4px;
        background: ${accentColor};
        margin: 0 auto 40px;
        border-radius: 2px;
      }

      .outro-text {
        font-size: 36px;
        line-height: 1.6;
        margin-bottom: 60px;
      }

      .outro-footer {
        font-size: 28px;
        opacity: 0.7;
      }
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Sanitize filename for use in file paths
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50); // Limit length
  }
}
