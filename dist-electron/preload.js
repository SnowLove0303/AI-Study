"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("aistudy", {
    appName: "AIstudy",
    version: "0.1.0",
    courses: {
        load: () => electron_1.ipcRenderer.invoke("courses:load"),
        save: (courses) => electron_1.ipcRenderer.invoke("courses:save", courses),
        storageStatus: () => electron_1.ipcRenderer.invoke("courses:storage-status")
    },
    mcp: {
        notionImportStatus: () => electron_1.ipcRenderer.invoke("mcp:notion-import-status")
    }
});
