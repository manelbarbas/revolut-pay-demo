import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import orders from '../orders.js';
import ordersQueue from '../queue/orders-queue.js';
import * as revolutApi from './revolut-api.js';
import * as dbApi from './db-api.js';
import * as webhookSecurity from '../webhook-security.js';

/**
 * Extended request type with rawBody for webhook signature verification
 */
interface ExtendedRequest extends Request {
  rawBody?: Buffer;
}

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5177;

// Parse application/json with raw body for webhook signature verification
app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      // We need the raw body to verify webhook signatures
      req.rawBody = buf;
    },
  }),
);

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

/* ################ API ENDPOINTS ################ */

/**
 * Create order endpoint
 * POST /api/orders
 * Body: { amount: number, currency: string, name: string, userId: string }
 */
app.post('/api/orders', async (req, res) => {
  try {
    const { amount, currency, name, userId } = req.body;

    // Validate input
    if (!amount || !currency || !name) {
      res.status(400).json({
        error: 'Missing required fields: amount, currency, and name are required',
      });
      return;
    }

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid userId',
      });
      return;
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        error: 'Amount must be a positive number',
      });
      return;
    }

    // Validate currency format
    if (!/^[A-Z]{3}$/.test(currency)) {
      res.status(400).json({
        error: 'Currency must be a valid 3-letter currency code (e.g., GBP, USD)',
      });
      return;
    }

    console.log(`[API] Creating order: ${amount} ${currency} for "${name}" (user: ${userId})`);

    // Create order via Revolut API (with payment details)
    const revolutOrder = await revolutApi.createOrderWithPayments({
      amount,
      currency,
      description: name,
    });

    // Log the IDs for debugging
    console.log(`[API] Revolut Order - ID: ${revolutOrder.id}, Token (public): ${revolutOrder.token}`);

    // Store order locally in database
    const { revolutPublicOrderId, description, state } = orders.createOrder(revolutOrder, userId);

    console.log(`[API] Created order - ID: ${revolutOrder.id} (this is used for all API requests)`);

    res.status(201).json({
      description,
      revolutPublicOrderId,
      orderState: state,
      payments: revolutOrder.payments || [],
    });
  } catch (error) {
    console.error('[API] Order creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Order creation failed';
    res.status(500).json({
      error: errorMessage,
    });
  }
});

/**
 * Get order endpoint
 * GET /api/orders/:id
 * Retrieves order details with fallback to local data
 */
app.get('/api/orders/:id', async (req, res): Promise<void> => {
  try {
    const publicId = req.params.id;

    console.log(`[API] Getting order: ${publicId}`);

    // Get order from local database
    const localOrder = dbApi.getLocalOrderByToken(publicId);
    if (!localOrder) {
      console.log(`[API] Order not found in local database: ${publicId}`);
      res.status(404).json({
        error: 'Order not found',
      });
      return;
    }

    console.log(`[API] Order found locally (state: ${localOrder.state}), fetching from Revolut API...`);

    // Fetch from Revolut API using internal order ID
    const internalId = dbApi.getInternalOrderId(publicId);
    if (!internalId) {
      console.log(`[API] No internal ID found for order: ${publicId}`);
      // Return local data if no internal ID
      res.json(dbApi.formatOrderForAPI(localOrder));
      return;
    }

    const revolutOrder = await revolutApi.fetchRevolutOrder(internalId);

    if (!revolutOrder) {
      // Revolut API failed, return local data
      console.log(`[API] Falling back to local order data for ${publicId}`);
      res.json(dbApi.formatOrderForAPI(localOrder));
      return;
    }

    console.log(`[API] Revolut API returned order (state: ${revolutOrder.state}, payments: ${revolutOrder.payments?.length || 0})`);

    // Extract payment details from Revolut API response
    const latestPayment = revolutOrder.payments && revolutOrder.payments.length > 0
      ? revolutOrder.payments[0]
      : null;

    const revolutPaymentState = latestPayment?.state as string;
    const revolutPaymentId = latestPayment?.id;
    const revolutDeclineReason = latestPayment?.decline_reason || revolutOrder.decline_reason;

    // Update local order state if it changed
    if (revolutOrder.state !== localOrder.state) {
      orders.updateOrderState(publicId, revolutOrder.state);
    }

    // Update local payment details if they exist and changed
    if (revolutPaymentState && revolutPaymentState !== localOrder.payment_state) {
      console.log(`[API] Updating local payment state: ${localOrder.payment_state} -> ${revolutPaymentState}`);
      orders.updateOrderAndPaymentState(
        publicId,
        revolutOrder.state as import('../orders.js').OrderState,
        revolutPaymentState as import('../orders.js').PaymentState,
        revolutPaymentId,
        revolutDeclineReason
      );
    }

    const mergedOrder = {
      ...revolutOrder,
      // Ensure token is set (this is the public order ID users see)
      token: revolutOrder.token || localOrder.token,
      // Use synced payment details (prefer Revolut's latest data)
      payment_state: revolutPaymentState || localOrder.payment_state,
      payment_id: revolutPaymentId || localOrder.payment_id,
      decline_reason: revolutDeclineReason || localOrder.decline_reason,
    };

    console.log(`[API] Returning order - ID: ${mergedOrder.id}, payment_state: ${mergedOrder.payment_state || 'N/A'}`);

    // Return merged data (includes payments array from Revolut)
    res.json(mergedOrder);
  } catch (error) {
    console.error('[API] Get order error:', error);

    // Try to return local order data as fallback
    const publicId = req.params.id;
    const localOrder = dbApi.getLocalOrderByToken(publicId);

    if (localOrder) {
      console.log(`[API] Error occurred, returning local order data for ${publicId}`);
      res.json(dbApi.formatOrderForAPI(localOrder));
      return;
    }

    res.status(500).json({
      error: 'Failed to get order',
    });
  }
});

/**
 * Get user orders endpoint
 * GET /api/orders?userId=xxx
 * Retrieves all orders for a specific user from local database
 */
app.get('/api/orders', async (req, res): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid userId query parameter',
      });
      return;
    }

    console.log(`[API] Getting orders for user: ${userId}`);

    const userOrders = dbApi.getLocalUserOrders(userId);

    console.log(`[API] Found ${userOrders.length} order(s) for user ${userId}`);

    res.json({
      orders: dbApi.formatOrdersForAPI(userOrders),
      count: userOrders.length,
    });
  } catch (error) {
    console.error('[API] Get user orders error:', error);
    res.status(500).json({
      error: 'Failed to get orders',
    });
  }
});

/**
 * Webhook endpoint
 * POST /webhook
 * Receives payment status updates from Revolut
 *
 * Security:
 * - IP allowlisting (Revolut IPs only)
 * - Signature verification (HMAC-SHA256)
 * - Timestamp validation (replay prevention)
 */
app.post('/webhook', (req: ExtendedRequest, res: Response) => {
  try {
    // Get request details
    const signature = Array.isArray(req.headers['revolut-signature'])
      ? req.headers['revolut-signature'][0]
      : req.headers['revolut-signature'];
    const timestamp = req.headers['revolut-request-timestamp'];
    const rawBody = req.rawBody;
    const payload = req.body;
    const clientIp = webhookSecurity.getClientIp(req);

    console.log(`[Webhook] Received ${payload.event} for order ${payload.order_id} from ${clientIp}`);

    // === IP Allowlisting ===
    const isIpAllowed = webhookSecurity.isIpAllowed(clientIp);
    if (isIpAllowed && webhookSecurity.isSecurityEnabled()) {
      console.log(`[Webhook] IP allowlisted: ${clientIp}`);
    } else if (!isIpAllowed) {
      // IP is not in the allowlist
      console.warn(`[Webhook] Blocked request from disallowed IP: ${clientIp}`);
      res.status(403).send('IP address not allowed');
      return;
    }

    // === Signature Verification ===
    const signatureResult = webhookSecurity.validateWebhookSignature({
      signature,
      timestamp: timestamp as string,
      rawBody,
    });

    if (!signatureResult.valid) {
      console.warn(`[Webhook] Signature validation failed: ${signatureResult.error}`);
      res.status(403).send(signatureResult.error || 'Signature verification failed');
      return;
    }

    if (webhookSecurity.isSecurityEnabled()) {
      console.log('[Webhook] Signature verified and timestamp validated');
    } else {
      console.log('[Webhook] Security checks passed (development mode)');
    }

    // Process webhook event
    switch (payload.event) {
      case 'ORDER_COMPLETED':
        console.log('[Webhook] Order Completed!');
        ordersQueue.push(payload);
        break;

      case 'ORDER_AUTHORISED':
        console.log('[Webhook] Order Authorised!');
        ordersQueue.push(payload);
        break;

      case 'ORDER_FAILED':
        console.log('[Webhook] Order Failed!');
        ordersQueue.push(payload);
        break;

      case 'ORDER_CANCELLED':
        console.log('[Webhook] Order Cancelled!');
        ordersQueue.push(payload);
        break;

      case 'ORDER_PAYMENT_DECLINED':
        console.log('[Webhook] Payment Declined!');
        ordersQueue.push(payload);
        break;

      default:
        console.log(`[Webhook] Unhandled event: ${payload.event}`);
        ordersQueue.push(payload);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[Webhook] Error:', error);
    // Still return 200 to prevent retries
    res.sendStatus(200);
  }
});

/* ################ CLIENT ENDPOINTS ################ */

/**
 * Config endpoint
 * GET /config
 * Returns public configuration for frontend
 */
app.get('/config', (req, res) => {
  res.send({
    revolutPublicKey: process.env.REVOLUT_API_PUBLIC_KEY,
  });
});

/* ################ PRODUCTION: SERVE STATIC FILES ################ */

// Serve static files in production (built React app)
if (process.env.NODE_ENV === 'production') {
  const path = await import('path');
  const url = await import('url');

  // Get __dirname equivalent for ES modules
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Resolve staticDir: use STATIC_DIR env var if set, otherwise use __dirname relative path
  // __dirname is dist/server/api/, so we go up 3 levels to reach project root, then into client/dist
  const clientDist = process.env.STATIC_DIR
    ? path.resolve(process.cwd(), process.env.STATIC_DIR)
    : path.join(__dirname, '../../../client/dist');

  // Serve static files (JS, CSS, images, etc.)
  app.use(express.static(clientDist));

  // SPA fallback - serve index.html for all non-API routes
  // This enables client-side routing (/, /orders, /success, /failure, /cancel)
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook') || req.path === '/config') {
      return next();
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  console.log(`[Static] Serving React app from: ${clientDist}`);
} else {
  // Development: 404 handler for API-only mode
  app.use((req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.path,
      hint: 'Frontend runs separately via: npm run dev:client',
    });
  });
}

/* ################ START SERVER ################ */

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Revolut Pay API Server Running               ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  API URL:     http://localhost:${PORT}                        ║`);
  console.log(`║  Environment: ${process.env.REVOLUT_API_URL?.includes('sandbox') ? 'SANDBOX' : 'PRODUCTION'}                                  ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  API Endpoints:                                           ║');
  console.log('║    POST /api/orders        - Create order                 ║');
  console.log('║    GET  /api/orders/:id    - Get order details            ║');
  console.log('║    GET  /api/orders?userId= - Get user orders              ║');
  console.log('║    POST /webhook           - Webhook handler              ║');
  console.log('║    GET  /config            - Frontend config              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Note: Frontend runs separately via: npm run dev:client    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});
