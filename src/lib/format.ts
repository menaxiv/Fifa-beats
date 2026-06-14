import type { Timestamp } from 'firebase/firestore';

type TimestampLike = Timestamp | Date | null | undefined;

function toDate(ts: TimestampLike): Date | null {
  if (!ts) return null;
  return 'toDate' in ts ? ts.toDate() : ts;
}

export function formatDateTime(ts: TimestampLike): string {
  const date = toDate(ts);
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toDatetimeLocal(ts: TimestampLike): string {
  const date = toDate(ts);
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
