/**
 * Audio and frame timing synchronization utilities
 */

import { NarrationTiming } from '../types/script.js';

/**
 * Calculate speaking duration based on text length and speaking rate
 * Average speaking rate: 150 words per minute (technical)
 * Beginner style: 130 WPM (slower)
 * Overview style: 170 WPM (faster)
 */
export function calculateSpeakingDuration(
  text: string,
  style: 'beginner' | 'technical' | 'overview' = 'technical'
): number {
  // Words per minute based on style
  const wpm = style === 'beginner' ? 130 : style === 'overview' ? 170 : 150;

  // Count words
  const words = text.trim().split(/\s+/).length;

  // Calculate duration in seconds
  const duration = (words / wpm) * 60;

  // Minimum duration of 2 seconds for very short text
  return Math.max(2, duration);
}

/**
 * Parse silence markers from narration text
 * Format: [[slnc 1000]] for 1 second pause
 */
export function parseSilenceMarkers(text: string): { cleanText: string; totalSilence: number } {
  const silenceRegex = /\[\[slnc (\d+)\]\]/g;
  let totalSilence = 0;
  let match;

  while ((match = silenceRegex.exec(text)) !== null) {
    totalSilence += parseInt(match[1]) / 1000; // Convert ms to seconds
  }

  const cleanText = text.replace(silenceRegex, '');

  return { cleanText, totalSilence };
}

/**
 * Calculate total duration including speaking time and pauses
 */
export function calculateTotalDuration(
  text: string,
  style: 'beginner' | 'technical' | 'overview' = 'technical'
): number {
  const { cleanText, totalSilence } = parseSilenceMarkers(text);
  const speakingDuration = calculateSpeakingDuration(cleanText, style);

  return speakingDuration + totalSilence;
}

/**
 * Split narration into timed segments for frame synchronization
 */
export function createTimingSegments(
  narration: string,
  style: 'beginner' | 'technical' | 'overview' = 'technical'
): NarrationTiming[] {
  // Split by silence markers
  const parts = narration.split(/(\[\[slnc \d+\]\])/);
  const segments: NarrationTiming[] = [];
  let currentTime = 0;

  for (const part of parts) {
    const silenceMatch = part.match(/\[\[slnc (\d+)\]\]/);

    if (silenceMatch) {
      // This is a silence marker
      const silenceDuration = parseInt(silenceMatch[1]) / 1000;
      segments.push({
        text: '',
        startTime: currentTime,
        duration: silenceDuration,
      });
      currentTime += silenceDuration;
    } else if (part.trim()) {
      // This is actual narration text
      const duration = calculateSpeakingDuration(part, style);
      segments.push({
        text: part.trim(),
        startTime: currentTime,
        duration,
      });
      currentTime += duration;
    }
  }

  return segments;
}

/**
 * Calculate frame durations based on audio segments
 * Each frame should be displayed for the duration of its corresponding narration
 */
export function calculateFrameDurations(
  frameCount: number,
  audioSegments: NarrationTiming[]
): number[] {
  if (frameCount === 0) {
    return [];
  }

  if (audioSegments.length === 0) {
    // No audio, use default 3 seconds per frame
    return new Array(frameCount).fill(3);
  }

  // If we have more frames than audio segments, distribute evenly
  if (frameCount > audioSegments.length) {
    const frameDurations: number[] = [];
    const segmentDuration = audioSegments.reduce((sum, seg) => sum + seg.duration, 0);
    const durationPerFrame = segmentDuration / frameCount;

    for (let i = 0; i < frameCount; i++) {
      frameDurations.push(durationPerFrame);
    }

    return frameDurations;
  }

  // If we have fewer frames than segments, group segments
  const frameDurations: number[] = [];
  const segmentsPerFrame = Math.ceil(audioSegments.length / frameCount);

  for (let i = 0; i < frameCount; i++) {
    const startIdx = i * segmentsPerFrame;
    const endIdx = Math.min((i + 1) * segmentsPerFrame, audioSegments.length);
    const segments = audioSegments.slice(startIdx, endIdx);
    const duration = segments.reduce((sum, seg) => sum + seg.duration, 0);
    frameDurations.push(duration);
  }

  return frameDurations;
}

/**
 * Synchronize frame display with audio timing
 * Returns start time for each frame
 */
export function synchronizeFrames(
  frameDurations: number[]
): { frameIndex: number; startTime: number; duration: number }[] {
  const synchronized: { frameIndex: number; startTime: number; duration: number }[] = [];
  let currentTime = 0;

  for (let i = 0; i < frameDurations.length; i++) {
    synchronized.push({
      frameIndex: i,
      startTime: currentTime,
      duration: frameDurations[i],
    });
    currentTime += frameDurations[i];
  }

  return synchronized;
}

/**
 * Format time in seconds to FFmpeg timestamp format (HH:MM:SS.mmm)
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
