import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] as const;

type Finding = {
  rule: string;
  impact: string;
  target: string;
};

type BaselineFile = {
  description?: string;
  /** Allowed moderate/minor findings keyed as rule|target */
  allowed: string[];
};

const baselinePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'a11y-baseline.json');

function loadBaseline(): Set<string> {
  const raw = JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineFile;
  return new Set(raw.allowed ?? []);
}

function fingerprint(finding: Finding): string {
  return `${finding.rule}|${finding.target}`;
}

function findingsFrom(result: Awaited<ReturnType<AxeBuilder['analyze']>>, impacts: string[]): Finding[] {
  return result.violations
    .filter(v => impacts.includes(v.impact ?? ''))
    .flatMap(v => v.nodes.map(node => ({
      rule: v.id,
      impact: v.impact ?? 'unknown',
      target: node.target.join(' ')
    })));
}

export async function analyzePage(page: Page) {
  return new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
}

/** Fail on serious/critical. Fail on new moderate/minor not listed in a11y-baseline.json. */
export async function expectAxeClean(page: Page, label: string) {
  const result = await analyzePage(page);
  const blocking = findingsFrom(result, ['critical', 'serious']);
  expect(blocking, `${label}: serious/critical axe findings`).toEqual([]);

  const allowed = loadBaseline();
  const residual = findingsFrom(result, ['moderate', 'minor'])
    .filter(finding => !allowed.has(fingerprint(finding)))
    .sort((a, b) => fingerprint(a).localeCompare(fingerprint(b)));

  expect(
    residual,
    `${label}: new moderate/minor axe findings (add to e2e/a11y-baseline.json only after triage)`
  ).toEqual([]);
}
