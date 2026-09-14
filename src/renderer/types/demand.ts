export type DemandType = 'rest' | 'shift'
export type DemandStatus = 'pending' | 'met' | 'rejected'

export interface Demand {
  id: string
  staffId: string
  date: string
  type: DemandType
  shiftId: string | null
  remark?: string
  status: DemandStatus
  createdAt: string
  updatedAt: string
}

export interface DemandsFile {
  version: number
  list: Demand[]
}
