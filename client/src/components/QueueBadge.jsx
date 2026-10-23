import React from 'react';
import { useLanguage } from '../i18n/index.jsx';

export default function QueueBadge({ status, paymentStatus }) {
  const { t } = useLanguage();

  switch (status) {
    case 'CONFIRMED':
    case 'FILED':
      return <span className="badge badge-success">{t('statusConfirmed')}</span>;
    case 'FILING_IN_PROGRESS':
      return <span className="badge badge-info animate-pulse-glow">{t('statusFiling')}</span>;
    case 'QUEUED':
      return <span className="badge badge-info">{t('statusQueued')}</span>;
    case 'PAYMENT_PENDING':
      if (paymentStatus === 'PENDING_VERIFICATION') {
        return (
          <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            ደረሰኝ በመጣራት ላይ / Reviewing
          </span>
        );
      }
      return <span className="badge badge-warning">{t('statusPaymentPending')}</span>;
    case 'PAYMENT_REJECTED':
      return <span className="badge badge-danger">{t('statusRejected')}</span>;
    case 'NEEDS_REVISION':
      return <span className="badge badge-warning">{t('statusRevision')}</span>;
    case 'REFUND_PENDING':
      return <span className="badge badge-warning">Refund Pending</span>;
    case 'REFUNDED':
      return <span className="badge badge-info">Refunded</span>;
    case 'DRAFT':
    default:
      return <span className="badge badge-secondary" style={{ background: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)' }}>{t('statusDraft')}</span>;
  }
}
