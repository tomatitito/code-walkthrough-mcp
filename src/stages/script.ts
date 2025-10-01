/**
 * Script generation stage - uses MCP sampling to request narration script from agent.
 *
 * This implements the inverted flow pattern where the tool orchestrates the agent.
 */

import { generateScriptPrompt } from '../utils/prompts.js';
import { AnalysisResult, PresentationStyle } from '../types/state.js';
import { VideoScript } from '../types/script.js';

/**
 * Request script generation from agent via sampling.
 */
export async function requestScriptGeneration(
  ctx: any,
  analysis: AnalysisResult,
  style: PresentationStyle,
  targetType: string
): Promise<VideoScript> {
  const prompt = generateScriptPrompt(analysis, style, targetType);

  try {
    // Request script from agent using MCP sampling
    const response = await ctx.session.create_message({
      messages: [{
        role: "user",
        content: prompt
      }],
      max_tokens: 3000,
      temperature: 0.8, // Higher temperature for more creative narration
    });

    // Extract and parse the response
    const responseText = extractTextFromResponse(response);
    const script = parseScriptResponse(responseText);

    return script;
  } catch (error) {
    throw new Error(`Failed to get script from agent: ${error instanceof Error ? error.message : String(error)}`);
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
 * Parse and validate script response from agent.
 * Handles markdown code blocks and extracts JSON.
 */
function parseScriptResponse(responseText: string): VideoScript {
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
    if (typeof parsed.intro !== 'string') {
      throw new Error("Missing or invalid intro field");
    }

    if (!Array.isArray(parsed.sections)) {
      throw new Error("Sections must be an array");
    }

    if (typeof parsed.outro !== 'string') {
      throw new Error("Missing or invalid outro field");
    }

    if (typeof parsed.fullNarrative !== 'string') {
      throw new Error("Missing or invalid fullNarrative field");
    }

    // Return validated script
    return {
      intro: String(parsed.intro),
      sections: parsed.sections.map((section: any) => ({
        file: String(section.file),
        narration: String(section.narration),
        duration: Number(section.duration) || 5,
      })),
      outro: String(parsed.outro),
      fullNarrative: String(parsed.fullNarrative),
      estimatedDuration: Number(parsed.estimatedDuration) || 30,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON response from agent. Response was: ${responseText.slice(0, 200)}...`);
    }
    throw error;
  }
}
