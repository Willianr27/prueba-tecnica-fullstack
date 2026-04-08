import { GoogleGenAI, Type } from '@google/genai';
import { AiEnrichmentSchema, type AiEnrichment } from '@signal-watcher/shared';
import { AppError } from '../../../core/errors.js';
import type { AIProvider, EnrichInput } from '../provider.interface.js';

const SYSTEM_INSTRUCTION = `You are a security analyst assistant. Given a security event payload
matched against a watchlist, you must produce a concise enrichment.

Rules:
- "summary" must be one short sentence (max 280 chars), in English, plain language.
- "severity" must be one of: LOW, MED, HIGH, CRITICAL.
  - CRITICAL: confirmed breach, ransomware, data exfiltration.
  - HIGH: credible threat such as phishing kit, credential leak, active exploitation.
  - MED: suspicious anomaly worth investigating.
  - LOW: informational, low-confidence noise.
- "suggestedAction" must be one short imperative sentence aimed at the analyst.
Return JSON only.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    severity: { type: Type.STRING, enum: ['LOW', 'MED', 'HIGH', 'CRITICAL'] },
    suggestedAction: { type: Type.STRING },
  },
  required: ['summary', 'severity', 'suggestedAction'],
};

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async enrichEvent(input: EnrichInput): Promise<AiEnrichment> {
    const userPrompt = JSON.stringify(
      {
        watchlist: { name: input.watchlistName, terms: input.terms },
        event: input.rawPayload,
      },
      null,
      2,
    );

    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new AppError('AI_PROVIDER_ERROR', 'Gemini call timed out', 504)),
        15_000,
      );
    });

    try {
      const response = await Promise.race([
        this.client.models.generateContent({
          model: this.model,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.2,
          },
        }),
        timeoutPromise,
      ]);

      const text = response.text;
      if (!text) {
        throw new AppError('AI_PROVIDER_ERROR', 'Gemini returned an empty response', 502);
      }

      const parsed = AiEnrichmentSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        throw new AppError(
          'AI_PROVIDER_ERROR',
          'Gemini response did not match expected schema',
          502,
          parsed.error.issues,
        );
      }
      return parsed.data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        'AI_PROVIDER_ERROR',
        err instanceof Error ? err.message : 'Unknown Gemini error',
        502,
      );
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
}
