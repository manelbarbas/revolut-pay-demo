import { getRevolutPayOrderIdURLParam } from '@revolut/checkout';

export function CancelPage() {
  const handleReturn = () => {
    window.location.href = '/';
  };

  const orderId = getRevolutPayOrderIdURLParam();

  return (
    <div className="container">
      <main style={{ textAlign: 'center', padding: '40px 0' }}>
        <h1 style={{ color: '#f59e0b' }}>Payment Cancelled</h1>
        <p style={{ fontSize: '18px', color: '#666', marginTop: '16px' }}>
          You cancelled the payment. You can try again when you're ready.
        </p>

        {orderId && (
          <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#fffbeb', borderRadius: '8px', textAlign: 'left', maxWidth: '400px', margin: '24px auto 0' }}>
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
