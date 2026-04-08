import { z } from 'zod';

/* ─────────────── Severity ─────────────── */
export const severityValues = ['LOW', 'MED', 'HIGH', 'CRITICAL'] as const;
export const SeveritySchema = z.enum(severityValues);
export type Severity = z.infer<typeof SeveritySchema>;

/* ─────────────── Watchlist ─────────────── */
export const CreateWatchlistSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  terms: z
    .array(z.string().trim().min(1).max(120))
    .min(1, 'at least one term is required')
    .max(50),
});
export type CreateWatchlistInput = z.infer<typeof CreateWatchlistSchema>;

export const WatchlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  terms: z.array(z.string()),
  createdAt: z.string(), // ISO
});
export type Watchlist = z.infer<typeof WatchlistSchema>;

/* ─────────────── Event ─────────────── */
export const EventSchema = z.object({
  id: z.string(),
  watchlistId: z.string(),
  rawPayload: z.record(z.string(), z.unknown()),
  summary: z.string().nullable(),
  severity: SeveritySchema.nullable(),
  suggestedAction: z.string().nullable(),
  aiProvider: z.string().nullable(),
  aiLatencyMs: z.number().int().nullable(),
  createdAt: z.string(), // ISO
});
export type SignalEvent = z.infer<typeof EventSchema>;

/* ─────────────── AI enrichment contract ─────────────── */
export const AiEnrichmentSchema = z.object({
  summary: z.string().min(1).max(500),
  severity: SeveritySchema,
  suggestedAction: z.string().min(1).max(500),
});
export type AiEnrichment = z.infer<typeof AiEnrichmentSchema>;

/* ─────────────── API error envelope ─────────────── */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    correlationId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
