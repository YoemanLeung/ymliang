import {chronologicalPapers} from './publications.mjs';

/** Resolve reference IDs against the one public bibliography; fail on stale IDs. */
export function topicReferences(topic, records) {
  const ids = new Set(topic.sections.flatMap(section => section.citations));
  const papers = chronologicalPapers(records).filter(paper => ids.has(paper.bibcode));
  const available = new Set(papers.map(paper => paper.bibcode));
  for (const id of ids) {
    if (!available.has(id)) throw new Error(`Unknown paper ${id} in research topic ${topic.slug}`);
  }
  return papers;
}

export function shortCitation(paper) {
  return `${paper.first_author.split(',')[0]} et al. (${paper.year})`;
}
