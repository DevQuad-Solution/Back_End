"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.createAndSendOtp = void 0;
const otp_1 = __importDefault(require("../models/otp"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const tokenService_1 = require("./tokenService");
const adminControllers_1 = require("../controllers/admin/adminControllers");
const emailService_1 = require("./emailService");
const mailDataFormat_1 = require("./mailDataFormat");
const jwtAccess = process.env.ACCESS_SECRET;
/**
 *
 * @param email
 * @param reason
 * @returns state - boolean value
 */
const createAndSendOtp = async (name, email, reason = 'signup') => {
    try {
        let { pin: verificationCode } = (0, adminControllers_1.generatePin)();
        let otpRecord = await otp_1.default.findOne({ email, reason });
        // Hash the OTP before storing
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedOTP = await bcryptjs_1.default.hash(verificationCode, salt);
        if (otpRecord) {
            otpRecord.otp = hashedOTP;
            //   otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString; //Update the expires time
        }
        else {
            otpRecord = new otp_1.default({
                email,
                otp: hashedOTP,
                reason,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Set expiration time
            });
        }
        await otpRecord.save();
        console.log('Code: ', verificationCode);
        const { emailContent, emailSubject } = (0, mailDataFormat_1.prepareMail)({ email, code: verificationCode }, reason);
        let sent = false;
        const emailData = {
            subject: emailSubject,
            message: emailContent,
            mailType: 'html',
            recipients: [{ address: email, name }],
        };
        const data = await (0, emailService_1.sendMail)(emailData);
        console.log('Data rec: ', data);
        console.log('Email Sent');
        sent = true;
        return sent;
    }
    catch (error) {
        // console.log('Error', error);
        console.log('Email not sent');
        return false;
    }
};
exports.createAndSendOtp = createAndSendOtp;
/**
 *
 * @param code The recieved code from user
 * @param email User's email adddress
 * @param reason Reason for code request and verification
 * @returns Token to authenticate the next action
 */
const verifyOtp = async (code, email, reason) => {
    try {
        let savedOtp = await otp_1.default.findOne({ email, reason });
        if (!savedOtp)
            throw new Error('Verification code is invalid or expired');
        const isExpired = new Date(savedOtp.expiresAt) < new Date();
        if (isExpired) {
            await otp_1.default.deleteOne({ _id: savedOtp._id });
            throw new Error('Verification code is invalid or expired');
        }
        const isValid = await bcryptjs_1.default.compare(code, savedOtp.otp);
        if (!isValid)
            throw new Error('Verification code is invalid or expired');
        let payload = {
            userId: '',
            email,
            emailVerified: reason === 'signup',
        };
        // console.log('Payload: ', payload);
        const token = (0, tokenService_1.generateToken)(payload, jwtAccess, {
            expiresIn: reason == 'signup' ? '365d' : '10m',
        });
        return token;
    }
    catch (error) {
        console.log('Error');
        throw error;
    }
};
exports.verifyOtp = verifyOtp;
