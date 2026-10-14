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
  availableStaff: Staff[],
  shifts: Shift[]
): string[] {
  const dateSet = new Set(dates)
  const staffSet = new Set(availableStaff.map((s) => s.id))
  const shiftIdSet = new Set(shifts.map((s) => s.id))
  const metDemandIds: string[] = []

  for (const demand of demands) {
    if (demand.status === 'rejected') continue
    if (!dateSet.has(demand.date)) continue
    if (!staffSet.has(demand.staffId)) continue
    const staff = availableStaff.find((s) => s.id === demand.staffId)
    // 员工当天不可用时不应用需求，保持“待处理”，避免排出无效班
    if (staff && !isStaffAvailableOnDate(staff, demand.date)) continue
    const detail = findDetail(details, demand.staffId, demand.date)
    if (!detail) continue
    if (demand.type === 'rest') {
      detail.isRest = true
      detail.shiftId = null
    } else if (demand.shiftId && shiftIdSet.has(demand.shiftId)) {
      detail.isRest = false
      detail.shiftId = demand.shiftId
    } else {
      // 指定班次但未选择（或班次已被删除）：视为未满足，不标记
      continue
    }
    metDemandIds.push(demand.id)
  }
  return metDemandIds
}

function copyNonNightFromLastWeek(
  details: ScheduleDetail[],
  lastWeek: ScheduleWeek,
  nightShiftIds: Set<string>,
  demands: Demand[],
  staffList: Staff[]
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
      const staff = staffList.find((s) => s.id === lastDetail.staffId)
      // 员工当天不可用时不复制班次，避免把班排给已休假的人
      if (staff && !isStaffAvailableOnDate(staff, date)) continue
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
  dates.forEach((date, dayIndex) => {
    // 关键修复：每天的循环起点在上一天基础上整体后移一格。
    // 原实现只按“员工×天”累加游标，当夜班人数与规则数成整除关系时
    // 循环会完全停滞（同一员工每天固定拿到同一条规则）。
    cursor.index = (startIndex + dayIndex) % rules.length
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
  })
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

  // 记录每个必备班次上一次安排的人，保证同一必备班次逐日轮换到不同的人
  const lastPicked = new Map<string, string>()
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
      const previous = lastPicked.get(shiftId)
      let index = candidates.findIndex((staff) => staff.id !== previous)
      if (index < 0) index = 0
      const staff = candidates[index]
      lastPicked.set(shiftId, staff.id)
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

  const metDemandIds = applyDemands(details, demands, dates, availableStaff, shifts)

  const nightShiftIds = new Set(nightRules.map((r) => r.shiftId))
  if (lastWeek) {
    copyNonNightFromLastWeek(details, lastWeek, nightShiftIds, demands, staffList)
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
  warnings.push(...findTimeConflicts(details, shifts, staffList))

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
  demands?: Demand[]
  settings?: Settings
}): ScheduleWeek {
  const { targetWeekKey, lastWeek, staffList, shifts } = params
  const demands = params.demands ?? []
  const settings = params.settings
  const { weekStart: ws, weekEnd: we } = parseWeekKey(targetWeekKey)
  const dates = getWeekDates(ws)
  const lastDates = getWeekDates(lastWeek.weekStart)
  const availableStaff = staffList.filter((s) => isStaffAvailable(s, ws, we))
  const shiftIdSet = new Set(shifts.map((s) => s.id))

  const details: ScheduleDetail[] = []
  for (const staff of availableStaff) {
    for (let i = 0; i < 7; i++) {
      const date = dates[i]
      const lastDate = lastDates[i]
      const lastDetail = lastWeek.details.find((d) => d.staffId === staff.id && d.date === lastDate)

      let shiftId: string | null = null
      let isRest = false
      let remark = ''

      const demand = demands.find(
        (d) => d.staffId === staff.id && d.date === date && d.status !== 'rejected'
      )
      const availableOnDate = isStaffAvailableOnDate(staff, date)

      if (demand && availableOnDate) {
        // 与“生成排班”保持一致：优先应用需求
        if (demand.type === 'rest') {
          isRest = true
        } else if (demand.shiftId && shiftIdSet.has(demand.shiftId)) {
          shiftId = demand.shiftId
        }
        remark = demand.remark ?? ''
      } else if (availableOnDate && lastDetail) {
        shiftId = lastDetail.shiftId
        isRest = lastDetail.isRest
        remark = lastDetail.remark ?? ''
        // 与“生成排班”保持一致：周末不排助夜班
        if (
          isWeekend(date) &&
          settings?.assistNightShiftId &&
          shiftId === settings.assistNightShiftId
        ) {
          shiftId = null
          isRest = false
        }
      }

      details.push({
        id: crypto.randomUUID(),
        staffId: staff.id,
        date,
        shiftId,
        isRest,
        remark
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

/**
 * 把尚未进入某一周排班的人员补充进去（生成空白排班单元）。
 * 解决“周生成后新增员工在排班表中没有行、也无法手动加入”的问题。
 */
export function appendStaffToWeek(week: ScheduleWeek, staffList: Staff[]): ScheduleWeek {
  const dates = getWeekDates(week.weekStart)
  const existing = new Set(week.details.map((d) => d.staffId))
  const additions: ScheduleDetail[] = []

  for (const staff of staffList) {
    if (existing.has(staff.id)) continue
    if (!isStaffAvailable(staff, week.weekStart, week.weekEnd)) continue
    for (const date of dates) {
      additions.push({
        id: crypto.randomUUID(),
        staffId: staff.id,
        date,
        shiftId: null,
        isRest: false,
        remark: ''
      })
    }
  }

  if (additions.length === 0) return week
  return { ...week, details: [...week.details, ...additions] }
}
