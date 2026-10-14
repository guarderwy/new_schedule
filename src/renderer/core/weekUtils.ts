import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Staff, StaffStatus } from '@renderer/types/staff'

dayjs.extend(isoWeek)

/** 临时状态：在状态有效期结束后自动恢复可用 */
const TEMPORARY_STATUSES: ReadonlySet<StaffStatus> = new Set<StaffStatus>([
  'leave',
  'training',
  'suspended'
])

export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function getWeekRange(date: string | Date): {
  weekStart: string
  weekEnd: string
  weekKey: string
} {
  const d = dayjs(date)
  const monday = d.startOf('isoWeek')
  const sunday = d.endOf('isoWeek')
  const weekStart = monday.format('YYYY-MM-DD')
  const weekEnd = sunday.format('YYYY-MM-DD')
  return { weekStart, weekEnd, weekKey: `${weekStart}-${weekEnd}` }
}

export function getCurrentWeekKey(): string {
  return getWeekRange(new Date()).weekKey
}

export function getNextWeekKey(): string {
  return getWeekRange(dayjs().add(1, 'week').toDate()).weekKey
}

export function getLastWeekKey(): string {
  return getWeekRange(dayjs().subtract(1, 'week').toDate()).weekKey
}

/**
 * 目标周的上一个周。
 * “复制上周排班 / 生成排班”时的数据来源必须是目标周的前一周：
 * 在“下周排班”页，上周 = 本周（正在执行的排班）；在“本周排班”页，上周 = 上一个自然周。
 * 不能直接用 getLastWeekKey()（那是以今天为基准的，对目标周而言会多退一周）。
 */
export function getPreviousWeekKey(targetWeekKey: string): string {
  const { weekStart } = parseWeekKey(targetWeekKey)
  return getWeekRange(dayjs(weekStart).subtract(1, 'week').toDate()).weekKey
}

export function getWeekDates(weekStart: string): string[] {
  const start = dayjs(weekStart)
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'))
}

export function isWeekend(date: string): boolean {
  const day = dayjs(date).day()
  return day === 0 || day === 6
}

export function formatColumnLabel(date: string): string {
  const d = dayjs(date)
  const names = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.format('MM-DD')} 周${names[d.day()]}`
}

export function weekdayName(date: string): string {
  const names = ['日', '一', '二', '三', '四', '五', '六']
  return names[dayjs(date).day()]
}

export function monthDay(date: string): string {
  const d = dayjs(date)
  return `${d.month() + 1}.${d.date()}`
}

export function canDeleteWeek(weekStart: string): boolean {
  return dayjs(weekStart).isAfter(dayjs(), 'day')
}

export function canEditDate(date: string): boolean {
  return !dayjs(date).isBefore(dayjs(), 'day')
}

/**
 * 判断员工在某天是否可排班。
 * 规则：
 * - 状态开始时间晚于该天（如未来到岗期）→ 不可用；
 * - 临时状态（休假/进修/停职）已过状态结束时间 → 恢复可用；
 * - 离职永久不可用；其余仅“在职”可用。
 * 比较统一归一到“天”粒度，避免状态时间带时区后缀导致生效日偏移。
 */
export function isStaffAvailableOnDate(staff: Staff, date: string): boolean {
  const day = dayjs(date).startOf('day')
  const start = staff.statusStartTime ? dayjs(staff.statusStartTime).startOf('day') : null
  const end = staff.statusEndTime ? dayjs(staff.statusEndTime).startOf('day') : null

  if (start && start.isAfter(day)) return false
  if (end && end.isBefore(day) && TEMPORARY_STATUSES.has(staff.status)) return true
  return staff.status === 'active'
}

export function isStaffAvailable(staff: Staff, start: string, end: string): boolean {
  let cursor = dayjs(start)
  const last = dayjs(end)
  while (!cursor.isAfter(last, 'day')) {
    if (isStaffAvailableOnDate(staff, cursor.format('YYYY-MM-DD'))) return true
    cursor = cursor.add(1, 'day')
  }
  return false
}

const WEEK_KEY_PATTERN = /^(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/

export function parseWeekKey(weekKey: string): { weekStart: string; weekEnd: string } {
  const matched = WEEK_KEY_PATTERN.exec(weekKey)
  if (matched) return { weekStart: matched[1], weekEnd: matched[2] }
  // 兜底：兼容历史/异常格式，避免直接抛出
  return {
    weekStart: weekKey.slice(0, 10),
    weekEnd: weekKey.slice(11)
  }
}
