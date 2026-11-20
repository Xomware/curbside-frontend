import { Ring } from '../app/map/geo';
import { Household, Place } from '../app/map/models';

/** A square of `size` degrees with its south-west corner at (lat, lng). */
export function square(lat: number, lng: number, size = 0.0001): Ring {
  return [
    [lng, lat],
    [lng + size, lat],
    [lng + size, lat + size],
    [lng, lat + size],
    [lng, lat],
  ];
}

export const place: Place = {
  id: 'map1',
  name: 'Quillfeather Ln',
  center: { lat: 40, lng: -75 },
  radius_m: 300,
  role: 'owner',
  footprint: { status: 'ready', version: 2 },
  version: 1,
};

export function household(
  id: string,
  over: Partial<Household> = {},
  label = 'Pumpernickel',
): Household {
  return {
    id,
    version: 1,
    lat: 40,
    lng: -75,
    building_id: null,
    private: { label, address: null, last_talked_at: null, people: [], pets: [] },
    published: null,
    ...over,
  };
}

/** Two houses (osm:way/1 at 40,-75 with a courtyard hole; osm:way/2 east of it) and a shed. */
export const collection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'osm:way/1',
      geometry: {
        type: 'Polygon',
        coordinates: [square(40, -75, 0.0003), square(40.0001, -74.9999)],
      },
      properties: { building: 'house', area_m2: 400, accessory: false },
    },
    {
      type: 'Feature',
      id: 'osm:way/2',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[square(40, -74.999)], [square(40.001, -74.999)]],
      },
      properties: { building: 'house', area_m2: 120, accessory: false },
    },
    {
      type: 'Feature',
      id: 'osm:way/3',
      geometry: { type: 'Polygon', coordinates: [square(40.002, -75)] },
      properties: { building: 'shed', area_m2: 9, accessory: true },
    },
    {
      type: 'Feature',
      id: 'osm:node/4',
      geometry: { type: 'Point', coordinates: [-75, 40] },
      properties: {},
    },
  ],
};
