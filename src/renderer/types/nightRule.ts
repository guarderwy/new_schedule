export interface NightShiftRule {
  id: string
  shiftId: string
  sortOrder: number
}

export interface NightRulesFile {
  version: number
  rules: NightShiftRule[]
}
