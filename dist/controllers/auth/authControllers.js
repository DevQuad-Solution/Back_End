"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccount = exports.verifyKyc = exports.resetPassword = exports.attendantSignin = exports.adminSignin = exports.signin = exports.onboarding = exports.verifyCode = exports.sendCode = exports.signup = exports.getMe = void 0;
const responseService_1 = require("../../utils/responseService");
const modifyResponse_1 = require("../../utils/modifyResponse");
const joi_1 = __importDefault(require("joi"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const validationSchema_1 = __importDefault(require("../../utils/validationSchema"));
const account_1 = require("../../models/account");
const tokenService_1 = require("../../utils/tokenService");
const otpService_1 = require("../../utils/otpService");
const paymentService_1 = require("../../utils/paymentService");
const hubAttendant_1 = require("../../models/hubAttendant");
const platformSettings_1 = require("../../models/platformSettings");
const jwtAccess = process.env.ACCESS_SECRET;
const jwtRefresh = process.env.REFRESH_SECRET;
const userMap = new Map();
const getMe = async (req, res) => {
    try {
        const user = req.user;
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, user);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching auth user!');
    }
};
exports.getMe = getMe;
const signup = async (req, res) => {
    try {
        // Check if signup is disabled in settings
        const settings = await platformSettings_1.PlatformSettings.findOne();
        if (!settings?.signupsEnabled) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'New Signups is currently disabled. Please contact support.');
        }
        const { fullName, phoneNumber, email, password } = req.body;
        const { error } = joi_1.default.object({
            fullName: validationSchema_1.default.name,
            email: validationSchema_1.default.email,
            phoneNumber: validationSchema_1.default.phoneNumber,
            password: validationSchema_1.default.password,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Check if email doesn't already exist
        const existingEmail = await account_1.Account.findOne({ email });
        if (existingEmail)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Email already exists!');
        const salt = bcryptjs_1.default.genSaltSync(10);
        const hashedPwd = bcryptjs_1.default.hashSync(password, salt);
        userMap.set(email, {
            email,
            password: hashedPwd,
            name: fullName,
            phone: phoneNumber,
            role: account_1.AppRole.USER,
            emailVerified: false,
            hub: undefined,
        });
        // Send 6 digit code to the email
        const emaialSent = await (0, otpService_1.createAndSendOtp)(fullName, email, 'signup');
        return (0, responseService_1.resSender)(res, 201, 'success', 'Email Sent, verify code next!');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error signing up!');
    }
};
exports.signup = signup;
/**
 * @param email Account email
 * @param reason Reason for code request
 */
const sendCode = async (req, res) => {
    try {
        const { email, reason } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            reason: validationSchema_1.default.reason.disallow('signup'),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let existingMail = await account_1.Account.findOne({
            email: email,
        });
        if (!existingMail)
            existingMail = userMap.get(email);
        if (!existingMail) {
            console.log('User Email does not exist');
            return (0, responseService_1.resSender)(res, 200, 'success', 'Verification Code will be sent to your mail, if it exists!');
        }
        const emailSent = await (0, otpService_1.createAndSendOtp)(existingMail.name, existingMail.email, reason);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Verification Code will be sent to your mail, if it exists!');
    }
    catch (error) {
        console.error('Failed to request for trial: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Server Error');
    }
};
exports.sendCode = sendCode;
/**
 * @param code This is the verification received from user's mail
 * @param email User's email address
 * @param reason Reason for code verification
 */
const verifyCode = async (req, res) => {
    try {
        const { email, code, reason } = req.body;
        const { error } = joi_1.default.object({
            email: validationSchema_1.default.email,
            code: validationSchema_1.default.strings,
            reason: validationSchema_1.default.reason,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const token = await (0, otpService_1.verifyOtp)(code, email, reason);
        let data;
        if (reason === 'signup') {
            data = userMap.get(email);
            if (!data)
                return (0, responseService_1.resSender)(res, 400, 'fail', 'Sign up data not found!');
            data = {
                ...data,
                emailVerified: true,
            };
            userMap.set(email, data);
        }
        return (0, responseService_1.resSender)(res, 200, 'success', 'Code verified successfully!', null, token);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Failed to verify code!');
    }
};
exports.verifyCode = verifyCode;
const onboarding = async (req, res) => {
    try {
        const { token, hubId, email } = req.body;
        const { error } = joi_1.default.object({
            token: validationSchema_1.default.strings,
            email: validationSchema_1.default.email,
            hubId: validationSchema_1.default.objectId,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let data = userMap.get(email);
        if (!data)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Sign up data not found!');
        console.log('Retrieve Done');
        const decoded = (await (0, tokenService_1.verifyToken)(token, jwtAccess));
        if (!decoded)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Token is invalid!');
        if (decoded.email !== email)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Emails do not match!');
        // Check if email doesn't already exist
        const existingEmail = await account_1.Account.findOne({ email });
        if (existingEmail)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Email already exists!');
        data = {
            ...data,
            hub: hubId,
        };
        const newUser = new account_1.Account(data);
        await newUser.save();
        console.log('User saved Done');
        let accPayload = {
            accountReference: `user_${newUser._id.toString()}_email_${data.email}`,
            accountName: data.name,
            customerEmail: data.email,
            customerName: data.name,
            currencyCode: 'NGN',
        };
        const userAccDet = await paymentService_1.monnifyService.createDedicatedAccount(accPayload);
        const dbUserAccDet = {
            bankName: userAccDet.accounts[0].bankName,
            accountName: `MONNIFY / Slashit-${userAccDet.accountName}`,
            accountNumber: userAccDet.accounts[0].accountNumber,
            accountRef: userAccDet.accountReference,
        };
        console.log('User acc: ', dbUserAccDet);
        const updatedUser = await account_1.Account.findByIdAndUpdate(newUser._id, {
            $set: { userAccountDetails: dbUserAccDet },
        }, { returnDocument: 'after' });
        if (!updatedUser)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'User onboarding failed');
        // Generate a JWT token
        let payload = {
            userId: updatedUser._id.toString(),
            email: updatedUser.email,
        };
        const [accessToken, refreshToken] = await Promise.all([
            (0, tokenService_1.generateToken)(payload, jwtAccess, {
                expiresIn: '30d',
            }),
            (0, tokenService_1.generateToken)(payload, jwtRefresh, {
                expiresIn: '30d',
            }),
        ]);
        await (0, tokenService_1.saveCookies)(res, 'rfst_tkn', refreshToken);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Onboarding complete', null, {
            user: (0, modifyResponse_1.modifyUserResponse)(updatedUser),
            accessToken,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Onboarding failed, try again!');
    }
};
exports.onboarding = onboarding;
const signin = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const { error } = joi_1.default.object({
            identifier: validationSchema_1.default.identifier,
            password: validationSchema_1.default.password,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!identifier || !password) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Email/phone and password are required');
        }
        // Check if the user exists
        let user = await (0, exports.getAccount)(identifier);
        if (!user) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        // Generate a JWT token
        let payload = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            (0, tokenService_1.generateToken)(payload, jwtAccess, {
                expiresIn: '10m',
            }),
            (0, tokenService_1.generateToken)(payload, jwtRefresh, {
                expiresIn: '1d',
            }),
        ]);
        await (0, tokenService_1.saveCookies)(res, 'rfst_tkn', refreshToken);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Sign In Successful', null, {
            user: (0, modifyResponse_1.modifyUserResponse)(user),
            accessToken,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error signing in!');
    }
};
exports.signin = signin;
const adminSignin = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const { error } = joi_1.default.object({
            identifier: validationSchema_1.default.identifier,
            password: validationSchema_1.default.password,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!identifier || !password) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Email/phone and password are required');
        }
        // Check if the user exists
        let admin = await account_1.Admin.findOne({
            $or: [{ email: identifier }, { phone: identifier }],
        });
        if (!admin) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, admin.password);
        if (!isPasswordValid) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        // Generate a JWT token
        let payload = {
            userId: admin._id.toString(),
            email: admin.email,
            role: admin.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            (0, tokenService_1.generateToken)(payload, jwtAccess, {
                expiresIn: '30d',
            }),
            (0, tokenService_1.generateToken)(payload, jwtRefresh, {
                expiresIn: '30d',
            }),
        ]);
        await (0, tokenService_1.saveCookies)(res, 'rfst_tkn', refreshToken, 86400000);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Sign In Successful', null, {
            admin: (0, modifyResponse_1.modifyUserResponse)(admin),
            accessToken,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error signing in!');
    }
};
exports.adminSignin = adminSignin;
const attendantSignin = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const { error } = joi_1.default.object({
            identifier: validationSchema_1.default.identifier,
            password: validationSchema_1.default.password,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!identifier || !password) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Email/phone and password are required');
        }
        // Check if the user exists
        let att = await hubAttendant_1.Attendant.findOne({
            $or: [{ email: identifier }, { phone: identifier }],
        });
        if (!att) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, att.password);
        if (!isPasswordValid) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid Credentials');
        }
        // Generate a JWT token
        let payload = {
            userId: att._id.toString(),
            email: att.email,
            role: att.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            (0, tokenService_1.generateToken)(payload, jwtAccess, {
                expiresIn: '30d',
            }),
            (0, tokenService_1.generateToken)(payload, jwtRefresh, {
                expiresIn: '30d',
            }),
        ]);
        await (0, tokenService_1.saveCookies)(res, 'rfst_tkn', refreshToken);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Sign In Successful', null, {
            attendant: (0, modifyResponse_1.modifyUserResponse)(att),
            accessToken,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error signing in!');
    }
};
exports.attendantSignin = attendantSignin;
/**
 * @param newPassword This is the new Password that the user wants
 * @param token Token issued after code confirmation
 */
const resetPassword = async (req, res) => {
    try {
        const { newPassword, token } = req.body;
        const { error } = joi_1.default.object({
            newPassword: validationSchema_1.default.password,
            token: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Validate received token
        const decoded = await (0, tokenService_1.verifyToken)(token, jwtAccess);
        console.log('Decoded Payload: ', decoded);
        // Hash the new Password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPwd = await bcryptjs_1.default.hash(newPassword, salt);
        let user = await account_1.Account.findOneAndUpdate({ email: decoded?.email }, {
            $set: {
                password: hashedPwd,
            },
        });
        if (!user)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Account not Found!');
        return (0, responseService_1.resSender)(res, 200, 'success', 'Password updated successfully!');
    }
    catch (error) {
        console.error('Failed to verify code: ', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Server Error');
    }
};
exports.resetPassword = resetPassword;
const verifyKyc = async (req, res) => {
    try {
        const user = req.user;
        const userId = user._id;
        const { nin, consent } = req.body;
        console.log('Receved req 1');
        // Check if any file is sent
        if (!req.files || Object.values(req.files).flat().length === 0) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'No files uploaded');
        }
        let files = Object.values(req.files).flat();
        const [image] = files;
        console.log('Receved req 2, images: ', files);
        const { error } = joi_1.default.object({
            nin: joi_1.default.string().required().min(11).max(11).messages({
                'string.base': 'NIN should be a string',
                'string.empty': 'NIN cannot be empty',
                'string.min': 'NIN must be 11 characters long',
                'string.max': 'NIN must be 11 characters long',
                'any.required': 'NIN is required',
            }),
            consent: validationSchema_1.default.boolean,
        }).validate(req.body);
        if (error) {
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        }
        console.log('Validation done');
        // Check if user is already verified
        if (user.kyc?.status === account_1.KycStatus.VERIFIED) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'User is already KYC verified');
        }
        // Check if NIN verification is enabled in settings
        const settings = await platformSettings_1.PlatformSettings.findOne();
        if (settings?.ninVerification === 'Disabled') {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'NIN verification is currently disabled. Please contact support.');
        }
        console.log('Setting confirmed');
        // Perform verification using Monnify service (matching verificationService.ts signature)
        const verificationResult = await paymentService_1.monnifyService.validateNinForUser(userId, nin, user.name, user.phone, image?.buffer, consent);
        console.log('verif result gotten');
        if (verificationResult.verified) {
            // Get updated user
            const updatedUser = await account_1.Account.findById(userId);
            if (!updatedUser)
                return (0, responseService_1.resSender)(res, 403, 'fail', 'Something went wrong!');
            return (0, responseService_1.resSender)(res, 200, 'success', 'KYC verification successful!', null, {
                verified: true,
                kycStatus: account_1.KycStatus.VERIFIED,
                walletBalance: verificationResult.walletBalance,
                verificationDetails: {
                    nameMatch: verificationResult.matches.name,
                    phoneMatch: verificationResult.matches.phone,
                    photoMatch: verificationResult.matches.photo,
                },
                user: (0, modifyResponse_1.modifyUserResponse)(updatedUser),
            });
        }
        else {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'KYC verification failed. Please ensure your NIN details match your profile information.', null, {
                verified: false,
                kycStatus: account_1.KycStatus.REJECTED,
                walletBalance: verificationResult.walletBalance,
                verificationDetails: {
                    nameMatch: verificationResult.matches.name,
                    phoneMatch: verificationResult.matches.phone,
                    photoMatch: verificationResult.matches.photo,
                },
                message: 'Name mismatch detected. Please update your profile or contact support.',
            });
        }
    }
    catch (error) {
        console.error('KYC verification error:', error);
        return (0, responseService_1.errorHandler)(error, res, error.message || 'Error verifying KYC, please try again!');
    }
};
exports.verifyKyc = verifyKyc;
const getAccount = async (identifier, id = false) => {
    try {
        let query;
        if (id) {
            // Search by ObjectId
            query = { _id: identifier };
        }
        else {
            // Search by email or phone
            query = {
                $or: [{ email: identifier }, { phone: identifier }],
            };
        }
        let account = null;
        account = await account_1.Account.findOne(query);
        if (!account) {
            account = await hubAttendant_1.Attendant.findOne(query);
            if (!account) {
                account = await account_1.Admin.findOne(query);
            }
        }
        return account;
    }
    catch (error) {
        throw error;
    }
};
exports.getAccount = getAccount;
