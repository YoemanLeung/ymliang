/** A missing or unknown year opens the latest available year. */
export function yearIndex(years, year) {
  const found = years.findIndex(value => String(value) === String(year));
  return found < 0 ? 0 : found;
}

/** Move through available years, including gaps, without wrapping at either end. */
export function moveYear(index, direction, length) {
  return Math.max(0, Math.min(length - 1, index + direction));
}

/** Separate fragment namespaces keep multiple year browsers independent. */
export function yearFromHash(hash, prefix) {
  if (!prefix || !hash.startsWith('#' + prefix)) return undefined;
  const year = hash.slice(prefix.length + 1);
  return /^\d{4}$/.test(year) ? year : undefined;
}
