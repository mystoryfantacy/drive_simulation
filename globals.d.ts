// This file augments the NodeJS.ProcessEnv interface to include API_KEY.
// It uses 'export {}' to ensure this is treated as a module with global augmentation,
// preventing conflicts with existing 'process' declarations (e.g. from @types/node).

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
      [key: string]: string | undefined;
    }
  }
}
