<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScheduleDetail, ScheduleWeek } from '@renderer/types/schedule'
import type { Staff } from '@renderer/types/staff'
import type { Shift } from '@renderer/types/shift'
import type { Post } from '@renderer/types/post'
import { getWeekDates, monthDay, weekdayName } from '@renderer/core/weekUtils'
import ScheduleCell from './ScheduleCell.vue'
import ShiftSelectDialog from './ShiftSelectDialog.vue'

const props = defineProps<{
  week: ScheduleWeek
  staffList: Staff[]
  shiftList: Shift[]
  postList?: Post[]
  title?: string
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

const postMap = computed(() => new Map((props.postList ?? []).map((p) => [p.id, p.name])))

const tableData = computed(() =>
  staffInWeek.value.map((s) => ({
    staffId: s.id,
    staffName: s.name,
    title: s.title,
    annualLeave: s.annualLeave,
    accumulatedLeave: s.accumulatedLeave,
    bedManagement: s.bedManagement ?? '',
    postName: s.postId ? (postMap.value.get(s.postId) ?? '') : ''
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
  <div class="schedule-wrap">
    <h3 v-if="title" class="schedule-title">{{ title }}</h3>
    <el-table :data="tableData" border height="calc(100vh - 260px)" class="schedule-table">
      <el-table-column prop="annualLeave" label="年假" width="56" fixed="left" align="center" />
      <el-table-column prop="title" label="能级/职称" width="90" fixed="left" align="center" />
      <el-table-column prop="postName" label="岗位" width="110" fixed="left" align="center" />
      <el-table-column prop="bedManagement" label="管床" width="110" fixed="left" />
      <el-table-column prop="staffName" label="姓名" width="84" fixed="left" align="center" />
      <el-table-column v-for="date in weekDates" :key="date" min-width="108" align="center">
        <template #header>
          <div class="day-head">
            <div class="day-name">星期{{ weekdayName(date) }}</div>
            <div class="day-date">{{ monthDay(date) }}</div>
          </div>
        </template>
        <template #default="{ row }">
          <ScheduleCell
            :detail="getDetail(row.staffId, date)"
            :shift="getShift(getDetail(row.staffId, date)?.shiftId)"
            :editable="isEditable(date)"
            @click="openDialog(row.staffId, date)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="accumulatedLeave" label="积休" width="56" fixed="right" align="center" />
    </el-table>

    <ShiftSelectDialog
      v-model="dialogVisible"
      :shifts="shiftList"
      :current="currentDetail"
      @confirm="onDialogConfirm"
    />
  </div>
</template>

<style scoped>
.schedule-title {
  margin: 4px 0 12px;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.day-head {
  line-height: 1.4;
}

.day-name {
  font-weight: 600;
}

.day-date {
  font-size: 12px;
  color: #909399;
}
</style>
