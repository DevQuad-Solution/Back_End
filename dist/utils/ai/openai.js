"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = exports.trackedCompletion = void 0;
const openai_1 = __importDefault(require("openai"));
const AILog_1 = require("../../models/ai/AILog");
const AISettings_1 = require("../../models/ai/AISettings");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
// console.log('Open key: ', process.env.OPENAI_API_KEY);
const openAIKEY = process.env.OPENAI_API_KEY;
if (!openAIKEY)
    throw new Error('OPEN AI Key is missing!');
const openai = new openai_1.default({
    apiKey: openAIKEY,
    maxRetries: 3,
    timeout: 30000,
});
exports.openai = openai;
const COST_PER_1M = {
    'gpt-4o': { input: 5.0, output: 15.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'text-embedding-3-small': { input: 0.02, output: 0.0 },
};
const estimateCost = (usage, model) => {
    const rates = COST_PER_1M[model] || { input: 1, output: 3 };
    return (usage.prompt_tokens / 1e6) * rates.input + (usage.completion_tokens / 1e6) * rates.output;
};
const trackedCompletion = async (params, context) => {
    const settings = await AISettings_1.AISettings.findOne();
    if (settings?.pausedForBudget) {
        throw new Error('AI paused --- daily budget reached');
    }
    const start = Date.now();
    try {
        const response = await openai.chat.completions.create(params);
        const usage = response.usage;
        const cost = estimateCost(usage, params.model);
        await AILog_1.AILog.create({
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
    }
    catch (error) {
        await AILog_1.AILog.create({
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
exports.trackedCompletion = trackedCompletion;
