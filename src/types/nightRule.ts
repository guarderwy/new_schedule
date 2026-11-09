export interface NightShiftRule {
  id: string
  shiftId: string
  sortOrder: number
}

// 夜班循环规则中表示「休息」的占位 shiftId（休息不是具体班次，没有真实 id）
export const REST_RULE_SHIFT_ID = '__rest__'

export function isRestRule(rule: NightShiftRule): boolean {
  return rule.shiftId === REST_RULE_SHIFT_ID
}

export interface NightRulesFile {
  version: number
  rules: NightShiftRule[]
}
