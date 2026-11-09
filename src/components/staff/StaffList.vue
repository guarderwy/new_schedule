<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Sortable from 'sortablejs'
import { STAFF_STATUS_LABEL, GROUP_TYPE_LABEL } from '@/constants'
import { confirmAction, reportError } from '@/core/feedback'
import { buildStaffDeleteWarning, countStaffReferences } from '@/core/reference'
import { isStaffAvailableOnDate, todayStr } from '@/core/weekUtils'
import type { GroupType, Staff, StaffStatus } from '@/types/staff'
import type { StaffInput } from '@/stores/useStaffStore'
import { useDemandStore } from '@/stores/useDemandStore'
import { usePostStore } from '@/stores/usePostStore'
import { useScheduleStore } from '@/stores/useScheduleStore'
import { useStaffStore } from '@/stores/useStaffStore'
import StaffFormDialog from './StaffFormDialog.vue'
import StaffPickerDialog from '@/components/schedule/StaffPickerDialog.vue'

const staffStore = useStaffStore()
const postStore = usePostStore()
const scheduleStore = useScheduleStore()
const demandStore = useDemandStore()

const dialogVisible = ref(false)
const editing = ref<Staff | null>(null)

const keyword = ref('')
const statusFilter = ref<StaffStatus | ''>('')
const sortState = ref<{ prop: string | null; order: string | null }>({ prop: null, order: null })

/** 筛选或列排序状态下禁止拖动，避免顺序错乱 */
const canDrag = computed(
  () => !keyword.value.trim() && !statusFilter.value && !sortState.value.order
)

const postName = (id: string | null) => postStore.list.find((p) => p.id === id)?.name ?? '-'

function statusLabel(s: Staff): string {
  const base = STAFF_STATUS_LABEL[s.status] ?? '其他'
  const note = s.statusNote?.trim()
  return s.status === 'other' && note ? `${base}（${note}）` : base
}

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return staffStore.list.filter((s) => {
    if (statusFilter.value && s.status !== statusFilter.value) return false
    if (!kw) return true
    return (
      s.name.toLowerCase().includes(kw) ||
      s.employeeNo.toLowerCase().includes(kw) ||
      (s.title ?? '').toLowerCase().includes(kw)
    )
  })
})

/** 当前可用（可排班）的人员，用于夜班组批量设置 */
const availableStaff = computed(() =>
  staffStore.list.filter((s) => isStaffAvailableOnDate(s, todayStr()))
)
const nightGroupVisible = ref(false)
const nightSelectedIds = computed(() =>
  availableStaff.value.filter((s) => s.groupType === 'night').map((s) => s.id)
)

function openAdd() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(row: Staff) {
  editing.value = row
  dialogVisible.value = true
}

async function onSubmit(payload: StaffInput) {
  try {
    if (editing.value) {
      await staffStore.update(editing.value.id, payload)
      ElMessage.success('已更新')
    } else {
      await staffStore.add(payload)
      ElMessage.success('已新增')
    }
  } catch (e) {
    reportError('保存人员', e)
  }
}

async function onRemove(row: Staff) {
  const count = countStaffReferences(
    row.id,
    scheduleStore.weeks,
    demandStore.list.filter((d) => d.staffId === row.id).length
  )
  const ok = await confirmAction(buildStaffDeleteWarning(row.name, count))
  if (!ok) return
  try {
    await staffStore.remove(row.id)
    ElMessage.success('已删除')
  } catch (e) {
    reportError('删除人员', e)
  }
}

async function onSaveNightGroup(ids: string[]) {
  const selected = new Set(ids)
  const candidateIds = new Set(availableStaff.value.map((s) => s.id))
  const now = new Date().toISOString()
  try {
    staffStore.list = staffStore.list.map((s) => {
      if (!candidateIds.has(s.id)) return s
      const groupType: GroupType = selected.has(s.id) ? 'night' : 'day'
      return { ...s, groupType, updatedAt: now }
    })
    await staffStore.persist()
    ElMessage.success('夜班组已保存')
  } catch (e) {
    reportError('保存夜班组', e)
  }
}

function onSortChange(payload: { prop: string | null; order: string | null }) {
  sortState.value = payload
}

const tableRef = ref()
let sortable: Sortable | null = null

onMounted(async () => {
  await nextTick()
  const root = tableRef.value?.$el as HTMLElement | undefined
  const tbody = root?.querySelector('.el-table__body-wrapper tbody') as HTMLElement | null
  if (!tbody) return
  sortable = Sortable.create(tbody, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'row-ghost',
    chosenClass: 'row-chosen',
    disabled: !canDrag.value,
    onEnd: async (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      if (!canDrag.value) {
        ElMessage.warning('请先清除筛选或列排序，再拖动调整顺序')
        return
      }
      const visible = [...rows.value]
      const [moved] = visible.splice(oldIndex, 1)
      if (!moved) return
      visible.splice(newIndex, 0, moved)
      try {
        await staffStore.applyVisibleOrder(visible.map((s) => s.id))
      } catch (e) {
        reportError('调整排序', e)
      }
    }
  })
})

watch(canDrag, (enabled) => sortable?.option('disabled', !enabled))

onBeforeUnmount(() => {
  sortable?.destroy()
  sortable = null
})
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增</el-button>
      <el-button @click="nightGroupVisible = true">夜班组</el-button>
      <el-input
        v-model="keyword"
        placeholder="搜索姓名 / 工号 / 职称"
        clearable
        style="width: 220px"
      />
      <el-select v-model="statusFilter" clearable placeholder="按状态筛选" style="width: 150px">
        <el-option
          v-for="(label, value) in STAFF_STATUS_LABEL"
          :key="value"
          :label="label"
          :value="value"
        />
      </el-select>
      <span class="hint">共 {{ rows.length }} 人</span>
      <span v-if="canDrag" class="hint">拖动「排序」列可调整固定顺序</span>
      <span v-else class="hint">清除筛选或列排序后可拖动排序</span>
    </div>
    <el-table ref="tableRef" :data="rows" border row-key="id" @sort-change="onSortChange">
      <el-table-column label="排序" width="72" align="center">
        <template #default="{ row }">
          <span
            class="drag-handle"
            :class="{ 'is-disabled': !canDrag }"
            :title="canDrag ? '拖动调整顺序' : '清除筛选或列排序后可拖动'"
          >
            ⠿ {{ row.sortOrder }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="姓名" width="120" sortable />
      <el-table-column prop="employeeNo" label="工号" width="100" sortable />
      <el-table-column prop="title" label="职称" width="120" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">{{ statusLabel(row as Staff) }}</template>
      </el-table-column>
      <el-table-column label="岗位" width="120">
        <template #default="{ row }">{{ postName(row.postId) }}</template>
      </el-table-column>
      <el-table-column prop="bedManagement" label="管床" width="140" />
      <el-table-column label="分组" width="90">
        <template #default="{ row }">{{ GROUP_TYPE_LABEL[row.groupType] }}</template>
      </el-table-column>
      <el-table-column prop="annualLeave" label="年假" width="80" sortable />
      <el-table-column prop="accumulatedLeave" label="积休" width="80" sortable />
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row as Staff)">编辑</el-button>
          <el-button link type="danger" @click="onRemove(row as Staff)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <StaffFormDialog v-model="dialogVisible" :staff="editing" @submit="onSubmit" />
    <StaffPickerDialog
      v-model="nightGroupVisible"
      title="设置夜班组人员"
      description="勾选的人员设为夜班组，未勾选的可用人员设为白班组；仅显示当前可排班人员。"
      confirm-text="保存"
      empty-text="当前没有可用人员"
      :candidates="availableStaff"
      :initial-selected-ids="nightSelectedIds"
      allow-empty
      @confirm="onSaveNightGroup"
    />
  </div>
</template>

<style scoped>
.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: grab;
  color: var(--brand);
  font-size: 13px;
  user-select: none;
}

.drag-handle:hover {
  background: var(--brand-soft);
}

.drag-handle.is-disabled {
  cursor: not-allowed;
  color: #b9c2d0;
}

.drag-handle.is-disabled:hover {
  background: transparent;
}

:deep(.row-ghost) {
  background: var(--brand-soft) !important;
  opacity: 0.8;
}

:deep(.row-chosen) {
  background: #f5f9ff;
}
</style>
