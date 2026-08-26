import { GoogleGenAI, Type, createPartFromBase64, createUserContent } from "@google/genai";
import type { Part } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export const FLASH_MODEL = "gemini-3.6-flash";
export const EMBEDDING_MODEL = "gemini-embedding-001";

export function imagePart(dataUrl: string): Part {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const [, mimeType, data] = match;
  return createPartFromBase64(data, mimeType);
}

export { createUserContent, Type };

export async function generateJson<T>(params: {
  contents: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"];
  schema: Record<string, unknown>;
  systemInstruction?: string;
  model?: string;
}): Promise<T> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: params.model ?? FLASH_MODEL,
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: params.schema,
      temperature: 0.1,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text) as T;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
  });
  return (response.embeddings ?? []).map((e) => e.values ?? []);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
