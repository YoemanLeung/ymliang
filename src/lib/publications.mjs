/** Newest first for all authors and paper types. ADS order breaks month ties. */
export function chronologicalPapers(records) {
  return records
    .filter((paper) => ['refereed', 'preprint'].includes(paper.type))
    .map((paper, index) => ({ ...paper, source_order: paper.source_order ?? index }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.source_order - b.source_order);
}

export function groupByYear(records) {
  return [...new Set(records.map((paper) => paper.year))]
    .sort((a, b) => b - a)
    .map((year) => ({ year, papers: records.filter((paper) => paper.year === year) }));
}

export function localUrl(path = '') {
  const base = import.meta.env?.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
