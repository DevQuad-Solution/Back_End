"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
const slash_1 = require("../models/slash");
class QRService {
    constructor() {
        this.qrStore = new Map();
    }
    /**
     * Generates a QR code and returns it as a data URL string
     */
    async generateQR(data) {
        try {
            const qrId = crypto_1.default.randomUUID();
            const timestamp = Date.now();
            const hash = this.generateHash(data, timestamp);
            const qrData = {
                id: qrId,
                data,
                timestamp,
                hash,
            };
            await slash_1.Qr.create(qrData);
            const qrDataUrl = await qrcode_1.default.toDataURL(JSON.stringify({ id: qrId, hash }));
            return qrDataUrl;
        }
        catch (error) {
            throw new Error(`Failed to generate QR code: ${error}`);
        }
    }
    /**
     * Verifies scanned QR data against previously generated QR
     */
    async verifyQR(scannedData) {
        try {
            const scanned = JSON.parse(scannedData);
            const stored = await slash_1.Qr.findOne({ id: scanned.id });
            if (!stored) {
                return null;
            }
            if (stored.hash !== scanned.hash) {
                return null;
            }
            return stored;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Generates a hash for QR data
     */
    generateHash(data, timestamp) {
        return crypto_1.default.createHash('sha256').update(`${data}${timestamp}`).digest('hex');
    }
    /**
     * Clears stored QR codes (optional cleanup)
     */
    clearQRStore() {
        this.qrStore.clear();
    }
}
exports.default = new QRService();
