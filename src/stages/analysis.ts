/**
 * Agent analysis stage - uses MCP sampling to delegate code analysis to an agent.
 *
 * This implements the inverted flow pattern where the tool orchestrates the agent.
 */

import {
  generateCommitAnalysisPrompt,
  generateDiffAnalysisPrompt,
  generateCodebaseAnalysisPrompt
} from '../utils/prompts.js';
import { CommitInfo, DiffInfo, CodebaseInfo } from '../types/analysis.js';
import { AnalysisResult } from '../types/state.js';

/**
 * Request commit analysis from agent via sampling.
 */
export async function requestCommitAnalysis(
  ctx: any,
  commitInfo: CommitInfo
): Promise<AnalysisResult> {
  const prompt = generateCommitAnalysisPrompt(commitInfo);

  try {
    // Request analysis from agent using MCP sampling
    const response = await ctx.createMessage({
      messages: [{
        role: "user",
        content: prompt
      }],
      maxTokens: 4000,
    });

    // Extract and parse the response
    const responseText = extractTextFromResponse(response);
    const analysis = parseAnalysisResponse(responseText);

    return analysis;
  } catch (error) {
    throw new Error(`Failed to get commit analysis from agent: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Request diff analysis (staged/unstaged) from agent via sampling.
 */
export async function requestDiffAnalysis(
  ctx: any,
  diffInfo: DiffInfo
): Promise<AnalysisResult> {
  const prompt = generateDiffAnalysisPrompt(diffInfo);

  try {
    // Request analysis from agent using MCP sampling
    const response = await ctx.createMessage({
      messages: [{
        role: "user",
        content: prompt
      }],
      maxTokens: 4000,
    });

    // Extract and parse the response
    const responseText = extractTextFromResponse(response);
    const analysis = parseAnalysisResponse(responseText);

    return analysis;
  } catch (error) {
    throw new Error(`Failed to get diff analysis from agent: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Request codebase analysis from agent via sampling.
 */
export async function requestCodebaseAnalysis(
  ctx: any,
  codebaseInfo: CodebaseInfo
): Promise<AnalysisResult> {
  const prompt = generateCodebaseAnalysisPrompt(codebaseInfo);

  try {
    // Request analysis from agent using MCP sampling
    const response = await ctx.createMessage({
      messages: [{
        role: "user",
        content: prompt
      }],
      maxTokens: 4000,
    });

    // Extract and parse the response
    const responseText = extractTextFromResponse(response);
    const analysis = parseAnalysisResponse(responseText);

    return analysis;
  } catch (error) {
    throw new Error(`Failed to get codebase analysis from agent: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text content from MCP sampling response.
 */
function extractTextFromResponse(response: any): string {
  if (!response.content || !Array.isArray(response.content)) {
    throw new Error("Invalid response format: missing content array");
  }

  const textContent = response.content.find((item: any) => item.type === "text");
  if (!textContent || !textContent.text) {
    throw new Error("Invalid response format: no text content found");
  }

  return textContent.text;
}

/**
 * Parse and validate analysis response from agent.
 * Handles markdown code blocks and extracts JSON.
 */
function parseAnalysisResponse(responseText: string): AnalysisResult {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();

    // Remove ```json ... ``` or ``` ... ```
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      lines.shift(); // Remove opening ```json or ```
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Remove closing ```
      }
      jsonText = lines.join('\n').trim();
    }

    // Parse JSON
    const parsed = JSON.parse(jsonText);

    // Validate required fields
    if (!parsed.summary || !parsed.summary.achievement || !parsed.summary.approach) {
      throw new Error("Missing required summary fields");
    }

    if (!Array.isArray(parsed.files)) {
      throw new Error("Files must be an array");
    }

    if (!parsed.totalStats || typeof parsed.totalStats.filesChanged !== 'number') {
      throw new Error("Missing or invalid totalStats");
    }

    // Return validated analysis result
    return {
      summary: {
        achievement: String(parsed.summary.achievement),
        approach: String(parsed.summary.approach),
      },
      files: parsed.files.map((file: any) => ({
        path: String(file.path),
        status: String(file.status) as "added" | "modified" | "deleted",
        explanation: String(file.explanation),
        impact: String(file.impact),
      })),
      totalStats: {
        additions: Number(parsed.totalStats.additions) || 0,
        deletions: Number(parsed.totalStats.deletions) || 0,
        filesChanged: Number(parsed.totalStats.filesChanged),
      },
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON response from agent. Response was: ${responseText.slice(0, 200)}...`);
    }
    throw error;
  }
}
