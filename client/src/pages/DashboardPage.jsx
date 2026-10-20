import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { apiRequest } from '../services/api.js';
import QueueBadge from '../components/QueueBadge.jsx';
import Alert from '../components/Alert.jsx';
import { PlusCircle, FileText, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function DashboardPage({ onNavigate }) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    apiRequest('/entries')
      .then((res) => {
        if (res.success) setEntries(res.data);
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(err.message || 'Could not load entries.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateNew = async () => {
    try {
      setErrorMessage('');
      const res = await apiRequest('/entries', { method: 'POST' });
      if (res.success) {
        onNavigate('wizard', { entryId: res.data.entry.id });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not initialize application');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>{t('myApplications')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>የDV-2027 ማመልከቻዎችዎን ሁኔታ እዚህ ይከታተሉ</p>
        </div>

        <button onClick={handleCreateNew} className="btn btn-primary">
          <PlusCircle size={16} />
          {t('newApplication')}
        </button>
      </div>

      {errorMessage && (
        <Alert
          type="danger"
          message={errorMessage}
          onClose={() => setErrorMessage('')}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          መረጃዎች በመጫን ላይ ናቸው... / Loading entries...
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={48} color="var(--primary-400)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>እስካሁን ምንም ማመልከቻ አልሞሉም</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, maxWidth: 440, margin: '0 auto 24px auto' }}>
            የእርስዎንና የቤተሰብዎን የDV-2027 ማመልከቻ አሁን በደቂቃዎች ውስጥ መጀመር ይችላሉ።
          </p>
          <button onClick={handleCreateNew} className="btn btn-primary" style={{ padding: '12px 24px' }}>
            {t('newApplication')}
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {entries.map((entry) => (
            <div key={entry.id} className="card card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <strong style={{ fontSize: 16, color: 'var(--text-main)', fontWeight: 700 }}>{entry.applicantName}</strong>
                  <span style={{ fontSize: 13, color: 'var(--primary-600)', fontFamily: 'monospace', fontWeight: 600 }}>
                    #{entry.uniqueReference}
                  </span>
                  <QueueBadge status={entry.status} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                  <span>የተጀመረበት: {new Date(entry.createdAt).toLocaleDateString()}</span>
                  {entry.confirmationNumber && (
                    <span style={{ color: 'var(--accent-400)', fontWeight: 600 }}>
                      ✓ Confirmation: {entry.confirmationNumber}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {entry.status === 'DRAFT' && (
                  <button
                    onClick={() => onNavigate('wizard', { entryId: entry.id })}
                    className="btn btn-primary"
                    style={{ fontSize: 13, padding: '8px 16px' }}
                  >
                    ቅጹን ቀጥል / Continue
                  </button>
                )}

                {entry.status === 'PAYMENT_PENDING' && (
                  <button
                    onClick={() => onNavigate('payment', { entryId: entry.id })}
                    className="btn btn-accent"
                    style={{ fontSize: 13, padding: '8px 16px' }}
                  >
                    ክፍያ ፈጽም / Pay 1,000 ETB
                  </button>
                )}

                {(entry.status === 'QUEUED' || entry.status === 'FILING_IN_PROGRESS') && (
                  <button
                    onClick={() => onNavigate('tracker', { entryId: entry.id })}
                    className="btn btn-secondary"
                    style={{ fontSize: 13, padding: '8px 16px' }}
                  >
                    <Clock size={14} />
                    {t('trackQueue')}
                  </button>
                )}

                {entry.status === 'CONFIRMED' && (
                  <button
                    onClick={() => onNavigate('tracker', { entryId: entry.id })}
                    className="btn btn-secondary"
                    style={{ fontSize: 13, padding: '8px 16px', borderColor: 'var(--success)', color: 'var(--success)' }}
                  >
                    <CheckCircle2 size={14} />
                    ይፋዊ ሰርተፊኬት / View Certificate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
