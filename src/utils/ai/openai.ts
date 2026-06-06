import OpenAI from 'openai';
import { AILog } from '../../models/ai/AILog';
import { AISettings } from '../../models/ai/AISettings';
import { config } from 'dotenv';

config();

// console.log('Open key: ', process.env.OPENAI_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

const COST_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'text-embedding-3-small': { input: 0.02, output: 0.0 },
};

const estimateCost = (
  usage: { prompt_tokens: number; completion_tokens: number },
  model: string,
): number => {
  const rates = COST_PER_1M[model] || { input: 1, output: 3 };
  return (usage.prompt_tokens / 1e6) * rates.input + (usage.completion_tokens / 1e6) * rates.output;
};

interface TrackedCompletionParams {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  response_format?: { type: 'json_object' };
  max_tokens?: number;
  temperature?: number;
}

interface Context {
  feature: string;
  userId: string;
}

export const trackedCompletion = async (params: TrackedCompletionParams, context: Context) => {
  const settings = await AISettings.findOne();
  if (settings?.pausedForBudget) {
    throw new Error('AI paused --- daily budget reached');
  }

  const start = Date.now();

  try {
    const response = await openai.chat.completions.create(params as any);
    const usage = response.usage!;
    const cost = estimateCost(usage, params.model);

    await AILog.create({
      feature: context.feature,
      aiModel: params.model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      estimatedCost: cost,
      latencyMs: Date.now() - start,
      userId: context.userId,
      success: true,
    });

    return response;
  } catch (error: any) {
    await AILog.create({
      feature: context.feature,
      aiModel: params.model,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      latencyMs: Date.now() - start,
      userId: context.userId,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
};

// try {
//   const response = openai.responses.create({
//     model: 'gpt-5.4-mini',
//     input: 'write a haiku about ai',
//     store: true,
//   });

//   response.then((result) => console.log('AI test result: ', result.output_text));
// } catch (error: any) {
//   console.log('Error testing ai: ', error.message);
// }

export { openai };
