"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("storage", {
  read: (fileName) => electron.ipcRenderer.invoke("storage:read", fileName),
  write: (fileName, data) => electron.ipcRenderer.invoke("storage:write", fileName, data),
  list: () => electron.ipcRenderer.invoke("storage:list"),
  export: (targetPath) => electron.ipcRenderer.invoke("storage:export", targetPath),
  import: (sourcePath) => electron.ipcRenderer.invoke("storage:import", sourcePath),
  backup: () => electron.ipcRenderer.invoke("storage:backup"),
  chooseExportFile: () => electron.ipcRenderer.invoke("storage:chooseExportFile"),
  chooseImportFile: () => electron.ipcRenderer.invoke("storage:chooseImportFile")
});
