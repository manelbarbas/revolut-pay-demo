import { validateSignature } from './helpers.js';

/**
 * Revolut webhook IP addresses
 * https://developer.revolut.com/docs/merchant/order-management/webhooks
 */
const REVOLUT_IPS = {
  sandbox: [
    '35.242.130.242',
    '35.242.162.241',
  ],
  production: [
    '35.246.21.235',
    '34.89.70.170',
  ],
} as const;

/**
 * Get allowed IPs based on environment
 * @returns Array of allowed IP addresses
 */
export function getAllowedIps(): string[] {
  const isSandbox = process.env.REVOLUT_API_URL?.includes('sandbox');
  return isSandbox ? [...REVOLUT_IPS.sandbox] : [...REVOLUT_IPS.production];
}

/**
 * Check if an IP address is allowed
 * @param ip - IP address to check
 * @returns true if IP is allowed
 */
export function isIpAllowed(ip: string): boolean {
  const allowedIps = getAllowedIps();
  return allowedIps.includes(ip);
}

/**
 * IP allowlisting middleware for Express
 * Validates that requests come from Revolut's IP addresses
 */
export function ipAllowlistMiddleware(req: any, res: any, next: any) {
  // Get client IP - check various headers for reverse proxy setups
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    '';

  // Remove IPv6 prefix if present (::ffff:)
  const ip = clientIp.replace(/^::ffff:/, '');

  console.log(`[WebhookSecurity] Request from IP: ${ip}`);

  if (!isIpAllowed(ip)) {
    console.warn(`[WebhookSecurity] Blocked request from disallowed IP: ${ip}`);
    return res.status(403).send('IP address not allowed');
  }

  next();
}

/**
 * Validate Revolut webhook signature
 * @param signature - Revolut-Signature header value
 * @param timestamp - Revolut-Request-Timestamp header value
 * @param rawBody - Raw request body
 * @returns Object with validation result and error message
 */
export function validateWebhookSignature(options: {
  signature: string | undefined;
  timestamp: string | undefined;
  rawBody: Buffer | undefined;
}): { valid: boolean; error?: string } {
  const { signature, timestamp, rawBody } = options;

  // Check signature header exists
  if (!signature) {
    return { valid: false, error: 'Missing Revolut-Signature header' };
  }

  // Extract signature version (e.g., "v1" from "v1=abc123...")
  const signatureVersion = signature.substring(0, signature.indexOf('='));

  if (!signatureVersion) {
    return { valid: false, error: 'Invalid signature format' };
  }

  // Check timestamp header exists
  if (!timestamp) {
    return { valid: false, error: 'Missing Revolut-Request-Timestamp header' };
  }

  // Check raw body exists
  if (!rawBody) {
    return { valid: false, error: 'Missing request body' };
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[WebhookSecurity] REVOLUT_WEBHOOK_SECRET not set - skipping signature verification');

    return { valid: true };
  }

  // Construct the payload to sign
  // Format: {version}.{timestamp}.{rawBody}
  const payloadToSign = `${signatureVersion}.${timestamp}.${rawBody}`;

  // Validate signature
  const isValid = validateSignature({
    signatureVersion,
    originalSignature: signature,
    signingSecret: webhookSecret,
    payloadToSign,
  });

  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Get client IP address from request
 * Handles various proxy headers
 * @param req - Express request
 * @returns Client IP address
 */
export function getClientIp(req: any): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  // Remove IPv6 prefix if present
  return ip.replace(/^::ffff:/, '');
}

/**
 * Check if webhook security is enabled
 * @returns true if security features should be enforced
 */
export function isSecurityEnabled(): boolean {
  const isProduction = !process.env.REVOLUT_API_URL?.includes('sandbox');
  const hasWebhookSecret = !!process.env.REVOLUT_WEBHOOK_SECRET;
  return isProduction || hasWebhookSecret;
}

// Export as default object for convenience
export default {
  getAllowedIps,
  isIpAllowed,
  ipAllowlistMiddleware,
  validateWebhookSignature,
  getClientIp,
  isSecurityEnabled,
  REVOLUT_IPS,
};
