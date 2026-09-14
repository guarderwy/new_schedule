import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Staff } from '@renderer/types/staff'

dayjs.extend(isoWeek)

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

export function canDeleteWeek(weekStart: string): boolean {
  return dayjs(weekStart).isAfter(dayjs(), 'day')
}

export function canEditDate(date: string): boolean {
  return !dayjs(date).isBefore(dayjs(), 'day')
}

export function isStaffAvailableOnDate(staff: Staff, date: string): boolean {
  if (staff.status !== 'active') return false
  if (staff.statusStartTime && dayjs(staff.statusStartTime).isAfter(dayjs(date), 'day')) {
    return false
  }
  if (staff.statusEndTime && dayjs(staff.statusEndTime).isBefore(dayjs(date), 'day')) {
    return false
  }
  return true
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

export function parseWeekKey(weekKey: string): { weekStart: string; weekEnd: string } {
  return {
    weekStart: weekKey.slice(0, 10),
    weekEnd: weekKey.slice(11)
  }
}
