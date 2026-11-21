import { ActivityItem } from './activity-store';
import { activityText as text, ago, opensStreet } from './text';

const item = (kind: string, over: Partial<ActivityItem> = {}): ActivityItem => ({
  id: 'i',
  kind,
  actor_name: 'Sam',
  map_id: 'map1',
  map_name: 'Quillfeather Ln',
  created_at: '2026-11-20T12:00:00Z',
  ...over,
});

describe('activity text', () => {
  it('says what happened for each kind', () => {
    expect(text(item('member_joined'))).toBe('Sam joined Quillfeather Ln');
    expect(text(item('added_to_street'))).toBe('Sam added you to Quillfeather Ln');
    expect(text(item('removed_from_street'))).toBe('Sam removed you from Quillfeather Ln');
    expect(text(item('street_handed_to_you'))).toBe('Quillfeather Ln is yours now');
    expect(text(item('household_added'))).toBe('Sam added a household to Quillfeather Ln');
    expect(text(item('household_added', { household_label: 'Mossbottom' }))).toBe(
      'Sam added Mossbottom to Quillfeather Ln',
    );
    expect(text(item('friend_added', { map_id: undefined, map_name: undefined }))).toBe(
      'You and Sam are friends',
    );
    expect(text(item('something_new'))).toBe('Sam changed Quillfeather Ln');
  });

  it('links to the street unless you were removed from it', () => {
    expect(opensStreet(item('member_joined'))).toBe(true);
    expect(opensStreet(item('removed_from_street'))).toBe(false);
    expect(opensStreet(item('friend_added', { map_id: undefined }))).toBe(false);
  });

  it('gives a relative time, then a date past a week', () => {
    const now = new Date('2026-11-20T12:00:00Z');
    expect(ago('2026-11-20T11:59:40Z', now)).toBe('Just now');
    expect(ago('2026-11-20T11:55:00Z', now)).toBe('5 minutes ago');
    expect(ago('2026-11-20T09:00:00Z', now)).toBe('3 hours ago');
    expect(ago('2026-11-19T10:00:00Z', now)).toBe('yesterday');
    expect(ago('2026-11-16T12:00:00Z', now)).toBe('4 days ago');
    expect(ago('2026-11-10T12:00:00Z', now)).toBe('Nov 10');
  });
});
