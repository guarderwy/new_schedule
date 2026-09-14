import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
import type { NightShiftRule } from '@renderer/types/nightRule'

export const useNightRuleStore = defineStore('nightRule', () => {
  const rules = ref<NightShiftRule[]>([])

  async function load() {
    const data = await window.storage.read(FILE_NAMES.NIGHT_RULES)
    rules.value = (data?.rules ?? []).sort(
      (a: NightShiftRule, b: NightShiftRule) => a.sortOrder - b.sortOrder
    )
  }

  async function persist() {
    await window.storage.write(FILE_NAMES.NIGHT_RULES, { version: 1, rules: rules.value })
  }

  async function add(shiftId: string) {
    const maxOrder = rules.value.reduce((m, r) => Math.max(m, r.sortOrder), 0)
    rules.value.push({
      id: crypto.randomUUID(),
      shiftId,
      sortOrder: maxOrder + 1
    })
    await persist()
  }

  async function remove(id: string) {
    rules.value = rules.value.filter((r) => r.id !== id)
    rules.value.forEach((r, i) => {
      r.sortOrder = i + 1
    })
    await persist()
  }

  async function reorder(next: NightShiftRule[]) {
    rules.value = next.map((r, i) => ({ ...r, sortOrder: i + 1 }))
    await persist()
  }

  return { rules, load, persist, add, remove, reorder }
})
