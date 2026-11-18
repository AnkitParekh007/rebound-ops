/**
 * Splits a job description into required and preferred qualification lines,
 * using the posting's own headings and wording. Every line returned is
 * verbatim text from the description (its own evidence); nothing is inferred.
 */

export interface RequirementLine {
  text: string;
  kind: 'required' | 'preferred';
  /** The heading or phrase that decided the kind, for explanations. */
  basis: string;
}

const REQUIRED_HEADING =
  /^(?:[#*\s]*)(requirements?|(?:minimum|basic|required|key)\s+qualifications|qualifications|what you(?:'|’)?ll need|what you need|what you bring|what we(?:'|’)?re looking for|who you are|about you|you have|you will have|must[- ]haves?|skills(?: and experience)?|experience(?: and skills)?|your profile|your background)\b[^\n]{0,40}$/i;
const PREFERRED_HEADING =
  /^(?:[#*\s]*)(preferred(?:\s+qualifications)?|nice[- ]to[- ]haves?|bonus(?: points)?|it(?:'|’)?s a plus if|pluses|desired(?:\s+(?:skills|qualifications))?|good to have|ideally(?: you)?|even better if|extra credit)\b[^\n]{0,40}$/i;
const OTHER_HEADING =
  /^(?:[#*\s]*)(about (?:us|the (?:role|team|company))|what you(?:'|’)?ll do|responsibilities|the role|benefits|perks|what we offer|why join|our values|compensation|salary|how to apply|equal opportunity|location|where you(?:'|’)?ll be|the team|day to day|your impact|in this role)\b[^\n]{0,40}$/i;

const INLINE_PREFERRED = /\b(preferred|nice to have|is a plus|a plus\b|bonus|desirable|ideally|not required|advantageous)\b/i;
const BULLET = /^\s*(?:[-*•·▪◦‣–—]|\d{1,2}[.)])\s+/;

function isHeading(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && t.length <= 80 && !BULLET.test(t) && (/:\s*$/.test(t) || !/[.!?]$/.test(t)) && (REQUIRED_HEADING.test(t) || PREFERRED_HEADING.test(t) || OTHER_HEADING.test(t));
}

/** Required/preferred qualification lines in reading order, each verbatim from the description. */
export function requirementLines(description: string, max = 40): RequirementLine[] {
  const out: RequirementLine[] = [];
  let section: { kind: 'required' | 'preferred'; basis: string; sawBullet: boolean } | null = null;
  for (const raw of description.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (isHeading(line)) {
      const head = line.replace(/[:#*]+/g, '').trim();
      section = PREFERRED_HEADING.test(line) ? { kind: 'preferred', basis: head, sawBullet: false } : REQUIRED_HEADING.test(line) ? { kind: 'required', basis: head, sawBullet: false } : null;
      continue;
    }
    if (!section) continue;
    const bullet = BULLET.test(line);
    // Prose after a bullet list has ended the list (e.g. a closing sentence about the company).
    if (!bullet && section.sawBullet) {
      section = null;
      continue;
    }
    if (bullet) section.sawBullet = true;
    const text = line.replace(BULLET, '').trim();
    if (text.length < 2 || text.length > 400) continue;
    const inline = INLINE_PREFERRED.exec(text);
    if (section.kind === 'required' && inline) out.push({ text, kind: 'preferred', basis: `says “${inline[1]}”` });
    else out.push({ text, kind: section.kind, basis: `under “${section.basis}”` });
    if (out.length >= max) break;
  }
  return out;
}
