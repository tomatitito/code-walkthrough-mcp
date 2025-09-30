#!/usr/bin/env node

/**
 * Example script showing how to use the Git Commit Video MCP Server
 * This demonstrates the complete workflow from commit analysis to video generation
 */

import { simpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HtmlToPngConverter } from './html-to-png.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VideoConfig {
  repoPath: string;
  commitHash: string;
  outputDir: string;
  theme: 'dark' | 'light' | 'github';
  style: 'technical' | 'beginner' | 'overview';
  fps: number;
}
