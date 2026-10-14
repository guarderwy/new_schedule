import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
import { useDemandStore } from './useDemandStore'
import { useScheduleStore } from './useScheduleStore'
import type { Staff } from '@renderer/types/staff'

export const useStaffStore = defineStore('staff', () => {
  const list = ref<Staff[]>([])

  async function load() {
    const data = await window.storage.read(FILE_NAMES.STAFF)
    list.value = data?.list ?? []
  }

  async function persist() {
    await window.storage.write(FILE_NAMES.STAFF, { version: 1, list: list.value })
  }

  async function add(staff: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    list.value.push({ ...staff, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
    await persist()
  }

  async function update(id: string, patch: Partial<Staff>) {
    const idx = list.value.findIndex((s) => s.id === id)
    if (idx < 0) return
    list.value[idx] = { ...list.value[idx], ...patch, updatedAt: new Date().toISOString() }
    await persist()
  }

  /** 清空指定岗位在人员上的引用（岗位被删除时调用） */
  async function clearPostReference(postId: string): Promise<number> {
    const affected = list.value.filter((s) => s.postId === postId)
    if (affected.length === 0) return 0
    const now = new Date().toISOString()
    for (const staff of affected) {
      const idx = list.value.findIndex((s) => s.id === staff.id)
      if (idx >= 0) list.value[idx] = { ...list.value[idx], postId: null, updatedAt: now }
    }
    await persist()
    return affected.length
  }

  /**
   * 删除人员，并级联清理其排班详情与需求，
   * 避免留下永远不可见的孤儿数据。
   */
  async function remove(id: string) {
    list.value = list.value.filter((s) => s.id !== id)

    const scheduleStore = useScheduleStore()
    const demandStore = useDemandStore()

    let scheduleTouched = false
    for (const week of Object.values(scheduleStore.weeks)) {
      const before = week.details.length
      week.details = week.details.filter((d) => d.staffId !== id)
      if (week.details.length !== before) scheduleTouched = true
    }

    const demandTouched = demandStore.list.some((d) => d.staffId === id)
    if (demandTouched) {
      demandStore.list = demandStore.list.filter((d) => d.staffId !== id)
    }

    const jobs: Promise<unknown>[] = [persist()]
    if (scheduleTouched) jobs.push(scheduleStore.persist())
    if (demandTouched) jobs.push(demandStore.persist())
    await Promise.all(jobs)
  }

  return { list, load, persist, add, update, clearPostReference, remove }
})
