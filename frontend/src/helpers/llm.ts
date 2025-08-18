import * as Types from "Types";

import { db } from "./db";


export type ChatCompletionParams = {
  model: string;
  messages: { role: 'user' | 'system' | 'assistant'; content: string | { type: 'text'; text: string; }[]; }[];
  [key: string]: any; // extra params (temperature, top_p, etc.)
};


function stripThinkTags(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/gi, '');
}


function classifyFromAnswer(ans: string): 0 | 1 | 2 | 3 {
  const a = ans.toLowerCase();
  const hasInclude = /\binclude\b/.test(a);
  const hasDiscard = /\bdiscard\b/.test(a);
  if (hasInclude && !hasDiscard) return 1;
  if (hasDiscard && !hasInclude) return 2;
  if (!hasInclude && !hasDiscard) return 3;
  // both present -> ambiguous -> error
  return 3;
}

function coerceParam(v: string): any {
  // try to coerce numeric/boolean JSON-like values
  const t = v.trim();
  if (/^(true|false)$/i.test(t)) return /^true$/i.test(t);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  try { return JSON.parse(t); } catch { return v; }
}

export async function classifyViaLLM(input: { model: string; prompt: string; paper_id: number; run_id: number; }): Promise<{ paper_id: number; model_name: string; classification: number; answer: string; }> {
  const { model: modelName, prompt, paper_id, run_id } = input;

  // Load paper & model
  const [paper, modelRow] = await Promise.all([
    db.papers.get(paper_id),
    db.models.where('name').equals(modelName).first()
  ]);
  if (!paper) throw new Error('Paper not found');
  if (!modelRow) throw new Error('Model not found');
  const paramsRows = await db.modelParameters.where('model_id').equals(modelRow.model_id!).toArray();
  const parameters = Object.fromEntries(paramsRows.map((r: any) => [r.parameter_name, coerceParam(r.value)]));

  // Build the prompt
  const text = `${prompt}\n\nBelow is the title and abstract. You must only answer with INCLUDE or DISCARD and a 2-sentence reason of why.\n\nTitle:\n'${paper.document_title}'.\n\nAbstract:\n'${paper.abstract == '' ? '(No abstract available, ERROR)' : paper.abstract}'`;

  const body: ChatCompletionParams = {
    model: modelRow.name,
    messages: [
      { role: 'user', content: [{ type: 'text', text: text }] }
    ],
    ...parameters
  };

  let answer = '';
  let classification: Types.ConsensusClassification = 3;
  try {
    const res = await fetch(modelRow.host + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelRow.key}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Support both OpenAI and some compatible providers
    const msg = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.message || '';
    answer = stripThinkTags(String(msg ?? ''));
    console.log(answer);
    classification = classifyFromAnswer(answer);
  } catch (e: any) {
    answer = String(e?.message || e || 'LLM error');
    classification = 3;
  }

  const model_id = modelRow.model_id!;
  await db.runEntries.add({ paper_id, run_id, model_id, classification, answer });

  return { paper_id, model_name: modelName, classification, answer };
}


/** Helper: classify a set of papers for a run (respects subset if run.type === 1 and ids stored) */
export async function classifyRun(run_id: number, modelName: string): Promise<void> {
  const run = await db.runs.get(run_id);
  if (!run) throw new Error('Run not found');
  const targetPaperIds = run.type === 1 && Array.isArray(run.ids) && run.ids.length
    ? run.ids
    : (await db.papers.toCollection().primaryKeys()) as number[];
  for (const pid of targetPaperIds) {
    await classifyViaLLM({ model: modelName, prompt: run.prompt, paper_id: pid, run_id });
  }
}
