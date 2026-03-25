import crypto from 'crypto';

/**
 * Validate Revolut webhook signature
 * @param options - Signature validation options
 * @returns true if signature is valid
 */
export function validateSignature(options: {
  signatureVersion: string;
  originalSignature: string;
  signingSecret: string;
  payloadToSign: string;
}): boolean {
  const { signatureVersion, originalSignature, signingSecret, payloadToSign } =
    options;

  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(payloadToSign);
  const digest = hmac.digest('hex');
  const expectedSignature = `${signatureVersion}=${digest}`;

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(originalSignature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Format amount as currency
 * @param amount - Amount in minor currency units
 * @param currency - Currency code
 * @returns Formatted string
 */
export function formatCurrency(amount: number, currency: string): string {
  const majorAmount = amount / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(majorAmount);
}

/**
 * Get error message for decline reason
 * @param declineReason - Revolut decline reason
 * @returns User-friendly error message
 */
export function getErrorMessage(declineReason?: string): string {
  const errorMessages: Record<string, string> = {
    insufficient_funds: 'Payment declined: Insufficient funds. Please check your account balance and try again.',
    suspected_fraud: 'Payment declined: Suspected fraud. For security reasons, this transaction could not be processed.',
    withdrawal_limit_exceeded: "Payment declined: Withdrawal limit exceeded. You've reached your daily or monthly spending limit.",
    do_not_honour: 'Payment declined by your bank. Please contact your bank for more information.',
    card_declined: 'Payment declined: Your card was declined. Please try another payment method.',
    card_expired: 'Payment declined: Your card has expired. Please use a valid card.',
    incorrect_cvv: 'Payment declined: Incorrect CVV. Please check your security code and try again.',
  };

  return declineReason && errorMessages[declineReason]
    ? errorMessages[declineReason]
    : 'Payment declined by your bank. Please try again or use a different payment method.';
}
