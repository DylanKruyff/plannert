const KNOWN_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { name: "Rotterdam", lat: 51.9244, lng: 4.4777 },
  { name: "Utrecht", lat: 52.0907, lng: 5.1214 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
];

function nearestCity(lat: number, lng: number): string {
  let best = KNOWN_CITIES[0];
  let bestDist = Infinity;
  for (const city of KNOWN_CITIES) {
    const d = (city.lat - lat) ** 2 + (city.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  // If far from any known city, fall back to a generic label.
  return bestDist < 2 ? best.name : "your area";
}

/**
 * Convert coordinates to a city name. Tries a free, key-less reverse geocoding
 * service and falls back to the nearest known city if it is unavailable.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        city?: string;
        locality?: string;
      };
      const city = data.city || data.locality;
      if (city) return city;
    }
  } catch {
    // ignore and fall back
  }
  return nearestCity(lat, lng);
}
