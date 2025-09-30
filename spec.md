# Git Commit Video Walkthrough - Specification

## Purpose

This tool generates video walkthroughs of git commits to help developers understand code changes through visual and audio narration. It transforms technical git diffs into accessible, narrated video content that explains what was changed, why, and how.

## Core Intent

The primary goal is to make code review and commit understanding more accessible by:
- Providing visual representations of code changes
- Generating natural-sounding audio narration that explains changes
- Offering different presentation styles for different audiences (beginners, technical reviewers, quick overviews)

## User Experience

### Video Structure

Each generated video follows this structure:

1. **Introduction (High-Level Overview)**
   - What was achieved in this commit (the outcome)
   - How it was achieved (high-level approach)
   - Context: author, date, commit message

2. **Technical Details**
   - File-by-file walkthrough of changes
   - Visual display of code diffs with syntax highlighting
   - Detailed narration of what each change does

3. **Conclusion**
   - Summary of total changes (files, lines added/removed)
   - Impact on the codebase

### Narration Style

The narration should sound natural and human-like:
- Uses a pleasant, clear voice (Samantha voice on macOS)
- Speaks at a comfortable pace (160 words per minute)
- Includes natural pauses at logical breaks
- Emphasizes important information through pacing
- Avoids robotic, monotone delivery

### Presentation Styles

Three styles are available to match different use cases:

- **Beginner**: Detailed explanations with more pauses, educational tone
- **Technical**: Precise, focused on implementation details
- **Overview**: Quick summary, high-level only

## What the Tool Does

### Input
- A git repository path
- A commit hash to analyze

### Processing
1. Extracts commit metadata (author, date, message)
2. Analyzes all file changes and generates diffs
3. Creates a narrative script explaining the changes
4. Generates visual frames showing:
   - Title frame with commit overview
   - One frame per changed file with syntax-highlighted diff
5. Converts frames to images
6. Generates audio narration from the script
7. Compiles frames and audio into a video file

### Output
- An MP4 video file with:
  - Visual frames showing code changes
  - Audio narration explaining the changes
  - Proper pacing to allow comprehension

## Key Requirements

### Video Introduction Must Include
- **Achievement**: What this commit accomplished (feature added, bug fixed, refactoring done)
- **High-level approach**: How it was done (which components were modified, what strategy was used)
- **Save technical details for later**: Don't dive into specific code changes in the intro

### Audio Quality
- Natural-sounding voice (not robotic)
- Natural speech patterns with pauses and emphasis
- Clear pronunciation and pacing
- Strategic silence for comprehension

### Visual Quality
- Syntax-highlighted code diffs
- Clear, readable typography
- Professional dark or light themes
- Proper contrast for readability

## Non-Goals

This tool does NOT:
- Perform code review or suggest improvements
- Execute or test code
- Modify the git repository
- Generate interactive videos
- Support real-time streaming
- Require manual intervention during generation

## Technical Constraints

- Requires Node.js 18+
- Requires FFmpeg for video compilation
- Uses macOS `say` command for text-to-speech (macOS only currently)
- Generates intermediate HTML and image files
- Video compilation can be CPU-intensive for large commits

## Future Considerations

While not currently implemented, future enhancements could include:
- Multi-commit range analysis
- Branch visualization
- Custom visual themes
- Cross-platform TTS support
- Interactive timeline features
- Multiple export formats
