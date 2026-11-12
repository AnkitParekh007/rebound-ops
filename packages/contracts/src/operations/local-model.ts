/**
 * Optional local model (R0 FND-05). Operations features may ask a model on
 * this computer (any OpenAI-compatible server, such as llama.cpp, Ollama or
 * LM Studio) for a structured draft. Every request returns either a validated
 * model result or an honest manual fallback that says why and carries the
 * prompt to copy. A value is never invented when the model is missing, slow
 * or wrong, and only loopback endpoints are ever contacted.
 */

export const LOCAL_MODEL_STATUSES = [
  /** No endpoint or model name is set. */
  'not_configured',
  /** The endpoint is set but is not allowed (not loopback, has credentials, bad URL). It is never contacted. */
  'invalid_config',
  /** The endpoint did not answer, answered with an error, or redirected. */
  'unreachable',
  /** The endpoint answered but does not list the configured model. */
  'model_missing',
  'ready'
] as const;
export type LocalModelStatus = (typeof LOCAL_MODEL_STATUSES)[number];

export const MANUAL_FALLBACK_REASONS = [
  'not_configured',
  'invalid_config',
  'unreachable',
  'model_missing',
  'timeout',
  'cancelled',
  /** The model answered, but not with JSON that passes the expected schema. */
  'invalid_output'
] as const;
export type ManualFallbackReason = (typeof MANUAL_FALLBACK_REASONS)[number];

export interface LocalModelHealth {
  readonly status: LocalModelStatus;
  /** The configured model name, when one is set. */
  readonly model: string | null;
  /** The endpoint origin, only when it is allowed. */
  readonly endpoint: string | null;
  readonly checkedAt: string | null;
  readonly detail: string;
}

/** A model draft that passed validation. Still a draft: features must not treat it as a reviewed fact. */
export interface ModelResult<T> {
  readonly kind: 'model';
  readonly value: T;
  readonly model: string;
  readonly latencyMs: number;
}

/** No model draft. The person can paste `prompt` into a tool of their choice, or work by hand. */
export interface ManualFallback {
  readonly kind: 'manual';
  readonly reason: ManualFallbackReason;
  readonly detail: string;
  readonly prompt: string;
}

export type ModelOutcome<T> = ModelResult<T> | ManualFallback;
