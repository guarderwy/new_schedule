import type { NightShiftRule } from '@renderer/types/nightRule'
import type { ScheduleWeek } from '@renderer/types/schedule'
import type { Settings } from '@renderer/types/settings'
import type { Staff } from '@renderer/types/staff'

export interface ShiftReferenceCount {
  /** 排班详情中引用该班次的条数 */
  details: number
  /** 夜班循环规则中引用该班次的条数 */
  rules: number
  /** 系统设置（助夜班 / 工作日必备 / 周末必备）中引用该班次的条数 */
  settings: number
}

/** 统计一个班次被哪些数据引用，用于删除前的影响评估 */
export function countShiftReferences(
  shiftId: string,
  weeks: Record<string, ScheduleWeek>,
  nightRules: NightShiftRule[],
  settings: Settings
): ShiftReferenceCount {
  let details = 0
  for (const week of Object.values(weeks)) {
    for (const d of week.details) {
      if (d.shiftId === shiftId) details += 1
    }
  }
  const rules = nightRules.filter((r) => r.shiftId === shiftId).length
  const settingsCount =
    (settings.assistNightShiftId === shiftId ? 1 : 0) +
    settings.weekdayRequiredShiftIds.filter((id) => id === shiftId).length +
    settings.weekendRequiredShiftIds.filter((id) => id === shiftId).length
  return { details, rules, settings: settingsCount }
}

/** 统计一个岗位被多少人员引用 */
export function countPostReferences(postId: string, staffList: Staff[]): number {
  return staffList.filter((s) => s.postId === postId).length
}

export interface StaffReferenceCount {
  /** 排班详情条数 */
  details: number
  /** 需求条数 */
  demands: number
}

/** 统计一个人员被哪些排班/需求数据引用 */
export function countStaffReferences(
  staffId: string,
  weeks: Record<string, ScheduleWeek>,
  demandCount: number
): StaffReferenceCount {
  let details = 0
  for (const week of Object.values(weeks)) {
    for (const d of week.details) {
      if (d.staffId === staffId) details += 1
    }
  }
  return { details, demands: demandCount }
}

/** 生成删除前的影响说明文本，无影响时返回空字符串 */
export function buildShiftDeleteWarning(
  shiftName: string,
  count: ShiftReferenceCount
): string {
  const parts: string[] = []
  if (count.details > 0) parts.push(`${count.details} 条排班记录`)
  if (count.rules > 0) parts.push(`${count.rules} 条夜班循环规则`)
  if (count.settings > 0) parts.push(`${count.settings} 处系统设置`)
  if (parts.length === 0) return `确认删除班次「${shiftName}」？`
  return `确认删除班次「${shiftName}」？该班次正被${parts.join('、')}引用，删除后将自动清空这些引用。`
}

export function buildPostDeleteWarning(postName: string, count: number): string {
  if (count === 0) return `确认删除岗位「${postName}」？`
  return `确认删除岗位「${postName}」？有 ${count} 名人员属于该岗位，删除后这些人员的岗位将被清空。`
}

export function buildStaffDeleteWarning(
  staffName: string,
  count: StaffReferenceCount
): string {
  const parts: string[] = []
  if (count.details > 0) parts.push(`${count.details} 条排班记录`)
  if (count.demands > 0) parts.push(`${count.demands} 条需求`)
  if (parts.length === 0) return `确认删除人员「${staffName}」？`
  return `确认删除人员「${staffName}」？将同时删除该人员的${parts.join('和')}。`
}
