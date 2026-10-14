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

/** 允许渲染进程读写的白名单数据文件，防止路径穿越读写任意文件 */
const ALLOWED_DATA_FILES = new Set([
  'staff.json',
  'posts.json',
  'shifts.json',
  'schedules.json',
  'night_shift_rules.json',
  'demands.json',
  'settings.json'
])

function safeDataFileName(fileName: unknown): string | null {
  if (typeof fileName !== 'string' || fileName.length === 0) return null
  const base = path.basename(fileName)
  return ALLOWED_DATA_FILES.has(base) ? base : null
}

function getDataDir(): string {
  return path.join(app.getPath('userData'), 'data')
}

export function registerStorageIPC(): void {
  ipcMain.handle('storage:read', async (_e, fileName: string) => {
    const safe = safeDataFileName(fileName)
    if (!safe) return null
    return readJsonSafe(path.join(getDataDir(), safe))
  })

  ipcMain.handle('storage:write', async (_e, fileName: string, data: unknown) => {
    const safe = safeDataFileName(fileName)
    if (!safe) return false
    await Promise.resolve(atomicWriteJson(path.join(getDataDir(), safe), data))
    return true
  })

  ipcMain.handle('storage:list', async () => {
    const dataDir = getDataDir()
    if (!fs.existsSync(dataDir)) return []
    return fs.readdirSync(dataDir).filter((name) => {
      try {
        return fs.statSync(path.join(dataDir, name)).isFile()
      } catch {
        return false
      }
    })
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
