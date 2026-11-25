function coordinate(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value.replace(",", "."));
  return NaN;
}

export function mapCoordinates(latitude: unknown, longitude: unknown) {
  const lat = coordinate(latitude);
  const lng = coordinate(longitude);
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}
