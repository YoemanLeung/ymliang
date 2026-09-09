export const talkTypes = Object.freeze({
  talk: 'Talk',
  invited_talk: 'Invited talk',
  seminar: 'Seminar',
  poster: 'Poster',
  poster_flash: 'Poster / flash talk',
  flash_talk: 'Flash talk',
  tutorial: 'Invited tutorial',
});

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(value)) return false;
  if (value.length === 7) return true;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/** Preserve date precision; unknown days follow dated entries in the same month. */
export function chronologicalTalks(records) {
  const ids = new Set();
  for (const talk of records) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(talk.id) || ids.has(talk.id)) throw new Error(`Invalid or duplicate talk ID: ${talk.id}`);
    if (!validDate(talk.date)) throw new Error(`Invalid talk date: ${talk.id}`);
    if (!Object.hasOwn(talkTypes, talk.type)) throw new Error(`Unknown talk type: ${talk.id}`);
    if (typeof talk.event !== 'string' || !talk.event.trim()) throw new Error(`Missing event: ${talk.id}`);
    if (talk.title !== null && (typeof talk.title !== 'string' || !talk.title.trim())) throw new Error(`Invalid talk title: ${talk.id}`);
    if (talk.url && new URL(talk.url).protocol !== 'https:') throw new Error(`Invalid event URL: ${talk.id}`);
    ids.add(talk.id);
  }
  return [...records].sort((a, b) => b.date.localeCompare(a.date));
}

export function talksByYear(records) {
  const groups = new Map();
  for (const talk of chronologicalTalks(records)) {
    const year = Number(talk.date.slice(0, 4));
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(talk);
  }
  return [...groups].map(([year, talks]) => ({year, talks}));
}

export function talkDateLabel(date) {
  if (!validDate(date)) throw new Error(`Invalid talk date: ${date}`);
  return new Intl.DateTimeFormat('en-GB', {
    ...(date.length === 10 ? {day: '2-digit'} : {}),
    month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date((date.length === 7 ? date + '-01' : date) + 'T00:00:00Z'));
}
