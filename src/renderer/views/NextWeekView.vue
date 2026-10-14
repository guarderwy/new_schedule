<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useScheduleStore } from '@renderer/stores/useScheduleStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import { usePostStore } from '@renderer/stores/usePostStore'
import { useNightRuleStore } from '@renderer/stores/useNightRuleStore'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { getNextWeekKey, canDeleteWeek, getPreviousWeekKey } from '@renderer/core/weekUtils'
import {
  buildEmptyWeek,
  copyLastWeekSchedule,
  generateSchedule,
  appendStaffToWeek,
  type GenerateResult
} from '@renderer/core/scheduler'
import { exportWeekToCsv } from '@renderer/core/csvExport'
import { useNowTick } from '@renderer/core/useNowTick'
import { confirmAction, reportError } from '@renderer/core/feedback'
import type { ScheduleWeek } from '@renderer/types/schedule'
import ScheduleTable from '@renderer/components/schedule/ScheduleTable.vue'
import GenerateResultDialog from '@renderer/components/schedule/GenerateResultDialog.vue'
import StaffPickerDialog from '@renderer/components/schedule/StaffPickerDialog.vue'

const scheduleStore = useScheduleStore()
const staffStore = useStaffStore()
const shiftStore = useShiftStore()
const postStore = usePostStore()
const nightRuleStore = useNightRuleStore()
const demandStore = useDemandStore()
const settingsStore = useSettingsStore()

// 响应式时钟：跨周后自动切换到新的“下周”
const tick = useNowTick()
const weekKey = computed(() => {
  void tick.value
  return getNextWeekKey()
})

// 复制 / 生成排班的数据来源：目标周（下周）的前一周，即本周
const sourceWeekKey = computed(() => {
  void tick.value
  return getPreviousWeekKey(weekKey.value)
})

const week = computed<ScheduleWeek | undefined>(() =>
  scheduleStore.getWeek(weekKey.value) ?? buildEmptyWeek(weekKey.value, staffStore.list)
)

const storedWeek = computed(() => scheduleStore.getWeek(weekKey.value))

const resultVisible = ref(false)
const genResult = ref<GenerateResult | null>(null)
const addPickerVisible = ref(false)

/** 尚未进入下周排班、且下周内至少有一天可用的人员 */
const addableStaff = computed(() =>
  staffStore.list.filter((s) => !week.value?.details.some((d) => d.staffId === s.id))
)

async function onCellChange(payload: {
  staffId: string
  date: string
  shiftId: string | null
  isRest: boolean
  remark?: string
}) {
  try {
    if (!scheduleStore.getWeek(weekKey.value)) {
      await scheduleStore.upsertWeek(buildEmptyWeek(weekKey.value, staffStore.list))
    }
    const patch: { shiftId: string | null; isRest: boolean; remark?: string } = {
      shiftId: payload.shiftId,
      isRest: payload.isRest
    }
    if (payload.remark !== undefined) patch.remark = payload.remark
    await scheduleStore.updateDetail(weekKey.value, payload.staffId, payload.date, patch)
  } catch (e) {
    reportError('保存排班', e)
  }
}

async function onAddStaff(staffIds: string[]) {
  try {
    const base =
      scheduleStore.getWeek(weekKey.value) ?? buildEmptyWeek(weekKey.value, staffStore.list)
    const next = appendStaffToWeek(
      base,
      staffStore.list.filter((s) => staffIds.includes(s.id))
    )
    await scheduleStore.upsertWeek(next)
    ElMessage.success(`已添加 ${staffIds.length} 名人员到下周`)
  } catch (e) {
    reportError('添加人员', e)
  }
}

async function onCopyLastWeek() {
  const sourceWeek = scheduleStore.getWeek(sourceWeekKey.value)
  if (!sourceWeek) {
    ElMessage.warning('本周排班不存在，无法复制')
    return
  }
  const ok = await confirmAction(
    `将把本周（${sourceWeekKey.value}）的排班复制到下周，会覆盖下周已有排班，确定继续？（需求与周末助夜班规则会一并处理）`,
    '复制确认'
  )
  if (!ok) return
  try {
    const newWeek = copyLastWeekSchedule({
      targetWeekKey: weekKey.value,
      lastWeek: sourceWeek,
      staffList: staffStore.list,
      shifts: shiftStore.list,
      demands: demandStore.list,
      settings: settingsStore.settings
    })
    await scheduleStore.upsertWeek(newWeek)
    ElMessage.success('已复制本周排班')
  } catch (e) {
    reportError('复制本周排班', e)
  }
}

async function onGenerate() {
  const ok = await confirmAction(
    '生成排班会覆盖下周已有排班，确定继续？',
    '生成确认'
  )
  if (!ok) return
  try {
    // 夜班循环与“复制上周非夜班”均以目标周的前一周（本周）为基准
    const lastWeek = scheduleStore.getWeek(sourceWeekKey.value)
    const res = generateSchedule({
      targetWeekKey: weekKey.value,
      staffList: staffStore.list,
      shifts: shiftStore.list,
      nightRules: nightRuleStore.rules,
      demands: demandStore.list,
      settings: settingsStore.settings,
      lastWeek
    })
    await scheduleStore.upsertWeek(res.week)
    if (res.metDemandIds.length) {
      await demandStore.markMet(res.metDemandIds)
    }
    genResult.value = res
    resultVisible.value = true
  } catch (e) {
    reportError('生成排班', e)
  }
}

async function onDeleteWeek() {
  if (!scheduleStore.getWeek(weekKey.value)) {
    ElMessage.info('下周尚未排班')
    return
  }
  if (!canDeleteWeek(weekKey.value.slice(0, 10))) {
    ElMessage.warning('已开始或过期的排班不可删除')
    return
  }
  const ok = await confirmAction('确认删除下周排班？', '删除确认')
  if (!ok) return
  try {
    await scheduleStore.removeWeek(weekKey.value)
    ElMessage.success('已删除')
  } catch (e) {
    reportError('删除排班', e)
  }
}

async function onPublish() {
  try {
    if (!storedWeek.value) {
      ElMessage.warning('下周尚未排班，无法发布')
      return
    }
    await scheduleStore.publishWeek(weekKey.value)
    ElMessage.success('已发布，排班发布后为只读')
  } catch (e) {
    reportError('发布排班', e)
  }
}

async function onUnpublish() {
  try {
    await scheduleStore.unpublishWeek(weekKey.value)
    ElMessage.success('已撤销发布，可继续编辑')
  } catch (e) {
    reportError('撤销发布', e)
  }
}

function onExportCsv() {
  try {
    if (!week.value) return
    exportWeekToCsv(week.value, staffStore.list, shiftStore.list, postStore.list)
    ElMessage.success('已导出 CSV 文件')
  } catch (e) {
    reportError('导出 CSV', e)
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <span>下周：{{ weekKey }}</span>
      <el-tag v-if="week?.status === 'published'" type="success">已发布</el-tag>
      <el-tag v-else-if="week?.status === 'expired'" type="info">已过期</el-tag>
      <span class="hint">数据来源：本周 {{ sourceWeekKey }}</span>
      <span class="toolbar-spacer" />
      <el-button :disabled="addableStaff.length === 0" @click="addPickerVisible = true">
        添加人员
      </el-button>
      <el-button @click="onCopyLastWeek">复制本周排班</el-button>
      <el-button type="primary" @click="onGenerate">生成排班</el-button>
      <el-button @click="onExportCsv">导出 CSV</el-button>
      <el-button v-if="week?.status === 'published'" @click="onUnpublish">撤销发布</el-button>
      <el-button v-else type="success" plain :disabled="!storedWeek" @click="onPublish">
        发布排班
      </el-button>
      <el-button type="danger" plain @click="onDeleteWeek">删除排班</el-button>
    </div>

    <ScheduleTable
      v-if="week"
      title="护士排班表"
      :week="week"
      :staff-list="staffStore.list"
      :shift-list="shiftStore.list"
      :post-list="postStore.list"
      :editable="true"
      @cell-change="onCellChange"
    />
    <el-empty v-else description="暂无数据" />

    <StaffPickerDialog
      v-model="addPickerVisible"
      :candidates="addableStaff"
      title="添加人员到下周"
      @confirm="onAddStaff"
    />

    <GenerateResultDialog
      v-model="resultVisible"
      :result="genResult"
      :shift-list="shiftStore.list"
    />
  </div>
</template>

<style scoped>
.toolbar-spacer {
  flex: 1;
}
</style>
