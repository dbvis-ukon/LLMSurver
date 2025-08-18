import * as Types from "Types";

import { db } from "./db";

function csvEscapeField(v: any): string {
  const s = (v ?? '').toString();
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function exportPapersLocally(input: { run_id: number; alias: string; consensus?: Array<Types.ConsensusClassification>; }): Promise<{ url: string; blob: Blob; filename: string; } | { error: string; }> {
  const { run_id, alias } = input;
  try {
    let rows: any[] = [];
    if (run_id === -1) {
      const papers = await db.papers.toArray();
      rows = papers.map(p => ({
        paper_id: p.paper_id,
        document_title: p.document_title,
        year: p.year,
        abstract: p.abstract,
        doi: p.doi,
        authors: p.authors
      }));
    } else {
      const entries = await db.runEntries.where('run_id').equals(run_id).toArray();
      const models = await db.models.toArray();
      const modelNames = new Map<number, string>();
      for (const m of models) modelNames.set(m.model_id!, m.name);
      const byPaper = new Map<number, any[]>();
      for (const e of entries) {
        const arr = byPaper.get(e.paper_id) || [];
        arr.push({ model_name: modelNames.get(e.model_id) || String(e.model_id), classification: e.classification, answer: e.answer });
        byPaper.set(e.paper_id, arr);
      }
      const papers = await db.papers.bulkGet([...byPaper.keys()]);
      rows = papers.map((p: any, idx: any) => {
        if (!p) return null;
        const model_responses = byPaper.get(p.paper_id!) || [];
        const consensus = input.consensus?.[idx];
        return {
          paper_id: p.paper_id,
          document_title: p.document_title,
          year: p.year,
          abstract: p.abstract,
          doi: p.doi,
          authors: p.authors,
          model_responses: JSON.stringify(model_responses),
          consensus: consensus ?? ''
        };
      }).filter(Boolean) as any[];
    }

    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscapeField(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const filename = `${alias}.csv`;
    const url = URL.createObjectURL(blob);
    return { url, blob, filename };
  } catch (e: any) {
    return { error: 'exporting papers: ' + String(e?.message || e) };
  }
}
