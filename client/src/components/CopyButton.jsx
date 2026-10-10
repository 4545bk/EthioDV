import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = String(text);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`copy-btn ${copied ? 'copied' : ''}`}
      title={`Copy ${label || 'value'} to clipboard`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span>{copied ? 'Copied!' : 'Copy'}</span>
    </button>
  );
}
