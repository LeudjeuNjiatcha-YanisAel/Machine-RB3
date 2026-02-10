// Charger les variables d'environnement
import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

async function main() {
  if (!process.env.GEMINI_API) {
    throw new Error("La clé GEMINI_API n'est pas définie dans .env !");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API,
  });

  const tools = [
    {
      googleSearch: {}
    },
  ];

  const config = {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.HIGH,
    },
    tools,
  };

  const model = 'gemini-3-flash-preview';
  const contents = [
    {
      role: 'user',
      parts: [
        { text: `Qui est Bill Gates` },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  for await (const chunk of response) {
    console.log(chunk.text);
  }
}

main();

