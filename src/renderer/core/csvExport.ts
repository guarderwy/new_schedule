import type { Post } from '@renderer/types/post'
import type { ScheduleWeek } from '@renderer/types/schedule'
import type { Shift } from '@renderer/types/shift'
import type { Staff } from '@renderer/types/staff'
import { getWeekDates, weekdayName } from './weekUtils'

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** 将某一周排班导出为 CSV 文件（带 BOM，Excel 可直接打开中文） */
export function exportWeekToCsv(
  week: ScheduleWeek,
  staffList: Staff[],
  shifts: Shift[],
  posts: Post[]
): void {
  const dates = getWeekDates(week.weekStart)
  const shiftMap = new Map(shifts.map((s) => [s.id, s.name]))
  const postMap = new Map(posts.map((p) => [p.id, p.name]))

  const header = [
    '工号',
    '姓名',
    '能级/职称',
    '岗位',
    '管床',
    '年假',
    '积休',
    ...dates.map((d) => `${d} 周${weekdayName(d)}`)
  ]

  const rows = staffList
    .filter((s) => week.details.some((d) => d.staffId === s.id))
    .map((s) => {
      const cells = dates.map((date) => {
        const detail = week.details.find((d) => d.staffId === s.id && d.date === date)
        if (!detail) return ''
        if (detail.isRest) return '休'
        if (!detail.shiftId) return ''
        return shiftMap.get(detail.shiftId) ?? detail.shiftId
      })
      return [
        s.employeeNo,
        s.name,
        s.title,
        s.postId ? (postMap.get(s.postId) ?? '') : '',
        s.bedManagement ?? '',
        String(s.annualLeave),
        String(s.accumulatedLeave),
        ...cells
      ]
    })

  const csv = ['\uFEFF', [header, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')].join('')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `排班表-${week.weekKey}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
