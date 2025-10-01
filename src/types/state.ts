/**
 * State management types for the walkthrough generation process.
 *
 * Since MCP tool calls are atomic, state lives only within a single tool execution.
 * The multi-turn conversation happens via sequential sampling requests within that execution.
 */

export interface TargetSpec {
  type: "commit" | "staged" | "unstaged" | "codebase";
  commitHash?: string; // Required for type: "commit"
}

export type PresentationStyle = "beginner" | "technical" | "overview";

export type Theme = "dark" | "light" | "github";

export type WalkthroughStage = "analysis" | "script" | "video" | "complete";

export interface WalkthroughState {
  id: string;                    // Unique walkthrough ID
  repoPath: string;              // Path to git repository
  target: TargetSpec;            // What to analyze
  style: PresentationStyle;      // Presentation style
  outputPath: string;            // Where to save video
  theme: Theme;                  // Visual theme
  stage: WalkthroughStage;       // Current stage
  analysis?: AnalysisResult;     // From agent's first response
  script?: ScriptResult;         // From agent's second response
  frames?: string[];             // Generated frame paths
  audioPath?: string;            // Generated audio file
  error?: string;                // Error message if any
}

export interface AnalysisResult {
  summary: {
    achievement: string;  // What was achieved
    approach: string;     // How it was achieved
  };
  files: FileAnalysis[];
  totalStats: {
    additions: number;
    deletions: number;
    filesChanged: number;
  };
}

export interface FileAnalysis {
  path: string;
  status: "added" | "modified" | "deleted";
  explanation: string;  // What the changes do
  impact: string;       // Why the changes matter
}

export interface ScriptResult {
  intro: string;        // Introduction narration
  sections: ScriptSection[];
  outro: string;        // Conclusion narration
  fullNarrative: string; // Complete text with pauses for TTS
  estimatedDuration: number; // In seconds
}

export interface ScriptSection {
  file: string;
  narration: string;
  duration: number; // In seconds
}
