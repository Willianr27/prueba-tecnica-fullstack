import type { AiEnrichment, Severity } from '@signal-watcher/shared';
import type { AIProvider, EnrichInput } from '../provider.interface.js';

const RULES: Array<{ keywords: string[]; severity: Severity; action: string }> = [
  {
    keywords: ['ransomware', 'malware', 'breach', 'leak', 'exfiltration'],
    severity: 'CRITICAL',
    action: 'Escalar al equipo de respuesta a incidentes inmediatamente y aislar los activos afectados.',
  },
  {
    keywords: ['phishing', 'credential', 'spoof', 'impersonation', 'typosquat'],
    severity: 'HIGH',
    action: 'Notificar al equipo de seguridad y solicitar la baja del dominio infractor.',
  },
  {
    keywords: ['suspicious', 'anomaly', 'unusual', 'spike'],
    severity: 'MED',
    action: 'Abrir un ticket para triage y continuar monitoreando por señales adicionales.',
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
      match?.action ?? 'Sin acción inmediata requerida; conservar el evento para análisis de tendencias.';

    const eventTypeRaw = input.rawPayload.type;
    const eventType = typeof eventTypeRaw === 'string' ? eventTypeRaw : 'event';
    const summary = `Nuevo evento ${eventType} detectado para la lista "${input.watchlistName}" — severidad ${severity}.`;

    return { summary, severity, suggestedAction: action };
  }
}
