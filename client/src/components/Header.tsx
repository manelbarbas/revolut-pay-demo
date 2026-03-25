export function Header() {
  const currentPath = window.location.pathname;

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h1>Revolut Pay</h1>
        <p className="subtitle">Sandbox Environment - Payment Testing</p>
      </div>
      <nav>
        {currentPath === '/orders' ? (
          <a href="/" className="btn" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
            New Order
          </a>
        ) : (
          <a href="/orders" className="btn" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
            My Orders
          </a>
        )}
      </nav>
    </header>
  );
}
