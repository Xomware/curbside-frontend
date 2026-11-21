import { ActivityItem } from './activity-store';

/** One line per item, matching the iOS push alerts. */
export function activityText(item: ActivityItem): string {
  const who = item.actor_name;
  const street = item.map_name ?? 'a street';
  switch (item.kind) {
    case 'member_joined':
      return `${who} joined ${street}`;
    case 'added_to_street':
      return `${who} added you to ${street}`;
    case 'removed_from_street':
      return `${who} removed you from ${street}`;
    case 'street_handed_to_you':
      return `${street} is yours now`;
    case 'household_added':
      return item.household_label
        ? `${who} added ${item.household_label} to ${street}`
        : `${who} added a household to ${street}`;
    case 'friend_added':
      return `You and ${who} are friends`;
    default:
      return item.map_name ? `${who} changed ${street}` : `News from ${who}`;
  }
}

/** Whether the item leads to a street you can still open. */
export function opensStreet(item: ActivityItem): boolean {
  return !!item.map_id && item.kind !== 'removed_from_street';
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "Just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", then "Nov 10". */
export function ago(iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return relative.format(-minutes, 'minute');
  if (minutes < 24 * 60) return relative.format(-Math.floor(minutes / 60), 'hour');
  const days = Math.floor(minutes / (24 * 60));
  if (days < 7) return relative.format(-days, 'day');
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
