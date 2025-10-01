# Using the Walkthrough Tool Without Sampling Support

If your MCP client doesn't support the sampling capability, you can still use this tool by providing pre-generated analysis and script.

## Workflow

1. **Ask an LLM to analyze your code** using the prompts below
2. **Ask the LLM to generate a script** using the analysis
3. **Call the `generate_video_from_script` tool** with both outputs
4. **Get your video!**

## Step 1: Generate Analysis

Ask your LLM (like Claude) to analyze the codebase with this prompt:

```
Please analyze this codebase and provide a JSON response with the following structure:

{
  "summary": {
    "achievement": "What this codebase accomplishes",
    "approach": "How it accomplishes it"
  },
  "files": [
    {
      "path": "path/to/file.ts",
      "status": "added" | "modified" | "deleted",
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

Analyze the following files from /path/to/your/repo:
[paste file contents or descriptions here]
```

## Step 2: Generate Script

Once you have the analysis, ask your LLM to generate a script:

```
Based on this analysis, create a video script with the following JSON structure:

{
  "intro": "Introduction text for the video",
  "sections": [
    {
      "title": "Section title",
      "narration": "What to say in this section",
      "codeSnippet": "optional code to display",
      "duration": 5
    }
  ],
  "conclusion": "Concluding remarks",
  "estimatedDuration": 30
}

The style should be: technical|beginner|overview
Target audience: developers

Analysis:
[paste the analysis JSON here]
```

## Step 3: Call the Tool

Use the `generate_video_from_script` tool with the analysis and script:

```json
{
  "analysis": { ... paste analysis JSON ... },
  "script": { ... paste script JSON ... },
  "style": "technical",
  "outputPath": "./my-walkthrough.mp4",
  "theme": "dark"
}
```

## Example

See the example below for a complete workflow.

### Example Analysis (for a TypeScript MCP server):

```json
{
  "summary": {
    "achievement": "Implements an MCP server for generating video walkthroughs of git commits and codebases",
    "approach": "Uses TypeScript with MCP SDK, orchestrates analysis via sampling, and generates videos with Puppeteer"
  },
  "files": [
    {
      "path": "src/index.ts",
      "status": "modified",
      "explanation": "Main server implementation with tool handlers",
      "impact": "Core orchestration logic for the entire walkthrough generation process"
    },
    {
      "path": "src/stages/analysis.ts",
      "status": "modified",
      "explanation": "Handles code analysis via MCP sampling",
      "impact": "Critical for understanding what the code does before creating video"
    },
    {
      "path": "src/stages/video.ts",
      "status": "added",
      "explanation": "Video generation pipeline with frames and audio",
      "impact": "Final stage that produces the actual video output"
    }
  ],
  "totalStats": {
    "additions": 450,
    "deletions": 120,
    "filesChanged": 8
  }
}
```

### Example Script:

```json
{
  "intro": "Welcome to this walkthrough of an MCP server that generates video tutorials from code. This server implements a novel inverted architecture where the tool orchestrates an AI agent to analyze and explain code.",
  "sections": [
    {
      "title": "Server Architecture",
      "narration": "The server is built on the MCP SDK and declares two key capabilities: tools and sampling. The sampling capability is what allows it to request AI analysis from the client.",
      "duration": 8
    },
    {
      "title": "Analysis Stage",
      "narration": "In the analysis stage, the server extracts code information and uses MCP sampling to request detailed analysis from an LLM. This produces structured insights about what the code does and why.",
      "codeSnippet": "const analysis = await requestCodebaseAnalysis(ctx, codebaseInfo);",
      "duration": 10
    },
    {
      "title": "Video Generation",
      "narration": "Finally, the video generation pipeline creates HTML frames, generates audio narration, and compiles everything into an MP4 file using Puppeteer and ffmpeg.",
      "duration": 8
    }
  ],
  "conclusion": "This MCP server demonstrates how tools can leverage AI to create rich, automated documentation in video format.",
  "estimatedDuration": 35
}
```

## Notes

- The `analysis` and `script` objects must match the exact structure shown above
- All required fields must be present or the tool will fail validation
- The tool will skip the sampling stages and go directly to video generation
- This approach works with **any MCP client**, regardless of sampling support
