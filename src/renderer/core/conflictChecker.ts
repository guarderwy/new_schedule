import type { ScheduleDetail } from '@renderer/types/schedule'
import type { Shift } from '@renderer/types/shift'

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  const aWrap = aEnd <= aStart
  const bWrap = bEnd <= bStart
  const aEndAdj = aWrap ? aEnd + 24 * 60 : aEnd
  const bEndAdj = bWrap ? bEnd + 24 * 60 : bEnd
  return aStart < bEndAdj && bStart < aEndAdj
}

export function findTimeConflicts(
  details: ScheduleDetail[],
  shifts: Shift[]
): string[] {
  const shiftMap = new Map(shifts.map((s) => [s.id, s]))
  const warnings: string[] = []
  const byStaffDate = new Map<string, ScheduleDetail[]>()

  for (const d of details) {
    if (!d.shiftId || d.isRest) continue
    const key = `${d.staffId}|${d.date}`
    const arr = byStaffDate.get(key) ?? []
    arr.push(d)
    byStaffDate.set(key, arr)
  }

  for (const [key, arr] of byStaffDate) {
    if (arr.length < 2) continue
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const sa = shiftMap.get(arr[i].shiftId!)
        const sb = shiftMap.get(arr[j].shiftId!)
        if (!sa || !sb) continue
        if (
          rangesOverlap(
            toMinutes(sa.startTime),
            toMinutes(sa.endTime),
            toMinutes(sb.startTime),
            toMinutes(sb.endTime)
          )
        ) {
          const [staffId, date] = key.split('|')
          warnings.push(`${date} 人员 ${staffId} 班次时间冲突：${sa.name} / ${sb.name}`)
        }
      }
    }
  }

  return warnings
}
