# Changelog

## [0.1.0] - 2025-09-30

### Added

- Initial version of the Git Commit Video Walkthrough MCP Server.
- `analyze_commit` tool to extract commit information.
- `generate_video_script` tool to create a basic video script.
- `create_video_frames` tool to generate HTML frames for the video.
- `compile_video` tool to compile the frames into a video using `ffmpeg`.
- `HtmlToPngConverter` to convert HTML frames to PNG images using `puppeteer`.
- Syntax highlighting for code diffs using `highlight.js`.
- Modern and visually appealing design for the video frames.
- Test workflow to verify the end-to-end functionality.

### Fixed

- Handling of initial commits in the `analyze_commit` tool.
- Various TypeScript compilation errors.
- Compatibility issues with ES modules.
