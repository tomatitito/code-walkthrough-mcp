import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { simpleGit, SimpleGit } from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HtmlToPngConverter } from './html-to-png.js';
import hljs from 'highlight.js';
import { TextToSpeechConverter } from './tts.js';

const execAsync = promisify(exec);

interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: FileChange[];
}

interface FileChange {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  diff: string;
}

export class GitCommitVideoServer {
  private server: Server;
  private git: SimpleGit;

  constructor() {
    this.server = new Server(
      {
        name: "git-commit-video-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.git = simpleGit();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "analyze_commit",
          description: "Analyze a git commit and extract detailed information about changes",
          inputSchema: {
            type: "object",
            properties: {
              repoPath: {
                type: "string",
                description: "Path to the git repository",
              },
              commitHash: {
                type: "string",
                description: "Git commit hash to analyze",
              },
            },
            required: ["repoPath", "commitHash"],
          },
        },
        {
          name: "generate_video_script",
          description: "Generate a narrative script for explaining commit changes",
          inputSchema: {
            type: "object",
            properties: {
              commitInfo: {
                type: "object",
                description: "Commit information from analyze_commit",
              },
              style: {
                type: "string",
                description: "Presentation style: 'technical', 'beginner', 'overview'",
                enum: ["technical", "beginner", "overview"],
              },
            },
            required: ["commitInfo"],
          },
        },
        {
          name: "create_video_frames",
          description: "Generate visual frames showing code changes",
          inputSchema: {
            type: "object",
            properties: {
              commitInfo: {
                type: "object",
                description: "Commit information",
              },
              outputDir: {
                type: "string",
                description: "Directory to save frames",
              },
              theme: {
                type: "string",
                description: "Visual theme: 'dark', 'light', 'github'",
                enum: ["dark", "light", "github"],
              },
            },
            required: ["commitInfo", "outputDir"],
          },
        },
        {
          name: "compile_video",
          description: "Compile frames and audio into final video",
          inputSchema: {
            type: "object",
            properties: {
              framesDir: {
                type: "string",
                description: "Directory containing frames",
              },
              audioPath: {
                type: "string",
                description: "Path to audio narration (optional)",
              },
              outputPath: {
                type: "string",
                description: "Output video file path",
              },
              fps: {
                type: "number",
                description: "Frames per second (default: 2)",
              },
            },
            required: ["framesDir", "outputPath"],
          },
        },
        {
          name: "generate_audio",
          description: "Generate an audio file from text using a TTS service",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The text to synthesize",
              },
              outputFile: {
                type: "string",
                description: "Path to save the audio file",
              },
            },
            required: ["text", "outputFile"],
          },
        },
        {
          name: "generate_full_script",
          description: "Generate a complete narrative script for TTS from commit information",
          inputSchema: {
            type: "object",
            properties: {
              commitInfo: {
                type: "object",
                description: "Commit information from analyze_commit",
              },
              style: {
                type: "string",
                description: "Presentation style: 'technical', 'beginner', 'overview'",
                enum: ["technical", "beginner", "overview"],
              },
            },
            required: ["commitInfo"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error("Arguments are required");
      }

      try {
        switch (name) {
          case "analyze_commit":
            return await this.analyzeCommit(args.repoPath as string, args.commitHash as string);

          case "generate_video_script":
            return await this.generateScript(args.commitInfo as object, (args.style as string) || "technical");

          case "create_video_frames":
            return await this.createFrames(args.commitInfo as object, args.outputDir as string, (args.theme as string) || "dark");

          case "compile_video":
            return await this.compileVideo(
              args.framesDir as string,
              args.outputPath as string,
              args.audioPath as string,
              (args.fps as number) || 2
            );

          case "generate_audio":
            return await this.generateAudio(args.text as string, args.outputFile as string);

          case "generate_full_script":
            return await this.generateFullScript(args.commitInfo as object, (args.style as string) || "technical");

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async generateAudio(text: string, outputFile: string) {
    const ttsConverter = new TextToSpeechConverter();
    await ttsConverter.generateAudio(text, outputFile);
    return {
      content: [
        {
          type: "text",
          text: `Audio content written to file: ${outputFile}`,
        },
      ],
    };
  }

  private async generateFullScript(commitInfo: any, style: string) {
    const script = {
      intro: this.generateIntroduction(commitInfo, style),
      sections: commitInfo.files.map((file: FileChange) => ({
        file: file.path,
        explanation: this.generateFileExplanation(file, style),
        duration: this.calculateSectionDuration(file, style),
      })),
      outro: this.generateOutro(commitInfo, style),
    };

    // Generate full narrative text for TTS with natural pauses
    // Using commas and periods for natural pacing
    const pauseShort = ", ";  // Natural breath pause
    const pauseMedium = ". ";  // Sentence end
    const pauseLong = ". [[slnc 500]] ";  // Longer pause using silence marker

    let fullText = script.intro + pauseLong;

    script.sections.forEach((section: any, index: number) => {
      if (style === "beginner" && index === 0) {
        fullText += "Let's start by looking at the first file" + pauseMedium;
      } else if (style === "beginner" && index > 0) {
        fullText += pauseLong + "Next" + pauseShort + "let's examine another file" + pauseMedium;
      }

      fullText += section.explanation + pauseMedium;

      if (style === "beginner" && index < script.sections.length - 1) {
        fullText += "Moving on" + pauseMedium;
      }
    });

    fullText += pauseLong + script.outro;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            structured: script,
            narrative: fullText,
            totalDuration: script.sections.reduce((sum: number, section: any) => sum + section.duration, 0) +
              (style === "beginner" ? 8 : style === "overview" ? 3 : 5)
          }, null, 2),
        },
      ],
    };
  }

  private async analyzeCommit(repoPath: string, commitHash: string) {
    this.git = simpleGit(repoPath);

    // Get commit details
    const log = await this.git.show([commitHash, "--stat", "--format=%H%n%an%n%ai%n%s%n%b"]);
    const diff = await this.git.show([commitHash, "--unified=3"]);

    // Parse commit info
    const lines = log.split('\n');
    const commitInfo: CommitInfo = {
      hash: lines[0],
      author: lines[1],
      date: lines[2],
      message: lines.slice(3).join('\n').trim(),
      files: [],
    };

    // Get file statistics
    const parents = await this.git.raw(['rev-list', '--parents', '-n', '1', commitHash]);
    const isInitialCommit = parents.split(' ').length === 1;

    if (isInitialCommit) {
      const files = await this.git.show([commitHash, '--pretty=format:', '--name-only']);
      commitInfo.files = files.split('\n').filter(f => f).map(f => ({
        path: f,
        status: 'added',
        additions: 0, // not easily available
        deletions: 0, // not easily available
        diff: this.extractFileDiff(diff, f)
      }));
    } else {
      const diffSummary = await this.git.diffSummary([`${commitHash}^`, commitHash]);
      commitInfo.files = diffSummary.files.map(file => {
        if ('insertions' in file && 'deletions' in file) {
          return {
            path: file.file,
            status: this.getFileStatus(file),
            additions: file.insertions,
            deletions: file.deletions,
            diff: this.extractFileDiff(diff, file.file),
          }
        }
        return {
          path: file.file,
          status: 'binary',
          additions: 0,
          deletions: 0,
          diff: ''
        }
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(commitInfo, null, 2),
        },
      ],
    };
  }

  private getFileStatus(file: any): string {
    if (file.binary) return "binary";
    if (file.insertions > 0 && file.deletions === 0) return "added";
    if (file.insertions === 0 && file.deletions > 0) return "deleted";
    return "modified";
  }

  private extractFileDiff(fullDiff: string, filePath: string): string {
    const fileMarker = `diff --git a/${filePath}`;
    const startIdx = fullDiff.indexOf(fileMarker);
    if (startIdx === -1) return "";

    const nextFileIdx = fullDiff.indexOf("diff --git", startIdx + 1);
    return nextFileIdx === -1
      ? fullDiff.slice(startIdx)
      : fullDiff.slice(startIdx, nextFileIdx);
  }

  private async generateScript(commitInfo: any, style: string) {
    const script = {
      intro: this.generateIntroduction(commitInfo, style),
      sections: commitInfo.files.map((file: FileChange) => ({
        file: file.path,
        explanation: this.generateFileExplanation(file, style),
        duration: this.calculateSectionDuration(file, style),
      })),
      outro: this.generateOutro(commitInfo, style),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(script, null, 2),
        },
      ],
    };
  }

  private summarizeAchievement(commitInfo: any): string {
    const fileCount = commitInfo.files.length;
    const addedFiles = commitInfo.files.filter((f: FileChange) => f.status === "added").length;
    const deletedFiles = commitInfo.files.filter((f: FileChange) => f.status === "deleted").length;
    const modifiedFiles = commitInfo.files.filter((f: FileChange) => f.status === "modified").length;

    // Infer achievement from commit message and file changes
    const message = commitInfo.message.toLowerCase();

    if (message.includes("fix") || message.includes("bug")) {
      return `This commit fixes a bug by modifying ${modifiedFiles} file${modifiedFiles !== 1 ? 's' : ''}`;
    } else if (message.includes("feat") || message.includes("add")) {
      if (addedFiles > 0) {
        return `This commit introduces new functionality by adding ${addedFiles} new file${addedFiles !== 1 ? 's' : ''} and updating ${modifiedFiles} existing file${modifiedFiles !== 1 ? 's' : ''}`;
      }
      return `This commit adds new features by modifying ${modifiedFiles} file${modifiedFiles !== 1 ? 's' : ''}`;
    } else if (message.includes("refactor")) {
      return `This commit refactors the codebase, restructuring ${fileCount} file${fileCount !== 1 ? 's' : ''} to improve code quality`;
    } else if (message.includes("test")) {
      return `This commit enhances testing by adding or updating ${fileCount} test file${fileCount !== 1 ? 's' : ''}`;
    } else if (message.includes("docs") || message.includes("documentation")) {
      return `This commit improves documentation across ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    } else if (deletedFiles > 0) {
      return `This commit cleans up the codebase by removing ${deletedFiles} file${deletedFiles !== 1 ? 's' : ''} and updating ${modifiedFiles} file${modifiedFiles !== 1 ? 's' : ''}`;
    }

    // Default fallback
    return `This commit modifies ${fileCount} file${fileCount !== 1 ? 's' : ''} in the codebase`;
  }

  private summarizeApproach(commitInfo: any): string {
    const fileTypes = new Set(commitInfo.files.map((f: FileChange) => path.extname(f.path)));
    const uniqueFileTypes = Array.from(fileTypes).filter(ext => ext);
    const totalAdditions = commitInfo.files.reduce((sum: number, f: FileChange) => sum + f.additions, 0);
    const totalDeletions = commitInfo.files.reduce((sum: number, f: FileChange) => sum + f.deletions, 0);

    const message = commitInfo.message.toLowerCase();
    const fileCount = commitInfo.files.length;

    // Describe the technical approach at a high level
    if (fileCount === 1) {
      const file = commitInfo.files[0];
      const fileType = this.getFileTypeDescription(path.extname(file.path));
      return `This was accomplished by making changes to a single ${fileType}`;
    }

    const typeDescription = uniqueFileTypes.length > 0
      ? `working across ${uniqueFileTypes.map(ext => this.getFileTypeDescription(ext as string)).slice(0, 3).join(", ")} files`
      : "updating multiple files";

    if (totalAdditions > totalDeletions * 2) {
      return `This was accomplished primarily by adding new code, ${typeDescription}`;
    } else if (totalDeletions > totalAdditions * 2) {
      return `This was accomplished by removing unnecessary code, ${typeDescription}`;
    } else {
      return `This was accomplished by refactoring and restructuring, ${typeDescription}`;
    }
  }

  private generateIntroduction(commitInfo: any, style: string): string {
    const dateStr = new Date(commitInfo.date).toLocaleDateString();
    const achievement = this.summarizeAchievement(commitInfo);
    const approach = this.summarizeApproach(commitInfo);

    if (style === "beginner") {
      return `Welcome to this code walkthrough! [[slnc 300]] Today, we'll explore a commit made by ${commitInfo.author} on ${dateStr}. [[slnc 200]] The commit message says, "${commitInfo.message}". [[slnc 400]] ${achievement} [[slnc 300]] ${approach} [[slnc 400]] Now, let's dive into the technical details and see exactly how these changes were implemented`;
    } else if (style === "overview") {
      return `Commit ${commitInfo.hash.slice(0, 8)} by ${commitInfo.author}, ${commitInfo.message}. [[slnc 200]] ${achievement}`;
    }

    return `This is a technical walkthrough of commit ${commitInfo.hash.slice(0, 8)}, by ${commitInfo.author}. [[slnc 200]] The commit, titled "${commitInfo.message}", was made on ${dateStr}. [[slnc 300]] ${achievement} [[slnc 200]] ${approach} [[slnc 300]] Let's examine the implementation details`;
  }

  private generateOutro(commitInfo: any, style: string): string {
    const totalAdditions = commitInfo.files.reduce((sum: number, f: FileChange) => sum + f.additions, 0);
    const totalDeletions = commitInfo.files.reduce((sum: number, f: FileChange) => sum + f.deletions, 0);
    const fileCount = commitInfo.files.length;

    if (style === "beginner") {
      return `And that concludes our walkthrough! [[slnc 300]] This commit modified ${fileCount} file${fileCount > 1 ? 's' : ''}, [[slnc 100]] adding ${totalAdditions} new line${totalAdditions !== 1 ? 's' : ''}, and removing ${totalDeletions} line${totalDeletions !== 1 ? 's' : ''}. [[slnc 200]] These changes help improve and maintain the codebase`;
    } else if (style === "overview") {
      return `Summary, ${fileCount} files changed, ${totalAdditions} insertions, ${totalDeletions} deletions`;
    }

    return `In summary, this commit affects ${fileCount} file${fileCount > 1 ? 's' : ''}, [[slnc 100]] with ${totalAdditions} line addition${totalAdditions !== 1 ? 's' : ''} and ${totalDeletions} line deletion${totalDeletions !== 1 ? 's' : ''}. [[slnc 200]] The changes represent a focused modification to the codebase architecture`;
  }

  private calculateSectionDuration(file: FileChange, style: string): number {
    const baseTime = style === "beginner" ? 5 : style === "overview" ? 2 : 3;
    const complexityFactor = Math.min(10, (file.additions + file.deletions) / 5);
    return Math.max(baseTime, baseTime + complexityFactor);
  }

  private generateFileExplanation(file: FileChange, style: string): string {
    const action = file.status === "added" ? "adds" :
      file.status === "deleted" ? "removes" : "modifies";

    const fileExtension = path.extname(file.path);
    const fileName = path.basename(file.path);
    const fileType = this.getFileTypeDescription(fileExtension);

    if (style === "beginner") {
      if (file.status === "added") {
        return `This commit creates a new ${fileType}, called ${fileName}. [[slnc 200]] Adding ${file.additions} lines of code, [[slnc 100]] this file introduces new functionality to our project`;
      } else if (file.status === "deleted") {
        return `This commit removes the ${fileType}, ${fileName}. [[slnc 200]] The file contained ${file.deletions} lines that are no longer needed`;
      } else {
        return `This commit updates the ${fileType}, ${fileName}. [[slnc 200]] It adds ${file.additions} new lines, and removes ${file.deletions} existing lines, [[slnc 100]] improving the code's functionality`;
      }
    } else if (style === "overview") {
      return `${file.path}, ${file.status}, plus ${file.additions}, minus ${file.deletions}`;
    }

    // Technical style
    if (file.status === "added") {
      return `Introduces ${file.path}, [[slnc 100]] a new ${fileType} with ${file.additions} lines, implementing core functionality`;
    } else if (file.status === "deleted") {
      return `Removes ${file.path}, [[slnc 100]] eliminating ${file.deletions} lines of deprecated ${fileType} code`;
    } else {
      const netChange = file.additions - file.deletions;
      const changeDescription = netChange > 0 ? `expanding by ${netChange} lines` :
        netChange < 0 ? `reducing by ${Math.abs(netChange)} lines` :
          "with balanced additions and deletions";
      return `Refactors ${file.path}, [[slnc 100]] ${changeDescription}. [[slnc 200]] This ${fileType} modification includes ${file.additions} additions and ${file.deletions} deletions`;
    }
  }

  private getFileTypeDescription(extension: string): string {
    const typeMap: { [key: string]: string } = {
      '.js': 'JavaScript file',
      '.ts': 'TypeScript file',
      '.py': 'Python script',
      '.java': 'Java class',
      '.cpp': 'C++ source file',
      '.c': 'C source file',
      '.h': 'header file',
      '.css': 'stylesheet',
      '.html': 'HTML document',
      '.json': 'configuration file',
      '.md': 'documentation file',
      '.yml': 'YAML configuration',
      '.yaml': 'YAML configuration',
      '.xml': 'XML document',
      '.sql': 'SQL script',
      '.sh': 'shell script',
      '.bat': 'batch script',
      '.dockerfile': 'Docker configuration',
      '.gitignore': 'Git ignore file',
      '.env': 'environment file',
    };

    return typeMap[extension.toLowerCase()] || 'file';
  }

  private async createFrames(commitInfo: any, outputDir: string, theme: string) {
    await fs.mkdir(outputDir, { recursive: true });

    // Generate HTML frames for each change
    const frames: string[] = [];

    // Title frame
    const titleFrame = this.generateTitleFrame(commitInfo, theme);
    const titlePath = path.join(outputDir, "frame_000.html");
    await fs.writeFile(titlePath, titleFrame);
    frames.push(titlePath);

    // File change frames
    for (let i = 0; i < commitInfo.files.length; i++) {
      const file = commitInfo.files[i];
      const frameHtml = this.generateFileFrame(file, theme);
      const framePath = path.join(outputDir, `frame_${String(i + 1).padStart(3, '0')}.html`);
      await fs.writeFile(framePath, frameHtml);
      frames.push(framePath);
    }

    return {
      content: [
        {
          type: "text",
          text: `Generated ${frames.length} frames in ${outputDir}`,
        },
      ],
    };
  }

  private generateTitleFrame(commitInfo: any, theme: string): string {
    const bgColor = theme === "dark" ? "#1a1b26" : "#ffffff";
    const textColor = theme === "dark" ? "#c0caf5" : "#333333";

    return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
      body {
        margin: 0;
        padding: 60px;
        background: ${bgColor};
        color: ${textColor};
        font-family: 'Roboto', sans-serif;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
      }
      h1 { font-size: 64px; margin-bottom: 20px; font-weight: 700; }
      .meta { font-size: 28px; color: #7aa2f7; }
      .message { font-size: 36px; margin-top: 40px; }
    </style>
  </head>
  <body>
    <h1>Git Commit Walkthrough</h1>
    <div class="meta">
      <div>Commit: ${commitInfo.hash.slice(0, 8)}</div>
      <div>Author: ${commitInfo.author}</div>
      <div>Date: ${new Date(commitInfo.date).toLocaleDateString()}</div>
    </div>
    <div class="message">${commitInfo.message}</div>
  </body>
  </html>`;
  }
  private generateFileFrame(file: FileChange, theme: string): string {
    const bgColor = theme === "dark" ? "#1a1b26" : "#ffffff";
    const textColor = theme === "dark" ? "#c0caf5" : "#333333";
    const highlightedDiff = hljs.highlight(file.diff, { language: 'diff' }).value;

    return `
  <!DOCTYPE html>
  <html>
  <head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/tokyo-night-dark.min.css">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Roboto:wght@400;700&display=swap');
      body {
        margin: 0;
        padding: 60px;
        background: ${bgColor};
        color: ${textColor};
        font-family: 'Roboto', sans-serif;
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      h2 {
        font-family: 'Roboto', sans-serif;
        font-size: 42px;
        margin-bottom: 10px;
        font-weight: 700;
      }
      .stats {
        font-family: 'JetBrains Mono', monospace;
        font-size: 22px;
        color: #7aa2f7;
        margin-bottom: 30px;
      }
      .additions { color: #9ece6a; }
      .deletions { color: #f7768e; }
      pre {
        background: #24283b;
        padding: 30px;
        border-radius: 12px;
        overflow-x: auto;
        font-family: 'JetBrains Mono', monospace;
        font-size: 16px;
        line-height: 1.8;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        border: 1px solid #414868;
      }
      .hljs-meta { display: none; }
    </style>
  </head>
  <body>
    <h2>${file.path}</h2>
    <div class="stats">
      <span class="additions">+${file.additions}</span>
      <span class="deletions">-${file.deletions}</span>
      <span style="margin-left: 20px;">${file.status}</span>
    </div>
    <pre><code class="hljs">${highlightedDiff}</code></pre>
  </body>
  </html>`;
  }

  private async compileVideo(
    framesDir: string,
    outputPath: string,
    audioPath?: string,
    fps: number = 2
  ) {
    const converter = new HtmlToPngConverter();
    const pngDir = path.join(framesDir, 'pngs');

    try {
      await converter.initialize();
      await converter.convertDirectory(framesDir, pngDir);

      const ffmpegCmd = audioPath
        ? `ffmpeg -y -framerate ${fps} -pattern_type glob -i '${pngDir}/*.png' -i ${audioPath} -c:v libx264 -pix_fmt yuv420p -c:a aac ${outputPath}`
        : `ffmpeg -y -framerate ${fps} -pattern_type glob -i '${pngDir}/*.png' -c:v libx264 -pix_fmt yuv420p ${outputPath}`;

      await execAsync(ffmpegCmd);

      return {
        content: [
          {
            type: "text",
            text: `Video created successfully: ${outputPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `FFmpeg error: ${error}. Note: You need ffmpeg installed.`,
          },
        ],
      };
    } finally {
      await converter.close();
      // Clean up the temporary PNG directory
      await fs.rm(pngDir, { recursive: true, force: true });
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Git Commit Video MCP Server running on stdio");
  }
}

// Start the server
const server = new GitCommitVideoServer();
server.run().catch(console.error);
