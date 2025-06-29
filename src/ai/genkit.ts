import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ollama } from 'genkitx-ollama';

const ollamaHost = process.env.OLLAMA_HOST;

// Conditionally initialize the 'ai' object based on the presence of OLLAMA_HOST
export const ai = ollamaHost
  ? genkit({
      plugins: [
        ollama({
          host: ollamaHost,
        }),
      ],
      model: 'ollama/llama3', // A sensible default for Ollama
    })
  : genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-2.0-flash', // Fallback to Gemini
    });

// Log which provider is being used for clarity during development
if (process.env.NODE_ENV === 'development') {
    if (ollamaHost) {
        console.log(`Ollama host detected at ${ollamaHost}. Using Ollama as the AI provider.`);
    } else {
        console.log('OLLAMA_HOST environment variable not set. Falling back to Gemini as the AI provider.');
    }
}
