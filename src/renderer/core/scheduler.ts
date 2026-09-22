import { cloneDeep } from 'lodash-es'
import type { Demand } from '@renderer/types/demand'
import type { NightShiftRule } from '@renderer/types/nightRule'
import { REST_RULE_SHIFT_ID } from '@renderer/types/nightRule'
import type { ScheduleDetail, ScheduleWeek } from '@renderer/types/schedule'
import type { Settings } from '@renderer/types/settings'
import type { Shift } from '@renderer/types/shift'
import type { Staff } from '@renderer/types/staff'
import { findTimeConflicts } from './conflictChecker'
import { hasDemandOnDate, validateSchedule } from './validator'
import {
  getWeekDates,
  isStaffAvailable,
  isStaffAvailableOnDate,
  isWeekend,
  parseWeekKey
} from './weekUtils'

export interface GenerateParams {
  targetWeekKey: string
  staffList: Staff[]
  shifts: Shift[]
  nightRules: NightShiftRule[]
  demands: Demand[]
  settings: Settings
  lastWeek?: ScheduleWeek
}

export interface GenerateResult {
  week: ScheduleWeek
  missingRequired: { date: string; shiftId: string; need: number; actual: number }[]
  warnings: string[]
  metDemandIds: string[]
}

function findDetail(
  details: ScheduleDetail[],
  staffId: string,
  date: string
): ScheduleDetail | undefined {
  return details.find((d) => d.staffId === staffId && d.date === date)
}

function applyDemands(
  details: ScheduleDetail[],
  demands: Demand[],
  dates: string[],
  availableStaff: Staff[]
): string[] {
  const dateSet = new Set(dates)
  const staffSet = new Set(availableStaff.map((s) => s.id))
  const metDemandIds: string[] = []

  for (const demand of demands) {
    if (demand.status === 'rejected') continue
    if (!dateSet.has(demand.date)) continue
    if (!staffSet.has(demand.staffId)) continue
    const detail = findDetail(details, demand.staffId, demand.date)
    if (!detail) continue
    if (demand.type === 'rest') {
      detail.isRest = true
      detail.shiftId = null
    } else if (demand.shiftId) {
      detail.isRest = false
      detail.shiftId = demand.shiftId
    }
    metDemandIds.push(demand.id)
  }
  return metDemandIds
}

function copyNonNightFromLastWeek(
  details: ScheduleDetail[],
  lastWeek: ScheduleWeek,
  nightShiftIds: Set<string>,
  demands: Demand[]
): void {
  const lastDates = getWeekDates(lastWeek.weekStart)
  const targetDates = [...new Set(details.map((d) => d.date))].sort()
  if (targetDates.length !== 7 || lastDates.length !== 7) return

  for (let i = 0; i < 7; i++) {
    const lastDate = lastDates[i]
    const date = targetDates[i]
    const lastDayDetails = lastWeek.details.filter((d) => d.date === lastDate)
    for (const lastDetail of lastDayDetails) {
      if (lastDetail.shiftId && nightShiftIds.has(lastDetail.shiftId)) continue
      if (hasDemandOnDate(demands, lastDetail.staffId, date)) continue
      const detail = findDetail(details, lastDetail.staffId, date)
      if (!detail) continue
      if (detail.shiftId || detail.isRest) continue
      detail.shiftId = lastDetail.shiftId
      detail.isRest = lastDetail.isRest
      detail.remark = lastDetail.remark ?? ''
    }
  }
}

function nextNightShiftId(
  rules: NightShiftRule[],
  cursor: { index: number },
  date: string,
  assistNightShiftId: string | null
): string | null {
  if (rules.length === 0) return null
  for (let n = 0; n < rules.length; n++) {
    const rule = rules[cursor.index % rules.length]
    cursor.index = (cursor.index + 1) % rules.length
    if (isWeekend(date) && assistNightShiftId && rule.shiftId === assistNightShiftId) {
      continue
    }
    return rule.shiftId
  }
  return null
}

function generateNightShifts(
  details: ScheduleDetail[],
  dates: string[],
  staffList: Staff[],
  nightRules: NightShiftRule[],
  lastWeek: ScheduleWeek | undefined,
  assistNightShiftId: string | null
): void {
  const rules = [...nightRules].sort((a, b) => a.sortOrder - b.sortOrder)
  if (rules.length === 0) return

  const nightStaff = staffList
    .filter((s) => s.groupType === 'night')
    .sort((a, b) => a.employeeNo.localeCompare(b.employeeNo) || a.name.localeCompare(b.name))

  let startIndex = 0
  if (lastWeek) {
    const lastDates = getWeekDates(lastWeek.weekStart)
    let lastShiftId: string | null = null
    for (let i = lastDates.length - 1; i >= 0 && !lastShiftId; i--) {
      const dayDetails = lastWeek.details.filter(
        (d) => d.date === lastDates[i] && d.shiftId && rules.some((r) => r.shiftId === d.shiftId)
      )
      if (dayDetails.length > 0) {
        lastShiftId = dayDetails[dayDetails.length - 1].shiftId
      }
    }
    if (lastShiftId) {
      const idx = rules.findIndex((r) => r.shiftId === lastShiftId)
      startIndex = idx >= 0 ? (idx + 1) % rules.length : 0
    }
  }

  const cursor = { index: startIndex }
  for (const date of dates) {
    for (const staff of nightStaff) {
      if (!isStaffAvailableOnDate(staff, date)) continue
      const detail = findDetail(details, staff.id, date)
      if (!detail) continue
      if (detail.isRest || detail.shiftId) continue
      const shiftId = nextNightShiftId(rules, cursor, date, assistNightShiftId)
      if (!shiftId) continue
      if (shiftId === REST_RULE_SHIFT_ID) {
        // 夜班循环规则中的「休息」：标记该员工当天休息
        detail.shiftId = null
        detail.isRest = true
      } else {
        detail.shiftId = shiftId
        detail.isRest = false
      }
    }
  }
}

function fillRequiredShifts(
  details: ScheduleDetail[],
  dates: string[],
  staffList: Staff[],
  settings: Settings
): void {
  const dayStaff = staffList
    .filter((s) => s.groupType === 'day')
    .sort((a, b) => a.employeeNo.localeCompare(b.employeeNo) || a.name.localeCompare(b.name))

  let poll = 0
  for (const date of dates) {
    const requiredIds = isWeekend(date)
      ? settings.weekendRequiredShiftIds
      : settings.weekdayRequiredShiftIds
    for (const shiftId of requiredIds) {
      const actual = details.filter((d) => d.date === date && d.shiftId === shiftId).length
      if (actual >= 1) continue
      const candidates = dayStaff.filter((staff) => {
        if (!isStaffAvailableOnDate(staff, date)) return false
        const detail = findDetail(details, staff.id, date)
        if (!detail) return false
        return !detail.isRest && !detail.shiftId
      })
      if (candidates.length === 0) continue
      const staff = candidates[poll % candidates.length]
      poll += 1
      const detail = findDetail(details, staff.id, date)
      if (!detail) continue
      detail.shiftId = shiftId
      detail.isRest = false
    }
  }
}

export function generateSchedule(params: GenerateParams): GenerateResult {
  const { targetWeekKey, staffList, shifts, nightRules, demands, settings, lastWeek } = params
  const { weekStart: ws, weekEnd: we } = parseWeekKey(targetWeekKey)
  const dates = getWeekDates(ws)
  const availableStaff = staffList.filter((s) => isStaffAvailable(s, ws, we))
  const details: ScheduleDetail[] = []

  for (const staff of availableStaff) {
    for (const date of dates) {
      details.push({
        id: crypto.randomUUID(),
        staffId: staff.id,
        date,
        shiftId: null,
        isRest: false,
        remark: ''
      })
    }
  }

  const metDemandIds = applyDemands(details, demands, dates, availableStaff)

  const nightShiftIds = new Set(nightRules.map((r) => r.shiftId))
  if (lastWeek) {
    copyNonNightFromLastWeek(details, lastWeek, nightShiftIds, demands)
  }

  generateNightShifts(details, dates, availableStaff, nightRules, lastWeek, settings.assistNightShiftId)
  fillRequiredShifts(details, dates, availableStaff, settings)

  const { missingRequired, warnings } = validateSchedule({
    details,
    dates,
    staffList,
    shifts,
    settings,
    nightRules
  })
  warnings.push(...findTimeConflicts(details, shifts))

  return {
    week: {
      weekKey: targetWeekKey,
      weekStart: ws,
      weekEnd: we,
      status: 'draft',
      generatedAt: new Date().toISOString(),
      details
    },
    missingRequired,
    warnings,
    metDemandIds
  }
}

export function copyLastWeekSchedule(params: {
  targetWeekKey: string
  lastWeek: ScheduleWeek
  staffList: Staff[]
  shifts: Shift[]
}): ScheduleWeek {
  const { targetWeekKey, lastWeek, staffList } = params
  const { weekStart: ws, weekEnd: we } = parseWeekKey(targetWeekKey)
  const dates = getWeekDates(ws)
  const lastDates = getWeekDates(lastWeek.weekStart)
  const availableStaff = staffList.filter((s) => isStaffAvailable(s, ws, we))

  const details: ScheduleDetail[] = []
  for (const staff of availableStaff) {
    for (let i = 0; i < 7; i++) {
      const date = dates[i]
      const lastDate = lastDates[i]
      const lastDetail = lastWeek.details.find((d) => d.staffId === staff.id && d.date === lastDate)
      details.push({
        id: crypto.randomUUID(),
        staffId: staff.id,
        date,
        shiftId: lastDetail?.shiftId ?? null,
        isRest: lastDetail?.isRest ?? false,
        remark: lastDetail?.remark ?? ''
      })
    }
  }

  return {
    weekKey: targetWeekKey,
    weekStart: ws,
    weekEnd: we,
    status: 'draft',
    generatedAt: new Date().toISOString(),
    details
  }
}

export function buildEmptyWeek(
  targetWeekKey: string,
  staffList: Staff[]
): ScheduleWeek {
  const { weekStart: ws, weekEnd: we } = parseWeekKey(targetWeekKey)
  const dates = getWeekDates(ws)
  const availableStaff = staffList.filter((s) => isStaffAvailable(s, ws, we))
  const details: ScheduleDetail[] = []
  for (const staff of availableStaff) {
    for (const date of dates) {
      details.push({
        id: crypto.randomUUID(),
        staffId: staff.id,
        date,
        shiftId: null,
        isRest: false,
        remark: ''
      })
    }
  }
  return {
    weekKey: targetWeekKey,
    weekStart: ws,
    weekEnd: we,
    status: 'draft',
    generatedAt: null,
    details
  }
}

export function cloneWeek(week: ScheduleWeek): ScheduleWeek {
  return cloneDeep(week)
}
