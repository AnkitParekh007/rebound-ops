/**
 * Small, dependency-free country recogniser for free text such as
 * "Lisbon, Portugal (Hybrid)" or "Must have the right to work in the UK".
 * Short upper-case aliases (UK, USA, UAE) are matched case-sensitively so that
 * ordinary words like "us" are not mistaken for a country.
 */
const COUNTRIES: Record<string, string[]> = {
  'United States': ['United States', 'United States of America', 'USA', 'U.S.', 'US'],
  'United Kingdom': ['United Kingdom', 'UK', 'U.K.', 'Great Britain', 'Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
  Ireland: ['Ireland', 'Republic of Ireland'],
  Canada: ['Canada'],
  Mexico: ['Mexico'],
  Brazil: ['Brazil', 'Brasil'],
  Argentina: ['Argentina'],
  Chile: ['Chile'],
  Colombia: ['Colombia'],
  Portugal: ['Portugal'],
  Spain: ['Spain', 'España'],
  France: ['France'],
  Germany: ['Germany', 'Deutschland'],
  Netherlands: ['Netherlands', 'The Netherlands', 'Holland'],
  Belgium: ['Belgium'],
  Luxembourg: ['Luxembourg'],
  Switzerland: ['Switzerland'],
  Austria: ['Austria'],
  Italy: ['Italy'],
  Greece: ['Greece'],
  Poland: ['Poland'],
  Czechia: ['Czechia', 'Czech Republic'],
  Hungary: ['Hungary'],
  Romania: ['Romania'],
  Bulgaria: ['Bulgaria'],
  Croatia: ['Croatia'],
  Estonia: ['Estonia'],
  Latvia: ['Latvia'],
  Lithuania: ['Lithuania'],
  Denmark: ['Denmark'],
  Sweden: ['Sweden'],
  Norway: ['Norway'],
  Finland: ['Finland'],
  Iceland: ['Iceland'],
  Turkey: ['Turkey', 'Türkiye'],
  Israel: ['Israel'],
  'United Arab Emirates': ['United Arab Emirates', 'UAE', 'Dubai', 'Abu Dhabi'],
  'Saudi Arabia': ['Saudi Arabia'],
  Qatar: ['Qatar'],
  Egypt: ['Egypt'],
  Nigeria: ['Nigeria'],
  Kenya: ['Kenya'],
  'South Africa': ['South Africa'],
  India: ['India'],
  Pakistan: ['Pakistan'],
  Bangladesh: ['Bangladesh'],
  'Sri Lanka': ['Sri Lanka'],
  Singapore: ['Singapore'],
  Malaysia: ['Malaysia'],
  Indonesia: ['Indonesia'],
  Philippines: ['Philippines'],
  Vietnam: ['Vietnam', 'Viet Nam'],
  Thailand: ['Thailand'],
  China: ['China'],
  'Hong Kong': ['Hong Kong'],
  Taiwan: ['Taiwan'],
  Japan: ['Japan'],
  'South Korea': ['South Korea', 'Korea'],
  Australia: ['Australia'],
  'New Zealand': ['New Zealand'],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MATCHERS: [string, RegExp][] = Object.entries(COUNTRIES).flatMap(([country, aliases]) =>
  aliases.map((alias): [string, RegExp] => {
    const shortCode = alias.replace(/\./g, '').length <= 3 && alias === alias.toUpperCase();
    // "Northern Ireland" belongs to the United Kingdom, not Ireland.
    const guard = alias === 'Ireland' ? '(?<!northern\\s)' : '';
    return [country, new RegExp(`(?<![\\p{L}\\p{N}])${guard}${escape(alias)}(?![\\p{L}\\p{N}])`, shortCode ? 'u' : 'iu')];
  }),
);

/** Canonical country names mentioned in `text`, in first-seen order. */
export function detectCountries(text: string): string[] {
  const found: { country: string; at: number }[] = [];
  for (const [country, re] of MATCHERS) {
    const m = re.exec(text);
    if (m && !found.some((f) => f.country === country)) found.push({ country, at: m.index });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.country);
}

/** Canonicalises a person's own list (unknown entries are kept as typed). */
export function canonicalCountries(entries: readonly string[]): string[] {
  const out = new Set<string>();
  for (const e of entries) {
    const hits = detectCountries(e);
    if (hits.length) hits.forEach((h) => out.add(h));
    else if (e.trim()) out.add(e.trim());
  }
  return [...out];
}
