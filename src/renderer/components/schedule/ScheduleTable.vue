<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScheduleDetail, ScheduleWeek } from '@renderer/types/schedule'
import type { Staff } from '@renderer/types/staff'
import type { Shift } from '@renderer/types/shift'
import { formatColumnLabel, getWeekDates } from '@renderer/core/weekUtils'
import { GROUP_TYPE_LABEL } from '@renderer/constants'
import ScheduleCell from './ScheduleCell.vue'
import ShiftSelectDialog from './ShiftSelectDialog.vue'

const props = defineProps<{
  week: ScheduleWeek
  staffList: Staff[]
  shiftList: Shift[]
  editable?: boolean | ((date: string) => boolean)
}>()

const emit = defineEmits<{
  'cell-change': [payload: { staffId: string; date: string; shiftId: string | null; isRest: boolean }]
}>()

const weekDates = computed(() => getWeekDates(props.week.weekStart))

const staffInWeek = computed(() => {
  const ids = new Set(props.week.details.map((d) => d.staffId))
  return props.staffList.filter((s) => ids.has(s.id))
})

const tableData = computed(() =>
  staffInWeek.value.map((s) => ({
    staffId: s.id,
    staffName: s.name,
    employeeNo: s.employeeNo,
    groupType: s.groupType
  }))
)

function getDetail(staffId: string, date: string): ScheduleDetail | undefined {
  return props.week.details.find((d) => d.staffId === staffId && d.date === date)
}

function getShift(shiftId?: string | null): Shift | undefined {
  if (!shiftId) return undefined
  return props.shiftList.find((s) => s.id === shiftId)
}

function isEditable(date: string): boolean {
  if (typeof props.editable === 'function') return props.editable(date)
  return props.editable !== false
}

const dialogVisible = ref(false)
const currentStaffId = ref('')
const currentDate = ref('')
const currentDetail = computed(() => getDetail(currentStaffId.value, currentDate.value))

function openDialog(staffId: string, date: string) {
  if (!isEditable(date)) return
  currentStaffId.value = staffId
  currentDate.value = date
  dialogVisible.value = true
}

function onDialogConfirm(payload: { shiftId: string | null; isRest: boolean }) {
  emit('cell-change', {
    staffId: currentStaffId.value,
    date: currentDate.value,
    ...payload
  })
}
</script>

<template>
  <el-table :data="tableData" border height="calc(100vh - 220px)">
    <el-table-column prop="staffName" label="人员" fixed width="180">
      <template #default="{ row }">
        <div>{{ row.staffName }}</div>
        <div class="sub">{{ row.employeeNo }} · {{ GROUP_TYPE_LABEL[row.groupType] }}</div>
      </template>
    </el-table-column>
    <el-table-column
      v-for="date in weekDates"
      :key="date"
      :label="formatColumnLabel(date)"
      min-width="120"
    >
      <template #default="{ row }">
        <ScheduleCell
          :detail="getDetail(row.staffId, date)"
          :shift="getShift(getDetail(row.staffId, date)?.shiftId)"
          :editable="isEditable(date)"
          @click="openDialog(row.staffId, date)"
        />
      </template>
    </el-table-column>
  </el-table>

  <ShiftSelectDialog
    v-model="dialogVisible"
    :shifts="shiftList"
    :current="currentDetail"
    @confirm="onDialogConfirm"
  />
</template>
