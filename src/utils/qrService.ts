import QRCode from 'qrcode';
import crypto from 'crypto';
import { Qr } from '../models/slash';

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

      await Qr.create(qrData);

      const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ id: qrId, hash }));
      return qrDataUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Verifies scanned QR data against previously generated QR
   */
  async verifyQR(scannedData: string): Promise<QRData | null> {
    try {
      const scanned = JSON.parse(scannedData);
      const stored = await Qr.findOne({ id: scanned.id });

      if (!stored) {
        return null;
      }

      if (stored.hash !== scanned.hash) {
        return null;
      }

      return stored;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generates a hash for QR data
   */
  private generateHash(data: string, timestamp: number): string {
    return crypto.createHash('sha256').update(`${data}${timestamp}`).digest('hex');
  }

  /**
   * Clears stored QR codes (optional cleanup)
   */
  clearQRStore(): void {
    this.qrStore.clear();
  }
}

export default new QRService();
