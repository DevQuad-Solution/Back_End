"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const ensend_1 = __importDefault(require("../config/ensend"));
const sendMail = async (emailData) => {
    const senderIdentity = {
        name: process.env.ENSEND_IDEN_NAME ?? 'Slash It',
        address: process.env.ENSEND_SENDER_IDEN ?? 'noreply@slashit.com.ng',
    };
    const recipients = emailData.recipients;
    try {
        const { data, error } = await ensend_1.default.SendApi.SendMailMessage({
            subject: emailData.subject,
            message: emailData.message,
            sender: senderIdentity,
            recipients,
        });
        if (error)
            throw error;
        console.log('Email Data: ', data);
        return data;
    }
    catch (error) {
        console.log('Error sending mail with ensend: ', error);
        throw error;
    }
};
exports.sendMail = sendMail;
