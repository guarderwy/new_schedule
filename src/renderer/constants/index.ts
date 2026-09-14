export const FILE_NAMES = {
  STAFF: 'staff.json',
  POSTS: 'posts.json',
  SHIFTS: 'shifts.json',
  SCHEDULES: 'schedules.json',
  NIGHT_RULES: 'night_shift_rules.json',
  DEMANDS: 'demands.json',
  SETTINGS: 'settings.json'
} as const

export const DEFAULT_ASSIST_NIGHT_SHIFT_ID = 'assist-night-shift'

export const BACKUP_KEEP_DAYS = 7

export const WEEK_KEY_FORMAT = 'YYYY-MM-DD-YYYY-MM-DD'

export const STAFF_STATUS_LABEL: Record<string, string> = {
  active: '在职',
  leave: '休假',
  resigned: '离职',
  training: '进修',
  suspended: '停职'
}

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
