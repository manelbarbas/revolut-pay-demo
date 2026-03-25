import { useState, useEffect } from 'react';
import { getUserIdSync } from '../hooks/useUserId';

interface Order {
  token: string;
  id: string;
  user_id: string;
  description: string;
  state: string;
  payment_state?: string | null;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  decline_reason?: string;
  payment_id?: string;
}

interface OrdersResponse {
  orders: Order[];
  count: number;
}

type PaymentState = 'pending' | 'authentication_challenge' | 'authentication_verified' | 'authorisation_started' | 'authorisation_passed' | 'authorised' | 'capture_started' | 'captured' | 'completed' | 'declined' | 'soft_declined' | 'failed' | 'cancelled';

const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  pending: 'Pending',
  authentication_challenge: 'Auth Challenge',
  authentication_verified: 'Auth Verified',
  authorisation_started: 'Authorising',
  authorisation_passed: 'Auth Passed',
  authorised: 'Authorised',
  capture_started: 'Capturing',
  captured: 'Captured',
  completed: 'Completed',
  declined: 'Declined',
  soft_declined: 'Soft Declined',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const PAYMENT_STATE_COLORS: Record<PaymentState, string> = {
  pending: '#f59e0b',
  authentication_challenge: '#f59e0b',
  authentication_verified: '#3b82f6',
  authorisation_started: '#f59e0b',
  authorisation_passed: '#3b82f6',
  authorised: '#10b981',
  capture_started: '#f59e0b',
  captured: '#3b82f6',
  completed: '#10b981',
  declined: '#ef4444',
  soft_declined: '#f59e0b',
  failed: '#ef4444',
  cancelled: '#6b7280',
};

const ORDER_STATE_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  authorised: 'Authorised',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const ORDER_STATE_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  processing: '#f59e0b',
  completed: '#10b981',
  authorised: '#10b981',
  failed: '#ef4444',
  cancelled: '#6b7280',
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      const userId = getUserIdSync();
      if (!userId) {
        setError('User ID not found. Please refresh the page.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/orders?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data: OrdersResponse = await response.json();
        setOrders(data.orders);
        setLoading(false);
      } catch (err) {
        setError('Failed to load orders. Please try again.');
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const formatAmount = (amount: number, currency: string): string => {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="container">
        <header style={{ marginBottom: '2rem' }}>
          <h1>My Orders</h1>
        </header>
        <main style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '1.5rem' }}>Loading orders...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <header style={{ marginBottom: '2rem' }}>
          <h1>My Orders</h1>
        </header>
        <main>
          <section className="status-section status-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn"
              style={{ marginTop: '1rem' }}
            >
              Retry
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Orders</h1>
        <a href="/" className="btn" style={{ textDecoration: 'none' }}>
          New Order
        </a>
      </header>

      <main>
        {orders.length === 0 ? (
          <section className="status-section" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>No Orders Yet</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              You haven't placed any orders yet. Start by creating a new order.
            </p>
            <a href="/" className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
              Create First Order
            </a>
          </section>
        ) : (
          <section>
            <div style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
              Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
            </div>

            {/* Orders Table */}
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 0.8fr 1fr 1fr 1fr 1.2fr',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--color-bg-secondary)',
                borderBottom: '1px solid var(--color-border)',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                <div>Description</div>
                <div>Amount</div>
                <div>Order Status</div>
                <div>Payment Status</div>
                <div>Date</div>
                <div>Order ID</div>
              </div>

              {/* Table Rows */}
              {orders.map((order) => (
                <div
                  key={order.token}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 0.8fr 1fr 1fr 1fr 1.2fr',
                    gap: '1rem',
                    padding: '1rem',
                    borderBottom: orders[orders.length - 1].token !== order.token ? '1px solid var(--color-border)' : 'none',
                    fontSize: '0.875rem',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: 500 }}>
                    {order.description}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {formatAmount(order.amount, order.currency)}
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: `${ORDER_STATE_COLORS[order.state] || '#6b7280'}20`,
                      color: ORDER_STATE_COLORS[order.state] || '#6b7280',
                    }}>
                      {ORDER_STATE_LABELS[order.state] || order.state}
                    </span>
                  </div>
                  <div>
                    {order.payment_state ? (
                      <div>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: `${PAYMENT_STATE_COLORS[order.payment_state as PaymentState] || '#6b7280'}20`,
                          color: PAYMENT_STATE_COLORS[order.payment_state as PaymentState] || '#6b7280',
                        }}>
                          {PAYMENT_STATE_LABELS[order.payment_state as PaymentState] || order.payment_state}
                        </span>
                        {order.payment_state === 'declined' && order.decline_reason && (
                          <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                            {order.decline_reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {formatDate(order.created_at)}
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {order.id}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
