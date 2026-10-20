import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Unified, professional glassmorphism Alert component
 * 
 * @param {'success' | 'danger' | 'error' | 'warning' | 'info'} type
 * @param {string} [title]
 * @param {string | React.ReactNode} [message]
 * @param {React.ReactNode} [children]
 * @param {Function} [onClose]
 * @param {React.ReactNode} [action]
 * @param {React.CSSProperties} [style]
 */
export default function Alert({
  type = 'info',
  title,
  message,
  children,
  onClose,
  action,
  style = {},
  className = '',
}) {
  const content = message || children;
  if (!content) return null;

  const normalizedType = type === 'error' ? 'danger' : type;

  // Icon mapping with theme tailored colors
  const icons = {
    success: <CheckCircle2 size={19} color="#10b981" />,
    danger: <AlertCircle size={19} color="#ef4444" />,
    warning: <AlertTriangle size={19} color="#f59e0b" />,
    info: <Info size={19} color="var(--primary-500)" />,
  };

  const defaultTitles = {
    success: 'ስኬታማ (Success)',
    danger: 'ስህተት ተፈጥሯል (Error)',
    warning: 'ማሳሰቢያ (Notice)',
    info: 'መረጃ (Information)',
  };

  return (
    <div
      role="alert"
      className={`app-alert app-alert-${normalizedType} ${className}`}
      style={style}
    >
      <div className="app-alert-icon">
        {icons[normalizedType] || icons.info}
      </div>

      <div className="app-alert-content">
        {title && <div className="app-alert-title">{title}</div>}
        <div className="app-alert-message">{content}</div>
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="app-alert-close"
          title="Dismiss / ዝጋ"
          aria-label="Dismiss alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
