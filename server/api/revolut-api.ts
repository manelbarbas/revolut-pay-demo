/**
 * Revolut API Integration Module
 * Handles all communication with Revolut's API
 */

/**
 * Revolut order response type
 */
export interface RevolutOrderResponse {
  id: string;
  token: string;
  description?: string;
  state: string;
  amount: number;
  currency: string;
  created_at: string;
  decline_reason?: string;
  payments?: Array<{
    id: string;
    state: string;
    amount: number;
    currency: string;
    decline_reason?: string;
  }>;
}

/**
 * Create order request type
 */
export interface CreateOrderRequest {
  amount: number;
  currency: string;
  description: string;
  quantity?: number;
}

/**
 * Create a new order via Revolut API
 * @param orderData - Order details
 * @returns Revolut order response
 */
export async function createRevolutOrder(orderData: CreateOrderRequest): Promise<RevolutOrderResponse> {
  const { amount, currency, description } = orderData;

  console.log(`[RevolutAPI] Creating order: ${amount} ${currency} for "${description}"`);

  const response = await fetch(`${process.env.REVOLUT_API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.REVOLUT_API_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'Revolut-Api-Version': '2025-12-04',
    },
    body: JSON.stringify({
      description,
      amount,
      currency,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`[RevolutAPI] Order creation failed:`, response.status, errorData);
    throw new Error(`Failed to create order with Revolut: ${response.status}`);
  }

  const order = await response.json() as RevolutOrderResponse;
  console.log(`[RevolutAPI] Order created: ${order.id} (state: ${order.state})`);

  return order;
}

/**
 * Fetch full order details from Revolut API (including payments)
 * @param orderId - Internal Revolut order ID
 * @returns Complete order response with payments array
 */
export async function fetchRevolutOrder(orderId: string): Promise<RevolutOrderResponse | null> {
  console.log(`[RevolutAPI] Fetching order details: ${orderId}`);

  try {
    const response = await fetch(
      `${process.env.REVOLUT_API_URL}/api/orders/${orderId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.REVOLUT_API_SECRET_KEY}`,
          'Content-Type': 'application/json',
          'Revolut-Api-Version': '2024-09-01',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[RevolutAPI] Fetch order failed: ${response.status} ${errorText}`);
      return null;
    }

    const order = await response.json() as RevolutOrderResponse;
    console.log(`[RevolutAPI] Order fetched: ${order.id} (state: ${order.state}, payments: ${order.payments?.length || 0})`);

    return order;
  } catch (error) {
    console.error(`[RevolutAPI] Fetch order error:`, error);
    return null;
  }
}

/**
 * Create order and fetch full details in one call
 * @param orderData - Order details
 * @returns Order with payments array
 */
export async function createOrderWithPayments(orderData: CreateOrderRequest): Promise<RevolutOrderResponse> {
  // Create the order
  const order = await createRevolutOrder(orderData);

  // Fetch full details to get payments array
  const orderWithPayments = await fetchRevolutOrder(order.id);

  // Return full order if available, otherwise return basic order
  return orderWithPayments || order;
}

// Export as default object for convenience
export default {
  createRevolutOrder,
  fetchRevolutOrder,
  createOrderWithPayments,
};
