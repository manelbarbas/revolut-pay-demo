/**
 * Database API Module
 * Handles all local database operations for orders
 */

import {
  getOrderByToken,
  getOrdersByUserId,
  getAllOrders as dbGetAllOrders,
  getInternalIdFromPublicToken,
  type DbOrder,
} from '../db.js';

/**
 * Get order by public token (for frontend requests)
 * @param token - Public order ID
 * @returns Order from database or null
 */
export function getLocalOrderByToken(token: string): DbOrder | null {
  const order = getOrderByToken(token);
  if (!order) {
    console.log(`[DbAPI] Order not found: ${token}`);
    return null;
  }
  return order;
}

/**
 * Get all orders for a specific user
 * @param userId - Anonymous user ID
 * @returns Array of orders for the user
 */
export function getLocalUserOrders(userId: string): DbOrder[] {
  const orders = getOrdersByUserId(userId);
  console.log(`[DbAPI] Found ${orders.length} order(s) for user ${userId}`);
  return orders;
}

/**
 * Get internal Revolut order ID from public token
 * Useful for making API calls to Revolut
 * @param token - Public order ID
 * @returns Internal Revolut order ID or null
 */
export function getInternalOrderId(token: string): string | null {
  const internalId = getInternalIdFromPublicToken(token);
  if (!internalId) {
    console.log(`[DbAPI] No internal ID found for token: ${token}`);
    return null;
  }
  return internalId;
}

/**
 * Get all orders (for debugging/admin)
 * @returns All orders in database
 */
export function getAllOrders(): DbOrder[] {
  return dbGetAllOrders();
}

/**
 * Format order for API response
 * Converts DbOrder to a clean API response format
 * @param order - Database order
 * @returns Formatted order for API response
 */
export function formatOrderForAPI(order: DbOrder): Record<string, unknown> {
  return {
    id: order.id,                    // Internal Revolut ID (for API calls)
    token: order.token,              // Public order ID (this is what users see!)
    description: order.description,
    state: order.state,
    payment_state: order.payment_state,  // Payment state (NEW)
    payment_id: order.payment_id,         // Latest payment ID (NEW)
    amount: order.amount,
    currency: order.currency,
    created_at: order.created_at,
    updated_at: order.updated_at,
    decline_reason: order.decline_reason,
  };
}

/**
 * Format multiple orders for API response
 * @param orders - Array of database orders
 * @returns Array of formatted orders
 */
export function formatOrdersForAPI(orders: DbOrder[]): Record<string, unknown>[] {
  return orders.map(formatOrderForAPI);
}

// Export as default object for convenience
export default {
  getLocalOrderByToken,
  getLocalUserOrders,
  getInternalOrderId,
  getAllOrders,
  formatOrderForAPI,
  formatOrdersForAPI,
};
