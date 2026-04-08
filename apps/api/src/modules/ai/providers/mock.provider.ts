import type { AiEnrichment, Severity } from '@signal-watcher/shared';
import type { AIProvider, EnrichInput } from '../provider.interface.js';

const RULES: Array<{ keywords: string[]; severity: Severity; action: string }> = [
  {
    keywords: ['ransomware', 'malware', 'breach', 'leak', 'exfiltration'],
    severity: 'CRITICAL',
    action: 'Escalate to incident response team immediately and isolate affected assets.',
  },
  {
    keywords: ['phishing', 'credential', 'spoof', 'impersonation', 'typosquat'],
    severity: 'HIGH',
    action: 'Notify the security team and request takedown of the offending domain.',
  },
  {
    keywords: ['suspicious', 'anomaly', 'unusual', 'spike'],
    severity: 'MED',
    action: 'Open a ticket for triage and continue monitoring for additional signals.',
  },
];

function flatten(payload: Record<string, unknown>): string {
  return JSON.stringify(payload).toLowerCase();
}

export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async enrichEvent(input: EnrichInput): Promise<AiEnrichment> {
    const haystack = `${input.watchlistName} ${input.terms.join(' ')} ${flatten(
      input.rawPayload,
    )}`.toLowerCase();

    const match = RULES.find((rule) => rule.keywords.some((kw) => haystack.includes(kw)));

    const severity: Severity = match?.severity ?? 'LOW';
    const action =
      match?.action ?? 'No immediate action required; keep the event for trend analysis.';

    const eventTypeRaw = input.rawPayload.type;
    const eventType = typeof eventTypeRaw === 'string' ? eventTypeRaw : 'event';
    const summary = `New ${eventType} detected for watchlist "${input.watchlistName}" — severity ${severity}.`;

    return { summary, severity, suggestedAction: action };
  }
}
