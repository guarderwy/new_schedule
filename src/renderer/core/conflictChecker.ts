import dayjs from 'dayjs'
import type { ScheduleDetail } from '@renderer/types/schedule'
import type { Shift } from '@renderer/types/shift'
import type { Staff } from '@renderer/types/staff'

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.NaN
  return h * 60 + m
}

interface AbsInterval {
  start: number
  end: number
}

/**
 * 把班次换算到“绝对值时间轴”（分钟）上，跨零点的班次（如 23:00-08:00）
 * 结束时间会顺延到第二天，从而可以检测跨天的时间冲突。
 */
function toAbsInterval(shift: Shift, date: string): AbsInterval | null {
  const startMinutes = toMinutes(shift.startTime)
  let endMinutes = toMinutes(shift.endTime)
  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return null
  if (endMinutes <= startMinutes) endMinutes += 24 * 60
  const dayBase = dayjs(date).startOf('day').valueOf() / 60_000
  return { start: dayBase + startMinutes, end: dayBase + endMinutes }
}

/**
 * 检测班次时间冲突：
 * - 同一天多个班次时间重叠；
 * - 跨天冲突：夜班（23:00-08:00）与次日早班（07:30 起）实际重叠。
 */
export function findTimeConflicts(
  details: ScheduleDetail[],
  shifts: Shift[],
  staffList: Staff[] = []
): string[] {
  const shiftMap = new Map(shifts.map((s) => [s.id, s]))
  const staffNameMap = new Map(staffList.map((s) => [s.id, s.name]))
  const warnings: string[] = []

  const byStaff = new Map<string, { detail: ScheduleDetail; interval: AbsInterval }[]>()
  for (const detail of details) {
    if (!detail.shiftId || detail.isRest) continue
    const shift = shiftMap.get(detail.shiftId)
    if (!shift) continue
    const interval = toAbsInterval(shift, detail.date)
    if (!interval) continue
    const arr = byStaff.get(detail.staffId) ?? []
    arr.push({ detail, interval })
    byStaff.set(detail.staffId, arr)
  }

  for (const [staffId, items] of byStaff) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        if (a.interval.start < b.interval.end && b.interval.start < a.interval.end) {
          const shiftA = shiftMap.get(a.detail.shiftId!)
          const shiftB = shiftMap.get(b.detail.shiftId!)
          if (!shiftA || !shiftB) continue
          const name = staffNameMap.get(staffId) ?? staffId
          const dateLabel = a.detail.date === b.detail.date ? a.detail.date : `${a.detail.date} / ${b.detail.date}`
          warnings.push(`${dateLabel} ${name} 班次时间冲突：${shiftA.name} / ${shiftB.name}`)
        }
      }
    }
  }

  return warnings
}
