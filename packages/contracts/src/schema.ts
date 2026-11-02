import { z } from 'zod';

export const SourceSpanSchema = z.strictObject({
  documentId: z.uuid(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive()
});

export const SourceDocumentSchema = z.strictObject({
  id: z.uuid(),
  kind: z.enum(['resume', 'project_note']),
  label: z.string().trim().min(1).max(160),
  body: z.string().min(1).max(10000)
});

export const EvidenceSourceSchema = z.strictObject({
  kind: z.enum(['manual', 'resume', 'project_note']),
  label: z.string().trim().min(1).max(160),
  excerpt: z.string().max(700).optional(),
  span: SourceSpanSchema.optional()
});

export const EvidenceSchema = z.strictObject({
  id: z.uuid(),
  claim: z.string().trim().min(1).max(500),
  source: EvidenceSourceSchema,
  status: z.enum(['unverified', 'confirmed', 'rejected']).default('unverified')
});

export const IntakeSchema = z.strictObject({
  role: z.string().trim().min(1).max(120),
  location: z.string().trim().max(160),
  weeklyHours: z.number().int().min(1).max(20),
  urgency: z.enum(['soon', 'quarter', 'flexible']),
  priorities: z.string().trim().max(1200),
  shiftTarget: z.string().trim().max(140),
  bridgeTarget: z.string().trim().max(140),
  evidence: z.array(EvidenceSchema).max(15)
});

export const RouteIdSchema = z.enum(['return', 'shift', 'bridge']);
export const RouteSchema = z.strictObject({
  id: RouteIdSchema,
  label: z.string().min(1),
  target: z.string(),
  candidateEvidenceIds: z.array(z.uuid()),
  missingProof: z.array(z.string()),
  uncertainty: z.string(),
  nextTest: z.string()
});

export const ActionSchema = z.strictObject({
  id: z.string().min(1),
  day: z.number().int().min(1).max(7),
  title: z.string().min(1),
  minutes: z.number().int().positive(),
  completed: z.boolean()
});

export const PlanSchema = z.strictObject({
  routeId: RouteIdSchema,
  budgetMinutes: z.number().int().positive(),
  plannedMinutes: z.number().int().nonnegative(),
  actions: z.array(ActionSchema).max(7)
});

export const JobRequirementSchema = z.strictObject({
  id: z.uuid(),
  text: z.string().trim().min(1).max(500),
  status: z.enum(['unreviewed', 'supported', 'gap']),
  evidenceIds: z.array(z.uuid()).max(15)
});

export const JobTargetSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().trim().min(1).max(140),
  sourceUrl: z.string().trim().max(600).refine(
    value => !value || /^https:\/\/[^\s]+$/i.test(value),
    'Source URL must use HTTPS'
  ),
  requirements: z.array(JobRequirementSchema).min(1).max(12)
});

export const AddJobTargetSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
  title: JobTargetSchema.shape.title,
  sourceUrl: JobTargetSchema.shape.sourceUrl,
  requirements: z.array(JobRequirementSchema.shape.text).min(1).max(12)
});

export const ReviewRequirementSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
  status: JobRequirementSchema.shape.status,
  evidenceIds: z.array(z.uuid()).max(15)
});

export const DeleteTargetSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative()
});

export const CorrectionSchema = z.strictObject({
  evidenceId: z.uuid(),
  previousClaim: z.string().max(500),
  revisedClaim: z.string().max(500),
  previousSource: EvidenceSourceSchema,
  revisedSource: EvidenceSourceSchema,
  reason: z.string().trim().min(3).max(300),
  changedAt: z.iso.datetime()
});

export const AddSourceDocumentSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
  kind: SourceDocumentSchema.shape.kind,
  label: SourceDocumentSchema.shape.label,
  body: SourceDocumentSchema.shape.body
});

export const CorrectEvidenceSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
  claim: EvidenceSchema.shape.claim,
  reason: CorrectionSchema.shape.reason,
  source: z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('manual'), label: EvidenceSourceSchema.shape.label }),
    z.strictObject({ mode: z.literal('document'), documentId: z.uuid(), excerpt: z.string().min(1).max(700) })
  ])
});

export const SessionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  intake: IntakeSchema,
  routes: z.array(RouteSchema).length(3),
  jobTargets: z.array(JobTargetSchema).max(3),
  sourceDocuments: z.array(SourceDocumentSchema).max(3).default([]),
  corrections: z.array(CorrectionSchema).max(50).default([]),
  plan: PlanSchema.nullable(),
  reviewNotes: z.string().max(2000)
});

export const CreateSessionSchema = z.strictObject({ intake: IntakeSchema });
export const ReplaceIntakeSchema = z.strictObject({ expectedRevision: z.number().int().nonnegative(), intake: IntakeSchema });
export const SelectRouteSchema = z.strictObject({ expectedRevision: z.number().int().nonnegative(), routeId: RouteIdSchema });
export const EvidenceDecisionSchema = z.strictObject({ expectedRevision: z.number().int().nonnegative(), status: EvidenceSchema.shape.status });
export const ActionDecisionSchema = z.strictObject({ expectedRevision: z.number().int().nonnegative(), completed: z.boolean() });
export const ReviewSchema = z.strictObject({ expectedRevision: z.number().int().nonnegative(), notes: z.string().trim().max(2000) });

export type Evidence = z.infer<typeof EvidenceSchema>;
export type Intake = z.infer<typeof IntakeSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteId = z.infer<typeof RouteIdSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type Correction = z.infer<typeof CorrectionSchema>;
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type EvidenceCorrectionInput = z.infer<typeof CorrectEvidenceSchema>;
export type JobTarget = z.infer<typeof JobTargetSchema>;
export type JobRequirement = z.infer<typeof JobRequirementSchema>;
export type RequirementStatus = JobRequirement['status'];

export const RestoreSessionSchema = z.strictObject({ session: SessionSchema });

/** An explicit, minimal subset of session data that can be approved for provider transfer. */
export const AiPayloadSchema = z.strictObject({
  target: z.strictObject({
    id: z.uuid(),
    title: z.string(),
    requirements: z.array(z.strictObject({ id: z.uuid(), text: z.string() })).min(1).max(12)
  }),
  evidence: z.array(z.strictObject({ id: z.uuid(), claim: z.string() })).max(15)
});

export const AiFindingSchema = z.strictObject({
  requirementId: z.uuid(),
  assessment: z.enum(['possible_support', 'gap', 'uncertain']),
  evidenceIds: z.array(z.uuid()).max(3),
  explanation: z.string().trim().min(1).max(600),
  nextTest: z.string().trim().min(1).max(350)
});

export const AiAnalysisSchema = z.strictObject({
  findings: z.array(AiFindingSchema).min(1).max(12),
  caution: z.string().trim().min(1).max(400)
});

export const AiPreviewRequestSchema = z.strictObject({ targetId: z.uuid() });
export const AiAnalyzeRequestSchema = z.strictObject({
  targetId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  previewHash: z.string().regex(/^[a-f0-9]{64}$/),
  consent: z.literal(true)
});

export type AiPayload = z.infer<typeof AiPayloadSchema>;
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;
