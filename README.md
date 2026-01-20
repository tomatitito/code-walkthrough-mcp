# Git Commit Video Walkthrough Generator

A command-line tool that generates narrated video walkthroughs of git commits, staged/unstaged changes, or entire codebases with AI-powered analysis and explanations.

## Features

- 🎥 Automatic video generation from git commits, diffs, or codebases
- 🤖 AI-powered code analysis using Claude (Anthropic) or Gemini (Google)
- 🗣️ Natural text-to-speech narration
- 🎨 Syntax-highlighted code visualization
- 📊 Multiple presentation styles (beginner, technical, overview)
- ⚡ Standalone CLI - no external services required
- 🔑 Direct LLM API integration (Anthropic, Google AI)

## Installation

### Prerequisites

- **FFmpeg**: Required for video compilation
  - macOS: `brew install ffmpeg`
  - Linux: `apt install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/)

- **Node.js/Bun**: For running the CLI
  - Recommended: Bun 1.0+ (`curl -fsSL https://bun.sh/install | bash`)
  - Or Node.js 20+

- **LLM API Key**: You need an API key from one of these providers:
  - **Anthropic Claude**: Get from [console.anthropic.com](https://console.anthropic.com/)
  - **Google AI**: Get from [ai.google.dev](https://ai.google.dev/)

### Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/code-walkthrough-cli.git
cd code-walkthrough-cli

# Install dependencies
bun install

# Build TypeScript
bun run build

# Optional: Create compiled binary
bun run build:bin
```

### Setup API Keys

Set your API key as an environment variable:

```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="your-api-key-here"

# Or for Google Gemini
export GOOGLE_API_KEY="your-api-key-here"

# Add to your shell profile (~/.zshrc, ~/.bashrc) to persist
echo 'export ANTHROPIC_API_KEY="your-api-key-here"' >> ~/.zshrc
```

## Usage

### Basic Usage

```bash
# Analyze a specific commit
git-commit-video abc123

# Analyze staged changes
git-commit-video --staged

# Analyze unstaged changes
git-commit-video --unstaged

# Analyze entire codebase
git-commit-video --codebase
```

### Options

```bash
git-commit-video <commit-hash> [options]

Options:
  --repo <path>          Path to git repository (default: current directory)
  --output <path>        Output video path (default: ./walkthrough.mp4)
  --style <style>        Presentation style: beginner, technical, overview (default: technical)
  --theme <theme>        Visual theme: dark, light, github (default: dark)
  --llm <provider>       LLM provider: anthropic, google (default: anthropic)
  --model <name>         Specific model to use (default: provider's latest)
  --help, -h             Show help
```

### Examples

```bash
# Generate video for commit with technical style
git-commit-video abc123 --style technical

# Analyze staged changes with light theme
git-commit-video --staged --theme light --output ./staged-changes.mp4

# Analyze entire codebase using Google Gemini
git-commit-video --codebase --llm google --style overview

# Use specific repository path
git-commit-video abc123 --repo /path/to/repo --output ./my-video.mp4
```

### Target Types

- **Specific Commit**: `git-commit-video <commit-hash>`
- **Staged Changes**: `git-commit-video --staged`
- **Unstaged Changes**: `git-commit-video --unstaged`
- **Entire Codebase**: `git-commit-video --codebase`

### Presentation Styles

- **beginner**: Detailed explanations, slower pace, educational tone
- **technical**: Precise, focused on implementation details
- **overview**: Quick, high-level summary of changes

### Visual Themes

- **dark**: Dark background (ideal for code)
- **light**: Light background
- **github**: GitHub-style syntax highlighting

## How It Works

The CLI follows a three-stage pipeline:

1. **Extract Git Data**: Analyzes commits, diffs, or codebase structure
2. **LLM Analysis**: Calls Claude/Gemini API to analyze code and generate narration script
3. **Video Generation**: Creates frames, generates audio, compiles into MP4

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Git Data   │ --> │ LLM Analysis │ --> │ Video Gen   │
│  Extraction │     │  (API Call)  │     │ (Frames+TTS)│
└─────────────┘     └──────────────┘     └─────────────┘
```

## Configuration

### API Key Configuration

You can provide your API key in multiple ways (in order of precedence):

1. **Environment Variable** (recommended):
   ```bash
   export ANTHROPIC_API_KEY="your-key"
   # or
   export GOOGLE_API_KEY="your-key"
   ```

2. **Command-line Argument**:
   ```bash
   git-commit-video abc123 --api-key "your-key"
   ```

3. **Config File** (`~/.git-commit-video/config.json`):
   ```json
   {
     "anthropicApiKey": "your-key",
     "googleApiKey": "your-key",
     "defaultLlm": "anthropic",
     "defaultStyle": "technical",
     "defaultTheme": "dark"
   }
   ```

### LLM Providers

**Anthropic Claude** (default):
- Best for code analysis
- Models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
- Get API key: [console.anthropic.com](https://console.anthropic.com/)

**Google Gemini**:
- Fast and cost-effective
- Models: `gemini-1.5-pro`, `gemini-1.5-flash`
- Get API key: [ai.google.dev](https://ai.google.dev/)

## Project Structure

```
.
├── src/
│   ├── cli.ts                # CLI entry point
│   ├── index.ts              # Core application logic
│   ├── stages/
│   │   ├── analysis.ts       # LLM analysis via API
│   │   ├── script.ts         # Script generation via API
│   │   └── video.ts          # Video generation pipeline
│   ├── extractors/
│   │   ├── commit.ts         # Extract commit info
│   │   ├── staged.ts         # Extract staged changes
│   │   ├── unstaged.ts       # Extract unstaged changes
│   │   └── codebase.ts       # Extract codebase info
│   ├── llm/
│   │   ├── anthropic.ts      # Anthropic API integration
│   │   ├── google.ts         # Google AI integration
│   │   └── types.ts          # LLM provider interface
│   ├── types/
│   │   ├── state.ts          # Type definitions
│   │   └── analysis.ts       # Analysis types
│   └── utils/
│       ├── prompts.ts        # LLM prompts for analysis
│       └── args.ts           # CLI argument parsing
├── dist/                     # Compiled JavaScript
├── bin/
│   └── git-commit-video      # Compiled binary (optional)
└── video_output/             # Generated videos (default)
```

## Development

```bash
# Watch mode (auto-rebuild on changes)
bun run watch

# Run CLI locally
bun run dev

# Build TypeScript
bun run build

# Build standalone binary
bun run build:bin

# Run tests
bun test
```

## Architecture

This CLI application uses a straightforward pipeline:

1. **User** runs CLI command with target (commit, staged, unstaged, codebase)
2. **CLI** extracts code/commits from git repository
3. **CLI** calls LLM API (Anthropic/Google) to analyze code
4. **LLM** returns structured analysis (JSON)
5. **CLI** calls LLM API again to generate narration script
6. **LLM** returns timed script with narration
7. **CLI** generates video frames, audio, and compiles final MP4

All processing happens locally - only the LLM analysis is done via API calls.

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

### "API Key Not Found" Error

Make sure you've set your API key:
```bash
export ANTHROPIC_API_KEY="your-key"
# or
export GOOGLE_API_KEY="your-key"
```

Add it to your shell profile to persist across sessions.

### "FFmpeg Not Found" Error

Install FFmpeg:
- macOS: `brew install ffmpeg`
- Linux: `apt install ffmpeg`
- Windows: Download from ffmpeg.org and add to PATH

Verify installation: `ffmpeg -version`

### "Invalid JSON Response" Error

The LLM returned malformed JSON. This can happen with very large diffs. Try:
- Analyzing a smaller commit
- Using a different LLM provider (`--llm google`)
- Using a more capable model (`--model claude-3-opus-20240229`)

### No Audio in Video

The CLI uses system text-to-speech. If TTS fails, the video will be generated without audio (silent).

To improve TTS quality, install edge-tts:
```bash
pip install edge-tts
```

### Puppeteer Issues

Puppeteer downloads Chromium automatically. If it fails:
```bash
# Reinstall dependencies
rm -rf node_modules
bun install
```

### Rate Limiting

If you hit API rate limits, the CLI will automatically retry with exponential backoff. For large codebases, consider:
- Using `--style overview` for shorter analysis
- Splitting analysis into multiple commits
- Using a higher rate limit tier with your LLM provider

## Cost Estimates

Typical API costs (approximate):

| Target Type | Tokens | Anthropic (Claude) | Google (Gemini) |
|-------------|--------|-------------------|-----------------|
| Small commit (~10 files) | ~3K | $0.01 | $0.00 |
| Medium commit (~50 files) | ~15K | $0.05 | $0.01 |
| Large commit (~200 files) | ~60K | $0.20 | $0.03 |
| Entire codebase (small) | ~20K | $0.07 | $0.01 |
| Entire codebase (large) | ~100K | $0.35 | $0.05 |

Use `--dry-run` to see estimated costs before execution.

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- TypeScript code compiles without errors
- Follow existing code style
- Update documentation for new features
- Add tests for new functionality

## Roadmap

- [ ] Support for more LLM providers (OpenAI, Cohere)
- [ ] Custom TTS voices
- [ ] Interactive mode with live preview
- [ ] Video editing features (trim, merge sections)
- [ ] Export to different formats (GIF, WebM)
- [ ] GitHub Actions integration
