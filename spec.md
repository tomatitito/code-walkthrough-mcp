# Git Commit Video Walkthrough - Specification

## Purpose

This tool generates video walkthroughs of git commits, unstaged or staged changes or even whole codebases to help developers understand the code in question and the changes to it through visual and audio narration. It transforms technical source code, git commits and commit messages and possibly git diffs into accessible, narrated video content that explains the intent of the code and in case of git commits, staged or unstaged changes, what was changed, why, and how.

## Core Intent

The primary goal is to make code review more accessible by:
- Providing visual representations of code and code changes
- Generating natural-sounding audio narration that explains changes
- Offering different presentation styles for different audiences (beginners, technical reviewers, quick overviews)

## General Approach

This tool, which is supposed to be used as an mcp server, takes an unusual approach in that it inverts the flow of communication compared to a regular client-agent interaction with tool calls, where the user would prompt the model, the model would then call a tool and report the result of this tool call back to the user. Instead, this tool, when called by an agent, will respond with a prompt for the agent. When the agent comes back with a response, the tool will consume this response and use it in the process of generating the video walkthrough.

The reason for this approach is that analysis of code and generation of summaries that result from these analyses require an agent that has the capability of reading whatever code is of interest to the user at the time the agent is called. However, generating frames that can be combined into a video once the content of these frames is known or generating speech from text are tasks that can very well be handled by a separate tool or service.

This means that for every single task that is neccessary in the process of generating a video walkthrough of code with an accompanying audio track that explains the intent of the code, how it is structured, and so on, this tool needs to provide two tool calls: one that returns a prompt to the agent to actually gather the content, and one that takes the response and uses it to generate the video walkthrough. Should the agent need more information to finish the generation of the video, the tool must provide this so that the agent loop can continue until the work is done.

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
- Avoids reading the technical details of git diffs like a lot of "+"'s or "-"s

### Presentation Styles

Three styles are available to match different use cases:

- **Beginner**: Detailed explanations with more pauses, educational tone
- **Technical**: Precise, focused on implementation details
- **Overview**: Quick summary, high-level only

## What the Tool Does

### Input
The input is provided by the agent, that has been asked to generate a video walkthrough of one of the following: 
- A git repository path
- A commit hash to analyze
- Unstaged changes in the working directory
- Staged changes for the current git project
- The whole codebase in the current working directory
The agent delegates to the tool in order to get further instructions.

### Processing
- The tool then generates a prompt for the agent to analyze the relevant code. If the agent has the ability to use subagents, the tool instructs the agent to use a subagent for each analysis.
- The tool then takes the response from the agent and processes it to generate whatever is neccessary. The reponse could either be related to the analysis, or to the video content, or the the spoken narration and the audio that accompanies the video.

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

The tool should generate one or more tests to make sure that whatever is generated actually works and can be committed, even if it is not the finished video walkthrough tool yet.
