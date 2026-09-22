import fs from 'node:fs'
import path from 'node:path'

const BACKUP_KEEP_DAYS = 7

export function readJsonSafe(filePath: string): unknown | null {
  try {
    if (!fs.existsSync(filePath)) return null
    const text = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(text)
  } catch (e) {
    const bakPath = filePath + '.bak'
    if (fs.existsSync(bakPath)) {
      try {
        return JSON.parse(fs.readFileSync(bakPath, 'utf-8'))
      } catch {
        // ignore bak parse error
      }
    }
    console.error('read json failed', filePath, e)
    return null
  }
}

export function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmpPath = filePath + '.tmp'
  const bakPath = filePath + '.bak'
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, bakPath)
  }
  fs.renameSync(tmpPath, filePath)
}

function isDirectory(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory()
  } catch {
    return false
  }
}

export function backupDataDir(dataDir: string): boolean {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

    const backupRoot = path.join(dataDir, 'backup')
    if (!fs.existsSync(backupRoot)) {
      fs.mkdirSync(backupRoot, { recursive: true })
    } else if (!isDirectory(backupRoot)) {
      // 异常状态：backup 不是目录（例如意外变成了文件），先清理再重建
      fs.rmSync(backupRoot, { recursive: true, force: true })
      fs.mkdirSync(backupRoot, { recursive: true })
    }

    const stamp = new Date().toISOString().slice(0, 10)
    const target = path.join(backupRoot, stamp)
    if (fs.existsSync(target) && !isDirectory(target)) {
      fs.rmSync(target, { recursive: true, force: true })
    }
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true })

    for (const f of fs.readdirSync(dataDir)) {
      if (f === 'backup') continue
      if (f.endsWith('.tmp') || f.endsWith('.bak')) continue
      const src = path.join(dataDir, f)
      if (isDirectory(src)) continue
      try {
        fs.copyFileSync(src, path.join(target, f))
      } catch (copyErr) {
        console.error('backup copy failed for', f, copyErr)
      }
    }

    const cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000
    for (const name of fs.readdirSync(backupRoot)) {
      const dir = path.join(backupRoot, name)
      if (!isDirectory(dir)) continue
      const time = Date.parse(name)
      if (!Number.isNaN(time) && time < cutoff) {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    }
    return true
  } catch (e) {
    console.error('backupDataDir failed', e)
    return false
  }
}

export function ensureDataFiles(dataDir: string): void {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const defaults: Record<string, unknown> = {
    'staff.json': { version: 1, list: [] },
    'posts.json': { version: 1, list: [] },
    'shifts.json': { version: 1, list: [] },
    'schedules.json': { version: 1, weeks: {} },
    'night_shift_rules.json': { version: 1, rules: [] },
    'demands.json': { version: 1, list: [] },
    'settings.json': {
      version: 1,
      assistNightShiftId: null,
      weekdayRequiredShiftIds: [],
      weekendRequiredShiftIds: [],
      lastBackupAt: null
    }
  }
  for (const [name, content] of Object.entries(defaults)) {
    const filePath = path.join(dataDir, name)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
    }
  }
}

const DATA_FILE_NAMES = [
  'staff.json',
  'posts.json',
  'shifts.json',
  'schedules.json',
  'night_shift_rules.json',
  'demands.json',
  'settings.json'
]

export function exportDataBundle(dataDir: string, targetPath: string): boolean {
  const files: Record<string, unknown> = {}
  for (const name of DATA_FILE_NAMES) {
    files[name] = readJsonSafe(path.join(dataDir, name))
  }
  atomicWriteJson(targetPath, {
    version: 1,
    exportedAt: new Date().toISOString(),
    files
  })
  return true
}

export function importDataBundle(dataDir: string, sourcePath: string): boolean {
  const payload = readJsonSafe(sourcePath) as {
    files?: Record<string, unknown>
  } | null
  if (!payload?.files) return false
  ensureDataFiles(dataDir)
  for (const name of DATA_FILE_NAMES) {
    if (payload.files[name] != null) {
      atomicWriteJson(path.join(dataDir, name), payload.files[name])
    }
  }
  return true
}
