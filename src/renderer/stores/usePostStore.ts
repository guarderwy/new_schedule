import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
import type { Post } from '@renderer/types/post'

export const usePostStore = defineStore('post', () => {
  const list = ref<Post[]>([])

  async function load() {
    const data = await window.storage.read(FILE_NAMES.POSTS)
    list.value = data?.list ?? []
  }

  async function persist() {
    await window.storage.write(FILE_NAMES.POSTS, { version: 1, list: list.value })
  }

  async function add(name: string) {
    const now = new Date().toISOString()
    list.value.push({ id: crypto.randomUUID(), name, createdAt: now, updatedAt: now })
    await persist()
  }

  async function update(id: string, patch: Partial<Post>) {
    const idx = list.value.findIndex((p) => p.id === id)
    if (idx < 0) return
    list.value[idx] = { ...list.value[idx], ...patch, updatedAt: new Date().toISOString() }
    await persist()
  }

  async function remove(id: string) {
    list.value = list.value.filter((p) => p.id !== id)
    await persist()
  }

  return { list, load, persist, add, update, remove }
})
