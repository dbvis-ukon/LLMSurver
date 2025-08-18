import Dexie, { Table } from 'dexie';
import * as Types from 'Types';


export class SurveyDB extends Dexie {
    papers!: Table<Types.Paper, number, Types.PaperDB>;
    models!: Table<Types.Model, number>;
    modelParameters!: Table<Types.ModelParameter, [number, string]>; // [model_id, parameter_name]
    runs!: Table<Types.RunInformation, number, Types.RunInformationDB>;
    runEntries!: Table<Types.RunEntry, number>;

    constructor() {
        super('survey');
        this.version(1).stores({
            papers: '++paper_id, doi, year, document_title',
            models: '++model_id, &name, host',
            modelParameters: '[model_id+parameter_name], model_id',
            runs: '++run_id, created',
            runEntries: '++run_entry_id, run_id, paper_id, model_id'
        });
    }
}

export const db = new SurveyDB();


export async function storePapersInDB(papers: Types.PaperDB[]): Promise<number[]> {
    const ids: number[] = [];
    await db.transaction('rw', db.papers, async () => {
        for (const p of papers) {
            const id = await db.papers.add(p);
            ids.push(id);
        }
    });
    return ids;
}

export async function getPapersFromDB(): Promise<Types.Paper[]> {
    const rows = await db.papers.toArray();
    return rows.map(r => ({
        paper_id: r.paper_id!,
        document_title: r.document_title,
        year: r.year,
        abstract: r.abstract,
        doi: r.doi,
        authors: r.authors,

    }));
}

export async function setModelToDB(input: { model: Types.Model,
                                            parameters: { name: string; value: string; }[]; 
                                            edit?: boolean; }): Promise<{ model_id: number; name: string; }> {
    const host = input.model.host.trim();
    const name = input.model.name.trim();
    const key = input.model.key.trim();
    let model_id: number = -1;
    await db.transaction('rw', db.models, db.modelParameters, async () => {
        if (input.edit) {
            const existing = await db.models.where('name').equals(name).first();
            if (!existing) throw new Error('Model to edit not found');
            await db.models.update(existing.model_id!, { host, key });
            model_id = existing.model_id!;
            await db.modelParameters.where('model_id').equals(model_id).delete();
        } else {
            model_id = await db.models.add({ host, name, key });
        }
        for (const par of input.parameters) {
            if (par.name && par.value) {
                await db.modelParameters.add({ model_id: model_id!, parameter_name: par.name, value: par.value });
            }
        }
    });
    return { model_id: (model_id as number), name };
}

export async function deleteModelFromDB(model_id: number) {
    debugger;
    await db.transaction('rw', db.models, db.modelParameters, async () => {
        await db.modelParameters.where('model_id').equals(model_id).delete();
        await db.models.delete(model_id);
    });
    return;
}

export async function getModelsFromDB(): Promise<Types.Model[]> {
    return db.models.toArray();
}

export async function getParametersFromDB(model_id: number): Promise<{ name: string; value: string; }[]> {
    const rows = await db.modelParameters.where('model_id').equals(model_id).toArray();
    return rows.map((r: any) => ({ name: r.parameter_name, value: r.value }));
}
// ===================== runs.ts =====================

export async function setRunToDB(input: { prompt: string; ids?: number[]; name: string; }): Promise<{ run: number; }> {
    const prompt = input.prompt.trim();
    const name = input.name.trim();
    const type: 0 | 1 = input.ids && input.ids.length ? 1 : 0;
    const created = new Date().toISOString();
    const run_id = await db.runs.add({ alias: name, type, prompt, created, ids: input.ids });
    return { run: run_id };
}

export async function deleteRunFromDB(run_id: number): Promise<{ run: number; }> {
    await db.transaction('rw', db.runs, db.runEntries, async () => {
        await db.runEntries.where('run_id').equals(run_id).delete();
        await db.runs.delete(run_id);
    });
    return { run: run_id };
}

export async function getRunFromDB(id: number): Promise<{ run: (Types.Paper & { model_responses: Types.ModelResponse[]; })[]; }> {
    const entries = await db.runEntries.where('run_id').equals(id).toArray();
    const papersById = new Map<number, Types.Paper>();
    const modelNames = new Map<number, string>();
    const models = await db.models.toArray();
    for (const m of models) modelNames.set(m.model_id!, m.name);
    for (const e of entries) {
        if (!papersById.has(e.paper_id)) {
            const p = await db.papers.get(e.paper_id);
            if (p) papersById.set(e.paper_id, p);
        }
    }
    const grouped = new Map<number, Types.ModelResponse[]>();
    for (const e of entries) {
        const arr = grouped.get(e.paper_id) || [];
        arr.push({ model_name: modelNames.get(e.model_id) || String(e.model_id), classification: e.classification, answer: e.answer });
        grouped.set(e.paper_id, arr);
    }
    const result: (Types.Paper & { model_responses: Types.ModelResponse[]; })[] = [];
    for (const [paper_id, p] of papersById) {
        result.push({ ...(p as Types.Paper), model_responses: grouped.get(paper_id) || [] });
    }
    return { run: result };
}

export async function getRunsFromDB(): Promise<Types.RunInformation[]> {
    return db.runs.toArray();
}

