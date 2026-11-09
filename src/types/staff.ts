export type StaffStatus = 'active' | 'leave' | 'resigned' | 'training' | 'suspended'
export type GroupType = 'day' | 'night'

export interface Staff {
  id: string
  name: string
  employeeNo: string
  title: string
  remark?: string
  status: StaffStatus
  statusStartTime: string | null
  statusEndTime: string | null
  postId: string | null
  bedManagement?: string
  annualLeave: number
  accumulatedLeave: number
  groupType: GroupType
  createdAt: string
  updatedAt: string
}

export interface StaffFile {
  version: number
  list: Staff[]
}
