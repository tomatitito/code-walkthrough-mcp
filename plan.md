# Development Plan

This plan outlines the next steps for the Git Commit Video Walkthrough MCP Server.

## Phase 1: Integrate Existing Components and Complete Core Workflow

The first priority is to get a complete end-to-end workflow running. This involves integrating the existing `html-to-png.ts` functionality into the main server and ensuring a video can be generated.

1.  [x] **Install `puppeteer`**: The `html-to-png.ts` file requires `puppeteer`, but it's missing from `package.json`.
2.  [x] **Integrate `HtmlToPngConverter`**: Modify the `compile_video` tool in `index.ts` to use the `HtmlToPngConverter` to convert the generated HTML frames into PNGs before calling `ffmpeg`.
3.  [x] **Refine `create_video_frames`**:
    *   Add syntax highlighting to the code diffs in the generated HTML frames. `highlight.js` is a good option for this.
    *   Improve the overall visual design of the frames to be more modern and visually appealing.
4.  [x] **Test the full workflow**: Create a test script or an entry in `example-usage.ts` to run the entire process: `analyze_commit` -> `generate_video_script` -> `create_video_frames` -> `compile_video`.

## Phase 2: Enhance Script and Audio Generation

With the core video generation working, the next step is to improve the quality of the narration.

1.  **Integrate a Text-to-Speech (TTS) service**:
    *   Choose a TTS service (e.g., ElevenLabs, Google TTS, AWS Polly).
    *   Create a new tool, `generate_audio`, that takes the script from `generate_video_script` and generates an audio file.
    *   The `compile_video` tool will then use this audio file.
2.  **Improve `generate_video_script`**:
    *   Instead of the current placeholder, use a large language model (LLM) to generate more natural and informative explanations of the code changes. This will require adding a library to interact with an LLM API.
    *   The script generation should be more sophisticated, taking into account the `style` parameter (`technical`, `beginner`, `overview`) to produce tailored content.

## Phase 3: Advanced Features and Refinements

These steps are based on the "Enhancements Roadmap" in the `README.md`.

1.  **Multi-commit comparisons**: Add a new tool to analyze a range of commits and create a video that summarizes the changes across them.
2.  **Branch visualization**: Create visual representations of branch histories.
3.  **Custom templates**: Allow users to provide their own HTML/CSS templates for the video frames.
4.  **More export formats**: Add options to `compile_video` to export to different formats like WebM or GIF.
