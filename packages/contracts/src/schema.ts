import { z } from 'zod';

export const EvidenceSourceSchema = z.strictObject({
  kind: z.enum(['manual', 'resume', 'project_note']),
  label: z.string().trim().min(1).max(160),
  excerpt: z.string().trim().max(700).optional()
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

export const SessionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  intake: IntakeSchema,
  routes: z.array(RouteSchema).length(3),
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
