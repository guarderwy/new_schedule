import type { Demand } from '@/types/demand'
import { REST_RULE_SHIFT_ID } from '@/types/nightRule'
import type { NightShiftRule } from '@/types/nightRule'
import type { ScheduleDetail } from '@/types/schedule'
import type { Settings } from '@/types/settings'
import type { Shift } from '@/types/shift'
import type { Staff } from '@/types/staff'
import { isWeekend } from './weekUtils'

export interface ValidateParams {
  details: ScheduleDetail[]
  dates: string[]
  staffList: Staff[]
  shifts: Shift[]
  settings: Settings
  nightRules: NightShiftRule[]
}

export interface ValidateResult {
  missingRequired: { date: string; shiftId: string; need: number; actual: number }[]
  warnings: string[]
}

/**
 * 排班校验只关注两类规则：
 * 1. 工作日 / 周末每天都排齐对应的必备班次；
 * 2. 夜班组人员只按夜班循环规则排班，且周末不排助夜班。
 * 不再检测班次时间重叠或跨天时间冲突。
 */
export function validateSchedule(params: ValidateParams): ValidateResult {
  const { details, dates, staffList, shifts, settings, nightRules } = params
  const missingRequired: ValidateResult['missingRequired'] = []
  const warnings: string[] = []

  for (const date of dates) {
    const requiredIds = isWeekend(date)
      ? settings.weekendRequiredShiftIds
      : settings.weekdayRequiredShiftIds
    for (const shiftId of requiredIds) {
      const actual = details.filter((d) => d.date === date && d.shiftId === shiftId).length
      if (actual < 1) {
        missingRequired.push({ date, shiftId, need: 1, actual })
      }
    }
  }

  const nightStaffNames = new Map(
    staffList.filter((s) => s.groupType === 'night').map((s) => [s.id, s.name])
  )
  const nightRuleShiftIds = new Set(
    nightRules.map((r) => r.shiftId).filter((id) => id !== REST_RULE_SHIFT_ID)
  )
  const shiftNames = new Map(shifts.map((s) => [s.id, s.name]))

  // 已配置循环规则时，夜班组人员不应被安排到规则之外的班次
  if (nightRuleShiftIds.size > 0) {
    for (const d of details) {
      if (d.isRest || !d.shiftId) continue
      if (!nightStaffNames.has(d.staffId)) continue
      if (!nightRuleShiftIds.has(d.shiftId)) {
        warnings.push(
          `${d.date} ${nightStaffNames.get(d.staffId)} 夜班人员被安排了非夜班循环班次：${shiftNames.get(d.shiftId) ?? d.shiftId}`
        )
      }
    }
  }

  const assistId = settings.assistNightShiftId
  if (assistId) {
    for (const date of dates.filter(isWeekend)) {
      const hit = details.find((d) => d.date === date && d.shiftId === assistId)
      if (hit) {
        const staff = staffList.find((s) => s.id === hit.staffId)
        warnings.push(`${date} 周末排了助夜班：${staff?.name ?? hit.staffId}`)
      }
    }
  }

  return { missingRequired, warnings }
}

export function hasDemandOnDate(demands: Demand[], staffId: string, date: string): boolean {
  return demands.some(
    (d) => d.staffId === staffId && d.date === date && d.status !== 'rejected'
  )
}
