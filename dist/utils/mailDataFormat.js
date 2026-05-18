"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareMail = void 0;
const otpMail_1 = require("../mails/otpMail");
const prepareMail = (data, reason) => {
    // Destructure the data object
    const { email, code } = data;
    // Select email template and subject based on reason
    let emailSubject = '';
    let emailContent;
    // Filter email template based on reason
    switch (reason) {
        case 'forgotPassword':
            emailSubject = 'Password Reset Request';
            emailContent = (0, otpMail_1.forgetPassword)({
                firstName: email,
                otp: code,
            });
            break;
        case 'verifyEmail':
            emailSubject = 'Email Verification';
            emailContent = (0, otpMail_1.signupMail)({ firstName: email, otp: code });
            break;
        case 'signup':
            emailSubject = 'Free Trial Verification';
            emailContent = (0, otpMail_1.signupMail)({ firstName: email, otp: code }); // Using forgetPassword as fallback
            break;
        default:
            emailSubject = 'Verification Code';
            emailContent = (0, otpMail_1.forgetPassword)({
                firstName: email,
                otp: code,
            }); // Default to forgetPassword
    }
    return { emailContent, emailSubject };
};
exports.prepareMail = prepareMail;
