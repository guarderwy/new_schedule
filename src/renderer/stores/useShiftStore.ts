import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
import { useNightRuleStore } from './useNightRuleStore'
import { useScheduleStore } from './useScheduleStore'
import { useSettingsStore } from './useSettingsStore'
import type { Shift } from '@renderer/types/shift'

export const useShiftStore = defineStore('shift', () => {
  const list = ref<Shift[]>([])

  async function load() {
    const data = await window.storage.read(FILE_NAMES.SHIFTS)
    list.value = data?.list ?? []
  }

  async function persist() {
    await window.storage.write(FILE_NAMES.SHIFTS, { version: 1, list: list.value })
  }

  async function add(shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    list.value.push({ ...shift, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
    await persist()
  }

  async function update(id: string, patch: Partial<Shift>) {
    const idx = list.value.findIndex((s) => s.id === id)
    if (idx < 0) return
    list.value[idx] = { ...list.value[idx], ...patch, updatedAt: new Date().toISOString() }
    await persist()
  }

  /**
   * 删除班次，并级联清理所有引用：
   * - 排班详情中该班次清空为未排班；
   * - 夜班循环规则中该班次移除并重排序号；
   * - 系统设置中的助夜班 / 工作日必备 / 周末必备一并移除。
   */
  async function remove(id: string) {
    list.value = list.value.filter((s) => s.id !== id)

    const scheduleStore = useScheduleStore()
    const nightRuleStore = useNightRuleStore()
    const settingsStore = useSettingsStore()

    let scheduleTouched = false
    for (const week of Object.values(scheduleStore.weeks)) {
      for (const detail of week.details) {
        if (detail.shiftId === id) {
          detail.shiftId = null
          scheduleTouched = true
        }
      }
    }

    const ruleTouched = nightRuleStore.rules.some((r) => r.shiftId === id)
    if (ruleTouched) {
      nightRuleStore.rules = nightRuleStore.rules.filter((r) => r.shiftId !== id)
      nightRuleStore.rules.forEach((r, i) => {
        r.sortOrder = i + 1
      })
    }

    const settings = settingsStore.settings
    const settingsTouched =
      settings.assistNightShiftId === id ||
      settings.weekdayRequiredShiftIds.includes(id) ||
      settings.weekendRequiredShiftIds.includes(id)
    if (settingsTouched) {
      await settingsStore.update({
        assistNightShiftId: settings.assistNightShiftId === id ? null : settings.assistNightShiftId,
        weekdayRequiredShiftIds: settings.weekdayRequiredShiftIds.filter((sid) => sid !== id),
        weekendRequiredShiftIds: settings.weekendRequiredShiftIds.filter((sid) => sid !== id)
      })
    }

    const jobs: Promise<unknown>[] = [persist()]
    if (scheduleTouched) jobs.push(scheduleStore.persist())
    if (ruleTouched) jobs.push(nightRuleStore.persist())
    await Promise.all(jobs)
  }

  return { list, load, persist, add, update, remove }
})
