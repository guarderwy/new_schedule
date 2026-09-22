<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useScheduleStore } from '@renderer/stores/useScheduleStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import { usePostStore } from '@renderer/stores/usePostStore'
import { useNightRuleStore } from '@renderer/stores/useNightRuleStore'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { getNextWeekKey, getLastWeekKey, canDeleteWeek } from '@renderer/core/weekUtils'
import { generateSchedule, copyLastWeekSchedule, buildEmptyWeek } from '@renderer/core/scheduler'
import type { ScheduleWeek } from '@renderer/types/schedule'
import ScheduleTable from '@renderer/components/schedule/ScheduleTable.vue'

const scheduleStore = useScheduleStore()
const staffStore = useStaffStore()
const shiftStore = useShiftStore()
const postStore = usePostStore()
const nightRuleStore = useNightRuleStore()
const demandStore = useDemandStore()
const settingsStore = useSettingsStore()

const weekKey = getNextWeekKey()

const week = computed<ScheduleWeek | undefined>(() =>
  scheduleStore.getWeek(weekKey) ?? buildEmptyWeek(weekKey, staffStore.list)
)

const resultVisible = ref(false)
const genResult = ref<ReturnType<typeof generateSchedule> | null>(null)

function shiftName(id: string): string {
  return shiftStore.list.find((s) => s.id === id)?.name ?? id
}

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

async function onCopyLastWeek() {
  const lastWeek = scheduleStore.getWeek(getLastWeekKey())
  if (!lastWeek) {
    ElMessage.warning('上周排班不存在，无法复制')
    return
  }
  const newWeek = copyLastWeekSchedule({
    targetWeekKey: weekKey,
    lastWeek,
    staffList: staffStore.list,
    shifts: shiftStore.list
  })
  await scheduleStore.upsertWeek(newWeek)
  ElMessage.success('已复制上周排班')
}

async function onGenerate() {
  const lastWeek = scheduleStore.getWeek(getLastWeekKey())
  const res = generateSchedule({
    targetWeekKey: weekKey,
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
}

async function onDeleteWeek() {
  if (!scheduleStore.getWeek(weekKey)) {
    ElMessage.info('下周尚未排班')
    return
  }
  if (!canDeleteWeek(weekKey.slice(0, 10))) {
    ElMessage.warning('已开始或过期的排班不可删除')
    return
  }
  await ElMessageBox.confirm('确认删除下周排班？', '删除确认', { type: 'warning' })
  await scheduleStore.removeWeek(weekKey)
  ElMessage.success('已删除')
}
</script>

<template>
  <div>
    <div class="toolbar">
      <span>下周：{{ weekKey }}</span>
      <el-button @click="onCopyLastWeek">复制上周排班</el-button>
      <el-button type="primary" @click="onGenerate">生成排班</el-button>
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

    <el-dialog v-model="resultVisible" title="生成结果校验" width="560px">
      <template v-if="genResult">
        <el-alert
          v-if="genResult.missingRequired.length === 0 && genResult.warnings.length === 0"
          type="success"
          :closable="false"
          title="校验通过：必备班次齐全，未发现问题。"
        />
        <template v-else>
          <el-alert
            v-if="genResult.missingRequired.length"
            type="error"
            :closable="false"
            title="缺失的必备班次："
          />
          <ul v-if="genResult.missingRequired.length" class="result-list">
            <li v-for="(m, i) in genResult.missingRequired" :key="i">
              {{ m.date }} 缺少班次「{{ shiftName(m.shiftId) }}」（需要 {{ m.need }}，实际 {{ m.actual }}）
            </li>
          </ul>
          <el-alert
            v-if="genResult.warnings.length"
            type="warning"
            :closable="false"
            title="警告："
          />
          <ul v-if="genResult.warnings.length" class="result-list">
            <li v-for="(w, i) in genResult.warnings" :key="i">{{ w }}</li>
          </ul>
        </template>
      </template>
      <template #footer>
        <el-button type="primary" @click="resultVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.result-list {
  margin: 8px 0 16px;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
}
</style>
