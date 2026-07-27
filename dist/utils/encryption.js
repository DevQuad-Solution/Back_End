"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isEncryptedTextMatch = isEncryptedTextMatch;
exports.toBase64 = toBase64;
exports.base64ToString = base64ToString;
const crypto_1 = __importDefault(require("crypto"));
const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes
function encrypt(text) {
    // Generate a random IV for each encryption
    const iv = crypto_1.default.randomBytes(16); // 16 bytes for AES-256-CBC
    const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Prepend IV to encrypted data (separated by :)
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(encryptedData) {
    // Split IV and encrypted data
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
function isEncryptedTextMatch(plainText, encryptedData) {
    if (!plainText || !encryptedData)
        return false;
    try {
        const normalizedPlainText = plainText.replace(/\s+/g, '').trim();
        const normalizedEncryptedText = decrypt(encryptedData).replace(/\s+/g, '').trim();
        return normalizedEncryptedText === normalizedPlainText;
    }
    catch (error) {
        return false;
    }
}
function toBase64(input) {
    const originalString = input;
    // Convert string to a Buffer and then to Base64
    const base64String = Buffer.from(originalString, 'utf8').toString('base64');
    // console.log(base64String); // Output: SGVsbG8sIFR5cGVTY3JpcHQh
    return base64String;
}
function base64ToString(input) {
    const base64Input = input;
    // Convert Base64 back to a Buffer and then to a UTF-8 string
    const decodedString = Buffer.from(base64Input, 'base64').toString('utf8');
    // console.log(decodedString); // Output: Hello, TypeScript!
    return decodedString;
}
