# Git Commit Video Walkthrough MCP Server

An MCP (Model Context Protocol) server that analyzes git commits and generates video walkthroughs of code changes.

## Features

- **Analyze Commits**: Extract detailed information about commits including diffs, file changes, and statistics
- **Generate Scripts**: Create narrative explanations of changes in different styles (technical, beginner, overview)
- **Create Visual Frames**: Generate HTML frames showing code changes with syntax highlighting
- **Compile Videos**: Combine frames into video format with optional audio narration

## Prerequisites

- Node.js 18+ 
- Git (command line)
- FFmpeg (for video compilation)
- A git repository to analyze

### Installing FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) or use Chocolatey:
```bash
choco install ffmpeg
```

## Installation

1. **Clone or create the project:**
```bash
mkdir git-commit-video-mcp
cd git-commit-video-mcp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

4. **Save the server code as `src/index.ts`**

5. **Build the server:**
```bash
npm run build
```

## Configuration

Add the server to your Claude Desktop config file:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "git-commit-video": {
      "command": "node",
      "args": ["/absolute/path/to/git-commit-video-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after configuration.

## Usage

Once configured, you can ask Claude to use the tools. Here are example workflows:

### Basic Commit Analysis

```
Analyze commit abc123 in my repository at /path/to/repo
```

Claude will use the `analyze_commit` tool to extract:
- Commit metadata (author, date, message)
- Files changed
- Line additions/deletions
- Diff content

### Generate Video Script

```
Generate a beginner-friendly script for explaining this commit: [paste commit info]
```

Claude will use `generate_video_script` to create a narrative walkthrough.

### Complete Video Workflow

```
Create a video walkthrough for commit abc123 in /path/to/repo:
1. Analyze the commit
2. Generate a technical script
3. Create frames with dark theme in /tmp/frames
4. Compile to /tmp/commit-video.mp4
```

## Available Tools

### 1. `analyze_commit`
Analyzes a git commit and extracts detailed information.

**Parameters:**
- `repoPath` (string): Path to git repository
- `commitHash` (string): Commit hash to analyze

**Returns:** JSON with commit details, files changed, and diffs

### 2. `generate_video_script`
Generates narrative script for explaining changes.

**Parameters:**
- `commitInfo` (object): Output from analyze_commit
- `style` (string): "technical", "beginner", or "overview"

**Returns:** Structured script with intro, sections, and outro

### 3. `create_video_frames`
Generates HTML frames showing code changes.

**Parameters:**
- `commitInfo` (object): Commit information
- `outputDir` (string): Directory for frames
- `theme` (string): "dark", "light", or "github"

**Returns:** List of generated frame files

### 4. `compile_video`
Compiles frames and audio into video.

**Parameters:**
- `framesDir` (string): Directory containing frames
- `outputPath` (string): Output video file path
- `audioPath` (string, optional): Path to audio narration
- `fps` (number, optional): Frames per second (default: 2)

**Returns:** Success message or error

## Enhancements Roadmap

### Phase 1: Core Functionality ✅
- [x] Git commit analysis
- [x] Basic frame generation
- [x] FFmpeg video compilation

### Phase 2: Visual Improvements
- [ ] HTML to PNG conversion (using Puppeteer/Playwright)
- [ ] Syntax highlighting in diffs (using Highlight.js or Prism)
- [ ] Animated transitions between changes
- [ ] Minimap showing file context

### Phase 3: Audio Integration
- [ ] Text-to-speech for narration (using AWS Polly, Google TTS, or ElevenLabs)
- [ ] Background music
- [ ] Adjustable speaking rate
- [ ] Multiple voice options

### Phase 4: Advanced Features
- [ ] Multi-commit comparisons
- [ ] Branch visualization
- [ ] Interactive timeline
- [ ] Custom templates
- [ ] Export formats (MP4, WebM, GIF)

### Phase 5: AI Enhancements
- [ ] LLM-powered code explanations
- [ ] Automatic importance ranking
- [ ] Smart frame duration based on complexity
- [ ] Question generation for code review

## Technical Architecture

```
User Request → MCP Server → Git Operations
                           ↓
                    Commit Analysis
                           ↓
                    Frame Generation (HTML)
                           ↓
                    [Optional: Screenshot to PNG]
                           ↓
                    FFmpeg Video Compilation
                           ↓
                    Output Video File
```

## Limitations

1. **HTML Frames**: Currently generates HTML frames. You'll need to convert them to PNG images before FFmpeg compilation (use Puppeteer or manual screenshots).

2. **Audio**: Audio narration needs to be generated separately using TTS services.

3. **Complex Diffs**: Very large commits may need chunking for readability.

4. **Performance**: Video compilation can be CPU-intensive for long commits.

## Contributing Ideas

- Add Puppeteer integration for automatic HTML→PNG conversion
- Integrate OpenAI TTS or ElevenLabs for narration
- Add more themes and customization options
- Support for multiple commit ranges
- Interactive video controls
- Export to different formats

## License

MIT

## Troubleshooting

**Issue:** "FFmpeg not found"
- **Solution:** Install FFmpeg and ensure it's in your PATH

**Issue:** "Cannot read repository"
- **Solution:** Check that the repoPath is correct and contains a valid .git directory

**Issue:** "Frames not converting to video"
- **Solution:** HTML frames need to be converted to PNG first. Consider adding Puppeteer for automated screenshots.

**Issue:** MCP server not appearing in Claude
- **Solution:** Check the config file path is correct and restart Claude Desktop