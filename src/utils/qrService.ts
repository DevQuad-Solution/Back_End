import QRCode from 'qrcode';
import crypto from 'crypto';

interface QRData {
    id: string;
    data: string;
    timestamp: number;
    hash: string;
}

class QRService {
    private qrStore: Map<string, QRData> = new Map();

    /**
     * Generates a QR code and returns it as a data URL string
     */
    async generateQR(data: string): Promise<string> {
        try {
            const qrId = crypto.randomUUID();
            const timestamp = Date.now();
            const hash = this.generateHash(data, timestamp);

            const qrData: QRData = {
                id: qrId,
                data,
                timestamp,
                hash,
            };

            this.qrStore.set(qrId, qrData);

            const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ id: qrId, hash }));
            return qrDataUrl;
        } catch (error) {
            throw new Error(`Failed to generate QR code: ${error}`);
        }
    }

    /**
     * Verifies scanned QR data against previously generated QR
     */
    verifyQR(scannedData: string): boolean {
        try {
            const scanned = JSON.parse(scannedData);
            const stored = this.qrStore.get(scanned.id);

            if (!stored) {
                return false;
            }

            return stored.hash === scanned.hash;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generates a hash for QR data
     */
    private generateHash(data: string, timestamp: number): string {
        return crypto
            .createHash('sha256')
            .update(`${data}${timestamp}`)
            .digest('hex');
    }

    /**
     * Clears stored QR codes (optional cleanup)
     */
    clearQRStore(): void {
        this.qrStore.clear();
    }
}

export default new QRService();