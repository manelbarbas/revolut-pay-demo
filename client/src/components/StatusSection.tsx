import type { Status } from '../types';

interface StatusSectionProps {
  status: Status | null;
}

export function StatusSection({ status }: StatusSectionProps) {
  if (!status) {
    return (
      <section className="status-section" style={{ display: 'none' }} id="status-section">
        <h2>Payment Status</h2>
        <div id="status-content"></div>
      </section>
    );
  }

  return (
    <section className={`status-section status-${status.type}`} id="status-section">
      <h2>Payment Status</h2>
      <div id="status-content">
        <h3>{status.title}</h3>
        <div dangerouslySetInnerHTML={{ __html: status.content }} />
      </div>
    </section>
  );
}
