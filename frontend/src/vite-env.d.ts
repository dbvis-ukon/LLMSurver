/// <reference types="vite/client" />



declare module "Types" {
  export type ConsensusClassification = 0 | 1 | 2 | 3; // 0: unknown, 1: include, 2: discard, 3: error;
  export type RunType = 0 | 1; // 0: run over all, 1: sample/subset


  export interface PaperDBBase {
    document_title: string;
    // publication_title: string;
    year: string;
    // volume: string;
    // issue: string;
    // start_page: string;
    // end_page: string;
    abstract: string;
    doi: string;
    // keywords: string;
    // publisher: string;
    authors: string;
    // whole: string;
    // classifications?: Classifications;
    // consensus?: Classifications[keyof Classifications];
    //bibtex:string
    model_responses?: ModelResponse[];
    consensus?: ConsensusClassification; 
  }

  export type PaperDB = PaperDBBase & {
    paper_id?: int; // optional, Dexie fills this
  };

  export type Paper = PaperDBBase & {
    paper_id: int;  // mandatory
  };

  // classification: 0: unknown, 1: include, 2: discard, 3: error
  export interface ModelResponse {
    model_name: string;
    classification: number;
    answer: string;
  }

  export type ModelParameter = {
    model_id: number;
    parameter_name: string;
    value: string;
  };

  export type RunInformationDBBase = {
    run_id?: number;
    alias: string;
    type: RunType; 
    prompt: string;
    created: string; // ISO timestamp
    ids?: number[]; // optional: store subset in UI state; classification helpers accept a list
};

export type RunInformationDB = RunInformationDBBase & {
  run_id?: number; // optional, Dexie fills this
};

export type RunInformation = RunInformationDBBase & {
  run_id: number;  // mandatory
};
  
  export type RunInformationDB = {

  };

  export type RunInformation = {
    run_id: number;
    alias: string;
    type: RunType; 
    prompt: string;
    created: string; // ISO timestamp
    ids?: number[]; // optional: store subset in UI state; classification helpers accept a list
  };
  
  export type RunEntry = {
    run_entry_id?: number;
    paper_id: number;
    run_id: number;
    model_id: number;
    classification: ConsensusClassification;
    answer: string;
  };

  // export interface Classifications {
  //   // [key: string]: "include" | "exclude" | "unknown" | "";
  //   [key: string]: "include" | "discard" | "error" | "unknown";
  // }

  export interface Model {
    model_id?: int;
    host: string;
    name: string;
    key: string;
  }

  export interface GraphData {
    model: string;
    counts: number[];
  }
  export interface Statistic {
    total: number;
    classified: number;
    included: number;
    discarded: number;
    includedBy: number[];
  }
}
