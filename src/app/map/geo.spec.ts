import { collection, household } from '../../testing/map-fixtures';
import { buildingAt, contains, decodeFootprints, distance, houseNumber, nearest } from './geo';

describe('geo', () => {
  const footprints = decodeFootprints(collection);

  it('decodes polygons and multipolygons, skipping other geometry', () => {
    expect(footprints.map((f) => [f.id, f.polygons.length, f.accessory])).toEqual([
      ['osm:way/1', 1, false],
      ['osm:way/2', 2, false],
      ['osm:way/3', 1, true],
    ]);
  });

  it('hit-tests inside, outside and in a hole', () => {
    const [house] = footprints;
    expect(contains(house, 40.00005, -74.99995)).toBe(true);
    expect(contains(house, 40.00015, -74.99985)).toBe(false);
    expect(contains(house, 40.0005, -74.99995)).toBe(false);
  });

  it('selects across multipolygon parts and never an accessory building', () => {
    expect(buildingAt(footprints, 40.00105, -74.99895)?.id).toBe('osm:way/2');
    expect(buildingAt(footprints, 40.00205, -74.99995)).toBeNull();
  });

  it('reads the house number off the address', () => {
    expect(houseNumber('11 Quillfeather Ln')).toBe('11');
    expect(houseNumber('10A Quillfeather Ln')).toBe('10A');
    expect(houseNumber('Quillfeather Ln')).toBeNull();
    expect(houseNumber(null)).toBeNull();
  });

  it('measures metres and orders by distance', () => {
    expect(Math.round(distance({ lat: 40, lng: -75 }, { lat: 40.001, lng: -75 }))).toBe(111);
    const far = household('far', { lat: 40.01 });
    const near = household('near', { lat: 40.0001 });
    const mid = household('mid', { lat: 40.001 });
    expect(nearest([far, near, mid], { lat: 40, lng: -75 }, 2).map((h) => h.id)).toEqual([
      'near',
      'mid',
    ]);
  });
});
