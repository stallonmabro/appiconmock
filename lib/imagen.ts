import { GoogleGenAI, PersonGeneration, SafetyFilterLevel } from "@google/genai";
import crypto from "crypto";

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
});

export async function generateIconImages(
  prompt: string,
  count: number = 4
): Promise<string[]> {
  const fullPrompt = `${prompt}, app icon design, clean, minimal, no text, no watermark, square format, suitable for iOS and Android, professional quality`;

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt: fullPrompt,
    config: {
      numberOfImages: count,
      aspectRatio: "1:1",
      safetyFilterLevel: SafetyFilterLevel.BLOCK_ONLY_HIGH,
      personGeneration: PersonGeneration.ALLOW_ALL,
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("No images generated. Try a different prompt.");
  }

  return response.generatedImages.map((img) => {
    // imageBytes is already a base64-encoded string per the SDK types
    const bytes = img.image?.imageBytes || "";
    return `data:image/png;base64,${bytes}`;
  });
}

export function hashPrompt(prompt: string): string {
  return crypto
    .createHash("sha256")
    .update(prompt.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}
