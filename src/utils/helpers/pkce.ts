import crypto from 'crypto';

export class PKCEUtil {
  /**
   * Generates a random code verifier string
   * Must be between 43-128 chars using A-Z, a-z, 0-9, and -._~
   */
  static generateCodeVerifier(): string {
    // Generate random bytes
    const buffer = crypto.randomBytes(32);
    // Convert to base64 and make URL safe
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      // Ensure length is between 43-128
      .slice(0, 128);
  }

  /**
   * Creates a code challenge from the code verifier using SHA256
   * @param codeVerifier The code verifier to hash
   */
  static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    // Create SHA256 hash
    const hash = crypto.createHash('sha256')
      .update(codeVerifier)
      .digest();
    
    // Convert to base64 and make URL safe
    return Buffer.from(hash)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
} 