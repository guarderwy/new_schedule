import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { FILE_NAMES } from '@renderer/constants'
import type { ScheduleDetail, ScheduleWeek } from '@renderer/types/schedule'

export const useScheduleStore = defineStore('schedule', () => {
  const weeks = ref<Record<string, ScheduleWeek>>({})

  async function load() {
    const data = await window.storage.read(FILE_NAMES.SCHEDULES)
    weeks.value = data?.weeks ?? {}
    // 加载时把已结束的周标记为过期，让 ScheduleStatus 真正生效
    const expired = expirePastWeeks()
    if (expired.length > 0) await persist()
  }

  async function persist() {
    await window.storage.write(FILE_NAMES.SCHEDULES, { version: 1, weeks: weeks.value })
  }

  function getWeek(weekKey: string): ScheduleWeek | undefined {
    return weeks.value[weekKey]
  }

  async function upsertWeek(week: ScheduleWeek) {
    weeks.value = { ...weeks.value, [week.weekKey]: week }
    await persist()
  }

  async function updateDetail(
    weekKey: string,
    staffId: string,
    date: string,
    patch: Partial<ScheduleDetail>
  ) {
    const week = weeks.value[weekKey]
    if (!week) return
    const detail = week.details.find((d) => d.staffId === staffId && d.date === date)
    if (detail) {
      Object.assign(detail, patch)
    } else {
      week.details.push({
        id: crypto.randomUUID(),
        staffId,
        date,
        shiftId: null,
        isRest: false,
        ...patch
      })
    }
    await persist()
  }

  async function removeWeek(weekKey: string) {
    const next = { ...weeks.value }
    delete next[weekKey]
    weeks.value = next
    await persist()
  }

  /** 发布排班：发布后该周变为只读，防止误改 */
  async function publishWeek(weekKey: string) {
    const week = weeks.value[weekKey]
    if (!week) return
    week.status = 'published'
    await persist()
  }

  /** 撤销发布：恢复为草稿，可继续编辑 */
  async function unpublishWeek(weekKey: string) {
    const week = weeks.value[weekKey]
    if (!week) return
    week.status = 'draft'
    await persist()
  }

  /** 把结束日期早于今天的周标记为 expired，返回发生变化的 weekKey 列表 */
  function expirePastWeeks(): string[] {
    const today = dayjs().startOf('day')
    const changed: string[] = []
    for (const [key, week] of Object.entries(weeks.value)) {
      if (week.status === 'expired') continue
      if (dayjs(week.weekEnd).isBefore(today, 'day')) {
        week.status = 'expired'
        changed.push(key)
      }
    }
    return changed
  }

  return {
    weeks,
    load,
    persist,
    getWeek,
    upsertWeek,
    updateDetail,
    removeWeek,
    publishWeek,
    unpublishWeek,
    expirePastWeeks
  }
})
