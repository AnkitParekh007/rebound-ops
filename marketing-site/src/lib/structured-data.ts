/** schema.org JSON-LD. No ratings, reviews or counts: none exist. */
import { CURRENT, REPO_URL, assetUrl } from '../data/product';
import { absolute } from './site';

export function softwareApplication(site: URL | undefined): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ReboundOps',
    description: 'A local-first, privacy-oriented job-search workspace: capture postings with evidence, assess fit, tailor documents from verified facts, and track follow-ups on your own computer.',
    url: absolute('/', site),
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Job search',
    operatingSystem: 'macOS, Linux (requires Node.js 24 or newer)',
    softwareVersion: CURRENT.version,
    datePublished: CURRENT.date,
    releaseNotes: CURRENT.releaseUrl,
    downloadUrl: assetUrl(`reboundops-${CURRENT.version}.tar.gz`),
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    sameAs: [REPO_URL],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

export function organizationLd(site: URL | undefined): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'ReboundOps source code',
    codeRepository: REPO_URL,
    programmingLanguage: ['TypeScript'],
    license: 'https://opensource.org/licenses/MIT',
    url: absolute('/', site),
  };
}

export function faqLd(items: { q: string; a: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function breadcrumbLd(site: URL | undefined, trail: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: absolute(t.path, site) })),
  };
}
