<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { STAFF_STATUS_LABEL, GROUP_TYPE_LABEL } from '@renderer/constants'
import { confirmAction, reportError } from '@renderer/core/feedback'
import { buildStaffDeleteWarning, countStaffReferences } from '@renderer/core/reference'
import type { Staff, StaffStatus } from '@renderer/types/staff'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { usePostStore } from '@renderer/stores/usePostStore'
import { useScheduleStore } from '@renderer/stores/useScheduleStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import StaffFormDialog from './StaffFormDialog.vue'

const staffStore = useStaffStore()
const postStore = usePostStore()
const scheduleStore = useScheduleStore()
const demandStore = useDemandStore()

const dialogVisible = ref(false)
const editing = ref<Staff | null>(null)

const keyword = ref('')
const statusFilter = ref<StaffStatus | ''>('')

const postName = (id: string | null) => postStore.list.find((p) => p.id === id)?.name ?? '-'

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

function openAdd() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(row: Staff) {
  editing.value = row
  dialogVisible.value = true
}

async function onSubmit(payload: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) {
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
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增</el-button>
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
    </div>
    <el-table :data="rows" border>
      <el-table-column prop="name" label="姓名" width="120" sortable />
      <el-table-column prop="employeeNo" label="工号" width="100" sortable />
      <el-table-column prop="title" label="职称" width="120" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ STAFF_STATUS_LABEL[row.status] }}</template>
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
  </div>
</template>
