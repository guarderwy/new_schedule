import { BrowserWindow, app, dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  atomicWriteJson,
  backupDataDir,
  exportDataBundle,
  importDataBundle,
  readJsonSafe
} from '../utils/fileSystem'

function getDataDir(): string {
  return path.join(app.getPath('userData'), 'data')
}

export function registerStorageIPC(): void {
  ipcMain.handle('storage:read', async (_e, fileName: string) => {
    return readJsonSafe(path.join(getDataDir(), fileName))
  })

  ipcMain.handle('storage:write', async (_e, fileName: string, data: unknown) => {
    await Promise.resolve(atomicWriteJson(path.join(getDataDir(), fileName), data))
    return true
  })

  ipcMain.handle('storage:list', async () => {
    const dataDir = getDataDir()
    if (!fs.existsSync(dataDir)) return []
    return fs.readdirSync(dataDir)
  })

  ipcMain.handle('storage:export', async (_e, targetPath: string) => {
    return exportDataBundle(getDataDir(), targetPath)
  })

  ipcMain.handle('storage:import', async (_e, sourcePath: string) => {
    return importDataBundle(getDataDir(), sourcePath)
  })

  ipcMain.handle('storage:backup', async () => {
    return backupDataDir(getDataDir())
  })

  ipcMain.handle('storage:chooseExportFile', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.SaveDialogOptions = {
      title: '导出排班数据',
      defaultPath: `schedule-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle('storage:chooseImportFile', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      title: '导入排班数据',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })
}
