import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("aistudy", {
  appName: "AIstudy",
  version: "0.1.0",
  courses: {
    load: () => ipcRenderer.invoke("courses:load"),
    save: (courses: unknown) => ipcRenderer.invoke("courses:save", courses),
    storageStatus: () => ipcRenderer.invoke("courses:storage-status")
  },
  mcp: {
    notionImportStatus: () => ipcRenderer.invoke("mcp:notion-import-status")
  }
});
