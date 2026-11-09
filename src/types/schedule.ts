export type ScheduleStatus = 'draft' | 'published' | 'expired'

export interface ScheduleDetail {
  id: string
  staffId: string
  date: string
  shiftId: string | null
  isRest: boolean
  remark?: string
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
