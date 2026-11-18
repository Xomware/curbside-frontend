import { Household } from './models';

/** [lng, lat], GeoJSON order. */
export type Ring = [number, number][];

/** One OSM building outline. A relation with several parts carries several polygons, each an outer ring + holes. */
export interface Footprint {
  id: string;
  polygons: Ring[][];
  /** Garages, sheds and anything under 30 m². Drawn lighter and never selected. */
  accessory: boolean;
}

interface Feature {
  id?: string | number;
  geometry: { type: string; coordinates: unknown } | null;
  properties?: { accessory?: boolean } | null;
}

/** Features from the footprints file (B7: id `osm:way/<id>`, `{building, area_m2, accessory}`). Non-polygons skipped. */
export function decodeFootprints(collection: { features: Feature[] }): Footprint[] {
  return collection.features.flatMap((feature) => {
    const { geometry } = feature;
    if (feature.id === undefined || !geometry) return [];
    let polygons: Ring[][];
    if (geometry.type === 'Polygon') polygons = [geometry.coordinates as Ring[]];
    else if (geometry.type === 'MultiPolygon') polygons = geometry.coordinates as Ring[][];
    else return [];
    return [
      { id: String(feature.id), polygons, accessory: feature.properties?.accessory ?? false },
    ];
  });
}

/** Inside any part of the outline and outside its holes. Even-odd ray casting on lng/lat, exact enough at house scale. */
export function contains(footprint: Footprint, lat: number, lng: number): boolean {
  return footprint.polygons.some(
    ([outer, ...holes]) => inRing(outer, lng, lat) && !holes.some((hole) => inRing(hole, lng, lat)),
  );
}

function inRing(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** The building under a tap. Accessory buildings never select. */
export function buildingAt(footprints: Footprint[], lat: number, lng: number): Footprint | null {
  return footprints.find((f) => !f.accessory && contains(f, lat, lng)) ?? null;
}

/** "11" from "11 Quillfeather Ln", "10A" from "10A Quillfeather Ln". */
export function houseNumber(address: string | null): string | null {
  return address?.match(/^\d+[A-Za-z]?\b/)?.[0] ?? null;
}

/** Great-circle metres. */
export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function nearest(
  households: Household[],
  here: { lat: number; lng: number },
  limit: number,
): Household[] {
  return households
    .map((household) => ({ household, meters: distance(here, household) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit)
    .map((n) => n.household);
}
