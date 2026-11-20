// Shapes as curbside-backend returns them (lambdas/common/households.py, maps.py). Optional child fields are
// absent, not null, when unset.

export interface Place {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius_m: number;
  /** The caller's role: the owner shares and deletes; members edit. */
  role: 'owner' | 'member';
  footprint: { status: 'pending' | 'ready' | 'empty' | 'failed'; version: number };
  version: number;
}

export interface Person {
  id: string;
  version: number;
  name: string;
  role: 'adult' | 'kid';
  birth_year?: number;
  /** "About 6" from a capture: the year is a guess. */
  birth_year_approx?: boolean;
  birthday?: string;
  notes?: string;
}

export interface Pet {
  id: string;
  version: number;
  name: string;
  species?: string;
  notes?: string;
}

export interface Note {
  id: string;
  text: string;
  source: 'voice' | 'text' | 'manual';
  created_at: string;
}

/** `people`/`pets` are absent from PATCH responses and `notes` from map loads: absent means not sent, not none. */
export interface Household {
  id: string;
  version: number;
  lat: number;
  lng: number;
  building_id: string | null;
  private: {
    label: string;
    address: string | null;
    last_talked_at: string | null;
    people?: Person[];
    pets?: Pet[];
    notes?: Note[];
  };
  /** The post-MVP self-published card. Always null for now. */
  published: object | null;
}

/** A picked building or a dropped pin. `address` arrives from the reverse lookup, if Apple has one. */
export interface Spot {
  lat: number;
  lng: number;
  buildingId: string | null;
  address?: string | null;
}
