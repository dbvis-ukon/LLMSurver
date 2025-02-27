/// <reference types="vite/client" />

declare module "Types" {
  export interface Paper {
    paper_id: int;
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
    model_responses?: ModelResponse[];
    consensus?: number;
  }

  // classification: 0: unknown, 1: include, 2: discard, 3: error
  export interface ModelResponse {
    model_name: string;
    classification: number;
    answer: string;
  }

  // export interface Classifications {
  //   // [key: string]: "include" | "exclude" | "unknown" | "";
  //   [key: string]: "include" | "discard" | "error" | "unknown";
  // }

  export interface Model {
    model_id: int;
    host: string;
    name: string;
    key: string;
  }
  export interface Run {
    run_id: int;
    alias: string;
    type: 0 | 1;
    prompt: string;
    // models: string[];
    created: string;
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
