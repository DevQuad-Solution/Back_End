import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY as string, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  // Generate a random IV for each encryption
  const iv = crypto.randomBytes(16); // 16 bytes for AES-256-CBC

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to encrypted data (separated by :)
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  // Split IV and encrypted data
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function toBase64(input: string) {
  const originalString: string = input;

  // Convert string to a Buffer and then to Base64
  const base64String: string = Buffer.from(originalString, 'utf8').toString('base64');

  // console.log(base64String); // Output: SGVsbG8sIFR5cGVTY3JpcHQh
  return base64String;
}

export function base64ToString(input: string) {
  const base64Input: string = input;

  // Convert Base64 back to a Buffer and then to a UTF-8 string
  const decodedString: string = Buffer.from(base64Input, 'base64').toString('utf8');

  // console.log(decodedString); // Output: Hello, TypeScript!
  return decodedString;
}
