import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dbPath = path.join(__dirname, '../revolut-orders.db');

// Create database connection
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Type definitions for database rows
export type OrderState = 'pending' | 'processing' | 'completed' | 'authorised' | 'failed' | 'cancelled';

export type PaymentState = 'pending' | 'authentication_challenge' | 'authentication_verified' | 'authorisation_started' | 'authorisation_passed' | 'authorised' | 'capture_started' | 'captured' | 'completed' | 'declined' | 'soft_declined' | 'failed' | 'cancelled';

export interface DbOrder {
  token: string;                // Revolut public order ID (primary key)
  id: string;                   // Revolut internal order ID
  user_id: string;              // Anonymous user ID
  description: string;
  state: OrderState;            // Order state
  payment_state: PaymentState | null;  // Payment state (from latest payment)
  amount: number;
  currency: string;
  created_at: string;           // ISO string
  updated_at: string;           // ISO string
  decline_reason?: string;      // Payment decline reason
  payment_id?: string;          // Latest payment ID
}

export interface PaymentDetails {
  id: string;
  state: PaymentState;
  amount: number;
  currency: string;
  decline_reason?: string;
}

/**
 * Initialize database schema
 */
export function initDatabase(): void {
  // Check if we need to migrate (add new columns)
  const tableInfo = db.pragma('table_info(orders)') as Array<{ cid: number; name: string }>;
  const hasPaymentState = tableInfo.some(col => col.name === 'payment_state');
  const hasPaymentId = tableInfo.some(col => col.name === 'payment_id');

  // Create orders table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      token TEXT PRIMARY KEY,
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      description TEXT,
      state TEXT NOT NULL,
      payment_state TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      decline_reason TEXT,
      payment_id TEXT
    );
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_internal_id ON orders(id);
  `);

  // Migration: Add new columns if they don't exist (for existing databases)
  if (!hasPaymentState) {
    console.log('[DB] Migrating: Adding payment_state column');
    db.exec('ALTER TABLE orders ADD COLUMN payment_state TEXT');
  }
  if (!hasPaymentId) {
    console.log('[DB] Migrating: Adding payment_id column');
    db.exec('ALTER TABLE orders ADD COLUMN payment_id TEXT');
  }

  console.log('[DB] Database initialized at:', dbPath);
}

/**
 * Insert a new order
 */
export function insertOrder(order: Omit<DbOrder, 'created_at' | 'updated_at'>): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO orders (
      token, id, user_id, description, state, payment_state, amount, currency,
      created_at, updated_at, decline_reason, payment_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    order.token,
    order.id,
    order.user_id,
    order.description,
    order.state,
    order.payment_state || null,
    order.amount,
    order.currency,
    now,
    now,
    order.decline_reason || null,
    order.payment_id || null
  );

  console.log(`[DB] Order inserted: ${order.id} (user: ${order.user_id}, state: ${order.state}, payment_state: ${order.payment_state || 'N/A'})`);
}

/**
 * Get order by public token
 */
export function getOrderByToken(token: string): DbOrder | undefined {
  const stmt = db.prepare('SELECT * FROM orders WHERE token = ?');
  return stmt.get(token) as DbOrder | undefined;
}

/**
 * Get order by internal Revolut ID
 */
export function getOrderById(id: string): DbOrder | undefined {
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  return stmt.get(id) as DbOrder | undefined;
}

/**
 * Get all orders for a specific user
 */
export function getOrdersByUserId(userId: string): DbOrder[] {
  const stmt = db.prepare(`
    SELECT * FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId) as DbOrder[];
}

/**
 * Update order state
 */
export function updateOrderState(
  token: string,
  state: OrderState
): boolean {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE orders
    SET state = ?, updated_at = ?
    WHERE token = ?
  `);

  const result = stmt.run(state, now, token);
  const success = result.changes > 0;

  if (success) {
    console.log(`[DB] Order state updated: ${token} -> ${state}`);
  } else {
    console.log(`[DB] Order not found for update: ${token}`);
  }

  return success;
}

/**
 * Update payment state and details
 */
export function updatePaymentState(
  token: string,
  paymentState: PaymentState,
  paymentId?: string,
  declineReason?: string
): boolean {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE orders
    SET payment_state = ?, payment_id = ?, decline_reason = ?, updated_at = ?
    WHERE token = ?
  `);

  const result = stmt.run(
    paymentState,
    paymentId || null,
    declineReason || null,
    now,
    token
  );
  const success = result.changes > 0;

  if (success) {
    console.log(`[DB] Payment state updated: ${token} -> ${paymentState}${declineReason ? ` (${declineReason})` : ''}`);
  } else {
    console.log(`[DB] Order not found for payment update: ${token}`);
  }

  return success;
}

/**
 * Update both order and payment state (for webhook processing)
 */
export function updateOrderAndPaymentState(
  token: string,
  orderState: OrderState,
  paymentState?: PaymentState,
  paymentId?: string,
  declineReason?: string
): boolean {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE orders
    SET state = ?, payment_state = ?, payment_id = ?, decline_reason = ?, updated_at = ?
    WHERE token = ?
  `);

  const result = stmt.run(
    orderState,
    paymentState || null,
    paymentId || null,
    declineReason || null,
    now,
    token
  );
  const success = result.changes > 0;

  if (success) {
    console.log(`[DB] Order & payment updated: ${token} -> order: ${orderState}, payment: ${paymentState || 'N/A'}${declineReason ? ` (${declineReason})` : ''}`);
  } else {
    console.log(`[DB] Order not found for update: ${token}`);
  }

  return success;
}

/**
 * Get public token from internal ID (for webhook processing)
 */
export function getPublicTokenFromInternalId(internalId: string): string | undefined {
  const stmt = db.prepare('SELECT token FROM orders WHERE id = ?');
  const result = stmt.get(internalId) as { token: string } | undefined;
  return result?.token;
}

/**
 * Get internal ID from public token
 */
export function getInternalIdFromPublicToken(token: string): string | undefined {
  const stmt = db.prepare('SELECT id FROM orders WHERE token = ?');
  const result = stmt.get(token) as { id: string } | undefined;
  return result?.id;
}

/**
 * Get all orders (for debugging)
 */
export function getAllOrders(): DbOrder[] {
  const stmt = db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
  return stmt.all() as DbOrder[];
}

/**
 * Delete all orders (for testing)
 */
export function clearAllOrders(): void {
  db.prepare('DELETE FROM orders').run();
  console.log('[DB] All orders cleared');
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  db.close();
  console.log('[DB] Database connection closed');
}

// Initialize database on module load
initDatabase();
