export interface Settings {
  version: number
  assistNightShiftId: string | null
  weekdayRequiredShiftIds: string[]
  weekendRequiredShiftIds: string[]
  lastBackupAt: string | null
}
