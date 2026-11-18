// capture_parse output (curbside-backend lambdas/capture_parse/handler.py). `fields` hold only what was said.

export type FieldValue = string | number | boolean | null;

export interface CaptureOp {
  op:
    | 'create_household'
    | 'update_household'
    | 'add_person'
    | 'update_person'
    | 'add_pet'
    | 'update_pet'
    | 'add_note'
    | 'touch_last_talked';
  /** An existing household id, or "new:1", "new:2"… for one this capture creates. */
  household_ref: string;
  /** The person or pet an update changes. */
  target_id?: string | null;
  fields: Record<string, FieldValue>;
  /** The span of the transcript this came from. */
  evidence: string;
  confidence: number;
  /** Placed only by position ("next door"), so it starts unchecked. */
  needs_review: boolean;
  checked: boolean;
}

export interface Parsed {
  operations: CaptureOp[];
  unresolved: string[];
  /** Goes back unchanged with apply, which 409s if anything moved since. */
  base_versions: Record<string, number>;
}

export const isNew = (op: CaptureOp) => op.household_ref.startsWith('new:');

export const text = (value: FieldValue | undefined): string | null =>
  typeof value === 'string' ? value : null;
