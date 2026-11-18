import { JobSourceId, type JobSourceInfo } from '@reboundops/contracts';
import { ADAPTERS, type JobSourceAdapter } from './adapters.ts';
import { SourceError } from './http.ts';

export * from './http.ts';
export * from './html.ts';
export * from './adapters.ts';

export function listSources(): JobSourceInfo[] {
  return JobSourceId.options.map((id) => ADAPTERS[id].info);
}

/**
 * Works out which provider and board the person means: a careers-page URL on
 * a supported provider, or a bare identifier with an explicit source.
 */
export function resolveBoard(input: string, source?: JobSourceId): { adapter: JobSourceAdapter; board: string } {
  const raw = input.trim();
  if (/^https?:\/\//i.test(raw)) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new SourceError('invalid_board', 'That URL could not be read.');
    }
    for (const id of JobSourceId.options) {
      const board = ADAPTERS[id].boardFromUrl(u);
      if (board) {
        if (source && source !== id) throw new SourceError('invalid_board', `That URL is a ${ADAPTERS[id].info.label} page, not ${ADAPTERS[source].info.label}.`);
        if (!ADAPTERS[id].info.supported) throw new SourceError('unsupported', ADAPTERS[id].info.limitations.join(' '));
        return { adapter: ADAPTERS[id], board };
      }
    }
    throw new SourceError('unsupported', 'That page is not on a supported job board (Greenhouse, Lever, Ashby or Workable). Paste the posting into “Add a job” instead.');
  }
  if (!source) throw new SourceError('invalid_board', 'Choose the job board provider, or paste the company’s careers-page URL.');
  const adapter = ADAPTERS[source];
  if (!adapter.info.supported) throw new SourceError('unsupported', adapter.info.limitations.join(' '));
  return { adapter, board: raw };
}
