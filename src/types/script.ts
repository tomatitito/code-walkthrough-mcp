/**
 * Types for script generation results.
 */

export interface VideoScript {
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

export interface NarrationTiming {
  text: string;
  startTime: number; // In seconds
  duration: number;  // In seconds
}
