<script setup lang="ts">
import { computed } from 'vue'
import { useScheduleStore } from '@renderer/stores/useScheduleStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import { getCurrentWeekKey, canEditDate, todayStr } from '@renderer/core/weekUtils'
import { buildEmptyWeek } from '@renderer/core/scheduler'
import type { ScheduleWeek } from '@renderer/types/schedule'
import ScheduleTable from '@renderer/components/schedule/ScheduleTable.vue'

const scheduleStore = useScheduleStore()
const staffStore = useStaffStore()
const shiftStore = useShiftStore()

const weekKey = getCurrentWeekKey()
const today = todayStr()

const week = computed<ScheduleWeek | undefined>(() =>
  scheduleStore.getWeek(weekKey) ?? buildEmptyWeek(weekKey, staffStore.list)
)

const editable = (date: string) => canEditDate(date)

async function onCellChange(payload: {
  staffId: string
  date: string
  shiftId: string | null
  isRest: boolean
}) {
  if (!scheduleStore.getWeek(weekKey)) {
    await scheduleStore.upsertWeek(buildEmptyWeek(weekKey, staffStore.list))
  }
  await scheduleStore.updateDetail(weekKey, payload.staffId, payload.date, {
    shiftId: payload.shiftId,
    isRest: payload.isRest
  })
}
</script>

<template>
  <div>
    <div class="toolbar">
      <span>本周：{{ weekKey }}</span>
      <el-tag v-if="!scheduleStore.getWeek(weekKey)" type="warning">本周尚未排班</el-tag>
      <span class="hint">今天：{{ today }}（历史日期只读）</span>
    </div>
    <ScheduleTable
      v-if="week"
      :week="week"
      :staff-list="staffStore.list"
      :shift-list="shiftStore.list"
      :editable="editable"
      @cell-change="onCellChange"
    />
    <el-empty v-else description="暂无数据" />
  </div>
</template>
