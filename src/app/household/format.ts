import { Person } from '../map/models';

/** "8", or "~5" for a guessed year. Null without a birth year. */
export function age(person: Person, year = new Date().getFullYear()): string | null {
  if (person.birth_year === undefined) return null;
  return (person.birth_year_approx ? '~' : '') + (year - person.birth_year);
}

/** "Born 2018", or "Born ~2021, a guess". */
export function born(person: Person): string | null {
  if (person.birth_year === undefined) return null;
  return person.birth_year_approx
    ? `Born ~${person.birth_year}, a guess`
    : `Born ${person.birth_year}`;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "Talked today", "Talked 6 days ago", "Talked last month". Calendar days, local time. */
export function talked(iso: string | null, now = new Date()): string {
  if (!iso) return "Haven't talked yet";
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((day(now) - day(new Date(iso))) / 86_400_000);
  if (days < 30) return `Talked ${relative.format(-days, 'day')}`;
  if (days < 365) return `Talked ${relative.format(-Math.round(days / 30), 'month')}`;
  return `Talked ${relative.format(-Math.round(days / 365), 'year')}`;
}

export function talkedToday(iso: string | null, now = new Date()): boolean {
  return iso !== null && new Date(iso).toDateString() === now.toDateString();
}

/** "NOV 10". */
export function noteDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    .toUpperCase();
}
