import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
import type { Demand } from '@renderer/types/demand'

export const useDemandStore = defineStore('demand', () => {
  const list = ref<Demand[]>([])

  async function load() {
    const data = await window.storage.read(FILE_NAMES.DEMANDS)
    list.value = data?.list ?? []
  }

  async function persist() {
    await window.storage.write(FILE_NAMES.DEMANDS, { version: 1, list: list.value })
  }

  async function add(demand: Omit<Demand, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    list.value.push({ ...demand, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
    await persist()
  }

  async function update(id: string, patch: Partial<Demand>) {
    const idx = list.value.findIndex((d) => d.id === id)
    if (idx < 0) return
    list.value[idx] = { ...list.value[idx], ...patch, updatedAt: new Date().toISOString() }
    await persist()
  }

  async function markMet(ids: string[]) {
    const now = new Date().toISOString()
    const set = new Set(ids)
    list.value = list.value.map((d) =>
      set.has(d.id) ? { ...d, status: 'met', updatedAt: now } : d
    )
    await persist()
  }

  async function remove(id: string) {
    list.value = list.value.filter((d) => d.id !== id)
    await persist()
  }

  return { list, load, persist, add, update, markMet, remove }
})
