import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { decrypt } from './encryption';
import { EmailCredential } from '../Models/Campaign';
import { MailPlatform } from '../Controllers/EmailAutomation/Auth/MailOauth';

const readFileAsync = promisify(fs.readFile);

// Environment variables
const normalEmail = process.env.NORMAL_EMAIL;
const normalEmailPassword = process.env.NORMAL_EMAIL_PASSWORD;
const noReplyEmail = process.env.NOREPLY_EMAIL;
const noReplyPassword = process.env.NOREPLY_PASSWORD;
const smtp = process.env.HOST_SMTP;

interface TokenRecord {
  provider: string | 'google' | 'microsoft' | 'zoho' | 'custom' | 'normal' | 'noreply';
  providerId: string;
  location: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpPassword?: string;
}

interface UnifiedEmailData {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string;
  bcc?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer; // Can be base64 string or Buffer
    mimeType?: string;
    cid?: string; // For inline attachments
  }>;
}

class UnifiedMailService {
  private clientId: string;
  private clientSecret: string;
  private callBackUrl: string;

  // Nodemailer transporters for internal emails
  private normalTransporter: nodemailer.Transporter;
  private noReplyTransporter: nodemailer.Transporter;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    this.callBackUrl =
      process.env.NODE_ENV === 'development' ? process.env.SERVER_URL! : process.env.PROD_URL!;

    // Initialize internal transporters
    this.normalTransporter = nodemailer.createTransport({
      host: smtp,
      port: 465,
      secure: true,
      auth: {
        user: normalEmail,
        pass: normalEmailPassword,
      },
    });

    this.noReplyTransporter = nodemailer.createTransport({
      host: smtp,
      port: 465,
      secure: true,
      auth: {
        user: noReplyEmail,
        pass: noReplyPassword,
      },
    });
  }

  /**
   * Validates email address format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates email data before sending
   */
  private validateEmailData(emailData: UnifiedEmailData): void {
    if (!emailData.to || !this.validateEmail(emailData.to)) {
      throw new Error(`Invalid 'to' email address: ${emailData.to}`);
    }
    if (emailData.cc && !this.validateEmail(emailData.cc)) {
      throw new Error(`Invalid 'cc' email address: ${emailData.cc}`);
    }
    if (emailData.bcc && !this.validateEmail(emailData.bcc)) {
      throw new Error(`Invalid 'bcc' email address: ${emailData.bcc}`);
    }
    if (!emailData.subject || emailData.subject.trim() === '') {
      throw new Error('Email subject cannot be empty');
    }
    if (!emailData.body || emailData.body.trim() === '') {
      throw new Error('Email body cannot be empty');
    }
  }

  /**
   * Main email sending function that routes to the appropriate provider
   */
  async sendEmail(token: TokenRecord, emailData: UnifiedEmailData): Promise<any> {
    // Validate email data first
    this.validateEmailData(emailData);

    // Decrypt sensitive fields before use
    if (token.accessToken) token.accessToken = decrypt(token.accessToken);
    if (token.refreshToken) token.refreshToken = decrypt(token.refreshToken);
    if (token.smtpPassword) token.smtpPassword = decrypt(token.smtpPassword);

    console.log(`Sending email via ${token.provider} from: ${token.email}`);

    switch (token.provider) {
      case 'google':
        return this.sendViaGmail(token, emailData);
      case 'microsoft':
        return this.sendViaMicrosoft(token, emailData);
      case 'zoho':
        return this.sendViaZoho(token, emailData);
      case 'custom':
        return this.sendViaSmtp(token, emailData);
      case 'normal':
        return this.sendViaInternalEmail(this.normalTransporter, normalEmail!, emailData);
      case 'noreply':
        return this.sendViaInternalEmail(this.noReplyTransporter, noReplyEmail!, emailData);
      default:
        throw new Error(`Unsupported email provider: ${token.provider}`);
    }
  }

  /**
   * Gmail API implementation
   */
  private async sendViaGmail(token: TokenRecord, emailData: UnifiedEmailData): Promise<string> {
    try {
      const redirectUri = `${this.callBackUrl}/api/campaigns/google/callback`;

      const oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, redirectUri);

      // Set credentials with expiry check
      const expiryDate = this.calculateExpiry(token.accessToken!);
      oauth2Client.setCredentials({
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        expiry_date: expiryDate,
      });

      // Check if token is expired or about to expire (within 5 minutes)
      if (expiryDate && expiryDate < Date.now() + 300000) {
        // 300000ms = 5 minutes
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          if (credentials.access_token) {
            token.accessToken = credentials.access_token;
            // Update stored token if needed
            // await this.updateStoredToken(token);
          }
        } catch (refreshError) {
          console.error('Failed to refresh Google token:', refreshError);
          throw new Error('Authentication expired - please reauthenticate');
        }
      }

      const gmail = google.gmail({
        version: 'v1',
        auth: oauth2Client,
        retryConfig: {
          retry: 3,
          retryDelay: 1000,
          httpMethodsToRetry: ['GET', 'POST'],
          statusCodesToRetry: [
            [100, 199],
            [429, 429],
            [500, 599],
          ],
        },
        timeout: 10000,
      });

      // Create the email message in RFC 2822 format
      const rawMessage = this.createGmailRawMessage(token.email, emailData);

      // Encode the message in base64url format
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send the email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log('Gmail email sent successfully:', response.data.id);
      return response.data.id || '';
    } catch (error: any) {
      console.error('Detailed Gmail error:', error.response?.data || error.message);
      throw new Error(`Failed to send Gmail email: ${error.message}`);
    }
  }

  private calculateExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /**
   * Creates Gmail raw message in RFC 2822 format
   */
  private createGmailRawMessage(from: string, emailData: UnifiedEmailData): string {
    if (!from || !this.validateEmail(from)) {
      throw new Error(`Invalid 'from' email address: ${from}`);
    }

    const boundary = '----=_Part_' + Date.now();
    let message = '';

    // Headers
    message += `From: ${from}\r\n`;
    message += `To: ${emailData.to}\r\n`;
    if (emailData.cc) message += `Cc: ${emailData.cc}\r\n`;
    if (emailData.bcc) message += `Bcc: ${emailData.bcc}\r\n`;
    message += `Subject: ${emailData.subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;

    if (emailData.attachments && emailData.attachments.length > 0) {
      // Multipart message with attachments
      message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

      // Email body part
      message += `--${boundary}\r\n`;
      message += `Content-Type: ${
        emailData.isHtml ? 'text/html' : 'text/plain'
      }; charset="UTF-8"\r\n`;
      message += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      message += `${emailData.body}\r\n\r\n`;

      // Attachment parts
      for (const attachment of emailData.attachments) {
        message += `--${boundary}\r\n`;
        message += `Content-Type: ${
          attachment.mimeType || 'application/octet-stream'
        }; name="${attachment.filename}"\r\n`;
        message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        message += `Content-Transfer-Encoding: base64\r\n\r\n`;

        // Handle both string and Buffer content
        const content =
          typeof attachment.content === 'string'
            ? attachment.content
            : attachment.content.toString('base64');
        message += `${content}\r\n\r\n`;
      }

      message += `--${boundary}--\r\n`;
    } else {
      // Simple message without attachments
      message += `Content-Type: ${
        emailData.isHtml ? 'text/html' : 'text/plain'
      }; charset="UTF-8"\r\n\r\n`;
      message += emailData.body;
    }

    return message;
  }

  /**
   * Microsoft Graph API implementation
   */
  private async sendViaMicrosoft(token: TokenRecord, emailData: UnifiedEmailData): Promise<any> {
    try {
      // Validate token first
      // const expiryDate = this.calculateExpiry(token.accessToken!);
      if (!token.accessToken || this.isTokenExpired(token.accessToken)) {
        token = await this.refreshMicrosoftToken(token);
      }

      const client = Client.init({
        authProvider: (done) => {
          if (!token.accessToken) {
            done(new Error('No access token available'), null);
          } else {
            done(null, token.accessToken);
          }
        },
        defaultVersion: 'v1.0',
        debugLogging: process.env.NODE_ENV === 'development',
      });

      const message: any = {
        subject: emailData.subject,
        body: {
          contentType: emailData.isHtml ? 'HTML' : 'Text',
          content: emailData.body,
        },
        toRecipients: [{ emailAddress: { address: emailData.to } }],
      };

      // Add CC recipients
      if (emailData.cc) {
        message.ccRecipients = [{ emailAddress: { address: emailData.cc } }];
      }

      // Add BCC recipients
      if (emailData.bcc) {
        message.bccRecipients = [{ emailAddress: { address: emailData.bcc } }];
      }

      // Add attachments
      if (emailData.attachments && emailData.attachments.length > 0) {
        message.attachments = emailData.attachments.map((att) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType: att.mimeType || 'application/octet-stream',
          contentBytes:
            typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        }));
      }

      return client.api('/me/sendMail').post({
        message,
        saveToSentItems: true,
      });
    } catch (error: any) {
      console.error('Detailed Microsoft error:', error.response?.data || error.message);
      throw new Error(`Failed to send Microsoft email: ${error.message}`);
    }
  }

  /**
   * Zoho Mail API implementation
   */
  private async sendViaZoho(token: TokenRecord, emailData: UnifiedEmailData): Promise<any> {
    try {
      if (!token.providerId) {
        throw new Error('Account data malformed, please reauthenticate the system');
      }

      // Validate and refresh token if needed
      if (!token.accessToken || this.isTokenExpired(token.accessToken)) {
        console.log('Token Expired');
        token = await this.refreshZohoToken(token);
      }

      // Determine the correct endpoint based on location
      const mailEndpoint =
        token.location === 'eu'
          ? 'https://mail.zoho.eu'
          : token.location === 'in'
            ? 'https://mail.zoho.in'
            : 'https://mail.zoho.com';

      const payload: any = {
        fromAddress: token.email,
        toAddress: emailData.to,
        subject: emailData.subject,
        content: emailData.body,
        askReceipt: 'yes',
      };

      if (emailData.cc) payload.ccAddress = emailData.cc;
      if (emailData.bcc) payload.bccAddress = emailData.bcc;

      const response = await axios.post(
        `${mailEndpoint}/api/accounts/${token.providerId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${token.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      if (response.status >= 400) {
        throw new Error(`Zoho API error: ${response.statusText}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Detailed Zoho error:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        throw new Error(
          'Zoho Mail account not found. Please ensure the user has a valid Zoho Mail account.',
        );
      }
      throw new Error(`Failed to send via Zoho: ${error.response?.data?.message || error.message}`);
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('Exp: ', payload);
      return payload.exp * 1000 < Date.now();
    } catch {
      return true; // Assume expired if we can't parse
    }
  }

  private async refreshZohoToken(token: TokenRecord): Promise<TokenRecord> {
    if (!token.refreshToken) {
      throw new Error('Refresh token missing - reauthentication required');
    }

    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        new URLSearchParams({
          refresh_token: token.refreshToken,
          client_id: process.env.ZOHO_CLIENT_ID!,
          client_secret: process.env.ZOHO_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        },
      );

      console.log('new token: ', JSON.stringify(response.data, null, 2));

      return {
        ...token,
        accessToken: response.data.access_token,
        // Refresh token remains the same
      };
    } catch (error: any) {
      console.error('Zoho token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh Zoho token - reauthentication required');
    }
  }

  private async refreshMicrosoftToken(token: TokenRecord): Promise<TokenRecord> {
    if (!token.refreshToken) {
      throw new Error('Refresh token missing - reauthentication required');
    }

    try {
      const response = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          scope: 'https://graph.microsoft.com/.default',
          refresh_token: token.refreshToken,
          grant_type: 'refresh_token',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        },
      );

      return {
        ...token,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || token.refreshToken,
      };
    } catch (error: any) {
      console.error('Microsoft token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh Microsoft token - reauthentication required');
    }
  }

  /**
   * Custom SMTP implementation
   */
  private async sendViaSmtp(token: TokenRecord, emailData: UnifiedEmailData): Promise<any> {
    const transporter = nodemailer.createTransport({
      host: token.smtpHost,
      port: token.smtpPort || 465,
      secure: token.smtpSecure !== false,
      auth: {
        user: token.email,
        pass: token.smtpPassword,
      },
    });

    const mailOptions = this.createNodemailerOptions(token.email, emailData);

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error: any, info: any) => {
        if (error) {
          console.error('Error sending SMTP email:', error);
          reject(error);
        } else {
          console.log('SMTP email sent successfully');
          console.log('Message ID:', info.messageId);
          resolve(info);
        }
      });
    });
  }

  /**
   * Internal email system (normal/noreply) implementation
   */
  private async sendViaInternalEmail(
    transporter: nodemailer.Transporter,
    fromEmail: string,
    emailData: UnifiedEmailData,
  ): Promise<any> {
    // Add default logo attachment for internal emails
    const defaultAttachments = await this.getDefaultAttachments();
    const allAttachments = [...defaultAttachments, ...(emailData.attachments || [])];

    const mailOptions = this.createNodemailerOptions(fromEmail, {
      ...emailData,
      attachments: allAttachments,
    });

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error: any, info) => {
        if (error) {
          console.error('Error occurred:', error.message);
          reject(error);
        } else {
          console.log('Internal email sent successfully!');
          console.log('Message ID:', info.messageId);
          console.log(info.response);
          resolve(info);
        }
      });
    });
  }

  /**
   * Creates nodemailer options from unified email data
   */
  private createNodemailerOptions(from: string, emailData: UnifiedEmailData): any {
    const options: any = {
      from,
      to: emailData.to,
      subject: emailData.subject,
    };

    // Set content based on type
    if (emailData.isHtml) {
      options.html = emailData.body;
    } else {
      options.text = emailData.body;
    }

    // Add recipients
    if (emailData.cc) options.cc = emailData.cc;
    if (emailData.bcc) options.bcc = emailData.bcc;

    // Add attachments
    if (emailData.attachments && emailData.attachments.length > 0) {
      options.attachments = emailData.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.mimeType,
        cid: att.cid,
      }));
    }

    return options;
  }

  /**
   * Gets default attachments for internal emails
   */
  private async getDefaultAttachments(): Promise<Array<any>> {
    try {
      const icon = await readFileAsync(
        path.join(__dirname, '..', 'public', 'assets', 'images', 'logo.png'),
      );

      return [
        {
          filename: 'icon.png',
          content: icon,
          encoding: 'base64',
          cid: 'icon@m360suites.com',
        },
      ];
    } catch (error) {
      console.warn('Could not load default logo attachment:', error);
      return [];
    }
  }

  /**
   * Convenience method for simple text emails
   */
  async sendSimpleEmail(
    token: TokenRecord,
    to: string,
    subject: string,
    body: string,
  ): Promise<any> {
    return this.sendEmail(token, {
      to,
      subject,
      body,
      isHtml: false,
    });
  }

  /**
   * Convenience method for HTML emails
   */
  async sendHtmlEmail(
    token: TokenRecord,
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<any> {
    return this.sendEmail(token, {
      to,
      subject,
      body: htmlBody,
      isHtml: true,
    });
  }

  /**
   * Legacy compatibility method
   */
  async sendMail(
    mailRecipient: string,
    subject: string,
    mailContent: string,
    mailSender: string,
  ): Promise<any> {
    const email = process.env.ZOHO_HTTP_EMAIL!;
    const zohoCred = await EmailCredential.findOne({ email, provider: MailPlatform.ZOHO });
    if (!zohoCred) throw new Error('Provider credentials not found!');
    let token: TokenRecord = {
      provider: zohoCred.provider,
      email: zohoCred.email,
      providerId: zohoCred.providerId,
      location: '',
      accessToken: zohoCred.accessToken,
      refreshToken: zohoCred.refreshToken,
    };

    return this.sendEmail(token, {
      to: mailRecipient,
      subject,
      body: mailContent,
      isHtml: true, // Assuming HTML content for legacy compatibility
    });
  }

  /**
   * Refreshes Google access token
   */
  async refreshGoogleToken(refreshToken: string): Promise<string> {
    try {
      const oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret);

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      return credentials.access_token || '';
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  /**
   * Debug helper to validate email data
   */
  validateEmailDataOnly(
    token: TokenRecord,
    emailData: UnifiedEmailData,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (!token.email || !this.validateEmail(token.email)) {
        errors.push(`Invalid user email: ${token.email}`);
      }

      // Provider-specific validation
      if (token.provider === 'google' && (!token.accessToken || !token.refreshToken)) {
        errors.push('Google provider requires accessToken and refreshToken');
      }

      this.validateEmailData(emailData);

      return { valid: errors.length === 0, errors };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
      return { valid: false, errors };
    }
  }
}

// Create a singleton instance
const unifiedMailService = new UnifiedMailService();

// Export both the class and the singleton instance
export { UnifiedMailService, unifiedMailService, TokenRecord, UnifiedEmailData };

// Legacy exports for backward compatibility
export const sendMail = unifiedMailService.sendMail.bind(unifiedMailService);
export const sendEmail = unifiedMailService.sendEmail.bind(unifiedMailService);
