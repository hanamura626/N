import { useEffect, useRef, useState } from 'react';
import { Check, Copy, AlertTriangle } from 'lucide-react';

type CopyState = 'idle' | 'copied' | 'failed';

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(field);
  if (!ok) throw new Error('Copy not supported');
}

interface CopyButtonProps {
  text: string;
  label: string;
}

export default function CopyButton({ text, label }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  async function handleCopy() {
    try {
      await copyText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState('idle'), 2000);
  }

  const isCopied = state === 'copied';
  const isFailed = state === 'failed';

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Salin link ${label}`}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        isCopied
          ? 'bg-success-container text-success-on-container'
          : isFailed
            ? 'bg-error-container text-error-on-container'
            : 'bg-primary text-primary-on hover:shadow-md'
      }`}
    >
      {isCopied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : isFailed ? (
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{isCopied ? 'Tersalin' : isFailed ? 'Gagal' : 'Salin'}</span>
    </button>
  );
}
