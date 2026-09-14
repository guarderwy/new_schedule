import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('storage', {
  read: (fileName: string) => ipcRenderer.invoke('storage:read', fileName),
  write: (fileName: string, data: unknown) => ipcRenderer.invoke('storage:write', fileName, data),
  list: () => ipcRenderer.invoke('storage:list'),
  export: (targetPath: string) => ipcRenderer.invoke('storage:export', targetPath),
  import: (sourcePath: string) => ipcRenderer.invoke('storage:import', sourcePath),
  backup: () => ipcRenderer.invoke('storage:backup'),
  chooseExportFile: () => ipcRenderer.invoke('storage:chooseExportFile'),
  chooseImportFile: () => ipcRenderer.invoke('storage:chooseImportFile')
})
