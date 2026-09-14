import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FILE_NAMES } from '@renderer/constants'
import type { Settings } from '@renderer/types/settings'

const emptySettings: Settings = {
  version: 1,
  assistNightShiftId: null,
  weekdayRequiredShiftIds: [],
  weekendRequiredShiftIds: [],
  lastBackupAt: null
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({ ...emptySettings })

  async function load() {
    const data = await window.storage.read(FILE_NAMES.SETTINGS)
    settings.value = { ...emptySettings, ...(data ?? {}) }
  }

  async function persist() {
    await window.storage.write(FILE_NAMES.SETTINGS, settings.value)
  }

  async function update(patch: Partial<Settings>) {
    settings.value = { ...settings.value, ...patch }
    await persist()
  }

  return { settings, load, persist, update }
})
