/**
 * Order storage and management
 * Now using SQLite database via db.ts
 */

import type { OrderState, PaymentState, DbOrder } from './db.js';
import {
  insertOrder,
  getOrderByToken,
  getOrderById,
  getOrdersByUserId,
  updateOrderState as dbUpdateOrderState,
  updatePaymentState as dbUpdatePaymentState,
  updateOrderAndPaymentState as dbUpdateOrderAndPaymentState,
  getPublicTokenFromInternalId,
  getInternalIdFromPublicToken,
  getAllOrders as dbGetAllOrders,
  clearAllOrders as dbClearAllOrders,
} from './db.js';

// Re-export types
export type { OrderState, PaymentState, DbOrder };

/**
 * Create a new order from Revolut API response
 * @param revolutOrder - Order response from Revolut API
 * @param userId - Anonymous user ID
 * @returns Created order with public ID
 */
export function createOrder(
  revolutOrder: {
    id: string;
    token: string;
    description?: string;
    state: string;
    amount: number;
    currency: string;
    created_at: string;
  },
  userId: string
): {
  revolutPublicOrderId: string;
  description: string;
  state: string;
} {
  const order: Omit<DbOrder, 'created_at' | 'updated_at'> = {
    id: revolutOrder.id,
    token: revolutOrder.token,
    user_id: userId,
    description: revolutOrder.description || 'Order',
    state: revolutOrder.state as OrderState,
    payment_state: null, // Will be updated by webhook or fetched from API
    amount: revolutOrder.amount,
    currency: revolutOrder.currency,
  };

  insertOrder(order);

  return {
    revolutPublicOrderId: order.token,
    description: order.description,
    state: order.state,
  };
}

/**
 * Get order by public order ID (token)
 * @param publicId - Public order ID (token)
 * @returns Order object or undefined
 */
export function getOrderByRevolutPublicId(publicId: string): DbOrder | undefined {
  return getOrderByToken(publicId);
}

/**
 * Get order by internal Revolut order ID
 * @param internalId - Internal Revolut order ID
 * @returns Order object or undefined
 */
export function getOrderByInternalId(internalId: string): DbOrder | undefined {
  return getOrderById(internalId);
}

/**
 * Get internal Revolut order ID from public ID
 * @param publicId - Public order ID (token)
 * @returns Internal Revolut order ID or undefined
 */
export function getInternalOrderId(publicId: string): string | undefined {
  return getInternalIdFromPublicToken(publicId);
}

/**
 * Get public order ID from internal Revolut order ID
 * This is needed because webhooks send internal IDs
 * @param internalId - Internal Revolut order ID
 * @returns Public order ID (token) or undefined
 */
export function getPublicOrderId(internalId: string): string | undefined {
  return getPublicTokenFromInternalId(internalId);
}

/**
 * Update order state from webhook
 * @param publicId - Public order ID (token)
 * @param state - New state
 */
export function updateOrderState(
  publicId: string,
  state: OrderState | string
): void {
  const success = dbUpdateOrderState(publicId, state as OrderState);
  if (!success) {
    console.log(`[Orders] Cannot update non-existent order: ${publicId}`);
  }
}

/**
 * Update payment state from webhook
 * @param publicId - Public order ID (token)
 * @param paymentState - Payment state
 * @param paymentId - Payment ID
 * @param declineReason - Optional decline reason
 */
export function updatePaymentState(
  publicId: string,
  paymentState: PaymentState,
  paymentId?: string,
  declineReason?: string
): void {
  const success = dbUpdatePaymentState(publicId, paymentState, paymentId, declineReason);
  if (!success) {
    console.log(`[Orders] Cannot update payment for non-existent order: ${publicId}`);
  }
}

/**
 * Update both order and payment state from webhook
 * @param publicId - Public order ID (token)
 * @param orderState - New order state
 * @param paymentState - New payment state
 * @param paymentId - Payment ID
 * @param declineReason - Optional decline reason
 */
export function updateOrderAndPaymentState(
  publicId: string,
  orderState: OrderState,
  paymentState?: PaymentState,
  paymentId?: string,
  declineReason?: string
): void {
  const success = dbUpdateOrderAndPaymentState(publicId, orderState, paymentState, paymentId, declineReason);
  if (!success) {
    console.log(`[Orders] Cannot update non-existent order: ${publicId}`);
  }
}

/**
 * Get all orders for a specific user
 * @param userId - Anonymous user ID
 * @returns Array of orders for the user
 */
export function getOrdersByUser(userId: string): DbOrder[] {
  return getOrdersByUserId(userId);
}

/**
 * Get all orders (for debugging)
 * @returns Array of all orders
 */
export function getAllOrders(): DbOrder[] {
  return dbGetAllOrders();
}

/**
 * Clear all orders (for testing)
 */
export function clearAllOrders(): void {
  dbClearAllOrders();
}

// Re-export all functions as default object for convenience
export default {
  createOrder,
  getOrderByRevolutPublicId,
  getOrderByInternalId,
  getInternalOrderId,
  getPublicOrderId,
  updateOrderState,
  updatePaymentState,
  updateOrderAndPaymentState,
  getOrdersByUser,
  getAllOrders,
  clearAllOrders,
};
