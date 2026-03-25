import { useOrderVerification, formatAmount } from '../hooks/useOrderVerification';

type PaymentState = 'pending' | 'authentication_challenge' | 'authentication_verified' | 'authorisation_started' | 'authorisation_passed' | 'authorised' | 'capture_started' | 'captured' | 'completed' | 'declined' | 'soft_declined' | 'failed' | 'cancelled';

const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  pending: 'Pending',
  authentication_challenge: 'Authentication Required',
  authentication_verified: 'Authentication Verified',
  authorisation_started: 'Authorising...',
  authorisation_passed: 'Authorisation Passed',
  authorised: 'Authorised',
  capture_started: 'Capturing...',
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

export function SuccessPage() {
  const { status, order, error } = useOrderVerification();

  const handleReturn = () => {
    window.location.href = '/';
  };

  // Show loading state while verifying
  if (status === 'pending') {
    return (
      <div className="container">
        <main style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <h1>Verifying Payment...</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '16px' }}>
            Please wait while we confirm your payment status.
          </p>
        </main>
      </div>
    );
  }

  // Show error state if verification failed
  if (status === 'error' || !order) {
    return (
      <div className="container">
        <main style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
          <h1 style={{ color: '#f59e0b' }}>Unable to Verify Payment</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '16px' }}>
            {error || 'We could not verify your payment status. Please contact support if the problem persists.'}
          </p>
          <button
            onClick={handleReturn}
            className="btn-primary"
            style={{ marginTop: '32px' }}
          >
            Return to Checkout
          </button>
        </main>
      </div>
    );
  }

  // Show verified success with payment details
  return (
    <div className="container">
      <main style={{ textAlign: 'center', padding: '40px 0' }}>
        <h1>Order Successful!</h1>
        <p style={{ fontSize: '18px', color: '#666', marginTop: '16px' }}>
          Thank you for your purchase.
        </p>

        {/* Order Details */}
        <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'left', maxWidth: '400px', margin: '24px auto 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            <span>Order ID:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{order.id}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            <span>Amount:</span>
            <span style={{ fontWeight: 500 }}>{formatAmount(order.amount, order.currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            <span>Order Status:</span>
            <span style={{ fontWeight: 500, color: '#10b981', textTransform: 'capitalize' }}>{order.state}</span>
          </div>
          {order.payments && order.payments.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}>
                <span>Payment Status:</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: PAYMENT_STATE_COLORS[order.payments[0].state as PaymentState] || '#666',
                  }}
                >
                  {PAYMENT_STATE_LABELS[order.payments[0].state as PaymentState] || order.payments[0].state}
                </span>
              </div>
              {order.payments[0].decline_reason && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#dc2626',
                }}>
                  <strong>Decline Reason:</strong> {order.payments[0].decline_reason}
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={handleReturn}
          className="btn-primary"
          style={{ marginTop: '32px' }}
        >
          Make Another Purchase
        </button>
      </main>
    </div>
  );
}
