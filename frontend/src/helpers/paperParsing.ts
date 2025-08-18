

import * as Types from "Types";

import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-csl';
import '@citation-js/plugin-doi';

import { storePapersInDB } from "./db";


/** Normalize a BibTeX author list to "First Last, First2 Last2" */
function normalizeAuthors(auth?: string): string {
  if (!auth) return 'No authors available';
  // citation-js already understands BibTeX name forms; but we also accept raw strings
  // Split on ' and ' that are not within braces
  const parts = auth.split(/\s+and\s+/i).map(s => s.trim()).filter(Boolean);
  const normalized = parts.map(name => {
    const segments = name.split(',').map(s => s.trim());
    if (segments.length === 1) return segments[0];
    if (segments.length === 2) return `${segments[1]} ${segments[0]}`.trim();
    if (segments.length === 3) return `${segments[2]} ${segments[0]} ${segments[1]}`.trim();
    return name;
  });
  return normalized.join(', ');
}

function formatAuthorsFromCite(authors: any[]): string {
  if (!Array.isArray(authors) || authors.length === 0) return 'No authors available';
  const names = authors.map(a => {
    const given = (a.given || '').trim();
    const family = (a.family || '').trim();
    return [given, family].filter(Boolean).join(' ').trim();
  }).filter(Boolean);
  return names.length ? names.join(', ') : 'No authors available';
}

export async function parseCiteToPapers(cite: Cite): Promise<Types.PaperDB[]> {
  const data = cite.data || [];
  const entries: Types.PaperDB[] = data.map((item: any) => {

    const entry: Types.PaperDB = {
      document_title: item.title || '',
      year: (item.issued?.['date-parts']?.[0]?.[0] || item.year || '') + '',
      abstract: item.abstract || '',
      doi: item.DOI || item.doi || '',
      authors: normalizeAuthors(formatAuthorsFromCite(item.author)),
      //bibtex: JSON.stringify(item)
    };
    return entry;
  });
  return entries;
}

/** Try to obtain metadata for a DOI using citation-js */
export async function fetchFromDOIOrBibtex(doi: string): Promise<Cite> {
  const cleaned = doi.trim().replace(/^https?:\/\//i, '').replace(/^doi\.org\//i, '');
  // 1) citation-js with plugin-doi (returns internal data)
  try {
    const c = await Cite.async(cleaned); // either use doi resolve or bibtex directly
    return c;
  } catch {}
  throw new Error('Unable to resolve DOI metadata');
}


export async function insertPapersFromDOIOrBibtex(doi: string): Promise<number[]> {
  const cite = await fetchFromDOIOrBibtex(doi);
  const papers = await parseCiteToPapers(cite);
  return storePapersInDB(papers);
}
