import { houseNumber } from '../map/geo';
import { Household } from '../map/models';
import { CaptureOp, FieldValue, text } from './ops';

/** How one proposed change reads on review: whose house, who in it, and what changes. */
export interface Summary {
  /** House number for the plaque tab; null for a new house or one without an address. */
  number: string | null;
  /** "PUMPERNICKEL · ODO", "GRAY HOUSE · NEW PERSON". */
  who: string;
  change: string;
}

/** "new:1" → the label its create_household gives it. */
export function newLabels(ops: CaptureOp[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const op of ops)
    if (op.op === 'create_household')
      labels[op.household_ref] ??= text(op.fields['label']) ?? 'New house';
  return labels;
}

export function summarize(
  op: CaptureOp,
  households: Household[],
  labels: Record<string, string>,
): Summary {
  const household = households.find((h) => h.id === op.household_ref);
  const house = household?.private.label ?? labels[op.household_ref] ?? 'New house';
  const f = op.fields;
  const name = (list: { id: string; name: string }[] | undefined) =>
    list?.find((x) => x.id === op.target_id)?.name ?? null;

  let detail: string | null = null;
  let change: string;
  switch (op.op) {
    case 'create_household':
      detail = 'New house';
      change = join([text(f['label']), text(f['address'])]);
      break;
    case 'update_household':
      change = join([labelled('Label', f['label']), labelled('Address', f['address'])]);
      break;
    case 'add_person':
      detail = 'New person';
      change = join([text(f['name']), ...person(f)]);
      break;
    case 'update_person':
      detail = name(household?.private.people);
      change = join([labelled('Name', f['name']), ...person(f)]);
      break;
    case 'add_pet':
      detail = 'New pet';
      change = join([text(f['name']), text(f['species']), text(f['notes'])]);
      break;
    case 'update_pet':
      detail = name(household?.private.pets);
      change = join(
        ['name', 'species', 'notes'].map((k) => labelled(k[0].toUpperCase() + k.slice(1), f[k])),
      );
      break;
    case 'add_note':
      detail = 'Note';
      change = text(f['text']) ?? '';
      break;
    case 'touch_last_talked':
      change = 'Talked today';
  }
  return {
    number: houseNumber(household?.private.address ?? null),
    who: [house, detail].filter(Boolean).join(' · ').toUpperCase(),
    change,
  };
}

function person(f: Record<string, FieldValue>): (string | null)[] {
  const year = f['birth_year'];
  const born =
    typeof year === 'number'
      ? f['birth_year_approx'] === true
        ? `born ~${year}`
        : `born ${year}`
      : null;
  const birthday = text(f['birthday']);
  return [text(f['role']), born, birthday && `birthday ${birthday}`, text(f['notes'])];
}

function labelled(label: string, value: FieldValue | undefined): string | null {
  if (typeof value === 'string') return `${label}: ${value}`;
  return value === null ? `${label}: cleared` : null;
}

function join(parts: (string | null)[]): string {
  const joined = parts.filter((p): p is string => !!p).join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export interface Mark {
  start: number;
  end: number;
  /** The change's row number, 1-based. */
  number: number;
}

/**
 * Where each change's evidence sits in the transcript, case-insensitively, first match, in reading order.
 * Spans that overlap an earlier one are dropped, and evidence that isn't verbatim simply isn't marked.
 */
export function evidenceMarks(transcript: string, evidence: string[]): Mark[] {
  const lower = transcript.toLowerCase();
  const found = evidence.flatMap((span, i) => {
    const needle = span
      .trim()
      .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '')
      .toLowerCase();
    const start = needle ? lower.indexOf(needle) : -1;
    return start < 0 ? [] : [{ start, end: start + needle.length, number: i + 1 }];
  });
  let end = 0;
  return found
    .sort((a, b) => a.start - b.start)
    .filter((mark) => {
      if (mark.start < end) return false;
      end = mark.end;
      return true;
    });
}
