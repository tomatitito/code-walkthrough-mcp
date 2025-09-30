import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ConversionOptions {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
}

/**
 * Converts HTML files to PNG images using Puppeteer
 */
export class HtmlToPngConverter {
  private browser: any;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Convert a single HTML file to PNG
   */
  async convertFile(
    htmlPath: string,
    outputPath: string,
    options: ConversionOptions = {}
  ): Promise<void> {
    const {
      width = 1920,
      height = 1080,
      deviceScaleFactor = 2,
    } = options;

    const page = await this.browser.newPage();

    await page.setViewport({
      width,
      height,
      deviceScaleFactor,
    });

    // Load the HTML file
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    // Wait a bit for any animations or rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: false,
    });

    await page.close();
  }

  /**
   * Convert all HTML files in a directory to PNG
   */
  async convertDirectory(
    inputDir: string,
    outputDir: string,
    options: ConversionOptions = {}
  ): Promise<string[]> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Get all HTML files
    const files = await fs.readdir(inputDir);
    const htmlFiles = files
      .filter(f => f.endsWith('.html'))
      .sort();

    const outputPaths: string[] = [];

    console.log(`Converting ${htmlFiles.length} HTML files to PNG...`);

    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(inputDir, htmlFile);
      const pngFile = htmlFile.replace('.html', '.png');
      const outputPath = path.join(outputDir, pngFile);

      console.log(`  Converting ${htmlFile} → ${pngFile}`);
      await this.convertFile(htmlPath, outputPath, options);

      outputPaths.push(outputPath);
    }

    console.log('Conversion complete!');
    return outputPaths;
  }
}

/**
 * Standalone conversion function for CLI usage
 */
export async function convertHtmlToPng(
  inputPath: string,
  outputPath: string,
  options: ConversionOptions = {}
): Promise<void> {
  const converter = new HtmlToPngConverter();

  try {
    await converter.initialize();

    // Check if input is directory or file
    const stats = await fs.stat(inputPath);

    if (stats.isDirectory()) {
      await converter.convertDirectory(inputPath, outputPath, options);
    } else {
      await converter.convertFile(inputPath, outputPath, options);
    }
  } finally {
    await converter.close();
  }
}
