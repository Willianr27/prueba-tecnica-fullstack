import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const d = new Date(date);
  const rel = formatDistanceToNow(d, { addSuffix: true, locale: es });
  return (
    <time dateTime={date} title={d.toLocaleString('es')} className={className}>
      {rel}
    </time>
  );
}
