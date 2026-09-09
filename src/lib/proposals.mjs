const roles = new Set(['PI', 'Co-I', 'Collaborator']);
const states = new Set(['awarded', 'grade-c']);
const units = new Set(['hours', 'nights', 'ks', 'orbits']);
const bases = new Set(['allocated', 'requested', 'observed']);
// Broad wavelength groups; optical/infrared facilities have overlapping coverage.
const wavelengthOrder = ['Chandra', 'Subaru', 'Keck', 'Magellan', 'Gemini North', 'Blanco 4-m', 'Hubble', 'JWST', 'Roman', 'JCMT', 'ALMA', 'NOEMA', 'VLA', 'MeerKAT', 'uGMRT'];
const wavelengthRank = facility => {
  const rank = wavelengthOrder.indexOf(facility);
  return rank < 0 ? wavelengthOrder.length : rank;
};

/** Years refer to selection/cycle starts; no exact award dates are inferred. */
export function chronologicalProposals(records) {
  const ids = new Set();
  for (const record of records) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) || ids.has(record.id)) throw new Error(`Invalid or duplicate proposal ID: ${record.id}`);
    if (!Number.isInteger(record.year) || record.year < 1900) throw new Error(`Invalid proposal year: ${record.id}`);
    for (const field of ['title', 'cycle', 'facility', 'pi']) {
      if (typeof record[field] !== 'string' || !record[field].trim()) throw new Error(`Missing ${field}: ${record.id}`);
    }
    if (!roles.has(record.role) || !states.has(record.state) || !['observing', 'analysis'].includes(record.kind)) throw new Error(`Invalid proposal classification: ${record.id}`);
    if (record.url && new URL(record.url).protocol !== 'https:') throw new Error(`Invalid proposal URL: ${record.id}`);
    if (record.time && (!Number.isFinite(record.time.value) || record.time.value <= 0 || !units.has(record.time.unit) || !bases.has(record.time.basis))) throw new Error(`Invalid observing time: ${record.id}`);
    if (record.kind === 'analysis' && record.time) throw new Error(`Analysis program cannot have observing time: ${record.id}`);
    if (record.state === 'grade-c' && record.time?.basis === 'allocated') throw new Error(`Grade C request must not be presented as guaranteed time: ${record.id}`);
    if (record.support && (record.role !== 'PI' || record.support.status !== 'approved' || record.support.currency !== 'USD' || !Number.isFinite(record.support.amount) || record.support.amount <= 0 || !record.support.administrativePi || !record.support.scope || new URL(record.support.policyUrl).protocol !== 'https:')) throw new Error(`Invalid associated support: ${record.id}`);
    ids.add(record.id);
  }
  return [...records].sort((a, b) => b.year - a.year || a.facility.localeCompare(b.facility) || b.cycle.localeCompare(a.cycle, 'en', {numeric: true}) || a.id.localeCompare(b.id));
}

/** Export totals only. Project IDs, titles, teams, and source links stay in the local archive. */
export function summarizeProposals(records, updated) {
  const ordered = chronologicalProposals(records);
  if (!ordered.length) throw new Error('Cannot summarize an empty proposal archive');
  const facilities = new Map();
  const empty = () => ({measurements: [], unquantified: 0, analysis: 0});
  for (const record of ordered) {
    if (!facilities.has(record.facility)) facilities.set(record.facility, {
      id: record.facility.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      facility: record.facility, pi: empty(), collaboration: empty(),
    });
    const cell = facilities.get(record.facility)[record.role === 'PI' ? 'pi' : 'collaboration'];
    if (record.kind === 'analysis') {cell.analysis++; continue;}
    if (!record.time) {cell.unquantified++; continue;}
    const {value, unit, basis} = record.time;
    let total = cell.measurements.find(item => item.unit === unit && item.basis === basis);
    if (!total) {total = {value: 0, unit, basis}; cell.measurements.push(total);}
    total.value = Math.round((total.value + value) * 1e8) / 1e8;
  }
  return {updated, period: {start: ordered.at(-1).year, end: ordered[0].year},
    facilities: [...facilities.values()].sort((a,b) => wavelengthRank(a.facility) - wavelengthRank(b.facility) || a.facility.localeCompare(b.facility))};
}

export function summaryTimeLabel({value, unit}) {
  // Preserve an actual half-night award instead of inflating it to a full night.
  if (unit === 'nights' && value === 0.5) return '½ night';
  const amount = Math.round(value);
  const number = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0}).format(amount);
  const label = unit === 'hours' ? 'h' : unit === 'ks' ? 'ks' : amount === 1 ? unit.slice(0,-1) : unit;
  return `${number} ${label}`;
}
