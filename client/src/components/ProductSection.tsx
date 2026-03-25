import chairImage from '../../assets/chair.png';

const UNIT_PRICE = 1000; // £10.00 in pence

interface ProductSectionProps {
  amount: number;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

export function ProductSection({ amount, quantity, onQuantityChange }: ProductSectionProps) {
  const displayUnitPrice = `£${(UNIT_PRICE / 100).toFixed(2)}`;
  const displayTotalPrice = `£${(amount / 100).toFixed(2)}`;

  const handleIncrement = () => {
    if (quantity < 10) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <section className="product-section">
      <h2>Product</h2>
      <div className="product-card">
        <div className="product-image">
          <img src={chairImage} alt="Chair" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="product-details">
          <h3>Chair</h3>
          <p className="product-description">Comfortable office chair</p>
          <p className="product-price-unit">{displayUnitPrice} per chair</p>

          {/* Quantity Selector */}
          <div className="quantity-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <span className="quantity-label" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Quantity:</span>
            <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="quantity-btn"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  backgroundColor: quantity <= 1 ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                  color: quantity <= 1 ? 'var(--color-text-secondary)' : 'var(--color-text)',
                  cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (quantity > 1) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (quantity > 1) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                  }
                }}
              >
                −
              </button>
              <span className="quantity-value" style={{ padding: '0.5rem 0.75rem', minWidth: '2.5rem', textAlign: 'center', fontWeight: 500 }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= 10}
                className="quantity-btn"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  backgroundColor: quantity >= 10 ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                  color: quantity >= 10 ? 'var(--color-text-secondary)' : 'var(--color-text)',
                  cursor: quantity >= 10 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (quantity < 10) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (quantity < 10) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                  }
                }}
              >
                +
              </button>
            </div>
          </div>

          <p className="product-price" style={{ marginTop: '1rem' }}>
            Total: <strong>{displayTotalPrice}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
