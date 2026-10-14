import { contextBridge, ipcRenderer } from 'electron'
import { toPlain } from './toPlain'

contextBridge.exposeInMainWorld('storage', {
  read: (fileName: string) => ipcRenderer.invoke('storage:read', fileName),
  // write 的入参来自 Pinia store，是响应式代理，必须先转成纯对象才能通过 IPC 结构化克隆
  write: (fileName: string, data: unknown) =>
    ipcRenderer.invoke('storage:write', fileName, toPlain(data)),
  list: () => ipcRenderer.invoke('storage:list'),
  export: (targetPath: string) => ipcRenderer.invoke('storage:export', targetPath),
  import: (sourcePath: string) => ipcRenderer.invoke('storage:import', sourcePath),
  backup: () => ipcRenderer.invoke('storage:backup'),
  chooseExportFile: () => ipcRenderer.invoke('storage:chooseExportFile'),
  chooseImportFile: () => ipcRenderer.invoke('storage:chooseImportFile')
})
