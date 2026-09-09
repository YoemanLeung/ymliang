const roles = new Set(['PI', 'Co-I', 'Collaborator']);
const states = new Set(['awarded', 'grade-c']);
const units = new Set(['hours', 'nights', 'ks', 'orbits']);
const bases = new Set(['allocated', 'requested', 'observed']);

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

export function proposalsByYear(records) {
  const groups = new Map();
  for (const proposal of chronologicalProposals(records)) {
    if (!groups.has(proposal.year)) groups.set(proposal.year, []);
    groups.get(proposal.year).push(proposal);
  }
  return [...groups].map(([year, proposals]) => ({year, proposals}));
}

export function proposalTimeLabel(record) {
  if (record.kind === 'analysis') return 'Analysis program';
  if (!record.time) return record.state === 'grade-c' ? 'Grade C queue' : 'Approved program';
  const {value, unit, basis} = record.time;
  const label = unit === 'hours' ? 'h' : value === 1 && ['nights', 'orbits'].includes(unit) ? unit.slice(0, -1) : unit;
  return `${value} ${label} ${basis === 'requested' ? 'requested' : basis === 'observed' ? 'observed' : 'awarded'}`;
}
