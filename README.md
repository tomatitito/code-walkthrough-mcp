# Git Commit Video Walkthrough Generator

Generate narrated video walkthroughs of git commits with AI-powered explanations.

## Features

- 🎥 Automatic video generation from git commits
- 🗣️ Natural text-to-speech narration using Microsoft Edge TTS
- 🎨 Syntax-highlighted code diffs
- 📊 Multiple presentation styles (beginner, technical, overview)
- 🎯 Standalone executable - no Node.js required

## Installation

### Prerequisites

- FFmpeg: `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux)
- Edge TTS: `pip install edge-tts`

### Build from source

```bash
# Install dependencies
bun install

# Build TypeScript
bun run build

# Compile executable
bun run build:bin
```

## Usage

### CLI

```bash
./bin/git-commit-video <commit-hash> [options]

Options:
  --repo <path>          Path to git repository (default: current directory)
  --output <path>        Output directory (default: ./video_output)
  --style <style>        Presentation style: beginner, technical, overview (default: beginner)
  --theme <theme>        Visual theme: dark, light, github (default: dark)
  --fps <number>         Frames per second (default: 0.5)
  --help, -h             Show help message
```

### Examples

```bash
# Generate video for a commit
./bin/git-commit-video abc123

# Technical style with light theme
./bin/git-commit-video abc123 --style technical --theme light

# Custom output directory
./bin/git-commit-video abc123 --output ./my-videos
```

## Project Structure

```
.
├── src/               # Source code
│   ├── cli.ts         # CLI interface
│   ├── index.ts       # MCP server implementation
│   ├── tts.ts         # Text-to-speech integration
│   └── html-to-png.ts # HTML to PNG conversion
├── examples/          # Example scripts
├── bin/               # Compiled executables
├── dist/              # Compiled JavaScript
└── video_output/      # Generated videos (default)
```

## Development

```bash
# Watch mode
bun run watch

# Run MCP server
bun run dev

# Run example
bun examples/example-usage.ts
```

## Voice Options

The tool uses Microsoft Edge TTS. You can change the voice in `src/tts.ts`:

- `en-US-JennyNeural` - Friendly female (default)
- `en-US-GuyNeural` - Professional male
- `en-US-AriaNeural` - Conversational female
- `en-GB-SoniaNeural` - British female

List all available voices: `edge-tts --list-voices`

## License

MIT
