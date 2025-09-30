import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export class TextToSpeechConverter {
  async generateAudio(text: string, outputFile: string): Promise<void> {
    try {
      console.log('Generating audio narration with Edge TTS...');
      console.log('Text length: ' + text.length + ' characters');

      const silenceRegex = /\[\[slnc \d+\]\]/g;
      const cleanedText = text.replace(silenceRegex, '');

      const tempTextFile = outputFile.replace(/\.mp3$/, '.txt');
      await fs.writeFile(tempTextFile, cleanedText, 'utf8');

      const edgeCommand = 'edge-tts --voice en-US-JennyNeural --rate=-5% -f "' + tempTextFile + '" --write-media "' + outputFile + '"';
      console.log('Running: edge-tts with JennyNeural voice');

      await execAsync(edgeCommand);

      await fs.unlink(tempTextFile);

      const stats = await fs.stat(outputFile);
      console.log('Audio content written to file: ' + outputFile);
      console.log('Audio file size: ' + (stats.size / 1024 / 1024).toFixed(2) + ' MB');
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  }
}
