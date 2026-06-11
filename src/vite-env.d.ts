/// <reference types="vite/client" />

interface Window {
  aistudy: {
    appName: string;
    version: string;
    courses?: {
      load: () => Promise<unknown>;
      save: (courses: unknown) => Promise<void>;
      storageStatus: () => Promise<unknown>;
    };
    mcp?: {
      notionImportStatus: () => Promise<unknown>;
    };
  };
}
