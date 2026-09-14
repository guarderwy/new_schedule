import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
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

  async function remove(id: string) {
    list.value = list.value.filter((s) => s.id !== id)
    await persist()
  }

  return { list, load, persist, add, update, remove }
})
