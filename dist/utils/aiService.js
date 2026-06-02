"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const AI_PROVIDER_ENABLED = process.env.AI_PROVIDER_ENABLED === 'true';
const AI_PROVIDER_API_KEY = process.env.AI_PROVIDER_API_KEY || '';
const AI_PROVIDER_BASE_URL = process.env.AI_PROVIDER_BASE_URL || '';
const AI_PROVIDER_MODEL = process.env.AI_PROVIDER_MODEL || 'gpt-4o-mini';
const AI_PROVIDER_ENDPOINT = process.env.AI_PROVIDER_ENDPOINT || '/v1/responses';
class AIService {
    constructor() {
        this.enabled = AI_PROVIDER_ENABLED;
        this.apiKey = AI_PROVIDER_API_KEY;
        this.endpoint = AI_PROVIDER_ENDPOINT;
        this.model = AI_PROVIDER_MODEL;
        this.client = axios_1.default.create({
            baseURL: AI_PROVIDER_BASE_URL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    get headers() {
        return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
    }
    async requestAI(prompt, fallback) {
        if (!this.enabled || !this.apiKey || !this.client.defaults.baseURL) {
            return fallback;
        }
        try {
            const payload = {
                model: this.model,
                input: prompt,
            };
            const response = await this.client.post(this.endpoint, payload, {
                headers: {
                    ...this.headers,
                },
            });
            const content = (response.data?.output?.[0]?.content ?? []);
            const text = content.find((item) => item?.type === 'output_text')?.text;
            return text?.trim() || fallback;
        }
        catch (error) {
            console.log('AIService: provider request failed, using fallback text.', error);
            return fallback;
        }
    }
    async generateSlashLaunchMessage(options) {
        const prompt = `Write a short launch announcement for a Slash offering:\n
- Product: ${options.productName}\n- Category: ${options.category}\n- Price per slot: ₦${options.pricePerSlot}\n- Slots: ${options.noOfSlots}\n- Total value: ₦${options.totalValue}\n- Quantity: ${options.quantity}\n- Location: ${options.hubName}, ${options.hubCity}, ${options.hubState}\n- Time limit: ${options.timeLimit}\n- Emoji: ${options.emoji ?? 'N/A'}\n\nMake it friendly, concise, and suitable for an in-app announcement.`;
        const fallback = `New Slash created for ${options.productName} at ${options.hubName}. Grab your slot before it closes!`;
        return this.requestAI(prompt, fallback);
    }
    async generateProductMarketingCopy(options) {
        const prompt = `Write a promotional description for a new Slash product:\n
- Name: ${options.name}\n- Category: ${options.category}\n- Total value: ₦${options.totalValue}\n- Slots: ${options.noOfSlots}\n- Quantity: ${options.quantity}\n- Emoji: ${options.emoji ?? 'N/A'}\n- Description: ${options.description ?? 'No description provided.'}\n\nKeep it persuasive and suited for product listing pages.`;
        const fallback = `${options.name} is a ${options.category} product with ${options.noOfSlots} slots and value ₦${options.totalValue}. Perfect for Slash users looking for great group savings.`;
        return this.requestAI(prompt, fallback);
    }
}
exports.AIService = AIService;
