export type StaffStatus =
  | 'active'
  | 'leave'
  | 'resigned'
  | 'training'
  | 'suspended'
  | 'other'

export type GroupType = 'day' | 'night'

export interface Staff {
  id: string
  name: string
  employeeNo: string
  title: string
  remark?: string
  status: StaffStatus
  /** 状态选「其他」时填写的自定义说明 */
  statusNote?: string
  statusStartTime: string | null
  statusEndTime: string | null
  postId: string | null
  bedManagement?: string
  annualLeave: number
  accumulatedLeave: number
  groupType: GroupType
  /** 人员列表与排班表的固定顺序，按正序展示 */
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface StaffFile {
  version: number
  list: Staff[]
}
