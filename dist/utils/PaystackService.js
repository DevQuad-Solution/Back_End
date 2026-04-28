"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystackService = exports.PaystackService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class PaystackService {
    constructor() {
        this.secretKey = process.env.PAYSTACK_TEST_SECRET_KEY;
        this.client = axios_1.default.create({
            baseURL: 'https://api.paystack.co',
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
        });
    }
    // Initialize transaction for card capture (₦50 auth charge)
    async initializeTransaction(email, amount = 5000) {
        const response = await this.client.post('/transaction/initialize', {
            email,
            amount, // 5000 kobo = ₦50
            channels: ['card'],
            callback_url: `${process.env.CLIENT_URL}/payment/verify`,
            metadata: {
                custom_fields: [
                    {
                        display_name: 'Purpose',
                        variable_name: 'purpose',
                        value: 'card_authorization',
                    },
                ],
            },
        });
        return response.data.data;
    }
    // Verify transaction and extract authorization
    async verifyTransaction(reference) {
        const response = await this.client.get(`/transaction/verify/${reference}`);
        return response.data.data;
    }
    // Create a Paystack plan
    async createPlan(name, amount, interval = 'monthly') {
        const response = await this.client.post('/plan', {
            name,
            amount,
            interval,
        });
        return response.data.data;
    }
    // Get plan by plan code
    async getPlan(planCode) {
        const response = await this.client.get(`/plan/${planCode}`);
        return response.data.data;
    }
    // Create subscription
    async createSubscription(customerCode, planCode, authorizationCode, startDate) {
        const payload = {
            customer: customerCode,
            plan: planCode,
            authorization: authorizationCode,
        };
        if (startDate) {
            payload.start_date = startDate.toISOString();
        }
        const response = await this.client.post('/subscription', payload);
        return response.data.data;
    }
    // Disable subscription
    async disableSubscription(subscriptionCode, emailToken) {
        await this.client.post('/subscription/disable', {
            code: subscriptionCode,
            token: emailToken,
        });
    }
    // Get subscription details
    async getSubscription(subscriptionCodeOrId) {
        const response = await this.client.get(`/subscription/${subscriptionCodeOrId}`);
        return response.data.data;
    }
    // Charge authorization (for proration or one-time charges)
    async chargeAuthorization(email, amount, authorizationCode, reference) {
        const response = await this.client.post('/transaction/charge_authorization', {
            email,
            amount,
            authorization_code: authorizationCode,
            reference: reference || `proration_${Date.now()}`,
        });
        return response.data.data;
    }
    // Refund transaction (for auth charge refund)
    async refundTransaction(reference) {
        const response = await this.client.post('/refund', {
            transaction: reference,
        });
        return response.data.data;
    }
    // Verify webhook signature
    verifyWebhookSignature(payload, signature) {
        const hash = crypto_1.default.createHmac('sha512', this.secretKey).update(payload).digest('hex');
        return hash === signature;
    }
}
exports.PaystackService = PaystackService;
exports.paystackService = new PaystackService();
