/**
 * v0.2.0 assessment helpers: recognising skills in qualification lines,
 * per-skill years, seniority and published pay. Each function only reads what
 * the posting and the person actually stated.
 */
import type { Profile, RequirementMatch, SeniorityLevel } from '@reboundops/contracts';
import { requirementLines } from './requirements.ts';

/**
 * A small, general vocabulary used only to *recognise* skills a posting asks
 * for that are not in the profile. It never adds anything to the profile.
 */
export const SKILL_VOCABULARY: readonly string[] = [
  // languages
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Kotlin', 'Swift', 'Objective-C', 'Go', 'Golang', 'Rust', 'C', 'C++', 'C#', 'Ruby', 'PHP', 'Scala', 'Elixir', 'Erlang', 'Haskell', 'Clojure', 'R', 'MATLAB', 'Julia', 'Perl', 'Dart', 'Lua', 'SQL', 'Bash', 'PowerShell',
  // web & mobile
  'React', 'Angular', 'Vue', 'Svelte', 'Next.js', 'Node.js', 'Deno', 'Express', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Rails', 'Spring', 'Spring Boot', '.NET', 'ASP.NET', 'Laravel', 'GraphQL', 'REST', 'gRPC', 'HTML', 'CSS', 'Sass', 'Tailwind', 'React Native', 'Flutter', 'iOS', 'Android', 'SwiftUI', 'Jetpack Compose',
  // data & ML
  'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch', 'OpenSearch', 'Snowflake', 'BigQuery', 'Redshift', 'Databricks', 'Spark', 'Hadoop', 'Kafka', 'RabbitMQ', 'Airflow', 'dbt', 'Pandas', 'NumPy', 'scikit-learn', 'TensorFlow', 'PyTorch', 'JAX', 'Keras', 'LLM', 'NLP', 'Computer Vision', 'Machine Learning', 'Deep Learning', 'Tableau', 'Power BI', 'Looker', 'Excel', 'Statistics',
  // cloud & infra
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Kubernetes', 'Docker', 'Terraform', 'Pulumi', 'Ansible', 'Chef', 'Puppet', 'Helm', 'Linux', 'Nginx', 'Prometheus', 'Grafana', 'Datadog', 'OpenTelemetry', 'CI/CD', 'GitHub Actions', 'Jenkins', 'GitLab CI', 'Serverless', 'Lambda',
  // practice
  'Git', 'Agile', 'Scrum', 'Kanban', 'TDD', 'Microservices', 'Distributed Systems', 'System Design', 'Security', 'OAuth', 'Accessibility', 'WCAG', 'SRE', 'DevOps', 'Observability',
  // design & product
  'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign', 'User Research', 'Prototyping', 'Design Systems', 'Product Management', 'Roadmapping', 'A/B Testing', 'Jira', 'Confluence',
  // business
  'Salesforce', 'HubSpot', 'SAP', 'Oracle', 'Workday', 'Financial Modelling', 'Financial Modeling', 'Accounting', 'Budgeting', 'Forecasting', 'Project Management', 'Stakeholder Management', 'Negotiation', 'Customer Success', 'Copywriting', 'SEO', 'SEM', 'Google Analytics',
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function termRegex(term: string): RegExp {
  const t = term.trim();
  // Short tokens like "Go", "R", "C" are matched case-sensitively to avoid ordinary words.
  const flags = t.length <= 3 ? 'u' : 'iu';
  return new RegExp(`(?<![\\p{L}\\p{N}+#.])${escape(t)}(?![\\p{L}\\p{N}+#])`, flags);
}

const fold = (s: string) => s.trim().toLowerCase();

/** Skills found in `text`, from the profile first, then the vocabulary. */
function skillsIn(text: string, profileSkills: readonly string[]): { matched: string[]; missing: string[] } {
  const have = new Set(profileSkills.map(fold));
  const matched = profileSkills.filter((s) => termRegex(s).test(text));
  const missing = SKILL_VOCABULARY.filter((s) => !have.has(fold(s)) && termRegex(s).test(text))
    // "Go" alone in prose is too ambiguous unless written as a skill (e.g. "Go or Rust").
    .filter((s, _i, all) => !(s === 'Golang' && all.includes('Go')))
    .filter((s) => !matched.some((m) => fold(m) === fold(s)));
  return { matched: [...new Set(matched)], missing: [...new Set(missing)] };
}

const YEARS_FOR = /(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?)['’]?\s+(?:of\s+)?(?:(?:professional|commercial|hands-on|relevant|production)\s+)?(?:experience\s+)?(?:with|in|using|of|building|writing|developing)?\s*/i;

/** Matches qualification lines against the profile. Years are compared only with years the person entered. */
export function matchRequirements(description: string, profile: Profile): RequirementMatch[] {
  const statedYears = new Map(profile.skillExperience.map((s) => [fold(s.skill), s.years]));
  return requirementLines(description, 40).map((r) => {
    const { matched, missing } = skillsIn(r.text, profile.skills);
    let years: RequirementMatch['years'] = null;
    const m = YEARS_FOR.exec(r.text);
    if (m?.[1]) {
      const required = Number(m[1]);
      const after = r.text.slice((m.index ?? 0) + m[0].length);
      // The skill the years apply to: the first recognised skill right after the phrase, if any.
      const skill = [...matched, ...missing].map((s) => ({ s, at: after.search(termRegex(s)) })).filter((x) => x.at >= 0 && x.at < 40).sort((a, b) => a.at - b.at)[0]?.s ?? null;
      const stated = skill ? statedYears.get(fold(skill)) ?? null : null;
      years = { skill, required, stated, status: stated === null ? 'unknown' : stated >= required ? 'met' : 'short' };
    }
    return { text: r.text, kind: r.kind, basis: r.basis, matchedSkills: matched, missingSkills: missing, years };
  });
}

/* ---------------- seniority ---------------- */

export const SENIORITY_ORDER: readonly SeniorityLevel[] = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'manager', 'director', 'executive'];

const SENIORITY_PATTERNS: [RegExp, SeniorityLevel[]][] = [
  [/\b(chief|cto|ceo|cfo|coo|cpo|vp|vice president)\b/i, ['executive']],
  [/\bdirector\b/i, ['director']],
  [/\b(head of|engineering manager|manager)\b/i, ['manager']],
  [/\b(principal|distinguished)\b/i, ['principal']],
  [/\bstaff\b/i, ['staff']],
  [/\b(lead|tech lead)\b/i, ['senior', 'staff']],
  [/\b(senior|sr\.?)\b/i, ['senior']],
  [/\b(mid[- ]level|intermediate)\b/i, ['mid']],
  [/\b(junior|jr\.?|entry[- ]level|graduate|new grad)\b/i, ['junior']],
  [/\b(intern|internship|trainee|apprentice)\b/i, ['intern']],
];

/** Levels the title explicitly names, or null when the title states none (nothing is assumed). */
export function titleSeniority(title: string): { levels: SeniorityLevel[]; word: string } | null {
  for (const [re, levels] of SENIORITY_PATTERNS) {
    const m = re.exec(title);
    if (m) return { levels, word: m[0] };
  }
  return null;
}

export function seniorityDistance(a: readonly SeniorityLevel[], b: readonly SeniorityLevel[]): number {
  let best = Infinity;
  for (const x of a) for (const y of b) best = Math.min(best, Math.abs(SENIORITY_ORDER.indexOf(x) - SENIORITY_ORDER.indexOf(y)));
  return best;
}

/* ---------------- published pay ---------------- */

const CURRENCY_SYMBOL: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR', 'C$': 'CAD', 'A$': 'AUD', 'CHF': 'CHF' };

export interface ParsedPay {
  min: number;
  max: number;
  currency: string | null;
  period: 'year' | 'month' | 'hour' | null;
}

/** Reads a pay range from published pay text. Returns null when it cannot be read unambiguously. */
export function parsePay(text: string | null): ParsedPay | null {
  if (!text) return null;
  const t = text.replace(/,(?=\d{3}\b)/g, '').replace(/\u00a0/g, ' ');
  const nums = [...t.matchAll(/(\d+(?:\.\d+)?)\s*([kKmM])?(?![\d%])/g)]
    .map((m) => Number(m[1]) * (m[2] ? (m[2].toLowerCase() === 'k' ? 1000 : 1_000_000) : 1))
    .filter((n) => n >= 5); // drop stray small numbers such as "1 YEAR"
  if (!nums.length || nums.length > 4) return null;
  const code = /\b(USD|EUR|GBP|CAD|AUD|CHF|SEK|NOK|DKK|PLN|INR|JPY|SGD|NZD|BRL|MXN|ZAR)\b/.exec(t)?.[1];
  const symbol = /C\$|A\$|[$€£¥₹]/.exec(t)?.[0];
  const currency = code ?? (symbol ? CURRENCY_SYMBOL[symbol] ?? null : null);
  const period = /\b(per hour|hourly|\/\s?h(?:ou)?r|an hour)\b/i.test(t)
    ? 'hour'
    : /\b(per month|monthly|\/\s?mo(?:nth)?|a month)\b/i.test(t)
      ? 'month'
      : /\b(per year|annual(?:ly)?|yearly|\/\s?y(?:ea)?r|a year|p\.?a\.?|1 year|salary)\b/i.test(t)
        ? 'year'
        : null;
  return { min: Math.min(...nums.slice(0, 2)), max: Math.max(...nums.slice(0, 2)), currency, period };
}
