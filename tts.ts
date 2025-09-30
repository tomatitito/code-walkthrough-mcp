import * as say from 'say';

export class TextToSpeechConverter {
  generateAudio(text: string, outputFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // The 'say' library uses a callback-based API. We wrap it in a Promise
      // to make it compatible with our async/await workflow.
      say.export(text, undefined, 1, outputFile, (err) => {
        if (err) {
          return reject(err);
        }
        console.log(`Audio content written to file: ${outputFile}`);
        resolve();
      });
    });
  }
}
