import type { Feature, Geometry, Position } from 'geojson';
import type { LatLngBounds } from 'leaflet';

export interface FeatureIndex {
  [cf: string]: {
    feature: Feature;
    layerName: string;
  };
}

export function buildFeatureIndex(layers: Array<{ name: string; geoJson: { features: Feature[] } }>): FeatureIndex {
  const index: FeatureIndex = {};

  for (const layer of layers) {
    for (const feature of layer.geoJson.features) {
      if (feature.properties) {
        const cf = feature.properties['Nr_CF'] || feature.properties['nr_cf'] || feature.properties['NR_CF'];
        if (cf) {
          const cfKey = String(cf).toLowerCase();
          index[cfKey] = {
            feature,
            layerName: layer.name
          };
        }
      }
    }
  }

  return index;
}

export function simplifyGeometry(geometry: Geometry, tolerance: number): Geometry {
  if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
    return geometry;
  }

  if (geometry.type === 'LineString') {
    return {
      type: 'LineString',
      coordinates: simplifyCoordinates(geometry.coordinates, tolerance)
    };
  }

  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(ring => simplifyCoordinates(ring, tolerance))
    };
  }

  if (geometry.type === 'MultiLineString') {
    return {
      type: 'MultiLineString',
      coordinates: geometry.coordinates.map(line => simplifyCoordinates(line, tolerance))
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(polygon =>
        polygon.map(ring => simplifyCoordinates(ring, tolerance))
      )
    };
  }

  return geometry;
}

function simplifyCoordinates(coords: Position[], tolerance: number): Position[] {
  if (coords.length <= 2) return coords;

  const sqTolerance = tolerance * tolerance;
  const simplified = [coords[0]];

  for (let i = 1; i < coords.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = coords[i];

    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    const distSq = dx * dx + dy * dy;

    if (distSq > sqTolerance) {
      simplified.push(curr);
    }
  }

  simplified.push(coords[coords.length - 1]);
  return simplified;
}

export function getToleranceForZoom(zoom: number): number {
  if (zoom >= 16) return 0.00001;
  if (zoom >= 14) return 0.00005;
  if (zoom >= 12) return 0.0001;
  if (zoom >= 10) return 0.0005;
  if (zoom >= 8) return 0.001;
  return 0.005;
}

export function isFeatureInBounds(feature: Feature, bounds: LatLngBounds): boolean {
  if (!feature.geometry) return false;

  const geometry = feature.geometry;

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return bounds.contains([lat, lng]);
  }

  if (geometry.type === 'MultiPoint') {
    return geometry.coordinates.some(([lng, lat]) => bounds.contains([lat, lng]));
  }

  if (geometry.type === 'LineString') {
    return geometry.coordinates.some(([lng, lat]) => bounds.contains([lat, lng]));
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0].some(([lng, lat]) => bounds.contains([lat, lng]));
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.some(line =>
      line.some(([lng, lat]) => bounds.contains([lat, lng]))
    );
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(polygon =>
      polygon[0].some(([lng, lat]) => bounds.contains([lat, lng]))
    );
  }

  return true;
}

export function filterFeaturesByBounds(
  features: Feature[],
  bounds: LatLngBounds | null
): Feature[] {
  if (!bounds) return features;

  const expandedBounds = bounds.pad(0.2);

  return features.filter(feature => isFeatureInBounds(feature, expandedBounds));
}

export function simplifyFeature(feature: Feature, zoom: number): Feature {
  const tolerance = getToleranceForZoom(zoom);

  if (!feature.geometry || tolerance === 0) {
    return feature;
  }

  return {
    ...feature,
    geometry: simplifyGeometry(feature.geometry, tolerance)
  };
}
