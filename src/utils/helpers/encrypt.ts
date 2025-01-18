import crypto from 'crypto'
import { ErrorBuilder } from '../errors/ErrorBuilder';

export const  generateOAuthState = async (userId: string, stateSecret: Buffer) => { 
    const stateData = {
      userId,
      timestamp: Date.now(),
    };

    // Generate a random IV
    const iv = crypto.randomBytes(16);
    console.log(iv)
    // Encrypt the state data
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(stateSecret), iv);
    let encrypted = cipher.update(JSON.stringify(stateData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
}

export const verifyOAuthState = async (state: string, stateSecret: Buffer) => {
    try {
        // Decrypt the state
        const [ivHex, encryptedData] = state.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(stateSecret), iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        const stateData = JSON.parse(decrypted);

        // Verify timestamp is not too old (e.g., 1 hour)
        if (Date.now() - stateData.timestamp > 3600000) {
            throw ErrorBuilder.forbidden('OAuth state has expired');
        }

        return stateData.userId;
    } catch (error) {
        throw ErrorBuilder.forbidden('Invalid OAuth state');
    }
  }