/**
 * Git Commit Video Walkthrough MCP Server
 *
 * Implements an inverted conversation flow where the tool orchestrates the agent
 * through MCP's sampling capability, rather than the agent orchestrating the tool.
 *
 * Phase 3 Implementation: Complete video generation pipeline with frames, audio, and compilation.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from 'crypto';
import { extractCommitInfo } from './extractors/commit.js';
import { extractStagedChanges } from './extractors/staged.js';
import { extractUnstagedChanges } from './extractors/unstaged.js';
import { extractCodebaseInfo } from './extractors/codebase.js';
import { requestCommitAnalysis, requestDiffAnalysis, requestCodebaseAnalysis } from './stages/analysis.js';
import { requestScriptGeneration } from './stages/script.js';
import { generateVideo, cleanupTempFiles } from './stages/video.js';
import { WalkthroughState, TargetSpec, PresentationStyle, Theme, AnalysisResult } from './types/state.js';

export class GitCommitVideoServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "git-commit-video-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          sampling: {}, // Declare sampling capability
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_walkthrough",
          description: "Generate a video walkthrough of git commits, changes, or codebase. This tool orchestrates an agent to analyze code and create narrated video content. Requires MCP sampling support.",
          inputSchema: {
            type: "object",
            properties: {
              repoPath: {
                type: "string",
                description: "Path to the git repository",
              },
              target: {
                type: "object",
                description: "What to analyze",
                properties: {
                  type: {
                    type: "string",
                    enum: ["commit", "staged", "unstaged", "codebase"],
                    description: "Type of content to analyze",
                  },
                  commitHash: {
                    type: "string",
                    description: "Git commit hash (required when type is 'commit')",
                  },
                },
                required: ["type"],
              },
              style: {
                type: "string",
                enum: ["beginner", "technical", "overview"],
                description: "Presentation style (default: 'technical')",
              },
              outputPath: {
                type: "string",
                description: "Where to save the video (default: './walkthrough.mp4')",
              },
              theme: {
                type: "string",
                enum: ["dark", "light", "github"],
                description: "Visual theme (default: 'dark')",
              },
            },
            required: ["repoPath", "target"],
          },
        },
        {
          name: "generate_video_from_script",
          description: "Generate a video from pre-provided analysis and script. Use this when you don't have MCP sampling support - first ask an LLM to analyze the code and generate a script, then pass it to this tool.",
          inputSchema: {
            type: "object",
            properties: {
              analysis: {
                type: "object",
                description: "Pre-generated analysis object with summary, files, and totalStats",
                properties: {
                  summary: {
                    type: "object",
                    properties: {
                      achievement: { type: "string" },
                      approach: { type: "string" },
                    },
                    required: ["achievement", "approach"],
                  },
                  files: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        path: { type: "string" },
                        status: { type: "string", enum: ["added", "modified", "deleted"] },
                        explanation: { type: "string" },
                        impact: { type: "string" },
                      },
                      required: ["path", "status", "explanation", "impact"],
                    },
                  },
                  totalStats: {
                    type: "object",
                    properties: {
                      additions: { type: "number" },
                      deletions: { type: "number" },
                      filesChanged: { type: "number" },
                    },
                    required: ["filesChanged"],
                  },
                },
                required: ["summary", "files", "totalStats"],
              },
              script: {
                type: "object",
                description: "Pre-generated script object with intro, sections, and conclusion",
                properties: {
                  intro: { type: "string" },
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        narration: { type: "string" },
                        codeSnippet: { type: "string" },
                        duration: { type: "number" },
                      },
                      required: ["title", "narration"],
                    },
                  },
                  conclusion: { type: "string" },
                  estimatedDuration: { type: "number" },
                },
                required: ["intro", "sections", "conclusion"],
              },
              style: {
                type: "string",
                enum: ["beginner", "technical", "overview"],
                description: "Presentation style (default: 'technical')",
              },
              outputPath: {
                type: "string",
                description: "Where to save the video (default: './walkthrough.mp4')",
              },
              theme: {
                type: "string",
                enum: ["dark", "light", "github"],
                description: "Visual theme (default: 'dark')",
              },
            },
            required: ["analysis", "script"],
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
          case "generate_walkthrough":
            return await this.generateWalkthrough(
              this.server, // Pass the server instance which has createMessage
              args.repoPath as string,
              args.target as TargetSpec,
              (args.style as PresentationStyle) || "technical",
              (args.outputPath as string) || "./walkthrough.mp4",
              (args.theme as Theme) || "dark"
            );

          case "generate_video_from_script":
            return await this.generateVideoFromScript(
              args.analysis as any,
              args.script as any,
              (args.style as PresentationStyle) || "technical",
              (args.outputPath as string) || "./walkthrough.mp4",
              (args.theme as Theme) || "dark"
            );

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
          isError: true,
        };
      }
    });
  }

  /**
   * Generate a complete video walkthrough.
   * This is the main tool that orchestrates the entire process via sampling.
   */
  private async generateWalkthrough(
    ctx: any,
    repoPath: string,
    target: TargetSpec,
    style: PresentationStyle,
    outputPath: string,
    theme: Theme
  ) {
    // Initialize state
    const state: WalkthroughState = {
      id: randomUUID(),
      repoPath,
      target,
      style,
      outputPath,
      theme,
      stage: "analysis",
    };

    try {
      // Stage 1: Extract target content (commit, diff, or codebase)
      let targetData: any;
      let targetType: string;

      switch (target.type) {
        case "commit":
          if (!target.commitHash) {
            throw new Error("commitHash is required for type 'commit'");
          }
          targetData = await extractCommitInfo(repoPath, target.commitHash);
          targetType = "commit";
          break;

        case "staged":
          targetData = await extractStagedChanges(repoPath);
          targetType = "staged changes";
          break;

        case "unstaged":
          targetData = await extractUnstagedChanges(repoPath);
          targetType = "unstaged changes";
          break;

        case "codebase":
          targetData = await extractCodebaseInfo(repoPath);
          targetType = "codebase";
          break;

        default:
          throw new Error(`Unknown target type: ${target.type}`);
      }

      // Stage 2: Request analysis from agent via sampling
      state.stage = "analysis";

      let analysis;
      if (target.type === "commit") {
        analysis = await requestCommitAnalysis(ctx, targetData);
      } else if (target.type === "codebase") {
        analysis = await requestCodebaseAnalysis(ctx, targetData);
      } else {
        // staged or unstaged
        analysis = await requestDiffAnalysis(ctx, targetData);
      }

      state.analysis = analysis;

      // Stage 3: Request script generation from agent via sampling
      state.stage = "script";

      const script = await requestScriptGeneration(
        ctx,
        analysis,
        style,
        targetType
      );

      state.script = script;

      // Stage 4: Video generation - Complete pipeline
      state.stage = "video";

      console.error('\n=== Starting Video Generation ===');

      const videoResult = await generateVideo(
        analysis,
        script,
        style,
        theme,
        outputPath
      );

      state.stage = "complete";

      // Clean up temporary files
      await cleanupTempFiles(videoResult.tempFiles);

      // Return results
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              walkthroughId: state.id,
              stages: {
                analysis: {
                  summary: analysis.summary,
                  filesAnalyzed: analysis.files.length,
                  totalStats: analysis.totalStats,
                },
                script: {
                  intro: script.intro.slice(0, 100) + "...",
                  sections: script.sections.length,
                  estimatedDuration: script.estimatedDuration,
                },
                video: {
                  status: "generated",
                  path: videoResult.videoPath,
                  duration: videoResult.duration,
                  frameCount: videoResult.frameCount,
                  hasAudio: videoResult.hasAudio,
                }
              },
              output: {
                videoPath: videoResult.videoPath,
                duration: `${videoResult.duration.toFixed(2)}s`,
                frames: videoResult.frameCount,
                audio: videoResult.hasAudio ? 'Generated' : 'Skipped (silent video)',
              },
              note: "Phase 3: Complete video generation pipeline implemented."
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      state.error = error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              walkthroughId: state.id,
              stage: state.stage,
              error: state.error,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Generate video from pre-provided analysis and script.
   * This tool doesn't require sampling - the user provides the analysis and script directly.
   */
  private async generateVideoFromScript(
    analysis: AnalysisResult,
    script: any,
    style: PresentationStyle,
    outputPath: string,
    theme: Theme
  ) {
    const state = {
      id: randomUUID(),
      stage: "video",
      style,
      outputPath,
      theme,
    };

    try {
      console.error('\n=== Starting Video Generation from Pre-Generated Script ===');

      // Go directly to video generation - skip analysis and script stages
      const videoResult = await generateVideo(
        analysis,
        script,
        style,
        theme,
        outputPath
      );

      // Clean up temporary files
      await cleanupTempFiles(videoResult.tempFiles);

      // Return results
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              walkthroughId: state.id,
              video: {
                status: "generated",
                path: videoResult.videoPath,
                duration: videoResult.duration,
                frameCount: videoResult.frameCount,
                hasAudio: videoResult.hasAudio,
              },
              output: {
                videoPath: videoResult.videoPath,
                duration: `${videoResult.duration.toFixed(2)}s`,
                frames: videoResult.frameCount,
                audio: videoResult.hasAudio ? 'Generated' : 'Skipped (silent video)',
              },
              note: "Video generated from pre-provided analysis and script (no sampling required)."
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "error",
              walkthroughId: state.id,
              stage: state.stage,
              error: error instanceof Error ? error.message : String(error),
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Git Commit Video MCP Server (Phase 3) running on stdio");
    console.error("Capabilities: tools, sampling");
    console.error("Video generation: frames, audio, compilation");
  }
}

// Start the server
const server = new GitCommitVideoServer();
server.run().catch(console.error);
