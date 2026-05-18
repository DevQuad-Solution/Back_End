import { forgetPassword, signupMail } from '../mails/otpMail';

export interface IMailData {
  email: string;
  code: string;
}

export const prepareMail = (data: IMailData, reason: string) => {
  // Destructure the data object
  const { email, code } = data;

  // Select email template and subject based on reason
  let emailSubject = '';
  let emailContent;

  // Filter email template based on reason
  switch (reason) {
    case 'forgotPassword':
      emailSubject = 'Password Reset Request';
      emailContent = forgetPassword({
        firstName: email,
        otp: code,
      });
      break;
    case 'verifyEmail':
      emailSubject = 'Email Verification';
      emailContent = signupMail({ firstName: email, otp: code });
      break;
    case 'signup':
      emailSubject = 'Free Trial Verification';
      emailContent = signupMail({ firstName: email, otp: code }); // Using forgetPassword as fallback
      break;
    default:
      emailSubject = 'Verification Code';
      emailContent = forgetPassword({
        firstName: email,
        otp: code,
      }); // Default to forgetPassword
  }

  return { emailContent, emailSubject };
};
