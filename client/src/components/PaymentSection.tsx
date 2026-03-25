interface PaymentSectionProps {
  amount: number;
  unitAmount: number;
  quantity: number;
  onAmountChange: (unitAmount: number) => void;
  isReady: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}

const TEST_AMOUNTS = [
  { amount: 1000, label: '£10.00', desc: 'Normal payment' },
  { amount: 1001, label: '£10.01', desc: 'Declined (no reason)' },
  { amount: 1002, label: '£10.02', desc: 'Insufficient funds' },
  { amount: 1003, label: '£10.03', desc: 'Suspected fraud' },
  { amount: 1004, label: '£10.04', desc: 'Withdrawal limit' },
  { amount: 1005, label: '£10.05', desc: 'Do not honour' },
];

export function PaymentSection({
  amount,
  unitAmount,
  quantity,
  onAmountChange,
  isReady,
  containerRef,
}: PaymentSectionProps) {
  const displayTotalPrice = `£${(amount / 100).toFixed(2)}`;
  const displayUnitPrice = `£${(unitAmount / 100).toFixed(2)}`;

  return (
    <section className="payment-section">
      <h2>Payment Details</h2>

      {/* Price Summary */}
      <div className="price-summary" style={{
        padding: '1rem',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '1rem',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Unit Price:</span>
          <strong>{displayUnitPrice}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Quantity:</span>
          <strong>{quantity}</strong>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--color-border)',
        }}>
          <span style={{ fontWeight: 600 }}>Total:</span>
          <strong style={{ fontSize: '1.125rem', color: 'var(--color-primary)' }}>{displayTotalPrice}</strong>
        </div>
      </div>

      {/* Quick Test Amounts (Per-Unit) */}
      <div className="form-group">
        <label>Unit Price (Sandbox Testing)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          {TEST_AMOUNTS.map(({ amount: testAmount, label, desc }) => {
            const calculatedTotal = testAmount * quantity;
            const totalLabel = `£${(calculatedTotal / 100).toFixed(2)}`;
            const isSelected = unitAmount === testAmount;

            return (
              <button
                key={testAmount}
                type="button"
                onClick={() => onAmountChange(testAmount)}
                className={isSelected ? 'test-amount-btn selected' : 'test-amount-btn'}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg)',
                  color: isSelected ? 'var(--color-white)' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                    e.currentTarget.style.color = 'var(--color-white)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                    e.currentTarget.style.color = 'var(--color-text)';
                  }
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {label} {quantity > 1 && `(×${quantity} = ${totalLabel})`}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{desc}</div>
              </button>
            );
          })}
        </div>
        <p className="hint">
          Select a per-unit price to test different payment scenarios. Total amount is calculated based on quantity.
        </p>
      </div>

      {/* Revolut Pay Widget Container */}
      <div className="revolut-pay-container">
        {!isReady ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading payment system...
          </p>
        ) : null}
        <div ref={containerRef} id="revolut-pay"></div>
      </div>
    </section>
  );
}
