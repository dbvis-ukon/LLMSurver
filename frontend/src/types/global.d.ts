declare module '@citation-js/core' {
  export class Cite {
    constructor(data?: any, options?: any);

    static async(data?: any): any;

    format(format: string, options?: any): string | object;
    get(options?: any): any;
    set(data: any, options?: any): void;

    data: any[];
  }
}

declare module 'react-dom/client';