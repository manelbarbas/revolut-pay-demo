import { useState, useEffect } from 'react';
import { getRevolutPayOrderIdURLParam } from '@revolut/checkout';

interface Payment {
  id: string;
  state: string;
  amount: number;
  currency: string;
  decline_reason?: string;
}

interface OrderDetails {
  id: string;
  token: string;
  state: string;
  amount: number;
  currency: string;
  description?: string;
  decline_reason?: string;
  created_at: string;
  payments?: Payment[];
}

type VerificationStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'error';

interface VerificationResult {
  status: VerificationStatus;
  order: OrderDetails | null;
  error: string | null;
}

export function useOrderVerification(): VerificationResult {
  const [result, setResult] = useState<VerificationResult>({
    status: 'pending',
    order: null,
    error: null,
  });

  useEffect(() => {
    async function verifyOrder() {
      const orderId = getRevolutPayOrderIdURLParam();

      if (!orderId) {
        setResult({
          status: 'error',
          order: null,
          error: 'No order ID found in URL.',
        });
        return;
      }

      console.log(`[OrderVerification] Verifying order: ${orderId}`);

      try {
        const response = await fetch(`/api/orders/${orderId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setResult({
              status: 'error',
              order: null,
              error: 'Order not found. It may not exist yet or may have been removed.',
            });
          } else {
            setResult({
              status: 'error',
              order: null,
              error: 'Failed to verify order status. Please try again later.',
            });
          }
          return;
        }

        const order: OrderDetails = await response.json();
        console.log(`[OrderVerification] Order state: ${order.state}`, order);

        // Determine status based on order state
        let verificationStatus: VerificationStatus;

        switch (order.state) {
          case 'completed':
            verificationStatus = 'success';
            break;
          case 'authorised':
            verificationStatus = 'success';
            break;
          case 'failed':
            verificationStatus = 'failed';
            break;
          case 'cancelled':
            verificationStatus = 'cancelled';
            break;
          case 'pending':
          case 'processing':
            // Order is still being processed - keep pending status
            setResult({
              status: 'pending',
              order,
              error: null,
            });
            return;
          default:
            // Unknown state - treat as error
            setResult({
              status: 'error',
              order,
              error: `Unknown order state: ${order.state}`,
            });
            return;
        }

        setResult({
          status: verificationStatus,
          order,
          error: null,
        });
      } catch (error) {
        console.error('[OrderVerification] Verification failed:', error);
        setResult({
          status: 'error',
          order: null,
          error: 'Failed to verify order. Please check your connection and try again.',
        });
      }
    }

    verifyOrder();
  }, []);

  return result;
}

/**
 * Helper function to format amount for display
 */
export function formatAmount(amount: number, currency: string): string {
  // Convert from minor units to major units
  const majorAmount = amount / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(majorAmount);
}
