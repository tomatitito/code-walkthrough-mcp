/**
 * Prompt templates for agent collaboration via MCP sampling.
 *
 * These prompts instruct agents to:
 * - Use subagents when available
 * - Return structured JSON responses
 * - Perform thorough code analysis
 */

import { PresentationStyle } from '../types/state.js';
import { CommitInfo, DiffInfo, CodebaseInfo } from '../types/analysis.js';

/**
 * Generate prompt for commit analysis stage.
 * Instructs agent to analyze commit diffs and return structured analysis.
 */
export function generateCommitAnalysisPrompt(commitInfo: CommitInfo): string {
  return `Analyze the following git commit and provide a detailed explanation.

IMPORTANT: If you have access to subagents or the Task tool, delegate this analysis to a specialized subagent for better results. Use the following delegation strategy:
- Use a code analysis subagent for examining diffs and file changes
- Use a documentation subagent for explaining intent and impact

Commit Information:
- Hash: ${commitInfo.hash}
- Author: ${commitInfo.author}
- Date: ${commitInfo.date}
- Message: ${commitInfo.message}

Files Changed (${commitInfo.files.length}):
${commitInfo.files.map(f => `- ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`).join('\n')}

Your analysis should include:
1. **High-level summary**: What was achieved and how (the outcome and approach)
2. **File-by-file breakdown**: For each file, explain:
   - What the changes do (technical details)
   - Why the changes matter (impact on codebase)
3. **Impact assessment**: Overall effect on the codebase

Return your analysis in the following JSON format (THIS IS CRITICAL - ONLY RETURN VALID JSON):
{
  "summary": {
    "achievement": "What this commit accomplished (e.g., 'Added user authentication system')",
    "approach": "How it was done at a high level (e.g., 'Implemented JWT-based authentication across 3 components')"
  },
  "files": [
    {
      "path": "path/to/file",
      "status": "added|modified|deleted",
      "explanation": "Detailed explanation of what changed in this file",
      "impact": "Why this change matters to the codebase"
    }
  ],
  "totalStats": {
    "additions": ${commitInfo.files.reduce((sum, f) => sum + f.additions, 0)},
    "deletions": ${commitInfo.files.reduce((sum, f) => sum + f.deletions, 0)},
    "filesChanged": ${commitInfo.files.length}
  }
}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.`;
}

/**
 * Generate prompt for diff analysis (staged/unstaged changes).
 */
export function generateDiffAnalysisPrompt(diffInfo: DiffInfo): string {
  const diffType = diffInfo.type === "staged" ? "staged" : "unstaged";

  return `Analyze the following ${diffType} git changes and provide a detailed explanation.

IMPORTANT: If you have access to subagents or the Task tool, delegate this analysis to a specialized code analysis subagent.

Changes Summary:
- Files changed: ${diffInfo.totalStats.filesChanged}
- Lines added: ${diffInfo.totalStats.additions}
- Lines deleted: ${diffInfo.totalStats.deletions}

Files Changed:
${diffInfo.files.map(f => `- ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`).join('\n')}

Your analysis should include:
1. **High-level summary**: What these changes accomplish
2. **File-by-file breakdown**: Explain each file's changes and impact
3. **Impact assessment**: How these changes affect the codebase

Return your analysis in the following JSON format (ONLY RETURN VALID JSON):
{
  "summary": {
    "achievement": "What these changes accomplish",
    "approach": "How they're implemented"
  },
  "files": [
    {
      "path": "path/to/file",
      "status": "added|modified|deleted",
      "explanation": "What changed in this file",
      "impact": "Why this change matters"
    }
  ],
  "totalStats": {
    "additions": ${diffInfo.totalStats.additions},
    "deletions": ${diffInfo.totalStats.deletions},
    "filesChanged": ${diffInfo.totalStats.filesChanged}
  }
}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.`;
}

/**
 * Generate prompt for codebase analysis.
 */
export function generateCodebaseAnalysisPrompt(codebaseInfo: CodebaseInfo): string {
  return `Analyze the following codebase and provide an architectural overview.

IMPORTANT: If you have access to subagents or the Task tool, delegate this analysis to a specialized subagent. Consider using:
- A code analysis subagent for examining structure and patterns
- A documentation subagent for explaining architecture and design

Codebase Information:
- Root Path: ${codebaseInfo.rootPath}
- Total Files: ${codebaseInfo.totalFiles}
- Languages: ${codebaseInfo.languages.join(', ')}

Key Files (first 20):
${codebaseInfo.files.slice(0, 20).map(f => `- ${f.relativePath} (${f.language}, ${f.lines} lines)`).join('\n')}

Your analysis should include:
1. **High-level summary**: What this codebase does and its architecture
2. **Key components**: Main files/directories and their purposes
3. **Structure overview**: How the code is organized

Return your analysis in the following JSON format (ONLY RETURN VALID JSON):
{
  "summary": {
    "achievement": "What this codebase provides/implements",
    "approach": "How it's architecturally organized"
  },
  "files": [
    {
      "path": "path/to/important/file",
      "status": "modified",
      "explanation": "Purpose and role of this file",
      "impact": "Why this file is important to the architecture"
    }
  ],
  "totalStats": {
    "additions": 0,
    "deletions": 0,
    "filesChanged": ${codebaseInfo.totalFiles}
  }
}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.`;
}

/**
 * Generate prompt for script generation stage.
 * Instructs agent to generate natural narration script.
 */
export function generateScriptPrompt(
  analysis: any,
  style: PresentationStyle,
  targetType: string
): string {
  const styleGuidance = {
    beginner: `
Style: BEGINNER - Use simple, educational language. Include more pauses and context.
- Explain technical terms when they appear
- Use conversational tone
- Include encouraging phrases
- Pace slowly with frequent pauses for comprehension`,
    technical: `
Style: TECHNICAL - Use precise, professional language. Focus on implementation details.
- Use technical terminology appropriately
- Be concise but thorough
- Focus on "what" and "how"
- Include specific technical insights`,
    overview: `
Style: OVERVIEW - Provide quick, high-level summary. Minimal details.
- Be extremely concise
- Focus only on key points
- Skip detailed explanations
- Fast-paced delivery`
  };

  return `Generate a natural-sounding narration script for a video walkthrough.

IMPORTANT: If you have access to subagents, consider using a specialized writing or documentation subagent to craft engaging narration.

Context:
- Target: ${targetType}
- Presentation Style: ${style.toUpperCase()}

${styleGuidance[style]}

Analysis Data:
${JSON.stringify(analysis, null, 2)}

Generate a script with:
1. **Introduction** (intro):
   - Start with what was achieved (the outcome)
   - Explain how it was achieved (high-level approach)
   - Include context (author, date, commit message if applicable)
   - DO NOT dive into file details yet

2. **File Sections** (sections):
   - For each file in the analysis, create narration explaining:
     - What changed
     - Why it matters
   - Estimate duration in seconds for each section

3. **Conclusion** (outro):
   - Summary of total changes
   - Impact on codebase

4. **Full Narrative** (fullNarrative):
   - Combine all parts with natural pauses
   - Use [[slnc 300]] for 300ms pause
   - Use commas and periods for natural pacing
   - Ensure smooth transitions between sections

Return your script in the following JSON format (ONLY RETURN VALID JSON):
{
  "intro": "Introduction narration with natural pauses",
  "sections": [
    {
      "file": "path/to/file",
      "narration": "Explanation of this file's changes",
      "duration": 5
    }
  ],
  "outro": "Conclusion narration",
  "fullNarrative": "Complete script with all pauses marked as [[slnc N]]",
  "estimatedDuration": 30
}

IMPORTANT:
- Return ONLY the JSON object, no markdown code blocks or additional text
- Use natural, human-sounding language
- Include [[slnc N]] markers for pauses (N in milliseconds)
- Avoid robotic phrasing`;
}
