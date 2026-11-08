import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AiAnalysisSchema, type AiAnalysis, type AiPayload } from '@reboundops/contracts';
import { EVIDENCE_REVIEW_PROMPT, PROMPT_VERSION, buildUserMessage } from './prompt.js';

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
}
export interface ProviderResult {
  analysis: AiAnalysis;
  usage: ProviderUsage;
}

export interface AiProvider {
  name: string;
  model: string;
  /** Prompt identifier (`id@semver`) used by this provider; recorded with every analysis. */
  promptVersion?: string;
  checkConnection?(): Promise<void>;
  analyze(payload: AiPayload): Promise<AiAnalysis | ProviderResult>;
}

/** Disabled unless both an explicit flag and API key are present. Never browser-side. */
export function loadAiProvider(): AiProvider | null {
  if (process.env.REBOUNDOPS_AI_ENABLED !== 'true' || !process.env.ANTHROPIC_API_KEY) return null;
  const model = process.env.REBOUNDOPS_ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 30_000
  });
  return {
    name: 'anthropic',
    model,
    promptVersion: PROMPT_VERSION,
    async checkConnection(): Promise<void> {
      await client.models.retrieve(model, undefined, { timeout: 10_000 });
    },
    async analyze(payload: AiPayload): Promise<ProviderResult> {
      const response = await client.messages.parse({
        model,
        max_tokens: 3000,
        system: EVIDENCE_REVIEW_PROMPT.system,
        messages: [{
          role: 'user',
          content: buildUserMessage(JSON.stringify(payload))
        }],
        output_config: { format: zodOutputFormat(AiAnalysisSchema) }
      });
      if (!response.parsed_output) throw new Error('Structured AI output unavailable.');
      return {
        analysis: response.parsed_output,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
      };
    }
  };
}
