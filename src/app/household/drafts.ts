import { Person, Pet } from '../map/models';

// Form state as typed, converted to a create body or a PATCH diff. Limits match the backend's PersonCreate and
// PetCreate. A PATCH sends `version` plus only the changed fields; null clears an optional one.

export interface PersonDraft {
  name: string;
  role: 'adult' | 'kid';
  birthYear: string;
  approx: boolean;
  phone: string;
  email: string;
  notes: string;
}

export interface PetDraft {
  name: string;
  species: string;
  notes: string;
}

export type Body = Record<string, string | number | boolean | null>;

const optional = (text: string) => text.trim() || null;

export function personDraft(person?: Person): PersonDraft {
  return {
    name: person?.name ?? '',
    role: person?.role ?? 'adult',
    birthYear: person?.birth_year?.toString() ?? '',
    approx: person?.birth_year_approx ?? false,
    phone: person?.phone ?? '',
    email: person?.email ?? '',
    notes: person?.notes ?? '',
  };
}

export function petDraft(pet?: Pet): PetDraft {
  return { name: pet?.name ?? '', species: pet?.species ?? '', notes: pet?.notes ?? '' };
}

/** Why the form can't be saved, or null when it can. */
export function personProblem(
  draft: PersonDraft,
  thisYear = new Date().getFullYear(),
): string | null {
  if (!draft.name.trim()) return 'Add a name.';
  if (draft.name.trim().length > 80) return 'Keep the name under 80 characters.';
  const year = draft.birthYear.trim();
  if (year && !(/^\d{4}$/.test(year) && +year >= 1900 && +year <= thisYear))
    return `Birth year should be between 1900 and ${thisYear}.`;
  if (draft.phone.trim().length > 40) return 'Keep the phone number under 40 characters.';
  const email = draft.email.trim();
  if (email && !email.includes('@')) return 'That email address needs an @.';
  if (email.length > 254) return 'That email address is too long.';
  if (draft.notes.trim().length > 1000) return 'Notes run past 1,000 characters.';
  return null;
}

export function petProblem(draft: PetDraft): string | null {
  if (!draft.name.trim()) return 'Add a name.';
  if (draft.name.trim().length > 80) return 'Keep the name under 80 characters.';
  if (draft.species.trim().length > 40) return 'Keep the kind of animal under 40 characters.';
  if (draft.notes.trim().length > 1000) return 'Notes run past 1,000 characters.';
  return null;
}

function personFields(draft: PersonDraft): Body {
  const year = draft.birthYear.trim();
  return {
    name: draft.name.trim(),
    role: draft.role,
    birth_year: year ? Number(year) : null,
    birth_year_approx: draft.approx,
    phone: optional(draft.phone),
    email: optional(draft.email),
    notes: optional(draft.notes),
  };
}

function petFields(draft: PetDraft): Body {
  return {
    name: draft.name.trim(),
    species: optional(draft.species),
    notes: optional(draft.notes),
  };
}

/** Optional fields left blank are omitted: the API stores absent, not null, for a new item. */
const create = (fields: Body): Body =>
  Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null));

export const personCreate = (draft: PersonDraft) => create(personFields(draft));
export const petCreate = (draft: PetDraft) => create(petFields(draft));

/** Null when nothing changed. */
function patch(version: number, old: Body, fields: Body): Body | null {
  const changed = Object.entries(fields).filter(([key, value]) => (old[key] ?? null) !== value);
  return changed.length ? { version, ...Object.fromEntries(changed) } : null;
}

export function personPatch(person: Person, draft: PersonDraft): Body | null {
  return patch(person.version, personFields(personDraft(person)), personFields(draft));
}

export function petPatch(pet: Pet, draft: PetDraft): Body | null {
  return patch(pet.version, petFields(petDraft(pet)), petFields(draft));
}
