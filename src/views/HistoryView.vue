<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { getWeekRange, todayStr } from '@/core/weekUtils'
import type { ScheduleStatus } from '@/types/schedule'
import ScheduleTable from '@/components/schedule/ScheduleTable.vue'

const historyStore = useHistoryStore()

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  draft: '草稿',
  published: '已发布',
  expired: '已过期'
}
const STATUS_TAG: Record<ScheduleStatus, 'info' | 'success' | 'warning'> = {
  draft: 'info',
  published: 'success',
  expired: 'warning'
}

/** 已归档的历史周，按开始日期倒序（最近在前） */
const weekOptions = computed(() =>
  Object.values(historyStore.snapshots)
    .sort((a, b) => b.week.weekStart.localeCompare(a.week.weekStart))
    .map((s) => ({
      key: s.weekKey,
      weekStart: s.week.weekStart,
      label: `${s.week.weekStart} ~ ${s.week.weekEnd}（${STATUS_LABEL[s.week.status]}）`
    }))
)

const selectedKey = ref('')

/** 默认选中最近一个已开始的周；数据变化时保留已有选择 */
watch(
  weekOptions,
  (options) => {
    if (options.length === 0) {
      selectedKey.value = ''
      return
    }
    if (selectedKey.value && options.some((o) => o.key === selectedKey.value)) return
    const today = todayStr()
    selectedKey.value = (options.find((o) => o.weekStart <= today) ?? options[options.length - 1]).key
  },
  { immediate: true }
)

/** 选择任意日期，自动定位到该日期所在的 ISO 周 */
const pickedDate = ref('')
function onPickDate(value: unknown) {
  if (typeof value !== 'string' || !value) return
  const key = getWeekRange(value).weekKey
  if (!historyStore.getSnapshot(key)) {
    pickedDate.value = ''
    ElMessage.info('该周暂无归档记录')
    return
  }
  selectedKey.value = key
}

const snapshot = computed(() =>
  selectedKey.value ? (historyStore.snapshots[selectedKey.value] ?? null) : null
)
const selectedWeek = computed(() => snapshot.value?.week ?? null)
const rangeLabel = computed(() => {
  const w = selectedWeek.value
  return w ? `${w.weekStart} ~ ${w.weekEnd}` : ''
})
const staffCount = computed(() => snapshot.value?.staffList.length ?? 0)
const archiveLabel = computed(() => {
  const s = snapshot.value
  if (!s) return ''
  const source = s.source === 'published' ? '发布时归档' : '周末自动归档'
  return `${source} · ${s.archivedAt.slice(0, 10)}`
})
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="toolbar-label">选择周</span>
      <el-select v-model="selectedKey" placeholder="选择排班周" style="width: 280px">
        <el-option v-for="o in weekOptions" :key="o.key" :label="o.label" :value="o.key" />
      </el-select>
      <el-date-picker
        v-model="pickedDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="选日期快速定位"
        clearable
        style="width: 170px"
        @change="onPickDate"
      />
      <el-tag v-if="selectedWeek" size="small" :type="STATUS_TAG[selectedWeek.status]">
        {{ STATUS_LABEL[selectedWeek.status] }}
      </el-tag>
      <span v-if="selectedWeek" class="hint">
        {{ rangeLabel }} · {{ staffCount }} 人 · {{ archiveLabel }}
      </span>
      <span class="toolbar-spacer" />
      <span class="hint">共 {{ weekOptions.length }} 周归档</span>
    </div>

    <ScheduleTable
      v-if="selectedWeek && snapshot"
      :title="`${rangeLabel} 排班记录（存档）`"
      :week="selectedWeek"
      :staff-list="snapshot.staffList"
      :shift-list="snapshot.shiftList"
      :post-list="snapshot.postList"
      :editable="false"
      hint="历史排班为存档镜像，不随当前人员状态变化，不可编辑"
    />
    <el-empty v-else description="暂无历史排班归档" />
  </div>
</template>

<style scoped>
.toolbar-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}
</style>
