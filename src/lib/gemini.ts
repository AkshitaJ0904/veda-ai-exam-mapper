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

// The flagship "gemini-3.x-flash" tier carries a very low free-tier daily
// quota (20 requests/day at time of writing) — far too low for a pipeline
// that makes many calls per document. The "-lite" tier has a much higher
// free allowance and doesn't carry mandatory "thinking" overhead, so it's
// the right default for this app's call volume.
export const FLASH_MODEL = "gemini-flash-lite-latest";
export const EMBEDDING_MODEL = "gemini-embedding-001";

function extractRetryDelaySeconds(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(message);
    const details = parsed?.error?.details as { ["@type"]?: string; retryDelay?: string }[] | undefined;
    const retryInfo = details?.find((d) => d["@type"]?.includes("RetryInfo"));
    if (retryInfo?.retryDelay) {
      const seconds = parseFloat(retryInfo.retryDelay.replace("s", ""));
      if (!isNaN(seconds)) return seconds;
    }
  } catch {
    // not JSON — fall through to regex
  }
  const match = /retry in ([\d.]+)s/i.exec(message);
  return match ? parseFloat(match[1]) : null;
}

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("RESOURCE_EXHAUSTED") || message.includes('"code":429');
}

export function imagePart(dataUrl: string): Part {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const [, mimeType, data] = match;
  return createPartFromBase64(data, mimeType);
}

// Same shape as imagePart — named separately where the payload is a raw
// document (PDF) rather than a rasterized page image, for readability.
export const filePart = imagePart;

export { createUserContent, Type };

async function generateJsonOnce<T>(params: {
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
  const finishReason = response.candidates?.[0]?.finishReason;
  const text = response.text;
  if (!text) {
    throw new Error(
      `Empty response from Gemini (finishReason: ${finishReason ?? "unknown"}). The input may be too large for a single call.`,
    );
  }
  if (finishReason && finishReason !== "STOP") {
    throw new Error(`Gemini stopped early (finishReason: ${finishReason}) before finishing valid JSON.`);
  }
  return JSON.parse(text) as T;
}

const MAX_ATTEMPTS = 4;

export async function generateJson<T>(params: {
  contents: Parameters<GoogleGenAI["models"]["generateContent"]>[0]["contents"];
  schema: Record<string, unknown>;
  systemInstruction?: string;
  model?: string;
}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await generateJsonOnce<T>(params);
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_ATTEMPTS) break;
      if (isRateLimitError(err)) {
        const delaySeconds = Math.min(extractRetryDelaySeconds(err) ?? 15, 60);
        console.warn(`generateJson: rate limited, waiting ${delaySeconds}s before retry ${attempt + 1}/${MAX_ATTEMPTS}`);
        await new Promise((r) => setTimeout(r, delaySeconds * 1000));
      } else {
        console.warn(`generateJson: retry ${attempt + 1}/${MAX_ATTEMPTS} after failure: ${message}`);
      }
    }
  }
  throw lastErr;
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
