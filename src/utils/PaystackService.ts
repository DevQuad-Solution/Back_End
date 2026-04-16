import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export class PaystackService {
  private client: AxiosInstance;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_TEST_SECRET_KEY!;
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Initialize transaction for card capture (₦50 auth charge)
  async initializeTransaction(
    email: string,
    amount: number = 5000,
  ): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
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
  async verifyTransaction(reference: string): Promise<{
    status: string;
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string;
      reusable: boolean;
    };
    customer: {
      customer_code: string;
      email: string;
    };
  }> {
    const response = await this.client.get(`/transaction/verify/${reference}`);
    return response.data.data;
  }

  // Create a Paystack plan
  async createPlan(
    name: string,
    amount: number,
    interval: 'monthly' | 'yearly' = 'monthly',
  ): Promise<{
    plan_code: string;
    name: string;
    amount: number;
  }> {
    const response = await this.client.post('/plan', {
      name,
      amount,
      interval,
    });
    return response.data.data;
  }

  // Get plan by plan code
  async getPlan(planCode: string): Promise<any> {
    const response = await this.client.get(`/plan/${planCode}`);
    return response.data.data;
  }

  // Create subscription
  async createSubscription(
    customerCode: string,
    planCode: string,
    authorizationCode: string,
    startDate?: Date,
  ): Promise<{
    subscription_code: string;
    email_token: string;
    status: string;
  }> {
    const payload: any = {
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
  async disableSubscription(subscriptionCode: string, emailToken: string): Promise<void> {
    await this.client.post('/subscription/disable', {
      code: subscriptionCode,
      token: emailToken,
    });
  }

  // Get subscription details
  async getSubscription(subscriptionCodeOrId: string): Promise<any> {
    const response = await this.client.get(`/subscription/${subscriptionCodeOrId}`);
    return response.data.data;
  }

  // Charge authorization (for proration or one-time charges)
  async chargeAuthorization(
    email: string,
    amount: number,
    authorizationCode: string,
    reference?: string,
  ): Promise<{
    reference: string;
    status: string;
    amount: number;
  }> {
    const response = await this.client.post('/transaction/charge_authorization', {
      email,
      amount,
      authorization_code: authorizationCode,
      reference: reference || `proration_${Date.now()}`,
    });
    return response.data.data;
  }

  // Refund transaction (for auth charge refund)
  async refundTransaction(reference: string): Promise<any> {
    const response = await this.client.post('/refund', {
      transaction: reference,
    });
    return response.data.data;
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex');
    return hash === signature;
  }
}

export const paystackService = new PaystackService();
