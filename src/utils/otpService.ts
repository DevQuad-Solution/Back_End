import Otp from '../models/otp';
import bcrypt from 'bcryptjs';
import { forgetPassword, signupMail } from '../mails/otpMail';
import { generateToken } from './tokenService';
import { generatePin } from '../controllers/admin/adminControllers';
import { EmailData, sendMail } from './emailService';
import { prepareMail } from './mailDataFormat';

const jwtAccess = process.env.ACCESS_SECRET as string;

/**
 *
 * @param email
 * @param reason
 * @returns state - boolean value
 */
export const createAndSendOtp = async (name: string, email: string, reason: string = 'signup') => {
  try {
    let { pin: verificationCode } = generatePin();
    let otpRecord = await Otp.findOne({ email, reason });

    // Hash the OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(verificationCode, salt);

    if (otpRecord) {
      otpRecord.otp = hashedOTP;
      //   otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString; //Update the expires time
    } else {
      otpRecord = new Otp({
        email,
        otp: hashedOTP,
        reason,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Set expiration time
      });
    }
    await otpRecord.save();
    console.log('Code: ', verificationCode);

    const { emailContent, emailSubject } = prepareMail({ email, code: verificationCode }, reason);

    let sent: boolean = false;
    const emailData: EmailData = {
      subject: emailSubject,
      message: emailContent,
      mailType: 'html',
      recipients: [{ address: email, name }],
    };

    const data = await sendMail(emailData);

    // console.log('Data rec: ', data);
    console.log('Email Sent');
    sent = true;
    return sent;
  } catch (error) {
    // console.log('Error', error);
    console.log('Email not sent');
    return false;
  }
};

/**
 *
 * @param code The recieved code from user
 * @param email User's email adddress
 * @param reason Reason for code request and verification
 * @returns Token to authenticate the next action
 */
export const verifyOtp = async (code: string, email: string, reason: string) => {
  try {
    let savedOtp = await Otp.findOne({ email, reason });
    if (!savedOtp) throw new Error('Verification code is invalid or expired');

    const isExpired = new Date(savedOtp.expiresAt) < new Date();
    if (isExpired) {
      await Otp.deleteOne({ _id: savedOtp._id });
      throw new Error('Verification code is invalid or expired');
    }

    const isValid = await bcrypt.compare(code, savedOtp.otp);
    if (!isValid) throw new Error('Verification code is invalid or expired');

    let payload = {
      userId: '',
      email,
      emailVerified: reason === 'signup',
    };
    // console.log('Payload: ', payload);
    const token = generateToken(payload, jwtAccess, {
      expiresIn: reason == 'signup' ? '365d' : '10m',
    });
    return token;
  } catch (error) {
    console.log('Error');
    throw error;
  }
};
