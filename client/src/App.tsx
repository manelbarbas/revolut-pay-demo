import { useState, useEffect } from 'react';
import { useRevolutPay } from './hooks/useRevolutPay';
import { useUserId } from './hooks/useUserId';
import { Header } from './components/Header';
import { ProductSection } from './components/ProductSection';
import { PaymentSection } from './components/PaymentSection';
import { SuccessPage } from './components/SuccessPage';
import { FailurePage } from './components/FailurePage';
import { CancelPage } from './components/CancelPage';
import { OrdersPage } from './components/OrdersPage';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [unitAmount, setUnitAmount] = useState(1000);
  const [quantity, setQuantity] = useState(1);

  const { isReady, error, containerRef, mountWidget } = useRevolutPay();
  const { userId: currentUserId } = useUserId();

  // Listen for path changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Calculate total amount based on unit price and quantity
  const totalAmount = unitAmount * quantity;

  // Mount widget when amount/quantity changes and SDK is ready (only on main page)
  useEffect(() => {
    if (isReady && currentPath === '/') {
      mountWidget(totalAmount, 'GBP', 'Chair', quantity);
    }
  }, [totalAmount, quantity, isReady, mountWidget, currentPath]);

  const handleAmountChange = (newUnitAmount: number) => {
    setUnitAmount(newUnitAmount);
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  // Route handling
  if (currentPath === '/orders') {
    return <OrdersPage />;
  }

  if (currentPath === '/success') {
    return <SuccessPage />;
  }

  if (currentPath === '/failure') {
    return <FailurePage />;
  }

  if (currentPath === '/cancel') {
    return <CancelPage />;
  }

  // Main checkout page
  if (error) {
    return (
      <div className="container">
        <Header />
        <main>
          <section className="status-section status-error">
            <h2>Error</h2>
            <p>{error}</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />
      <main className="checkout-layout">
        <ProductSection
          amount={totalAmount}
          quantity={quantity}
          onQuantityChange={handleQuantityChange}
        />
        <PaymentSection
          amount={totalAmount}
          unitAmount={unitAmount}
          quantity={quantity}
          onAmountChange={handleAmountChange}
          isReady={isReady}
          containerRef={containerRef}
        />
      </main>
    </div>
  );
}

export default App;
