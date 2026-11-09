import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@/constants'
import { storage } from '@/storage'
import { useDemandStore } from './useDemandStore'
import { useScheduleStore } from './useScheduleStore'
import type { Staff } from '@/types/staff'

/** 表单提交的人员内容：id / 时间戳 / 排序由 store 统一管理 */
export type StaffInput = Omit<Staff, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>

export const useStaffStore = defineStore('staff', () => {
  const list = ref<Staff[]>([])

  /** 兼容旧数据：缺失排序值时按原顺序补号，并统一按正序展示 */
  function normalizeOrder(items: Staff[]): Staff[] {
    const withOrder = items.map((s, i) => ({
      ...s,
      sortOrder: Number.isFinite(s.sortOrder) ? s.sortOrder : i + 1
    }))
    return withOrder.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.employeeNo.localeCompare(b.employeeNo)
    )
  }

  async function load() {
    const data = await storage.read(FILE_NAMES.STAFF)
    const items = data?.list ?? []
    list.value = normalizeOrder(items)
    // 旧数据补齐排序值后落盘，避免每次载入都重复计算
    if (items.some((s) => !Number.isFinite(s.sortOrder))) await persist()
  }

  async function persist() {
    await storage.write(FILE_NAMES.STAFF, { version: 1, list: list.value })
  }

  async function add(staff: StaffInput) {
    const now = new Date().toISOString()
    const nextOrder = list.value.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), 0) + 1
    list.value.push({
      ...staff,
      sortOrder: nextOrder,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    })
    await persist()
  }

  async function update(id: string, patch: Partial<Staff>) {
    const idx = list.value.findIndex((s) => s.id === id)
    if (idx < 0) return
    list.value[idx] = { ...list.value[idx], ...patch, updatedAt: new Date().toISOString() }
    await persist()
  }

  /**
   * 按拖拽后的可见顺序重排：可见项按新顺序放回原有槽位，
   * 被筛选掉的项保持相对位置不变，最后统一重编号 1..n。
   */
  async function applyVisibleOrder(visibleIds: string[]) {
    const idSet = new Set(visibleIds)
    const ordered = visibleIds
      .map((id) => list.value.find((s) => s.id === id))
      .filter((s): s is Staff => !!s)
    const next = [...list.value]
    let cursor = 0
    for (let i = 0; i < next.length; i++) {
      if (idSet.has(next[i].id) && cursor < ordered.length) next[i] = ordered[cursor++]
    }
    list.value = next.map((s, i) => ({ ...s, sortOrder: i + 1 }))
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

  return { list, load, persist, add, update, applyVisibleOrder, clearPostReference, remove }
})
