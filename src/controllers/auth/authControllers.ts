import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import validationSchema from '../../utils/validationSchema';
import { Schema, Types } from 'mongoose';
import { Account, Admin, AppRole, IAccount, IAdmin } from '../../models/account';
import { generateToken, saveCookies, verifyToken } from '../../utils/tokenService';
import { createAndSendOtp, verifyOtp } from '../../utils/otpService';
import { MonnifyReservedAccountOptions, monnifyService } from '../../utils/paymentService';
import { Attendant, IAttendant } from '../../models/hubAttendant';

const jwtAccess = process.env.ACCESS_SECRET as string;
const jwtRefresh = process.env.REFRESH_SECRET as string;
const userMap: Map<string, UserMap> = new Map();

interface UserMap {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: AppRole.USER;
  emailVerified: boolean;
  hub?: Types.ObjectId;
}

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    return resSender(res, 200, 'success', 'Fetched!', null, user);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching auth user!');
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { fullName, phoneNumber, email, password } = req.body as {
      fullName: string;
      phoneNumber: string;
      email: string;
      password: string;
    };
    const { error } = Joi.object({
      fullName: validationSchema.name,
      email: validationSchema.email,
      phoneNumber: validationSchema.phoneNumber,
      password: validationSchema.password,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Check if email doesn't already exist
    const existingEmail = await Account.findOne({ email });
    if (existingEmail) return resSender(res, 403, 'fail', 'Email already exists!');

    const salt = bcrypt.genSaltSync(10);
    const hashedPwd = bcrypt.hashSync(password, salt);
    userMap.set(email, {
      email,
      password: hashedPwd,
      name: fullName,
      phone: phoneNumber,
      role: AppRole.USER,
      emailVerified: false,
      hub: undefined,
    });

    // Send 6 digit code to the email
    const emaialSent = await createAndSendOtp(fullName, email, 'signup');

    return resSender(res, 201, 'success', 'Email Sent, verify code next!');
  } catch (error: any) {
    return errorHandler(error, res, 'Error signing up!');
  }
};

/**
 * @param code This is the verification received from user's mail
 * @param email User's email address
 * @param reason Reason for code verification
 */
export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { email, code, reason } = req.body;
    const { error } = Joi.object({
      email: validationSchema.email,
      code: validationSchema.strings,
      reason: validationSchema.reason,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const token = await verifyOtp(code, email, reason);
    let data = userMap.get(email);
    if (!data) return resSender(res, 400, 'fail', 'Sign up data not found!');
    data = {
      ...data,
      emailVerified: true,
    };
    userMap.set(email, data);
    return resSender(res, 200, 'success', 'Code verified successfully!', null, token);
  } catch (error: any) {
    return errorHandler(error, res, 'Failed to verify code!');
  }
};

export const onboarding = async (req: Request, res: Response) => {
  try {
    const { token, hubId, email } = req.body;
    const { error } = Joi.object({
      token: validationSchema.strings,
      email: validationSchema.email,
      hubId: validationSchema.objectId,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let data = userMap.get(email);
    if (!data) return resSender(res, 400, 'fail', 'Sign up data not found!');
    console.log('Retrieve Done');
    const decoded = (await verifyToken(token, jwtAccess)) as any;
    if (!decoded) return resSender(res, 403, 'fail', 'Token is invalid!');
    if (decoded.email !== email) return resSender(res, 403, 'fail', 'Emails do not match!');

    // Check if email doesn't already exist
    const existingEmail = await Account.findOne({ email });
    if (existingEmail) return resSender(res, 403, 'fail', 'Email already exists!');

    data = {
      ...data,
      hub: hubId,
    };
    const newUser = new Account(data);
    await newUser.save();
    console.log('User saved Done');

    let accPayload: MonnifyReservedAccountOptions = {
      accountReference: `user_${newUser._id.toString()}_email_${data.email}`,
      accountName: data.name,
      customerEmail: data.email,
      customerName: data.name,
      currencyCode: 'NGN',
    };
    const userAccDet = await monnifyService.createDedicatedAccount(accPayload);
    const dbUserAccDet = {
      bankName: userAccDet.accounts![0].bankName,
      accountName: `MONNIFY / Slashit-${userAccDet.accountName}`,
      accountNumber: userAccDet.accounts![0].accountNumber,
      accountRef: userAccDet.accountReference,
    };
    console.log('User acc: ', dbUserAccDet);

    const updatedUser = await Account.findByIdAndUpdate(
      newUser._id,
      {
        $set: { userAccountDetails: dbUserAccDet },
      },
      { returnDocument: 'after' },
    );
    if (!updatedUser) return resSender(res, 400, 'fail', 'User onboarding failed');

    // Generate a JWT token
    let payload = {
      userId: updatedUser._id.toString(),
      email: updatedUser.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      generateToken(payload, jwtAccess, {
        expiresIn: '30d',
      }),
      generateToken(payload, jwtRefresh as string, {
        expiresIn: '30d',
      }),
    ]);

    await saveCookies(res, 'rfst_tkn', refreshToken);

    return resSender(res, 200, 'success', 'Onboarding complete', null, {
      user: modifyUserResponse(updatedUser),
      accessToken,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Onboarding failed, try again!');
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const { error } = Joi.object({
      identifier: validationSchema.identifier,
      password: validationSchema.password,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!identifier || !password) {
      return resSender(res, 400, 'fail', 'Email/phone and password are required');
    }

    // Check if the user exists
    let user = await getAccount(identifier);
    if (!user) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    // Generate a JWT token
    let payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      generateToken(payload, jwtAccess, {
        expiresIn: '30d',
      }),
      generateToken(payload, jwtRefresh as string, {
        expiresIn: '30d',
      }),
    ]);

    await saveCookies(res, 'rfst_tkn', refreshToken);
    return resSender(res, 200, 'success', 'Sign In Successful', null, {
      user: modifyUserResponse(user),
      accessToken,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error signing in!');
  }
};

export const adminSignin = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const { error } = Joi.object({
      identifier: validationSchema.identifier,
      password: validationSchema.password,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!identifier || !password) {
      return resSender(res, 400, 'fail', 'Email/phone and password are required');
    }

    // Check if the user exists
    let admin = await Admin.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!admin) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    // Generate a JWT token
    let payload = {
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      generateToken(payload, jwtAccess, {
        expiresIn: '30d',
      }),
      generateToken(payload, jwtRefresh as string, {
        expiresIn: '30d',
      }),
    ]);

    await saveCookies(res, 'rfst_tkn', refreshToken);
    return resSender(res, 200, 'success', 'Sign In Successful', null, {
      admin: modifyUserResponse(admin),
      accessToken,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error signing in!');
  }
};

export const attendantSignin = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const { error } = Joi.object({
      identifier: validationSchema.identifier,
      password: validationSchema.password,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!identifier || !password) {
      return resSender(res, 400, 'fail', 'Email/phone and password are required');
    }

    // Check if the user exists
    let att = await Attendant.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!att) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, att.password);
    if (!isPasswordValid) {
      return resSender(res, 403, 'fail', 'Invalid Credentials');
    }

    // Generate a JWT token
    let payload = {
      userId: att._id.toString(),
      email: att.email,
      role: att.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      generateToken(payload, jwtAccess, {
        expiresIn: '30d',
      }),
      generateToken(payload, jwtRefresh as string, {
        expiresIn: '30d',
      }),
    ]);

    await saveCookies(res, 'rfst_tkn', refreshToken);
    return resSender(res, 200, 'success', 'Sign In Successful', null, {
      attendant: modifyUserResponse(att),
      accessToken,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error signing in!');
  }
};

/**
 * @param email Account email
 * @param reason Reason for code request
 */
export const sendCode = async (req: Request, res: Response) => {
  try {
    const { email, reason } = req.body;
    const { error } = Joi.object({
      email: validationSchema.email,
      reason: validationSchema.reason.disallow('signup'),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const existingMail = await Account.findOne({ email: email });
    if (!existingMail) {
      console.log('User Email does not exist');
      return resSender(
        res,
        200,
        'success',
        'Verification Code will be sent to your mail, if it exists!',
      );
    }

    const emailSent = await createAndSendOtp(existingMail.name, existingMail.email, reason);

    return resSender(
      res,
      200,
      'success',
      'Verification Code will be sent to your mail, if it exists!',
    );
  } catch (error: any) {
    console.error('Failed to request for trial: ', error);
    return resSender(res, 500, 'error', error.message || 'Server Error');
  }
};

/**
 * @param newPassword This is the new Password that the user wants
 * @param token Token issued after code confirmation
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword, token } = req.body;
    const { error } = Joi.object({
      newPassword: validationSchema.password,
      token: validationSchema.strings,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Validate received token
    const decoded: any = await verifyToken(token, jwtAccess);
    console.log('Decoded Payload: ', decoded);

    // Hash the new Password
    const salt = await bcrypt.genSalt(10);
    const hashedPwd = await bcrypt.hash(newPassword, salt);

    let user = await Account.findOneAndUpdate(
      { email: decoded?.email },
      {
        $set: {
          password: hashedPwd,
        },
      },
    );
    if (!user) return resSender(res, 403, 'fail', 'Account not Found!');

    return resSender(res, 200, 'success', 'Password updated successfully!');
  } catch (error: any) {
    console.error('Failed to verify code: ', error);
    return resSender(res, 500, 'error', error.message || 'Server Error');
  }
};

export const getAccount = async (identifier: string, id: boolean = false) => {
  try {
    let query: any;

    if (id) {
      // Search by ObjectId
      query = { _id: identifier };
    } else {
      // Search by email or phone
      query = {
        $or: [{ email: identifier }, { phone: identifier }],
      };
    }

    let account: IAccount | IAttendant | IAdmin | null = null;
    account = await Account.findOne(query);
    if (!account) {
      account = await Attendant.findOne(query);
      if (!account) {
        account = await Admin.findOne(query);
      }
    }
    return account;
  } catch (error) {
    throw error;
  }
};
