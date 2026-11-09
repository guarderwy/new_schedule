export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface ShiftsFile {
  version: number
  list: Shift[]
}
