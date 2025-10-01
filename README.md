# Git Commit Video Walkthrough Generator

An MCP (Model Context Protocol) server that generates narrated video walkthroughs of git commits, staged/unstaged changes, or entire codebases with AI-powered analysis and explanations.

## Features

- 🎥 Automatic video generation from git commits, diffs, or codebases
- 🤖 AI-powered code analysis and script generation
- 🗣️ Natural text-to-speech narration using system TTS
- 🎨 Syntax-highlighted code visualization
- 📊 Multiple presentation styles (beginner, technical, overview)
- 🎯 Works with or without MCP sampling support

## Installation

### Prerequisites

- **FFmpeg**: Required for video compilation
  - macOS: `brew install ffmpeg`
  - Linux: `apt install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/)

- **Node.js/Bun**: For running the MCP server
  - Recommended: Bun 1.0+ (`curl -fsSL https://bun.sh/install | bash`)
  - Or Node.js 20+

### Build from Source

```bash
# Install dependencies
bun install

# Build TypeScript
bun run build
```

## Usage

This tool can be used in two ways, depending on whether your MCP client supports sampling:

### Option 1: With MCP Sampling Support (Automatic)

If your MCP client supports the sampling capability, use the `generate_walkthrough` tool:

```json
{
  "tool": "generate_walkthrough",
  "arguments": {
    "repoPath": "/path/to/repository",
    "target": {
      "type": "codebase"
    },
    "style": "technical",
    "theme": "dark",
    "outputPath": "./walkthrough.mp4"
  }
}
```

**Target types:**
- `"codebase"` - Analyze entire codebase
- `"commit"` - Analyze specific commit (requires `commitHash`)
- `"staged"` - Analyze staged changes
- `"unstaged"` - Analyze unstaged changes

### Option 2: Without MCP Sampling Support (Manual)

If your MCP client doesn't support sampling (like Claude Code), use the two-step approach:

#### Step 1: Generate Analysis and Script

Ask your LLM to analyze the code:

```
Please analyze this codebase and provide JSON with this structure:

{
  "summary": {
    "achievement": "What this codebase accomplishes",
    "approach": "How it accomplishes it"
  },
  "files": [
    {
      "path": "path/to/file.ts",
      "status": "added|modified|deleted",
      "explanation": "What this file does",
      "impact": "Why it's important"
    }
  ],
  "totalStats": {
    "additions": 0,
    "deletions": 0,
    "filesChanged": 5
  }
}
```

Then ask for a script:

```
Based on this analysis, create a video script with this structure:

{
  "intro": "Introduction text",
  "sections": [
    {
      "title": "Section title",
      "narration": "What to say",
      "codeSnippet": "optional code",
      "duration": 5
    }
  ],
  "conclusion": "Concluding remarks",
  "estimatedDuration": 30
}
```

#### Step 2: Generate Video

Call the `generate_video_from_script` tool with both JSONs:

```json
{
  "tool": "generate_video_from_script",
  "arguments": {
    "analysis": { /* paste analysis JSON */ },
    "script": { /* paste script JSON */ },
    "style": "technical",
    "theme": "dark",
    "outputPath": "./walkthrough.mp4"
  }
}
```

See [USAGE_WITHOUT_SAMPLING.md](./USAGE_WITHOUT_SAMPLING.md) for detailed examples.

## MCP Server Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "walkthrough": {
      "command": "node",
      "args": ["/path/to/code-walkthrough-mcp/dist/src/index.js"]
    }
  }
}
```

Or with Bun:

```json
{
  "mcpServers": {
    "walkthrough": {
      "command": "bun",
      "args": ["run", "/path/to/code-walkthrough-mcp/dist/src/index.js"]
    }
  }
}
```

## Available Tools

### `generate_walkthrough`

**Requires:** MCP sampling support

Fully automatic video generation from code analysis to final video.

**Parameters:**
- `repoPath` (required): Path to git repository
- `target` (required): What to analyze
  - `type`: "commit" | "staged" | "unstaged" | "codebase"
  - `commitHash`: Required if type is "commit"
- `style`: "beginner" | "technical" | "overview" (default: "technical")
- `theme`: "dark" | "light" | "github" (default: "dark")
- `outputPath`: Where to save video (default: "./walkthrough.mp4")

### `generate_video_from_script`

**Requires:** No special capabilities (works with any MCP client)

Generate video from pre-provided analysis and script.

**Parameters:**
- `analysis` (required): Analysis JSON object
- `script` (required): Script JSON object
- `style`: "beginner" | "technical" | "overview" (default: "technical")
- `theme`: "dark" | "light" | "github" (default: "dark")
- `outputPath`: Where to save video (default: "./walkthrough.mp4")

## Project Structure

```
.
├── src/
│   ├── index.ts              # MCP server implementation
│   ├── stages/
│   │   ├── analysis.ts       # Code analysis via sampling
│   │   ├── script.ts         # Script generation via sampling
│   │   └── video.ts          # Video generation pipeline
│   ├── extractors/
│   │   ├── commit.ts         # Extract commit info
│   │   ├── staged.ts         # Extract staged changes
│   │   ├── unstaged.ts       # Extract unstaged changes
│   │   └── codebase.ts       # Extract codebase info
│   ├── types/
│   │   ├── state.ts          # Type definitions
│   │   └── analysis.ts       # Analysis types
│   └── utils/
│       └── prompts.ts        # LLM prompts for analysis
├── dist/                     # Compiled JavaScript
└── video_output/             # Generated videos (default)
```

## Development

```bash
# Watch mode (auto-rebuild on changes)
bun run watch

# Run MCP server
bun run dev

# Build TypeScript
bun run build
```

## Architecture

This MCP server implements an **inverted conversation flow** using MCP's sampling capability:

1. **Client** calls `generate_walkthrough` tool
2. **Server** extracts code/commits from git
3. **Server** calls back to **client** via sampling: "analyze this code"
4. **Client** processes with LLM, returns analysis
5. **Server** calls back again: "generate script from analysis"
6. **Client** generates script, returns it
7. **Server** creates video frames, audio, and compiles final video

For clients without sampling, the `generate_video_from_script` tool allows manual completion of steps 3-5.

## Video Generation Pipeline

1. **Analysis**: Code is analyzed to understand what it does
2. **Script**: A narrated script is generated based on analysis
3. **Frames**: HTML frames are created with syntax-highlighted code
4. **Screenshots**: Puppeteer captures PNG screenshots of each frame
5. **Audio**: Text-to-speech generates narration audio
6. **Compilation**: FFmpeg combines frames and audio into MP4

## Output

The generated video includes:
- Introduction with project overview
- Section-by-section code walkthrough
- Syntax-highlighted code snippets
- Professional narration
- Conclusion summary

Example output structure:
```
walkthrough.mp4           # Final video
temp_frames/              # Temporary frame images (auto-deleted)
temp_audio.mp3           # Temporary audio (auto-deleted)
```

## Troubleshooting

### "Method not found -32601" Error

Your MCP client doesn't support sampling. Use the `generate_video_from_script` tool instead (see Option 2 above).

### FFmpeg Not Found

Install FFmpeg:
- macOS: `brew install ffmpeg`
- Linux: `apt install ffmpeg`
- Windows: Download from ffmpeg.org and add to PATH

### No Audio in Video

The tool uses system text-to-speech. If TTS fails, video will be generated without audio (silent).

### Puppeteer Issues

Puppeteer downloads Chromium automatically. If it fails:
```bash
# Reinstall dependencies
rm -rf node_modules
bun install
```

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- TypeScript code compiles without errors
- Follow existing code style
- Update documentation for new features
