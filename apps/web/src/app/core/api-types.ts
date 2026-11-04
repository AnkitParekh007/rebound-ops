import type { AiAnalysis, AiPayload, Evidence, RouteId, RequirementStatus } from '@reboundops/contracts';

/** Response and request shapes of the localhost API that are not shared Zod contracts. */

export interface HealthResponse {
  status: string;
}

export interface PersistenceStatus {
  available: boolean;
  savedCount: number;
  warnings: string[];
  migratedSessions?: number;
}

export interface SavedSessionSummary {
  id: string;
  role: string;
  updatedAt: string;
  revision: number;
}

export interface AiStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  attempts: number;
  maxAttempts: number;
  successful: number;
  failed: number;
  reportedInputTokens: number;
  reportedOutputTokens: number;
}

export interface AiPreview {
  enabled: boolean;
  provider: string;
  model: string | null;
  sessionRevision: number;
  payload: AiPayload;
  previewHash: string;
}

export interface AiAnalyzeResult {
  analysis: AiAnalysis;
  autoApplied: boolean;
  provider: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number } | null;
}

export type PersistenceMode = 'memory' | 'disk';
export type SourceKind = 'resume' | 'project_note';
export type EvidenceStatus = Evidence['status'];
export type { RouteId, RequirementStatus };

/** Citation choice for an evidence correction (mirrors CorrectEvidenceSchema.source). */
export type CorrectionSource =
  | { mode: 'manual'; label: string }
  | { mode: 'document'; documentId: string; excerpt: string };
