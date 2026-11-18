import { Person } from '../map/models';
import { age, born, noteDate, talked, talkedToday } from './format';

const kid = (over: Partial<Person>): Person => ({
  id: 'k',
  version: 1,
  name: 'Odo',
  role: 'kid',
  ...over,
});

describe('card formatting', () => {
  it('gives exact, guessed and missing ages', () => {
    expect(age(kid({ birth_year: 2018 }), 2026)).toBe('8');
    expect(age(kid({ birth_year: 2021, birth_year_approx: true }), 2026)).toBe('~5');
    expect(age(kid({}), 2026)).toBeNull();
    expect(born(kid({ birth_year: 2021, birth_year_approx: true }))).toBe('Born ~2021, a guess');
    expect(born(kid({ birth_year: 2018 }))).toBe('Born 2018');
  });

  it('says when you last talked in calendar days', () => {
    const now = new Date(2026, 10, 17, 9);
    expect(talked(null, now)).toBe("Haven't talked yet");
    expect(talked(new Date(2026, 10, 17, 8).toISOString(), now)).toBe('Talked today');
    expect(talked(new Date(2026, 10, 16, 23).toISOString(), now)).toBe('Talked yesterday');
    expect(talked(new Date(2026, 10, 11).toISOString(), now)).toBe('Talked 6 days ago');
    expect(talked(new Date(2026, 8, 1).toISOString(), now)).toBe('Talked 3 months ago');
    expect(talkedToday(new Date(2026, 10, 17, 1).toISOString(), now)).toBe(true);
    expect(talkedToday(null, now)).toBe(false);
  });

  it('stamps notes with the month and day', () => {
    expect(noteDate(new Date(2026, 9, 2).toISOString())).toBe('OCT 02');
  });
});
