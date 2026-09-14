<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref } from 'vue'
import { STAFF_STATUS_LABEL, GROUP_TYPE_LABEL } from '@renderer/constants'
import type { Staff } from '@renderer/types/staff'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { usePostStore } from '@renderer/stores/usePostStore'
import StaffFormDialog from './StaffFormDialog.vue'

const staffStore = useStaffStore()
const postStore = usePostStore()
const dialogVisible = ref(false)
const editing = ref<Staff | null>(null)

const postName = (id: string | null) => postStore.list.find((p) => p.id === id)?.name ?? '-'

function openAdd() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(row: Staff) {
  editing.value = row
  dialogVisible.value = true
}

async function onSubmit(payload: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) {
  if (editing.value) {
    await staffStore.update(editing.value.id, payload)
    ElMessage.success('已更新')
  } else {
    await staffStore.add(payload)
    ElMessage.success('已新增')
  }
}

async function onRemove(row: Staff) {
  await ElMessageBox.confirm(`确认删除人员「${row.name}」？`, '删除确认', { type: 'warning' })
  await staffStore.remove(row.id)
  ElMessage.success('已删除')
}

const rows = computed(() => staffStore.list)
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增</el-button>
    </div>
    <el-table :data="rows" border>
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="employeeNo" label="工号" width="100" />
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
      <el-table-column prop="annualLeave" label="年假" width="80" />
      <el-table-column prop="accumulatedLeave" label="积休" width="80" />
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
