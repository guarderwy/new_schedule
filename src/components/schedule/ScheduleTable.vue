<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getStaffStatusText,
  getStaffStatusDisplayText,
  isStaffStatusEndedOn
} from '@/constants'
import type { ScheduleDetail, ScheduleWeek } from '@/types/schedule'
import type { Staff } from '@/types/staff'
import type { Shift } from '@/types/shift'
import type { Post } from '@/types/post'
import { getWeekDates, monthDay, weekdayName } from '@/core/weekUtils'
import ScheduleCell from './ScheduleCell.vue'
import ShiftSelectDialog from './ShiftSelectDialog.vue'

const props = defineProps<{
  week: ScheduleWeek
  staffList: Staff[]
  shiftList: Shift[]
  postList?: Post[]
  title?: string
  /** 标题右侧的操作说明，只读页面可自定义 */
  hint?: string
  editable?: boolean | ((date: string) => boolean)
}>()

const emit = defineEmits<{
  'cell-change': [
    payload: {
      staffId: string
      date: string
      shiftId: string | null
      isRest: boolean
      remark?: string
      remarkColor?: string
    }
  ]
}>()

const weekDates = computed(() => getWeekDates(props.week.weekStart))

/** 显示所有人员（含该周未排班者），按排序字段正序 */
const staffInWeek = computed(() =>
  props.staffList
    .slice()
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.employeeNo.localeCompare(b.employeeNo) ||
        a.name.localeCompare(b.name)
    )
)

const postMap = computed(() => new Map((props.postList ?? []).map((p) => [p.id, p.name])))

const tableData = computed(() =>
  staffInWeek.value.map((s) => ({
    staffId: s.id,
    staffName: s.name,
    title: s.title,
    annualLeave: s.annualLeave,
    accumulatedLeave: s.accumulatedLeave,
    bedManagement: s.bedManagement ?? '',
    postName: s.postId ? (postMap.value.get(s.postId) ?? '') : '',
    statusText: getStaffStatusText(s),
    staff: s
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
  // 已发布 / 已过期的排班整体只读，防止误改
  if (props.week.status !== 'draft') return false
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

function onDialogConfirm(payload: {
  shiftId: string | null
  isRest: boolean
  remark?: string
  remarkColor?: string
}) {
  emit('cell-change', {
    staffId: currentStaffId.value,
    date: currentDate.value,
    shiftId: payload.shiftId,
    isRest: payload.isRest,
    remark: payload.remark ?? '',
    remarkColor: payload.remarkColor
  })
}
</script>

<template>
  <div class="schedule-wrap">
    <div v-if="title" class="schedule-head">
      <h3 class="schedule-title">{{ title }}</h3>
      <span class="schedule-hint">{{ hint ?? '点击单元格可调整班次 · 灰色单元格为只读' }}</span>
    </div>
    <el-table :data="tableData" border class="schedule-table">
      <!-- 以下列暂不展示，需要时取消注释即可恢复：
      <el-table-column prop="annualLeave" label="年假" width="56" fixed="left" align="center" />
      <el-table-column prop="title" label="能级/职称" width="90" fixed="left" align="center" />
      <el-table-column prop="postName" label="岗位" width="110" fixed="left" align="center" />
      <el-table-column prop="bedManagement" label="管床" width="110" fixed="left" />
      -->
      <el-table-column label="姓名" width="116" fixed="left" align="center">
        <template #default="{ row }">
          <div class="staff-name">
            <span>{{ row.staffName }}</span>
            <span v-if="row.statusText" class="staff-status-tag">{{ row.statusText }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column v-for="date in weekDates" :key="date" min-width="108" align="center">
        <template #header>
          <div class="day-head">
            <div class="day-name">星期{{ weekdayName(date) }}</div>
            <div class="day-date">{{ monthDay(date) }}</div>
          </div>
        </template>
        <template #default="{ row }">
          <div
            v-if="row.statusText && !isStaffStatusEndedOn(row.staff, date)"
            class="schedule-cell is-status"
            :title="getStaffStatusDisplayText(row.staff, date)"
          >
            {{ getStaffStatusDisplayText(row.staff, date) }}
          </div>
          <ScheduleCell
            v-else
            :detail="getDetail(row.staffId, date)"
            :shift="getShift(getDetail(row.staffId, date)?.shiftId)"
            :editable="isEditable(date)"
            @click="openDialog(row.staffId, date)"
          />
        </template>
      </el-table-column>
      <!-- <el-table-column prop="accumulatedLeave" label="积休" width="56" fixed="right" align="center" /> -->
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
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: var(--ink);
}

.schedule-title::before {
  content: '';
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand);
}

.staff-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.staff-status-tag {
  padding: 0 4px;
  border-radius: 3px;
  background: #eef1f6;
  color: #8492a6;
  font-size: 10px;
  line-height: 16px;
  white-space: nowrap;
}

.day-head {
  line-height: 1.3;
}

.day-name {
  font-weight: 600;
}

.day-date {
  font-size: 11px;
  color: var(--muted);
}
</style>
