import { getRevolutPayOrderIdURLParam } from '@revolut/checkout';

export function FailurePage() {
  const handleReturn = () => {
    window.location.href = '/';
  };

  // Get order ID from URL for display purposes
  const orderId = getRevolutPayOrderIdURLParam();

  return (
    <div className="container">
      <main style={{ textAlign: 'center', padding: '40px 0' }}>
        <h1 style={{ color: '#ef4444' }}>Payment Failed</h1>
        <p style={{ fontSize: '18px', color: '#666', marginTop: '16px' }}>
          Your payment could not be processed. Please try again or use a different payment method.
        </p>

        {/* Show order details if available */}
        {orderId && (
          <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px', textAlign: 'left', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}>
              <span>Order ID:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{orderId}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleReturn}
          className="btn-primary"
          style={{ marginTop: '32px' }}
        >
          Try Again
        </button>
      </main>
    </div>
  );
}
