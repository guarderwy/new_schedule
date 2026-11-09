import type { Post } from './post'
import type { Shift } from './shift'
import type { Staff } from './staff'

export type ScheduleStatus = 'draft' | 'published' | 'expired'

export interface ScheduleDetail {
  id: string
  staffId: string
  date: string
  shiftId: string | null
  isRest: boolean
  remark?: string
  /** 备注文字颜色，未设置时跟随默认字体色 */
  remarkColor?: string | null
}

export interface ScheduleWeek {
  weekKey: string
  weekStart: string
  weekEnd: string
  status: ScheduleStatus
  generatedAt: string | null
  details: ScheduleDetail[]
}

export interface SchedulesFile {
  version: number
  weeks: Record<string, ScheduleWeek>
}

/**
 * 历史排班的存档镜像：生成后不再随当前人员 / 班次 / 岗位数据变化。
 * published = 发布时归档；week-end = 周结束后自动归档。
 */
export interface ScheduleSnapshot {
  weekKey: string
  archivedAt: string
  source: 'published' | 'week-end'
  week: ScheduleWeek
  staffList: Staff[]
  shiftList: Shift[]
  postList: Post[]
}
