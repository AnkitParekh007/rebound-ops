import { AiAnalysisSchema, type AiPayload, type AiAnalysis, type Session } from './schema.js';

export function createAiPayload(session: Session, targetId: string): AiPayload {
  const target = session.jobTargets.find(item => item.id === targetId);
  if (!target) throw new Error('Job target not found.');
  // Deliberately omit location, income urgency, priorities, unconfirmed claims and notes.
  return {
    target: {
      id: target.id,
      title: target.title,
      requirements: target.requirements.map(item => ({ id: item.id, text: item.text }))
    },
    evidence: session.intake.evidence
      .filter(item => item.status === 'confirmed')
      .map(item => ({ id: item.id, claim: item.claim }))
  };
}

/** The model may invent or omit IDs. Never trust valid JSON as domain truth. */
export function validateAiAnalysis(payload: AiPayload, candidate: unknown): AiAnalysis {
  const analysis = AiAnalysisSchema.parse(candidate);
  const expected = new Set(payload.target.requirements.map(r => r.id));
  const seen = new Set<string>();
  const knownEvidence = new Set(payload.evidence.map(item => item.id));
  if (analysis.findings.length !== expected.size) throw new Error('Model omitted or duplicated requirements.');
  for (const item of analysis.findings) {
    if (!expected.has(item.requirementId) || seen.has(item.requirementId)) {
      throw new Error('AI output referenced an unknown or duplicate requirement.');
    }
    seen.add(item.requirementId);
    if (item.evidenceIds.some(id => !knownEvidence.has(id))) {
      throw new Error('AI output referenced unsupported evidence.');
    }
    if (item.assessment === 'possible_support' && item.evidenceIds.length === 0) {
      throw new Error('Possible support requires a linked participant-confirmed claim.');
    }
    if (item.assessment !== 'possible_support' && item.evidenceIds.length > 0) {
      throw new Error('Gaps and uncertainties cannot claim supporting evidence.');
    }
  }
  return analysis;
}
