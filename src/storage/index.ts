import { FILE_NAMES } from '@/constants'
import type { Demand } from '@/types/demand'
import type { NightShiftRule } from '@/types/nightRule'
import type { Post } from '@/types/post'
import type { ScheduleSnapshot, ScheduleWeek } from '@/types/schedule'
import type { Settings } from '@/types/settings'
import type { Shift } from '@/types/shift'
import type { Staff } from '@/types/staff'

const DATA_PREFIX = 'schedule-manager:data:'
const BACKUP_PREFIX = 'schedule-manager:backup:'
const BACKUP_KEEP_DAYS = 7

export type DataFileName = (typeof FILE_NAMES)[keyof typeof FILE_NAMES]

interface DataFileMap {
  'staff.json': { version: number; list: Staff[] }
  'posts.json': { version: number; list: Post[] }
  'shifts.json': { version: number; list: Shift[] }
  'schedules.json': { version: number; weeks: Record<string, ScheduleWeek> }
  'history_snapshots.json': { version: number; snapshots: Record<string, ScheduleSnapshot> }
  'night_shift_rules.json': { version: number; rules: NightShiftRule[] }
  'demands.json': { version: number; list: Demand[] }
  'settings.json': Settings
}

const DATA_FILES = Object.values(FILE_NAMES) as DataFileName[]

const DEFAULT_FILES: DataFileMap = {
  'staff.json': { version: 1, list: [] },
  'posts.json': { version: 1, list: [] },
  'shifts.json': { version: 1, list: [] },
  'schedules.json': { version: 1, weeks: {} },
  'history_snapshots.json': { version: 1, snapshots: {} },
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

/** 各数据文件期望的结构，用于导入前校验，避免脏数据污染现有数据 */
const FILE_SHAPES: Record<DataFileName, 'list' | 'weeks' | 'snapshots' | 'rules' | 'object'> = {
  'staff.json': 'list',
  'posts.json': 'list',
  'shifts.json': 'list',
  'demands.json': 'list',
  'schedules.json': 'weeks',
  'history_snapshots.json': 'snapshots',
  'night_shift_rules.json': 'rules',
  'settings.json': 'object'
}

function isDataFileName(name: string): name is DataFileName {
  return (DATA_FILES as string[]).includes(name)
}

function isValidBundleFile(name: DataFileName, content: unknown): boolean {
  const shape = FILE_SHAPES[name]
  if (content == null || typeof content !== 'object') return false
  if (shape === 'list') return Array.isArray((content as { list?: unknown }).list)
  if (shape === 'weeks') {
    const weeks = (content as { weeks?: unknown }).weeks
    return typeof weeks === 'object' && weeks !== null
  }
  if (shape === 'rules') return Array.isArray((content as { rules?: unknown }).rules)
  if (shape === 'snapshots') {
    const snapshots = (content as { snapshots?: unknown }).snapshots
    return typeof snapshots === 'object' && snapshots !== null
  }
  return true
}

/** 读取失败时回退到上一次写入的副本，避免单份数据损坏导致全部丢失 */
function readJson(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as unknown
  } catch (e) {
    console.error('读取数据失败', key, e)
    try {
      const previous = localStorage.getItem(`${key}.bak`)
      return previous === null ? null : (JSON.parse(previous) as unknown)
    } catch {
      return null
    }
  }
}

function writeJson(key: string, data: unknown): boolean {
  const text = JSON.stringify(data)
  if (typeof text !== 'string') return false
  const previous = localStorage.getItem(key)
  if (previous !== null) localStorage.setItem(`${key}.bak`, previous)
  localStorage.setItem(key, text)
  return true
}

/** 首次打开时初始化默认数据文件，保证导出的数据包结构完整 */
export function initStorage(): void {
  try {
    for (const name of DATA_FILES) {
      const key = DATA_PREFIX + name
      if (localStorage.getItem(key) === null) writeJson(key, DEFAULT_FILES[name])
    }
  } catch (e) {
    console.error('初始化本地存储失败', e)
  }
}

function collectFiles(): Record<string, unknown> {
  const files: Record<string, unknown> = {}
  for (const name of DATA_FILES) {
    files[name] = readJson(DATA_PREFIX + name) ?? DEFAULT_FILES[name]
  }
  return files
}

function pruneBackups(): void {
  const cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000
  const expired: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(BACKUP_PREFIX)) continue
    const time = Date.parse(key.slice(BACKUP_PREFIX.length))
    if (!Number.isNaN(time) && time < cutoff) expired.push(key)
  }
  for (const key of expired) localStorage.removeItem(key)
}

function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** 弹出系统文件选择框；用户取消时返回 null */
function pickJsonFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'

    let settled = false
    let onFocus: () => void = () => {}
    const finish = (file: File | null): void => {
      if (settled) return
      settled = true
      window.removeEventListener('focus', onFocus)
      input.remove()
      resolve(file)
    }
    onFocus = () => window.setTimeout(() => finish(null), 500)

    input.addEventListener('change', () => finish(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => finish(null))
    window.addEventListener('focus', onFocus)
    document.body.appendChild(input)
    input.click()
  })
}

async function read<K extends DataFileName>(fileName: K): Promise<DataFileMap[K] | null> {
  if (!isDataFileName(fileName)) return null
  return (readJson(DATA_PREFIX + fileName) ?? null) as DataFileMap[K] | null
}

async function write(fileName: DataFileName, data: unknown): Promise<boolean> {
  if (!isDataFileName(fileName)) return false
  try {
    return writeJson(DATA_PREFIX + fileName, data)
  } catch (e) {
    console.error('写入数据失败', fileName, e)
    return false
  }
}

/** 按日期保存一份快照，仅保留最近 7 天 */
async function backup(): Promise<boolean> {
  try {
    const stamp = new Date().toISOString().slice(0, 10)
    localStorage.setItem(
      BACKUP_PREFIX + stamp,
      JSON.stringify({ version: 1, createdAt: new Date().toISOString(), files: collectFiles() })
    )
    pruneBackups()
    return true
  } catch (e) {
    console.error('备份数据失败', e)
    return false
  }
}

/** 导出为 JSON 文件并触发浏览器下载 */
async function exportBundle(): Promise<boolean> {
  try {
    downloadJson(`schedule-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      version: 1,
      exportedAt: new Date().toISOString(),
      files: collectFiles()
    })
    return true
  } catch (e) {
    console.error('导出数据失败', e)
    return false
  }
}

/**
 * 从本地 JSON 文件导入：先做结构校验，通过后自动备份再覆盖；
 * 返回 null 表示用户取消选择，false 表示文件无效。
 */
async function importBundle(): Promise<boolean | null> {
  const file = await pickJsonFile()
  if (!file) return null
  try {
    const payload = JSON.parse(await file.text()) as {
      files?: Record<string, unknown>
    } | null
    if (!payload?.files || typeof payload.files !== 'object') return false

    const entries = Object.entries(payload.files).filter((entry): entry is [DataFileName, unknown] =>
      isDataFileName(entry[0])
    )
    if (entries.length === 0) return false
    for (const [name, content] of entries) {
      if (!isValidBundleFile(name, content)) {
        console.error('导入被拒绝：数据包中存在格式错误的文件', name)
        return false
      }
    }

    await backup()
    for (const [name, content] of entries) {
      if (!writeJson(DATA_PREFIX + name, content)) return false
    }
    return true
  } catch (e) {
    console.error('导入数据失败', e)
    return false
  }
}

/** 浏览器端持久化接口，替代原桌面端的全局存储对象 */
export const storage = { read, write, backup, exportBundle, importBundle }
