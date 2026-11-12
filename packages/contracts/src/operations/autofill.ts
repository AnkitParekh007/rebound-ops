import { z } from 'zod';

/**
 * Autofill vocabulary shared by every operations feature that proposes or
 * writes an application answer (Autofill now, Auto Apply later).
 *
 * The engine's prefill path (`engine/web/src/lib/apply/answer-policy.mjs`)
 * mirrors ANSWER_SOURCES and SENSITIVE_CATEGORIES as plain JavaScript so it can
 * run without a build step; `tests/operations-parity.test.mjs` fails if the two
 * lists drift apart.
 */

/**
 * Where an answer came from, in resolution order. A later source is used only
 * when every earlier one has nothing applicable. `unresolved` means the field
 * is left for the person: a plausible invented value is never a fallback.
 */
export const ANSWER_SOURCES = ['profile_fact', 'approved_answer', 'derived', 'model_draft', 'unresolved'] as const;
export const AnswerSourceSchema = z.enum(ANSWER_SOURCES);
export type AnswerSource = z.infer<typeof AnswerSourceSchema>;

/**
 * Question categories whose answer has legal, financial or personal
 * consequences. Their value may only come from a reviewed profile fact or an
 * approved answer the person saved for that context, never from a model draft.
 */
export const SENSITIVE_CATEGORIES = [
  'work_authorization',
  'sponsorship',
  'citizenship',
  'salary',
  'demographic',
  'attestation',
  'background_check'
] as const;
export const SensitiveCategorySchema = z.enum(SENSITIVE_CATEGORIES);
export type SensitiveCategory = z.infer<typeof SensitiveCategorySchema>;

/** The only sources a sensitive answer may have: reviewed by the person, or left empty. */
export const SENSITIVE_ALLOWED_SOURCES: readonly AnswerSource[] = ['profile_fact', 'approved_answer', 'unresolved'];

/** Why a proposal was withheld or flagged for the person. */
export const ANSWER_HOLD_REASONS = [
  'sensitive_requires_reviewed_fact',
  'not_an_option',
  'exceeds_max_length',
  'consent_never_auto',
  'no_answer'
] as const;
export const AnswerHoldReasonSchema = z.enum(ANSWER_HOLD_REASONS);
export type AnswerHoldReason = z.infer<typeof AnswerHoldReasonSchema>;

export const FIELD_TYPES = ['text', 'email', 'tel', 'url', 'number', 'date', 'textarea', 'select', 'checkbox', 'radio', 'file'] as const;

export const FieldDescriptorSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(FIELD_TYPES),
  label: z.string().max(500),
  required: z.boolean(),
  options: z.array(z.string().max(500)).max(500).optional(),
  maxLength: z.number().int().positive().optional()
});
export type FieldDescriptor = z.infer<typeof FieldDescriptorSchema>;

export const AnswerProposalSchema = z
  .object({
    fieldId: z.string().min(1).max(200),
    value: z.string().max(20000),
    source: AnswerSourceSchema,
    needsConfirmation: z.boolean(),
    sensitiveCategory: SensitiveCategorySchema.nullable(),
    holdReason: AnswerHoldReasonSchema.nullable()
  })
  .superRefine((p, ctx) => {
    if (p.source === 'unresolved' && p.value !== '') {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'An unresolved answer carries no value' });
    }
    if (p.sensitiveCategory && !SENSITIVE_ALLOWED_SOURCES.includes(p.source)) {
      ctx.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'A sensitive answer may only come from a reviewed profile fact or an approved answer'
      });
    }
    if (p.holdReason && !p.needsConfirmation) {
      ctx.addIssue({ code: 'custom', path: ['needsConfirmation'], message: 'A held answer must ask the person to confirm' });
    }
  });
export type AnswerProposal = z.infer<typeof AnswerProposalSchema>;

/** Per-field outcome after a fill, read back from the page. */
export const FILL_OUTCOMES = ['accepted', 'validation_error', 'page_modified', 'unsupported', 'unresolved', 'skipped'] as const;
export const FillResultSchema = z.object({
  fieldId: z.string().min(1).max(200),
  outcome: z.enum(FILL_OUTCOMES),
  message: z.string().max(500).optional()
});
export type FillResult = z.infer<typeof FillResultSchema>;
