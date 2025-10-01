# Phase 1 Usage Guide

## Quick Start

### Prerequisites
- Bun runtime
- Git repository to analyze
- MCP client that supports sampling (e.g., Claude Desktop, MCP Inspector)

### Installation

```bash
# Build the project
bun run build:tsc

# Run tests to verify installation
bun tests/integration-test.ts
```

### Running the Server

#### With MCP Inspector (Recommended for Testing)
```bash
npx @modelcontextprotocol/inspector bun dist/src/index.js
```

#### With Claude Desktop
Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "git-commit-video": {
      "command": "bun",
      "args": ["/path/to/code-walkthrough-mcp/dist/src/index.js"]
    }
  }
}
```

## Tool Interface

### `generate_walkthrough`

Generate a video walkthrough of git commits or changes.

**Parameters:**

```typescript
{
  repoPath: string;           // Path to git repository
  target: {
    type: "commit" | "staged" | "unstaged" | "codebase";
    commitHash?: string;      // Required when type = "commit"
  };
  style?: "beginner" | "technical" | "overview";  // Default: "technical"
  outputPath?: string;        // Default: "./walkthrough.mp4"
  theme?: "dark" | "light" | "github";           // Default: "dark"
}
```

**Examples:**

#### Analyze a Specific Commit
```json
{
  "repoPath": "/path/to/repo",
  "target": {
    "type": "commit",
    "commitHash": "abc123def456"
  },
  "style": "technical"
}
```

#### Analyze Staged Changes
```json
{
  "repoPath": "/path/to/repo",
  "target": {
    "type": "staged"
  },
  "style": "beginner"
}
```

#### Analyze Unstaged Changes
```json
{
  "repoPath": "/path/to/repo",
  "target": {
    "type": "unstaged"
  },
  "style": "overview"
}
```

## What Happens (Phase 1)

1. **Tool Initialization**
   - Validates inputs
   - Extracts target content (commit data or diffs)

2. **Agent Analysis (via Sampling)**
   - Tool prompts agent: "Analyze this commit/diff"
   - Agent reads diffs, returns structured JSON analysis
   - Includes: summary, file-by-file breakdown, impact assessment

3. **Script Generation (via Sampling)**
   - Tool prompts agent: "Generate narration script"
   - Agent creates natural-sounding script with pauses
   - Adapts to presentation style (beginner/technical/overview)

4. **Return Results (Phase 1)**
   - Returns analysis and script as JSON
   - Video generation stubbed (coming in Phase 3)

## Example Output

```json
{
  "status": "success (Phase 1 - Analysis & Script Only)",
  "walkthroughId": "uuid-here",
  "stages": {
    "analysis": {
      "summary": {
        "achievement": "Added user authentication system",
        "approach": "Implemented JWT-based auth across 3 components"
      },
      "filesAnalyzed": 3,
      "totalStats": {
        "additions": 145,
        "deletions": 12,
        "filesChanged": 3
      }
    },
    "script": {
      "intro": "This is a technical walkthrough of commit abc123...",
      "sections": 3,
      "estimatedDuration": 45
    },
    "video": {
      "status": "not_implemented",
      "message": "Video generation will be implemented in Phase 3"
    }
  },
  "fullAnalysis": { /* complete analysis object */ },
  "fullScript": { /* complete script object */ },
  "note": "Phase 1: Core sampling architecture implemented. Video generation stubbed."
}
```

## Presentation Styles

### Beginner
- Detailed explanations with educational tone
- Slower pacing with frequent pauses
- Explains technical terms
- Conversational and encouraging

**Use for:** Code reviews for junior developers, educational content

### Technical
- Precise, professional language
- Focuses on implementation details
- Uses technical terminology appropriately
- Concise but thorough

**Use for:** Senior developer reviews, technical documentation

### Overview
- Quick, high-level summary
- Minimal details
- Fast-paced delivery
- Only key points

**Use for:** Standup summaries, quick commit reviews

## Error Handling

The tool provides detailed error messages for common issues:

```json
{
  "status": "error",
  "walkthroughId": "uuid-here",
  "stage": "analysis",
  "error": "commitHash is required for type 'commit'"
}
```

Common errors:
- Missing `commitHash` for commit analysis
- Invalid repository path
- Git repository not found
- Agent returned malformed JSON
- Sampling request failed

## Limitations (Phase 1)

1. **No video output**: Only returns analysis + script
2. **No codebase analysis**: `type: "codebase"` not yet supported
3. **No frame generation**: HTML frames not created yet
4. **No audio synthesis**: TTS not integrated yet
5. **No video compilation**: FFmpeg integration pending

These will be addressed in Phases 2 and 3.

## Testing the Sampling Flow

### Manual Test with MCP Inspector

1. Start the inspector:
```bash
npx @modelcontextprotocol/inspector bun dist/src/index.js
```

2. In the inspector UI:
   - Find `generate_walkthrough` tool
   - Enter parameters
   - Click "Call Tool"
   - Watch the sampling requests appear
   - Agent will be prompted twice (analysis, then script)
   - Review the structured output

### What to Look For

**Sampling Request 1 (Analysis):**
- Prompt includes commit details
- Instructs use of subagents
- Requests JSON format
- Agent analyzes code and returns structured data

**Sampling Request 2 (Script):**
- Prompt includes analysis results
- Instructs on presentation style
- Requests narration with pauses
- Agent generates natural-sounding script

**Final Output:**
- Complete analysis object
- Complete script object
- Stub video status

## Next Steps

After Phase 1 is working:
- **Phase 2**: Add codebase analysis support
- **Phase 3**: Implement video generation (frames, audio, compilation)
- **Phase 4**: Add style/theme customization
- **Phase 5**: Performance optimization and testing

## Troubleshooting

### "Module not found" errors
```bash
# Rebuild the project
bun run build:tsc
```

### "sampling capability not supported"
Your MCP client doesn't support sampling. Use MCP Inspector or update your client.

### "Failed to parse JSON response from agent"
The agent returned malformed JSON. This is usually due to:
- Agent adding markdown code blocks (handled automatically)
- Agent returning plain text instead of JSON
- Connection timeout during sampling

Check the error message for the actual response received.

### Git operations failing
Ensure:
- `repoPath` points to a valid git repository
- You have read permissions
- For commit analysis, the commit hash exists
- For staged/unstaged, you're in a git repository

## Support

For issues specific to Phase 1 implementation:
1. Check `PHASE1_SUMMARY.md` for architecture details
2. Review `IMPLEMENTATION_PLAN.md` for the full plan
3. Run integration tests: `bun tests/integration-test.ts`
4. Check server logs for detailed error messages
