import { REST_RULE_SHIFT_ID, type NightShiftRule } from '@renderer/types/nightRule'
import type { Post } from '@renderer/types/post'
import type { ScheduleDetail, ScheduleWeek } from '@renderer/types/schedule'
import type { Settings } from '@renderer/types/settings'
import type { Shift } from '@renderer/types/shift'
import type { GroupType, Staff, StaffStatus } from '@renderer/types/staff'
import { getCurrentWeekKey, getNextWeekKey, getWeekDates, parseWeekKey } from './weekUtils'

export interface DemoData {
  posts: Post[]
  shifts: Shift[]
  staff: Staff[]
  nightRules: NightShiftRule[]
  settings: Settings
  weeks: ScheduleWeek[]
}

type ShiftCode =
  | 'A1'
  | 'A2'
  | 'A(服)'
  | 'P'
  | 'N'
  | '助夜'
  | '正(医)'
  | '正(1+2)'
  | '正(医+服)'
  | '正'
  | '休(prn)'
  | '休'

const SHIFT_DEFS: Omit<Shift, 'createdAt' | 'updatedAt'>[] = [
  { id: 'shift-a1', name: 'A1', startTime: '07:30', endTime: '16:00', remark: '07:30-10:30, 12:00-16:00' },
  { id: 'shift-a2', name: 'A2', startTime: '07:30', endTime: '16:00', remark: '07:30-10:30, 12:00-16:00' },
  { id: 'shift-a-fu', name: 'A(服)', startTime: '07:30', endTime: '16:00', remark: '服侍班' },
  { id: 'shift-assist-night', name: '助夜', startTime: '16:00', endTime: '22:00', remark: '16:00-22:00' },
  { id: 'shift-p', name: 'P', startTime: '16:00', endTime: '23:00', remark: '16:00-23:00' },
  { id: 'shift-n', name: 'N', startTime: '23:00', endTime: '08:00', remark: '23:00-08:00' },
  { id: 'shift-zheng-yi', name: '正(医)', startTime: '08:00', endTime: '17:30', remark: '08:00-12:00、14:30-17:30' },
  { id: 'shift-zheng-12', name: '正(1+2)', startTime: '07:30', endTime: '17:00', remark: '07:30-12:00、14:30-17:00' },
  { id: 'shift-zheng-yifu', name: '正(医+服)', startTime: '07:30', endTime: '17:30', remark: '07:30-12:00, 14:30-17:30' },
  { id: 'shift-zheng', name: '正', startTime: '08:00', endTime: '17:30', remark: '正班' },
  { id: 'shift-rest-prn', name: '休(prn)', startTime: '', endTime: '', remark: 'PRN 休息' }
]

const SHIFT_ID_BY_CODE: Record<Exclude<ShiftCode, '休'>, string> = {
  A1: 'shift-a1',
  A2: 'shift-a2',
  'A(服)': 'shift-a-fu',
  P: 'shift-p',
  N: 'shift-n',
  助夜: 'shift-assist-night',
  '正(医)': 'shift-zheng-yi',
  '正(1+2)': 'shift-zheng-12',
  '正(医+服)': 'shift-zheng-yifu',
  正: 'shift-zheng',
  '休(prn)': 'shift-rest-prn'
}

const POST_DEFS: { id: string; name: string }[] = [
  { id: 'post-nurse', name: '护士' },
  { id: 'post-charge', name: '主管护师' },
  { id: 'post-tcm', name: '中医护理门诊' },
  { id: 'post-ent', name: '耳鼻喉科门诊' },
  { id: 'post-eye', name: '眼科门诊' },
  { id: 'post-vice-head', name: '副护士长' },
  { id: 'post-training', name: '进修' }
]

interface StaffSeed {
  name: string
  title: string
  postId: string
  bedManagement: string
  annualLeave: number
  accumulatedLeave: number
  status?: StaffStatus
  groupType?: GroupType
}

// 19 名护士（姓名 / 信息参考样例排班表）
const STAFF_SEEDS: StaffSeed[] = [
  { name: '孙菲瑶', title: 'N1', postId: 'post-nurse', bedManagement: '原岗', annualLeave: 0, accumulatedLeave: 1.5 },
  { name: '王铧', title: 'N2', postId: 'post-nurse', bedManagement: '原岗', annualLeave: 5, accumulatedLeave: 0 },
  { name: '吴彤', title: 'N0', postId: 'post-nurse', bedManagement: '支撑', annualLeave: 0, accumulatedLeave: 0.5 },
  { name: '何嘉华', title: 'N0', postId: 'post-nurse', bedManagement: '次责(一组)', annualLeave: 0, accumulatedLeave: 0 },
  { name: '张玲', title: 'N2', postId: 'post-charge', bedManagement: '主责', annualLeave: 10, accumulatedLeave: 3 },
  { name: '吴淇', title: 'N3', postId: 'post-charge', bedManagement: '主责', annualLeave: 10, accumulatedLeave: 2 },
  { name: '吴秋萱', title: 'N2', postId: 'post-tcm', bedManagement: '中医', annualLeave: 10, accumulatedLeave: 4 },
  { name: '陈榴', title: 'N2', postId: 'post-charge', bedManagement: '次责(一组)', annualLeave: 10, accumulatedLeave: 2.5 },
  { name: '肖菁菁', title: 'N2', postId: 'post-nurse', bedManagement: '支撑', annualLeave: 5, accumulatedLeave: 1 },
  { name: '黄霞', title: 'N2', postId: 'post-charge', bedManagement: '主责', annualLeave: 10, accumulatedLeave: 2 },
  { name: '李兰静', title: 'N2', postId: 'post-nurse', bedManagement: '药疗(带班组长)', annualLeave: 5, accumulatedLeave: 1.5 },
  { name: '匡瑞', title: 'N2', postId: 'post-charge', bedManagement: '医辅', annualLeave: 5, accumulatedLeave: 0.5 },
  { name: '何蜜', title: 'N0', postId: 'post-nurse', bedManagement: '', annualLeave: 5, accumulatedLeave: 0 },
  { name: '范永涛', title: 'N3', postId: 'post-tcm', bedManagement: '中医护理门诊', annualLeave: 10, accumulatedLeave: 3 },
  { name: '刘璐', title: 'N3', postId: 'post-tcm', bedManagement: '中医护理门诊', annualLeave: 10, accumulatedLeave: 2 },
  { name: '金金', title: 'N2', postId: 'post-ent', bedManagement: '', annualLeave: 5, accumulatedLeave: 1 },
  { name: '林玉洁', title: 'N3', postId: 'post-eye', bedManagement: '', annualLeave: 10, accumulatedLeave: 2 },
  { name: '贲卉', title: 'N3', postId: 'post-vice-head', bedManagement: '副护士长', annualLeave: 5, accumulatedLeave: 1 },
  { name: '许丹', title: '主管护师', postId: 'post-training', bedManagement: '进修', annualLeave: 5, accumulatedLeave: 0, status: 'training' }
]

const CODE_POOL: ShiftCode[] = ['A1', 'A2', 'A(服)', '正(医)', 'P', 'N', '助夜', '正', '休(prn)', '休']

function weeklyPattern(offset: number): ShiftCode[] {
  return Array.from({ length: 7 }, (_, day) => CODE_POOL[(day + offset) % CODE_POOL.length])
}

function buildWeek(weekKey: string, staffList: Staff[], weekIndex: number): ScheduleWeek {
  const { weekStart, weekEnd } = parseWeekKey(weekKey)
  const dates = getWeekDates(weekStart)
  const details: ScheduleDetail[] = []

  staffList.forEach((staff, index) => {
    const pattern = weeklyPattern(index + weekIndex * 3)
    dates.forEach((date, day) => {
      const code = pattern[day]
      let shiftId: string | null = null
      let isRest = false
      if (code === '休') {
        isRest = true
      } else {
        shiftId = SHIFT_ID_BY_CODE[code]
      }
      details.push({
        id: crypto.randomUUID(),
        staffId: staff.id,
        date,
        shiftId,
        isRest,
        remark: ''
      })
    })
  })

  return {
    weekKey,
    weekStart,
    weekEnd,
    status: 'draft',
    generatedAt: new Date().toISOString(),
    details
  }
}

export function buildDemoData(): DemoData {
  const now = new Date().toISOString()

  const posts: Post[] = POST_DEFS.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: now,
    updatedAt: now
  }))

  const shifts: Shift[] = SHIFT_DEFS.map((s) => ({ ...s, createdAt: now, updatedAt: now }))

  const staff: Staff[] = STAFF_SEEDS.map((seed, index) => ({
    id: `demo-staff-${index + 1}`,
    name: seed.name,
    employeeNo: `D${String(index + 1).padStart(3, '0')}`,
    title: seed.title,
    remark: '',
    status: seed.status ?? 'active',
    statusStartTime: null,
    statusEndTime: null,
    postId: seed.postId,
    bedManagement: seed.bedManagement,
    annualLeave: seed.annualLeave,
    accumulatedLeave: seed.accumulatedLeave,
    groupType: seed.groupType ?? 'day',
    createdAt: now,
    updatedAt: now
  }))

  const nightRules: NightShiftRule[] = [
    { id: 'demo-rule-1', shiftId: 'shift-n', sortOrder: 1 },
    { id: 'demo-rule-2', shiftId: 'shift-assist-night', sortOrder: 2 },
    { id: 'demo-rule-3', shiftId: REST_RULE_SHIFT_ID, sortOrder: 3 }
  ]

  const settings: Settings = {
    version: 1,
    assistNightShiftId: 'shift-assist-night',
    weekdayRequiredShiftIds: ['shift-a1', 'shift-zheng-yi'],
    weekendRequiredShiftIds: ['shift-a1'],
    lastBackupAt: null
  }

  const weeks: ScheduleWeek[] = [
    buildWeek(getCurrentWeekKey(), staff, 0),
    buildWeek(getNextWeekKey(), staff, 1)
  ]

  return { posts, shifts, staff, nightRules, settings, weeks }
}
