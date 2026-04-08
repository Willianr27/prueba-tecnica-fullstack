import { randomUUID } from 'node:crypto';

const EVENT_TEMPLATES: Array<{ type: string; description: (term: string) => string }> = [
  {
    type: 'new_suspicious_domain',
    description: (term) => `Newly registered domain similar to "${term}" detected`,
  },
  {
    type: 'credential_leak',
    description: (term) => `Possible credential leak referencing "${term}" found in paste site`,
  },
  {
    type: 'phishing_kit',
    description: (term) => `Phishing kit impersonating "${term}" hosted on suspicious infra`,
  },
  {
    type: 'malware_mention',
    description: (term) => `Malware sample referencing "${term}" observed in sandbox`,
  },
  {
    type: 'social_chatter',
    description: (term) => `Unusual spike of mentions of "${term}" on dark-web forums`,
  },
  {
    type: 'ransomware_listing',
    description: (term) =>
      `Possible ransomware leak site listing referencing "${term}" — exfiltration suspected`,
  },
];

export interface SimulatedEventPayload {
  type: string;
  description: string;
  source: string;
  matchedTerm: string;
  detectedAt: string;
  refId: string;
}

function pick<T>(arr: readonly T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx]!;
}

const SOURCES = ['threat-intel-feed', 'darkweb-monitor', 'paste-watcher', 'dns-sensor'];

export function generateEvent(terms: string[]): SimulatedEventPayload {
  const term = terms.length > 0 ? pick(terms) : 'unknown';
  const tpl = pick(EVENT_TEMPLATES);
  return {
    type: tpl.type,
    description: tpl.description(term),
    source: pick(SOURCES),
    matchedTerm: term,
    detectedAt: new Date().toISOString(),
    refId: randomUUID(),
  };
}
