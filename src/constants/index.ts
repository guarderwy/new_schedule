import dayjs from 'dayjs'
import type { Staff } from '@/types/staff'

export const FILE_NAMES = {
  STAFF: 'staff.json',
  POSTS: 'posts.json',
  SHIFTS: 'shifts.json',
  SCHEDULES: 'schedules.json',
  HISTORY_SNAPSHOTS: 'history_snapshots.json',
  NIGHT_RULES: 'night_shift_rules.json',
  DEMANDS: 'demands.json',
  SETTINGS: 'settings.json'
} as const

export const STAFF_STATUS_LABEL: Record<string, string> = {
  active: '在职',
  leave: '休假',
  resigned: '离职',
  training: '进修',
  suspended: '停职',
  other: '其他'
}

/**
 * 非在职人员在排班表中要显示的文本：
 * 「其他」优先显示自定义内容，未填写时显示「其他」；在职返回空串。
 */
export function getStaffStatusText(staff: Staff): string {
  if (staff.status === 'active') return ''
  if (staff.status === 'other') return staff.statusNote?.trim() || '其他'
  return STAFF_STATUS_LABEL[staff.status] ?? '其他'
}

/**
 * 严格校验列日期为 YYYY-MM-DD。dayjs 会把 2026-13-45 之类的异常值宽松进位，
 * 因此额外比对格式化结果，确保异常日期按「日期缺失 / 非法」处理。
 */
function isValidDateStr(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    dayjs(date).isValid() &&
    dayjs(date).format('YYYY-MM-DD') === date
  )
}

/**
 * 计算「某一天」相对人员状态结束日的剩余天数。
 *
 * 日期来源：排班表的列日期来自 ScheduleWeek.weekStart（YYYY-MM-DD），
 * 由 getWeekDates() 展开成 7 个 YYYY-MM-DD 字符串；每个单元格再用
 * staffId + 该列 date 精确匹配 week.details 中的 ScheduleDetail（同格式）。
 * 状态显示只依赖列日期，不依赖该天是否存在排班记录。
 *
 * 计算：days = 状态结束日 - 列日期（两端均归一到天），与「今天」无关，
 * 因此同一行 7 列会依次递减 1。dayjs.diff('day') 按真实日历计算，
 * 自动处理跨月、跨年、大小月和闰年，不按 30 / 365 天估算。
 *
 * 返回 null 表示不追加天数：在职、开始 / 结束时间缺失或非法、
 * 结束早于开始、列日期缺失或格式非法。
 */
export function getStaffStatusRemainingDays(staff: Staff, date: string): number | null {
  if (staff.status === 'active' || !staff.statusStartTime || !staff.statusEndTime) return null
  if (!isValidDateStr(date)) return null

  const start = dayjs(staff.statusStartTime)
  const end = dayjs(staff.statusEndTime)
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) return null

  return end.startOf('day').diff(dayjs(date).startOf('day'), 'day')
}

/**
 * 该列日期是否已超过人员状态结束日，与「（已结束 N 天）」文案使用同一计算。
 * 结束后不再用状态占位，改为普通排班单元格，可手动点击配置排班。
 */
export function isStaffStatusEndedOn(staff: Staff, date: string): boolean {
  const days = getStaffStatusRemainingDays(staff, date)
  return days !== null && days < 0
}

/**
 * 排班表某一列（某一天）的人员状态显示文本；姓名列请用 getStaffStatusText()，不带天数。
 *
 * 显示规则（D = 列日期，T = 今天，E = 状态结束日，days = E - D）：
 * - days > 0：「状态（剩余 N 天）」；days = 0：「状态（剩余 0 天）」，即当天为状态最后一天
 * - days < 0：「状态（已结束 N 天）」，用提示文案代替裸负数
 * - D < T（历史列）：仍按该日回溯计算，不清零、不隐藏，显示「按那天看的剩余天数」
 * - D = T（今日列）：即当前真实剩余天数；D > T（未来列）：显示到那天时还剩几天
 */
export function getStaffStatusDisplayText(staff: Staff, date: string): string {
  const text = getStaffStatusText(staff)
  const days = getStaffStatusRemainingDays(staff, date)
  if (!text || days === null) return text
  if (days > 0) return `${text}（剩余${days}天）`
  if (days === 0) return `${text}（剩余0天）`
  return `${text}（已结束${-days}天）`
}

/** 备注文字默认颜色，与全局字体色 var(--ink) 一致 */
export const DEFAULT_REMARK_COLOR = '#1f2937'

export const GROUP_TYPE_LABEL: Record<string, string> = {
  day: '白班',
  night: '夜班'
}

export const DEMAND_TYPE_LABEL: Record<string, string> = {
  rest: '休息',
  shift: '指定班次'
}

export const DEMAND_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  met: '已满足',
  rejected: '已拒绝'
}
