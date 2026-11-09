import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { FILE_NAMES } from '@/constants'
import { storage } from '@/storage'
import { usePostStore } from './usePostStore'
import { useShiftStore } from './useShiftStore'
import { useStaffStore } from './useStaffStore'
import type { ScheduleSnapshot, ScheduleWeek } from '@/types/schedule'

/** 深拷贝成普通对象，避免镜像被后续编辑 / 响应式引用改动 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * 历史排班镜像：把「发布时」或「周结束后」的排班、人员名单（含状态与状态时间）、
 * 班次、岗位整体冻结下来。历史页只读镜像，不随当前人员状态变化。
 */
export const useHistoryStore = defineStore('history', () => {
  const snapshots = ref<Record<string, ScheduleSnapshot>>({})
  const staffStore = useStaffStore()
  const shiftStore = useShiftStore()
  const postStore = usePostStore()

  async function load() {
    const data = await storage.read(FILE_NAMES.HISTORY_SNAPSHOTS)
    snapshots.value = data?.snapshots ?? {}
  }

  async function persist() {
    await storage.write(FILE_NAMES.HISTORY_SNAPSHOTS, { version: 1, snapshots: snapshots.value })
  }

  function getSnapshot(weekKey: string): ScheduleSnapshot | undefined {
    return snapshots.value[weekKey]
  }

  function buildSnapshot(week: ScheduleWeek, source: ScheduleSnapshot['source']): ScheduleSnapshot {
    return {
      weekKey: week.weekKey,
      archivedAt: new Date().toISOString(),
      source,
      week: clone(week),
      staffList: clone(staffStore.list),
      shiftList: clone(shiftStore.list),
      postList: clone(postStore.list)
    }
  }

  /** 发布时立即存镜像；已有镜像不覆盖，保证存档不可变 */
  async function archivePublished(week: ScheduleWeek) {
    if (snapshots.value[week.weekKey]) return
    snapshots.value = { ...snapshots.value, [week.weekKey]: buildSnapshot(week, 'published') }
    await persist()
  }

  /** 未发布（或从未归档）的周，在该周结束后按当时内容补一份镜像 */
  async function archiveEndedWeeks(weeks: Record<string, ScheduleWeek>) {
    const today = dayjs().startOf('day')
    const next = { ...snapshots.value }
    let changed = false
    for (const week of Object.values(weeks)) {
      if (snapshots.value[week.weekKey]) continue
      const end = dayjs(week.weekEnd)
      if (!end.isValid() || !end.isBefore(today, 'day')) continue
      next[week.weekKey] = buildSnapshot(week, 'week-end')
      changed = true
    }
    if (!changed) return
    snapshots.value = next
    await persist()
  }

  return { snapshots, load, persist, getSnapshot, archivePublished, archiveEndedWeeks }
})
