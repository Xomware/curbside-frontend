import { CaptureOp, Parsed } from '../app/capture/ops';

export const op = (
  over: Partial<CaptureOp> & Pick<CaptureOp, 'op' | 'household_ref'>,
): CaptureOp => ({
  target_id: null,
  fields: {},
  evidence: '',
  confidence: 0.9,
  needs_review: false,
  checked: true,
  ...over,
});

/**
 * Shaped like curbside-backend's recorded `next_door_only` case after the server checks: the person comes
 * before the create of their house, both start unchecked, and a phrase is left unresolved.
 */
export const nextDoor: Parsed = {
  operations: [
    op({
      op: 'add_person',
      household_ref: 'new:1',
      fields: { name: 'Sam', role: 'adult' },
      evidence: "there's a guy named Sam who just moved in",
      confidence: 0.5,
      needs_review: true,
      checked: false,
    }),
    op({
      op: 'create_household',
      household_ref: 'new:1',
      fields: { label: 'Next door to Pumpernickel' },
      evidence: "Next door to Pumpernickel's there's a guy",
      confidence: 0.4,
      needs_review: true,
      checked: false,
    }),
    op({
      op: 'touch_last_talked',
      household_ref: 'h1',
      evidence: 'Ran into Clementine',
    }),
    op({
      op: 'update_person',
      household_ref: 'h1',
      target_id: 'p2',
      fields: { birth_year: 2021, birth_year_approx: false },
      evidence: 'Odo just turned five',
    }),
  ],
  unresolved: ['the guy with the red truck'],
  base_versions: { h1: 3 },
};
