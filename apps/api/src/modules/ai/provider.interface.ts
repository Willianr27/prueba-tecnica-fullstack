import type { AiEnrichment } from '@signal-watcher/shared';

export interface EnrichInput {
  watchlistName: string;
  terms: string[];
  rawPayload: Record<string, unknown>;
}

export interface AIProvider {
  readonly name: string;
  enrichEvent(input: EnrichInput): Promise<AiEnrichment>;
}
