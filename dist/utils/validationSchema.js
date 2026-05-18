"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
// Reusable field validators
class ValidationService {
    constructor() {
        // Name validation
        this.name = joi_1.default.string().min(6).required().messages({
            'string.base': 'Name should be a string',
            'string.empty': 'Name cannot be empty',
            'string.min': 'Name must be at least 6 characters long',
            'any.required': 'Name is required',
        });
        // Last name validation
        this.lastName = joi_1.default.string().min(2).required().messages({
            'string.base': 'Last name should be a string',
            'string.empty': 'Last name cannot be empty',
            'string.min': 'Last name must be at least 2 characters long',
            'any.required': 'Last name is required',
        });
        // Email validation
        this.email = joi_1.default.string().email().required().messages({
            'string.email': 'Email must be a valid email address',
            'any.required': 'Email is required',
        });
        // Password validation
        this.password = joi_1.default.string().min(6).required().messages({
            'string.base': 'Password should be a string',
            'string.min': 'Password should be at least 6 characters long',
            'any.required': 'Password is required',
        });
        this.reason = joi_1.default.string().required().allow('signup', 'forgotPassword', 'emailVerification').messages({
            'string.base': 'Reason should be a string',
            'any.required': 'Reason is required',
        });
        // Phone number validation
        this.phoneNumber = joi_1.default.string()
            .pattern(/^(\+234|0)[7-9][0-1][0-9]{8}$/)
            .required()
            .messages({
            'string.pattern.base': 'Phone number must be between 10 and 15 digits long',
            'any.required': 'Phone number is required',
        });
        // Phone country code validation
        this.phoneCountryCode = joi_1.default.string()
            .pattern(/^\+\d{1,4}$/) // Validates country codes like +1, +44, +234, etc.
            .required()
            .messages({
            'string.pattern.base': "Phone country code must be in the format '+[country code]'",
            'any.required': 'Phone country code is required',
        });
        // Gender validation
        this.gender = joi_1.default.string().valid('male', 'female').required().messages({
            'any.only': 'Gender must be one of "male", "female", or "other"',
            'any.required': 'Gender is required',
        });
        // Birth date validation
        this.bYear = joi_1.default.number()
            .integer()
            .min(1900)
            .max(new Date().getFullYear())
            .required()
            .messages({
            'number.base': 'Birth year must be a number',
            'number.min': 'Birth year must be after 1900',
            'number.max': `Birth year must not exceed ${new Date().getFullYear()}`,
            'any.required': 'Birth year is required',
        });
        this.bMonth = joi_1.default.number().integer().min(1).max(12).required().messages({
            'number.base': 'Birth month must be a number',
            'number.min': 'Birth month must be between 1 and 12',
            'number.max': 'Birth month must be between 1 and 12',
            'any.required': 'Birth month is required',
        });
        this.bDay = joi_1.default.number().integer().min(1).max(31).required().messages({
            'number.base': 'Birth day must be a number',
            'number.min': 'Birth day must be between 1 and 31',
            'number.max': 'Birth day must be between 1 and 31',
            'any.required': 'Birth day is required',
        });
        // Date of birth validation - proper date validation
        this.dateOfBirth = joi_1.default.date()
            .max('now')
            .min(new Date(new Date().getFullYear() - 100, 0, 1)) // Not older than 100 years
            .required()
            .messages({
            'date.base': 'Date of birth must be a valid date',
            'date.max': 'Date of birth cannot be in the future',
            'date.min': 'Date of birth seems too old (more than 100 years ago)',
            'any.required': 'Date of birth is required',
        });
        this.date = joi_1.default.date().required().messages({
            'date.base': 'Date must be valid.',
            'any.required': 'Date is required',
        });
        // Username validation
        this.username = joi_1.default.string().min(3).max(30).required().messages({
            'string.base': 'Username should be a string',
            'string.empty': 'Username cannot be empty',
            'string.min': 'Username must be at least 3 characters long',
            'string.max': 'Username can be at most 30 characters long',
            'any.required': 'Username is required',
        });
        // Interests validation
        this.interests = joi_1.default.array().items(joi_1.default.string()).messages({
            'array.base': 'Interests must be an array of strings',
        });
        // Google ID validation
        this.googleId = joi_1.default.string().optional().allow(null).messages({
            'string.base': 'Google ID should be a string',
        });
        // Picture validation (optional)
        this.picture = joi_1.default.string().optional().messages({
            'string.base': 'Profile picture must be a valid URL',
        });
        // Cover validation (optional)
        this.cover = joi_1.default.string().optional().messages({
            'string.base': 'Cover photo must be a valid URL',
        });
        // Website validation
        this.website = joi_1.default.string().uri().optional().messages({
            'string.uri': 'Website must be a valid URL',
        });
        this.getStarted = joi_1.default.number().integer().messages({
            'number.base': 'get started month must be a number',
        });
        // Other user profile fields
        this.bio = joi_1.default.string().optional();
        this.workPlace = joi_1.default.string().optional();
        this.education = joi_1.default.array().items(joi_1.default.string()).optional();
        // location = Joi.string().optional();
        this.otherName = joi_1.default.string().optional();
        this.homeTown = joi_1.default.string().optional();
        this.relationship = joi_1.default.string().optional();
        // Phrase Key validation
        this.phraseKey = joi_1.default.string().optional().min(5).messages({
            'string.min': 'Phrase key must be at least 5 characters long',
        });
        // Phrase key activation validation
        this.phraseKeyActivation = joi_1.default.boolean().optional();
        this.boolean = joi_1.default.boolean();
        this.identifier = joi_1.default.string().required().messages({
            'string.base': `"identifier" should be a type of 'text'`,
            'string.empty': `"identifier" cannot be an empty field`,
            'any.required': `"identifier" is a required field`,
        });
        this.otp = joi_1.default.string().required().messages({
            'string.base': `"otp" should be a type of 'text'`,
            'string.empty': `"otp" cannot be an empty field`,
            'any.required': `"otp" is a required field`,
        });
        this.strings = joi_1.default.string().required().messages({
            'string.base': `field must be a string`,
            'string.empty': `An empty field`,
            'any.required': `An empty field`,
        });
        this.phraseKeySchema = joi_1.default.object({
            phraseKey: joi_1.default.string().min(5).required().messages({
                'string.empty': 'Phrase key is required.',
                'string.min': 'Phrase key must be at least 5 characters long.',
            }),
        });
        this.thumbnail = joi_1.default.string().optional().messages({
            'string.base': `field must be a string`,
        });
        this.audio = joi_1.default.string().optional().messages({
            'string.base': `field must be a string`,
        });
        this.title = joi_1.default.string().optional().messages({
            'string.base': `field must be a string`,
        });
        this.artist = joi_1.default.string().optional().messages({
            'string.base': `field must be a string`,
        });
        this.url = joi_1.default.string().optional().messages({
            'string.base': `field must be a string`,
        });
        // Reusable validators for common fields
        this.objectId = joi_1.default.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
            'string.pattern.base': 'Invalid ObjectId format',
            'any.required': 'ObjectId is required',
        });
        this.text = joi_1.default.string().optional().allow(null, '').messages({
            'string.base': 'Text must be a string',
        });
        this.number = joi_1.default.number().messages({
            'number.base': 'Value must be a number',
        });
        this.caption = joi_1.default.string().optional().allow(null, '').messages({
            'string.base': 'Caption must be a string',
        });
        this.position = joi_1.default.object({
            x: joi_1.default.number().required().messages({
                'number.base': "Position 'x' must be a number",
                'any.required': "Position 'x' is required",
            }),
            y: joi_1.default.number().required().messages({
                'number.base': "Position 'y' must be a number",
                'any.required': "Position 'y' is required",
            }),
        })
            .required()
            .messages({
            'object.base': "Position must be an object with 'x' and 'y'",
            'any.required': 'Position is required',
        });
        this.musicId = joi_1.default.string().optional().allow(null).messages({
            'string.base': 'Music ID must be a string',
        });
        this.media = joi_1.default.string().required().messages({
            'string.base': 'Media must be a string',
            'any.required': 'Media is required',
        });
        this.color = joi_1.default.string().required().messages({
            'string.base': 'Color ID must be a string',
        });
        this.object = joi_1.default.object().required().messages({
            'object.base': 'Field must be an object',
            'any.required': 'Field is required',
        });
    }
}
exports.default = new ValidationService();
