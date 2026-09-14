import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
import type { ScheduleDetail, ScheduleWeek } from '@renderer/types/schedule'

export const useScheduleStore = defineStore('schedule', () => {
  const weeks = ref<Record<string, ScheduleWeek>>({})

  async function load() {
    const data = await window.storage.read(FILE_NAMES.SCHEDULES)
    weeks.value = data?.weeks ?? {}
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

  return { weeks, load, persist, getWeek, upsertWeek, updateDetail, removeWeek }
})
