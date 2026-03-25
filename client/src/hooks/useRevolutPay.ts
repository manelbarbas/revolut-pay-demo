import { useState, useEffect, useRef, useCallback } from 'react';
import RevolutCheckout from '@revolut/checkout';
import type { Config } from '../types';
import { getUserIdSync } from './useUserId';

interface CreateOrderResponse {
  revolutPublicOrderId: string;
  description: string;
  state: string;
}

export function useRevolutPay() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const revolutPayRef = useRef<any>(null);

  // Fetch config from backend
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.error('[App] Failed to fetch config:', err);
        setError('Failed to initialize payment system.');
      }
    }

    fetchConfig();
  }, []);

  // Initialize Revolut Pay SDK
  useEffect(() => {
    if (!config) {
      return;
    }

    async function initialize() {
      try {
        const { revolutPay } = await RevolutCheckout.payments({
          locale: 'en',
          mode: 'sandbox',
          publicToken: config.revolutPublicKey,
        });
        revolutPayRef.current = revolutPay;
        setIsReady(true);
        console.log('[App] Revolut Pay SDK initialized');
      } catch (err) {
        console.error('[App] Failed to initialize Revolut Pay:', err);
        setError('Failed to initialize payment system. Please refresh the page.');
      }
    }

    initialize();
  }, [config]);

  // Mount widget with payment options
  const mountWidget = useCallback(async (
    amount: number,
    currency: string,
    itemName: string,
    quantity: number
  ) => {
    if (!revolutPayRef.current) {
      return;
    }
    if (!containerRef.current) {
      return;
    }

    // Wait for SDK to be ready
    const maxWaitTime = 5000;
    const startTime = Date.now();

    

    while (!revolutPayRef.current) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Revolut Pay initialization timed out');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Calculate unit price for line items
    const unitPrice = Math.floor(amount / quantity);

    // Define line items matching Revolut API schema
    const lineItems = [
      {
        name: itemName,
        type: 'physical' as const,
        quantity: {
          value: quantity,
          unit: 'PIECES',
        },
        unit_price_amount: unitPrice,
        total_amount: amount,
        description: `Comfortable office chair${quantity > 1 ? ` (x${quantity})` : ''}`,
      },
    ];

    // Payment options with mobile redirect URLs (matching Revolut's working example)
    const paymentOptions = {
      currency: currency,
      totalAmount: amount,
      // This function is called by Revolut SDK when user clicks the pay button
      createOrder: async () => {
        console.log('[App] Creating order via backend...');

        // Get userId for order association
        const userId = getUserIdSync();
        if (!userId) {
          throw new Error('User ID not initialized. Please refresh the page.');
        }

        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, currency, name: itemName, quantity, userId }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to create order');
          }

          const order: CreateOrderResponse = await response.json();
          console.log('[App] Order created:', order.revolutPublicOrderId);

          // Return the public token as required by Revolut
          return { publicId: order.revolutPublicOrderId };
        } catch (error) {
          console.error('[App] Order creation failed:', error);
          throw error;
        }
      },
      redirectUrls: {
        success: `${window.location.origin}/success`,
        failure: `${window.location.origin}/failure`,
        cancel: `${window.location.origin}/cancel`,
      },
      lineItems: lineItems,
    };

    // Mount the widget
    revolutPayRef.current.mount(containerRef.current, paymentOptions);
    console.log('[App] Revolut Pay widget mounted');

    // Set up payment event handlers (for logging; redirects are handled by mobileRedirectUrls)
    revolutPayRef.current.on('payment', (event: any) => {
      switch (event.type) {
        case 'cancel': {
          console.log('[App] Payment canceled', event.orderId ? `- orderId: ${event.orderId}` : '');
          break;
        }

        case 'success': {
          console.log('[App] Payment successful', event.orderId ? `- orderId: ${event.orderId}` : '');
          break;
        }

        case 'error': {
          console.log('[App] Payment error', event.orderId ? `- orderId: ${event.orderId}` : '');
          break;
        }

        default:
          console.log('[App] Unknown payment event:', event);
      }
    });
  }, []);

  return {
    isReady,
    error,
    containerRef,
    mountWidget,
  };
}
