import { describe, expect, it } from 'vitest';
import { MockProvider } from '../src/modules/ai/providers/mock.provider.js';

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('classifies ransomware payloads as CRITICAL', async () => {
    const result = await provider.enrichEvent({
      watchlistName: 'Acme',
      terms: ['acme'],
      rawPayload: { type: 'ransomware_listing', description: 'ransomware leak site for acme' },
    });
    expect(result.severity).toBe('CRITICAL');
    expect(result.summary).toMatch(/ransomware_listing/);
    expect(result.summary).toMatch(/severidad/);
    expect(result.suggestedAction.length).toBeGreaterThan(0);
  });

  it('classifies phishing payloads as HIGH', async () => {
    const result = await provider.enrichEvent({
      watchlistName: 'Acme',
      terms: ['acme'],
      rawPayload: { type: 'phishing_kit', description: 'phishing kit impersonating acme' },
    });
    expect(result.severity).toBe('HIGH');
  });

  it('falls back to LOW when no keywords match', async () => {
    const result = await provider.enrichEvent({
      watchlistName: 'Acme',
      terms: ['acme'],
      rawPayload: { type: 'social_chatter', description: 'a benign mention of acme' },
    });
    expect(result.severity).toBe('LOW');
  });

  it('produces deterministic output for the same input', async () => {
    const input = {
      watchlistName: 'Acme',
      terms: ['acme'],
      rawPayload: { type: 'phishing_kit', description: 'phishing kit acme' },
    };
    const a = await provider.enrichEvent(input);
    const b = await provider.enrichEvent(input);
    expect(a).toEqual(b);
  });
});
