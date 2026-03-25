import { updateOrderState, updateOrderAndPaymentState, updatePaymentState, getPublicOrderId, type PaymentState } from '../orders.js';

/**
 * Webhook event types from Revolut
 * Extended to include payment details
 */
type RevolutWebhookEvent = {
  event: 'ORDER_COMPLETED' | 'ORDER_AUTHORISED' | 'ORDER_FAILED' | 'ORDER_CANCELLED' | 'ORDER_PAYMENT_DECLINED' | 'ORDER_PAYMENT_FAILED';
  order_id: string;
  created_at: string;
  state?: string;
  decline_reason?: string;
  payment_id?: string;
  payment_state?: string;
};

/**
 * Order processing queue
 * Processes webhook events asynchronously
 */
class OrdersQueue {
  private queue: RevolutWebhookEvent[] = [];
  private processing: boolean = false;

  /**
   * Add webhook event to queue
   * @param event - Webhook event from Revolut
   */
  push(event: RevolutWebhookEvent): void {
    this.queue.push(event);
    console.log(`[Queue] Added ${event.event} for order ${event.order_id} to queue (${this.queue.length} in queue)`);
    this.process();
  }

  /**
   * Process queue asynchronously
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) break;

      try {
        await this.processEvent(event);
      } catch (error) {
        console.error(`[Queue] Error processing ${event.event} for order ${event.order_id}:`, error);
      }
    }

    this.processing = false;
  }

  private async processEvent(event: RevolutWebhookEvent): Promise<void> {
    console.log(`[Queue] Processing ${event.event} for order ${event.order_id}`);

    const publicOrderId = getPublicOrderId(event.order_id);
    if (!publicOrderId) {
      console.log(`[Queue] Order not found in local storage: ${event.order_id}`);
      return;
    }

    // Map event to order state and default payment state
    const eventConfig: Record<string, { orderState: string; defaultPaymentState?: PaymentState }> = {
      ORDER_COMPLETED: { orderState: 'completed', defaultPaymentState: 'completed' },
      ORDER_AUTHORISED: { orderState: 'authorised', defaultPaymentState: 'authorised' },
      ORDER_FAILED: { orderState: 'failed', defaultPaymentState: 'failed' },
      ORDER_CANCELLED: { orderState: 'cancelled', defaultPaymentState: 'cancelled' },
      ORDER_PAYMENT_DECLINED: { orderState: 'failed', defaultPaymentState: 'declined' },
      ORDER_PAYMENT_FAILED: { orderState: 'failed', defaultPaymentState: 'failed' },
    };

    const config = eventConfig[event.event];
    if (!config) {
      console.log(`[Queue] Unhandled event type: ${event.event}`);
      return;
    }

    const { orderState, defaultPaymentState } = config;
    const paymentState = (event.payment_state as PaymentState) || defaultPaymentState;

    // Special handling for ORDER_PAYMENT_DECLINED
    if (event.event === 'ORDER_PAYMENT_DECLINED') {
      console.log(`[Queue] Payment for order ${publicOrderId} declined!${event.decline_reason ? ` Reason: ${event.decline_reason}` : ''}`);
      updatePaymentState(publicOrderId, 'declined', event.payment_id, event.decline_reason);
      updateOrderState(publicOrderId, 'failed');
    } else {
      console.log(`[Queue] Order ${publicOrderId} ${orderState}! Payment: ${paymentState}${event.decline_reason ? ` Reason: ${event.decline_reason}` : ''}`);
      updateOrderAndPaymentState(publicOrderId, orderState as any, paymentState, event.payment_id, event.decline_reason);
    }

    // Specific business logic for completed orders
    if (event.event === 'ORDER_COMPLETED') {
      console.log(`[Queue] Order ${publicOrderId} fulfillment triggered`);
    }
  }

  /**
   * Get queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is processing (for monitoring)
   */
  isProcessing(): boolean {
    return this.processing;
  }
}

// Export singleton instance
const ordersQueue = new OrdersQueue();
export default ordersQueue;
