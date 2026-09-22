/**
 * Real district centroid coordinates (latitude, longitude) for districts
 * commonly used in BhumiDrishti demo/seed data.
 *
 * Sources: public district boundary data from Census of India / DILRMP portals.
 * These are centroid approximations — NOT survey-grade coordinates.
 */
const DISTRICT_CENTROIDS = {
  // Maharashtra
  'pune':       { lat: 18.5204, lng: 73.8567 },
  'mumbai':     { lat: 19.0760, lng: 72.8777 },
  'nagpur':     { lat: 21.1458, lng: 79.0882 },
  'nashik':     { lat: 19.9975, lng: 73.7898 },
  'aurangabad': { lat: 19.8762, lng: 75.3433 },
  'satara':     { lat: 17.6805, lng: 74.0183 },
  'kolhapur':   { lat: 16.7050, lng: 74.2433 },

  // Uttar Pradesh
  'varanasi':   { lat: 25.3176, lng: 82.9739 },
  'lucknow':    { lat: 26.8467, lng: 80.9462 },
  'agra':       { lat: 27.1767, lng: 78.0081 },
  'prayagraj':  { lat: 25.4358, lng: 81.8463 },
  'kanpur':     { lat: 26.4499, lng: 80.3319 },

  // Rajasthan
  'jaipur':     { lat: 26.9124, lng: 75.7873 },
  'jodhpur':    { lat: 26.2389, lng: 73.0243 },
  'udaipur':    { lat: 24.5854, lng: 73.7125 },
  'ajmer':      { lat: 26.4499, lng: 74.6399 },
  'kota':       { lat: 25.2138, lng: 75.8648 },

  // Madhya Pradesh
  'bhopal':     { lat: 23.2599, lng: 77.4126 },
  'indore':     { lat: 22.7196, lng: 75.8577 },

  // Telangana
  'hyderabad':  { lat: 17.3850, lng: 78.4867 },
  'warangal':   { lat: 17.9784, lng: 79.5941 },
};

/**
 * Generate a deterministic approximate bounding polygon from a district centroid.
 * The polygon is a small square (~500m side) centered on the centroid,
 * offset slightly by a hash of the survey number so different records
 * in the same district don't stack exactly on top of each other.
 *
 * @param {string} district - District name (case-insensitive)
 * @param {string} [surveyNumber=''] - Survey number for deterministic offset
 * @returns {{ geo: Object|null, geoSource: 'approximate'|'none' }}
 */
function approximateGeoFromDistrict(district, surveyNumber = '') {
  const key = (district || '').toLowerCase().trim();
  const centroid = DISTRICT_CENTROIDS[key];

  if (!centroid) {
    return { geo: null, geoSource: 'none' };
  }

  // Simple deterministic hash from survey number for small offset
  let hash = 0;
  const sv = String(surveyNumber);
  for (let i = 0; i < sv.length; i++) {
    hash = ((hash << 5) - hash + sv.charCodeAt(i)) | 0;
  }
  // Normalize hash to a small offset range (±0.01 degrees ≈ ±1 km)
  const offsetLng = ((hash % 100) / 10000);
  const offsetLat = (((hash >> 8) % 100) / 10000);

  const cLng = centroid.lng + offsetLng;
  const cLat = centroid.lat + offsetLat;
  const d = 0.0025; // ~250m half-side

  return {
    geo: {
      type: 'Polygon',
      coordinates: [
        [
          [cLng, cLat],
          [cLng + d, cLat],
          [cLng + d, cLat + d],
          [cLng, cLat + d],
          [cLng, cLat],
        ],
      ],
    },
    geoSource: 'approximate',
  };
}

module.exports = { DISTRICT_CENTROIDS, approximateGeoFromDistrict };
