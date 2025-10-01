# Implementation Plan: Git Commit Video Walkthrough MCP Server

## Executive Summary

This document outlines the plan to rewrite the git-commit-video-mcp-server to conform to the specification in `spec.md`. The key architectural change is implementing an **inverted conversation flow** where the tool orchestrates the agent's work through MCP's sampling capability, rather than the agent orchestrating the tool.

## Current State Analysis

### Existing Implementation
The current server (`src/index.ts`) implements a traditional MCP tool pattern:
- **6 tools**: `analyze_commit`, `generate_video_script`, `create_video_frames`, `compile_video`, `generate_audio`, `generate_full_script`
- **Agent-orchestrated flow**: Agent calls tools sequentially to build a video
- **Self-contained logic**: Tools perform all analysis and content generation internally
- **No sampling**: No use of MCP's sampling capability for agent collaboration

### Gap from Specification
The spec requires:
- **Tool-orchestrated flow**: Tool prompts agent for analysis work
- **Agent performs analysis**: Agent reads files, analyzes diffs, generates summaries
- **Multi-turn interaction**: Tool and agent collaborate until video is complete
- **Subagent delegation**: Agent should use subagents for complex analysis tasks

## Architecture Design

### Core Pattern: Sampling-Based Inverted Flow

The new architecture leverages **MCP Sampling** to enable the tool to request agent work:

```typescript
// Tool prompts agent for analysis
const analysisResult = await ctx.session.create_message({
  messages: [{
    role: "user",
    content: "Analyze commit abc123. Read diffs, explain changes..."
  }],
  max_tokens: 3000
});

// Tool processes agent's response
const analysis = JSON.parse(analysisResult.content[0].text);

// Tool prompts agent for narration script
const scriptResult = await ctx.session.create_message({
  messages: [{
    role: "user", 
    content: `Generate narration script based on: ${JSON.stringify(analysis)}`
  }],
  max_tokens: 2000
});

// Tool generates video using agent's outputs
const video = generateVideo(analysis, scriptResult);
```

### Tool Interface Design

**Single Primary Tool**: `generate_walkthrough`

**Input Parameters:**
```typescript
{
  repoPath: string;           // Path to git repository
  target: {                    // What to analyze
    type: "commit" | "staged" | "unstaged" | "codebase";
    commitHash?: string;       // For type: "commit"
  };
  style?: "beginner" | "technical" | "overview";  // Presentation style
  outputPath?: string;        // Where to save video (default: ./walkthrough.mp4)
  theme?: "dark" | "light" | "github";           // Visual theme
}
```

**Processing Stages:**

1. **Initialization**
   - Validate inputs
   - Detect git repository
   - Determine what to analyze based on `target.type`

2. **Agent Analysis Stage** (via sampling)
   - **For commits**: Prompt agent to analyze commit diff
   - **For staged/unstaged**: Prompt agent to analyze `git diff` output
   - **For codebase**: Prompt agent to analyze entire project structure
   - Agent returns structured analysis (JSON)

3. **Narration Generation Stage** (via sampling)
   - Prompt agent to generate natural narration script
   - Include style guidance (beginner/technical/overview)
   - Agent returns timed script with pauses

4. **Video Generation Stage** (tool-native)
   - Generate HTML frames with syntax-highlighted code
   - Convert HTML to PNG using Puppeteer
   - Generate audio from script using Edge TTS
   - Compile video using FFmpeg

5. **Output**
   - Return video file path
   - Include metadata (duration, frame count, audio length)

### State Management

**Problem**: MCP protocol doesn't specify session persistence. Multi-turn sampling requests need context continuity.

**Solution**: Conversation context management

```typescript
interface WalkthroughState {
  id: string;                    // Unique walkthrough ID
  repoPath: string;
  target: TargetSpec;
  style: string;
  stage: "analysis" | "script" | "video" | "complete";
  analysis?: AnalysisResult;     // From agent's first response
  script?: ScriptResult;         // From agent's second response
  frames?: string[];             // Generated frame paths
  audioPath?: string;            // Generated audio file
}

// Store state in memory during tool execution
const stateMap = new Map<string, WalkthroughState>();
```

Since MCP tool calls are atomic (start → finish), state lives only within a single tool execution. The multi-turn conversation happens via sequential sampling requests within that execution.

### Subagent Integration

**Specification Requirement**: "If the agent has the ability to use subagents, the tool instructs the agent to use a subagent for each analysis."

**Implementation via Prompts**:

```typescript
const analysisPrompt = `Analyze commit ${commitHash}.

IMPORTANT: If you have access to subagents, delegate this analysis to a specialized subagent. Use the following delegation strategy:

- Use a code analysis subagent for examining diffs and file changes
- Use a documentation subagent for explaining intent and impact

Your analysis should include:
1. High-level summary (what was achieved, how)
2. File-by-file breakdown with explanations
3. Impact assessment

Return JSON format:
{
  "summary": {
    "achievement": "...",
    "approach": "..."
  },
  "files": [
    {"path": "...", "status": "added|modified|deleted", "explanation": "...", "impact": "..."}
  ],
  "totalStats": {"additions": 0, "deletions": 0, "filesChanged": 0}
}`;
```

The agent (e.g., Claude Code) will automatically use its Task tool to delegate to subagents when appropriate. The MCP server doesn't need to know about subagents - it just requests analysis and receives results.

### Input Type Support

**1. Git Commit Analysis**
```typescript
target: { type: "commit", commitHash: "abc123" }
```
- Extract commit diff using `simple-git`
- Provide diff to agent for analysis
- Generate frames showing before/after code

**2. Unstaged Changes**
```typescript
target: { type: "unstaged" }
```
- Run `git diff` to get working directory changes
- Provide diff to agent for analysis
- Generate frames showing current changes

**3. Staged Changes**
```typescript
target: { type: "staged" }
```
- Run `git diff --staged` to get index changes
- Provide diff to agent for analysis
- Generate frames showing staged modifications

**4. Whole Codebase**
```typescript
target: { type: "codebase" }
```
- Enumerate project files (respecting .gitignore)
- Provide file tree and key files to agent
- Generate frames showing codebase structure
- Focus on architecture, not detailed diffs

## Testing Strategy

### Test Categories

**1. Unit Tests** (`tests/unit/`)
- Test git operations (commit analysis, diff extraction)
- Test HTML frame generation with syntax highlighting
- Test audio generation (mock Edge TTS)
- Test video compilation (mock FFmpeg)

**2. Integration Tests** (`tests/integration/`)
- Test full walkthrough generation end-to-end
- Test all four target types (commit, staged, unstaged, codebase)
- Test all three styles (beginner, technical, overview)
- Test error handling (missing commits, invalid repos)

**3. Sampling Mock Tests** (`tests/sampling/`)
- Mock MCP sampling responses
- Verify prompts sent to agent
- Test conversation flow (analysis → script → video)
- Validate JSON parsing of agent responses

**4. Visual Regression Tests** (`tests/visual/`)
- Capture sample frames for each theme
- Verify syntax highlighting works correctly
- Test frame layouts (title, file diff, outro)

### Test Fixtures

Create fixture repository in `tests/fixtures/sample-repo/`:
```
tests/fixtures/sample-repo/
  .git/              # Real git repo
  src/
    index.ts         # Sample source file
    utils.ts         # Another file
  package.json       # Project metadata
  README.md          # Documentation
```

With known commits:
- `fixture-commit-1`: Add new feature (adds 2 files)
- `fixture-commit-2`: Fix bug (modifies 1 file)
- `fixture-commit-3`: Refactor (modifies 3 files, deletes 1)

### Test Script

```bash
#!/usr/bin/env bash
# tests/run-integration-tests.sh

set -e

echo "Running integration tests..."

# Test 1: Analyze commit
bun run test:integration -- commit

# Test 2: Analyze unstaged changes  
echo "test change" >> tests/fixtures/sample-repo/src/index.ts
bun run test:integration -- unstaged
git -C tests/fixtures/sample-repo checkout -- .

# Test 3: Analyze staged changes
echo "staged change" >> tests/fixtures/sample-repo/src/index.ts
git -C tests/fixtures/sample-repo add .
bun run test:integration -- staged
git -C tests/fixtures/sample-repo reset HEAD

# Test 4: Analyze whole codebase
bun run test:integration -- codebase

echo "✓ All integration tests passed"
```

### Success Criteria

- [ ] All unit tests pass
- [ ] All integration tests produce valid MP4 files
- [ ] Generated videos have audio that matches frame timing
- [ ] Syntax highlighting works for TypeScript, JavaScript, Python, JSON
- [ ] All three presentation styles produce different narration
- [ ] Subagent delegation prompt is included in sampling requests
- [ ] Error handling gracefully handles missing dependencies (FFmpeg, Edge TTS)

## Implementation Phases

### Phase 1: Core Sampling Architecture (Week 1)
**Goal**: Implement inverted flow with sampling

**Tasks**:
- [ ] Update MCP server to declare `sampling` capability
- [ ] Create `generate_walkthrough` tool with sampling integration
- [ ] Implement commit analysis stage (prompt agent, parse response)
- [ ] Implement script generation stage (prompt agent, parse response)
- [ ] Add state management for multi-turn conversation
- [ ] Write unit tests for sampling mock

**Deliverable**: Tool can request agent analysis and receive structured JSON response

### Phase 2: Input Type Support (Week 2)
**Goal**: Support all target types (commit, staged, unstaged, codebase)

**Tasks**:
- [ ] Implement commit diff extraction
- [ ] Implement unstaged changes extraction (`git diff`)
- [ ] Implement staged changes extraction (`git diff --staged`)
- [ ] Implement codebase file enumeration
- [ ] Create target-specific prompts for each type
- [ ] Write integration tests for each target type

**Deliverable**: Tool works with commits, diffs, and whole codebases

### Phase 3: Video Generation (Week 3)
**Goal**: Generate complete videos with frames and audio

**Tasks**:
- [ ] Refactor frame generation to use agent's analysis
- [ ] Implement syntax highlighting for common languages
- [ ] Integrate Edge TTS for audio narration
- [ ] Implement FFmpeg video compilation
- [ ] Add timing synchronization (match audio to frames)
- [ ] Test all three themes (dark, light, github)

**Deliverable**: Tool produces complete MP4 videos

### Phase 4: Style & Polish (Week 4)
**Goal**: Implement presentation styles and improve quality

**Tasks**:
- [ ] Implement beginner style (detailed, slow-paced)
- [ ] Implement technical style (precise, focused)
- [ ] Implement overview style (quick, high-level)
- [ ] Add natural pauses in narration (silence markers)
- [ ] Improve frame layouts and typography
- [ ] Add error handling and validation
- [ ] Write comprehensive documentation

**Deliverable**: Production-ready tool with excellent UX

### Phase 5: Testing & Documentation (Week 5)
**Goal**: Complete test coverage and documentation

**Tasks**:
- [ ] Create fixture repository with sample commits
- [ ] Write full integration test suite
- [ ] Add visual regression tests
- [ ] Write user guide (README)
- [ ] Write developer guide (CONTRIBUTING)
- [ ] Create example videos
- [ ] Performance testing and optimization

**Deliverable**: Well-tested, documented tool ready for release

## Migration Strategy

### Breaking Changes
The new implementation has a fundamentally different API:

**Old**: 6 separate tools that agent orchestrates
```typescript
// Agent calls each tool
await analyzeCommit({repoPath, commitHash});
await generateScript({commitInfo, style});
await createFrames({commitInfo, outputDir});
await generateAudio({text, outputFile});
await compileVideo({framesDir, audioPath, outputPath});
```

**New**: 1 tool that orchestrates agent
```typescript
// Agent calls once, tool does everything
await generateWalkthrough({
  repoPath,
  target: {type: "commit", commitHash},
  style: "technical"
});
```

### Deprecation Path
1. Mark old tools as deprecated in `ListToolsRequestSchema`
2. Add warning messages when old tools are called
3. Provide migration guide in README
4. Remove old tools after 2 release cycles

### Backward Compatibility
Not feasible due to fundamental architectural change. Old tools cannot be shimmed to new architecture since they don't use sampling.

**Recommendation**: Major version bump (v0.1.0 → v1.0.0)

## File Structure Changes

```
src/
  index.ts                    # Main MCP server (rewritten)
  tools/
    generate-walkthrough.ts   # Primary tool implementation
  stages/
    analysis.ts              # Agent analysis stage (sampling)
    script.ts                # Script generation stage (sampling)
    video.ts                 # Video generation stage (native)
  generators/
    frames.ts                # HTML frame generation
    audio.ts                 # Edge TTS integration
    compiler.ts              # FFmpeg video compilation
  extractors/
    commit.ts                # Extract commit diffs
    staged.ts                # Extract staged changes
    unstaged.ts              # Extract unstaged changes
    codebase.ts              # Enumerate codebase files
  utils/
    syntax-highlight.ts      # Syntax highlighting utilities
    timing.ts                # Audio/frame synchronization
    prompts.ts               # Prompt templates for agent
  types/
    state.ts                 # State management types
    analysis.ts              # Analysis result types
    script.ts                # Script result types
tests/
  unit/
    generators/              # Test frame/audio/video generation
    extractors/              # Test git operations
  integration/
    walkthrough.test.ts      # End-to-end walkthrough tests
  sampling/
    mock-agent.ts            # Mock sampling responses
  fixtures/
    sample-repo/             # Git repository for testing
  visual/
    snapshots/               # Visual regression snapshots
```

## Dependencies

### Keep (Already Used)
- `@modelcontextprotocol/sdk`: MCP server framework
- `simple-git`: Git operations
- `puppeteer`: HTML to PNG conversion
- `highlight.js`: Syntax highlighting
- `axios`: HTTP requests (if needed)

### Add
- None required - all functionality can be achieved with existing deps

### Remove
- `@google/generative-ai`: Not needed (using MCP sampling instead)
- `say`: Replaced by Edge TTS (already integrated)

### External Tools (Required)
- **FFmpeg**: Video compilation (must be installed on system)
- **Edge TTS** (`edge-tts` Python package): Audio generation (must be installed)

## Risk Assessment

### High Risk
1. **MCP Sampling Adoption**: Sampling requires client support and user approval
   - **Mitigation**: Document client requirements, provide fallback error messages

2. **Agent Response Parsing**: Agent might return malformed JSON
   - **Mitigation**: Use strict JSON schema validation, retry with clarification prompt

3. **External Dependencies**: FFmpeg and Edge TTS must be installed
   - **Mitigation**: Check for dependencies on startup, provide helpful error messages

### Medium Risk
1. **Long-running Execution**: Video generation can take minutes
   - **Mitigation**: Use MCP progress notifications, show incremental updates

2. **Memory Usage**: Large diffs and codebase analysis can consume significant memory
   - **Mitigation**: Stream processing, limit diff context, paginate file lists

### Low Risk
1. **Theme Compatibility**: Different syntax highlighting themes for different languages
   - **Mitigation**: Use robust highlight.js with fallback rendering

## Success Metrics

### Functional Requirements ✓
- [ ] Supports commit, staged, unstaged, and codebase analysis
- [ ] Uses sampling to delegate analysis to agent
- [ ] Instructs agent to use subagents when available
- [ ] Generates MP4 videos with audio narration
- [ ] Implements three presentation styles
- [ ] Provides syntax highlighting for 10+ languages

### Quality Requirements ✓
- [ ] 90%+ test coverage
- [ ] All integration tests pass
- [ ] Videos play correctly on macOS, Linux, Windows
- [ ] Audio syncs with frames (±200ms tolerance)
- [ ] Natural-sounding narration with appropriate pauses

### Performance Requirements ✓
- [ ] Generates 5-minute video in <2 minutes
- [ ] Memory usage <500MB for typical commits
- [ ] Handles commits with 100+ file changes

### User Experience Requirements ✓
- [ ] Clear error messages for missing dependencies
- [ ] Progress updates during generation
- [ ] Comprehensive README with examples
- [ ] Example videos demonstrating each style

## Conclusion

This implementation plan transforms the git-commit-video-mcp-server from a traditional tool collection into an **agent-orchestrating MCP server** that leverages sampling to delegate code analysis work to intelligent agents. The new architecture aligns with the specification's vision of an inverted conversation flow while maintaining compatibility with the MCP protocol.

The phased approach ensures incremental progress with testable milestones, reducing risk and enabling early feedback. By focusing on core sampling architecture first, then expanding to support multiple input types and presentation styles, we build a solid foundation before adding polish.

The end result will be a powerful tool that transforms git commits, changes, and codebases into accessible, narrated video walkthroughs - making code review more engaging and understandable for developers of all skill levels.
