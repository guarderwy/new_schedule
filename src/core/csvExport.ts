import { getStaffStatusDisplayText, isStaffStatusEndedOn } from '@/constants'
import type { Post } from '@/types/post'
import type { ScheduleWeek } from '@/types/schedule'
import type { Shift } from '@/types/shift'
import type { Staff } from '@/types/staff'
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
    .slice()
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.employeeNo.localeCompare(b.employeeNo)
    )
    .map((s) => {
      const cells = dates.map((date) => {
        const statusText = isStaffStatusEndedOn(s, date)
          ? ''
          : getStaffStatusDisplayText(s, date)
        if (statusText) return statusText
        const detail = week.details.find((d) => d.staffId === s.id && d.date === date)
        if (!detail) return ''
        let base = ''
        if (detail.isRest) base = '休'
        else if (detail.shiftId) base = shiftMap.get(detail.shiftId) ?? detail.shiftId
        const remark = detail.remark?.trim()
        return remark ? `${base || '-'}（${remark}）` : base
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
