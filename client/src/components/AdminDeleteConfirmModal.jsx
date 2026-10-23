import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function AdminDeleteConfirmModal({ title, subtitle, onConfirm, onClose, isDeleting }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          color: '#0f172a',
          width: '100%',
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #fee2e2',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={22} />
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
          {title || 'Confirm Deletion'}
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
          {subtitle || 'Are you sure you want to permanently delete this item? This action cannot be undone.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
