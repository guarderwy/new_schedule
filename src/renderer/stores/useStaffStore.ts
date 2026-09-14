import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
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

  async function remove(id: string) {
    list.value = list.value.filter((s) => s.id !== id)
    await persist()
  }

  return { list, load, persist, add, update, remove }
})
