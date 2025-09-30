import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export class TextToSpeechConverter {
  async generateAudio(text: string, outputFile: string): Promise<void> {
    try {
      console.log(`Generating audio narration...`);
      console.log(`Text length: ${text.length} characters`);

      // Use macOS built-in 'say' command to generate audio
      // First, save text to a temporary file to handle long text and special characters
      const tempTextFile = outputFile.replace(/\.(wav|mp3|aiff)$/, '.txt');
      await fs.writeFile(tempTextFile, text, 'utf8');

      // Generate audio using macOS say command
      // Output as AIFF first, then convert to MP3 if needed
      const tempAiffFile = outputFile.replace(/\.(wav|mp3)$/, '.aiff');

      // Use Samantha voice (more natural female) or Daniel (natural male)
      // Slower rate for better comprehension (150-160 WPM instead of 180)
      const sayCommand = `say -f "${tempTextFile}" -o "${tempAiffFile}" -v Samantha -r 160`;
      console.log(`Running: ${sayCommand}`);

      await execAsync(sayCommand);

      // Convert AIFF to MP3 if needed using ffmpeg
      if (outputFile.endsWith('.mp3')) {
        const ffmpegCommand = `ffmpeg -y -i "${tempAiffFile}" -acodec mp3 -ab 128k "${outputFile}"`;
        console.log(`Converting to MP3: ${ffmpegCommand}`);
        await execAsync(ffmpegCommand);

        // Clean up temporary AIFF file
        await execAsync(`rm "${tempAiffFile}"`);
      } else {
        // If output format is AIFF, just rename
        await execAsync(`mv "${tempAiffFile}" "${outputFile}"`);
      }

      // Clean up temporary text file
      await execAsync(`rm "${tempTextFile}"`);

      console.log(`Audio content written to file: ${outputFile}`);
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  }
}
