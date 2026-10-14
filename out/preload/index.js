"use strict";
const electron = require("electron");
function toPlain(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => toPlain(item));
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) {
    const out2 = {};
    for (const [k, v] of value) out2[String(k)] = toPlain(v);
    return out2;
  }
  if (value instanceof Set) {
    return [...value].map((item) => toPlain(item));
  }
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = toPlain(item);
  }
  return out;
}
electron.contextBridge.exposeInMainWorld("storage", {
  read: (fileName) => electron.ipcRenderer.invoke("storage:read", fileName),
  // write 的入参来自 Pinia store，是响应式代理，必须先转成纯对象才能通过 IPC 结构化克隆
  write: (fileName, data) => electron.ipcRenderer.invoke("storage:write", fileName, toPlain(data)),
  list: () => electron.ipcRenderer.invoke("storage:list"),
  export: (targetPath) => electron.ipcRenderer.invoke("storage:export", targetPath),
  import: (sourcePath) => electron.ipcRenderer.invoke("storage:import", sourcePath),
  backup: () => electron.ipcRenderer.invoke("storage:backup"),
  chooseExportFile: () => electron.ipcRenderer.invoke("storage:chooseExportFile"),
  chooseImportFile: () => electron.ipcRenderer.invoke("storage:chooseImportFile")
});
