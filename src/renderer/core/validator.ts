import type { Demand } from '@renderer/types/demand'
import type { NightShiftRule } from '@renderer/types/nightRule'
import type { ScheduleDetail } from '@renderer/types/schedule'
import type { Settings } from '@renderer/types/settings'
import type { Shift } from '@renderer/types/shift'
import type { Staff } from '@renderer/types/staff'
import { isStaffAvailableOnDate, isWeekend } from './weekUtils'

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

export function validateSchedule(params: ValidateParams): ValidateResult {
  const { details, dates, staffList, settings } = params
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

  const grouped = new Map<string, ScheduleDetail[]>()
  for (const d of details) {
    if (d.isRest || !d.shiftId) continue
    const key = `${d.staffId}|${d.date}`
    const arr = grouped.get(key) ?? []
    arr.push(d)
    grouped.set(key, arr)
  }
  for (const [key, arr] of grouped) {
    if (arr.length > 1) {
      const [staffId, date] = key.split('|')
      const staff = staffList.find((s) => s.id === staffId)
      warnings.push(`${date} ${staff?.name ?? staffId} 同一天多个班次`)
    }
  }

  for (const d of details) {
    if (d.isRest || !d.shiftId) continue
    const staff = staffList.find((s) => s.id === d.staffId)
    if (staff && !isStaffAvailableOnDate(staff, d.date)) {
      warnings.push(`${d.date} ${staff.name} 当天不可用但仍排了班`)
    }
  }

  return { missingRequired, warnings }
}

export function hasDemandOnDate(demands: Demand[], staffId: string, date: string): boolean {
  return demands.some(
    (d) => d.staffId === staffId && d.date === date && d.status !== 'rejected'
  )
}
