<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref } from 'vue'
import type { Shift } from '@renderer/types/shift'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import ShiftFormDialog from './ShiftFormDialog.vue'

const shiftStore = useShiftStore()
const dialogVisible = ref(false)
const editing = ref<Shift | null>(null)

function openAdd() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(row: Shift) {
  editing.value = row
  dialogVisible.value = true
}

async function onSubmit(payload: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>) {
  if (editing.value) {
    await shiftStore.update(editing.value.id, payload)
    ElMessage.success('已更新')
  } else {
    await shiftStore.add(payload)
    ElMessage.success('已新增')
  }
}

async function onRemove(row: Shift) {
  await ElMessageBox.confirm(`确认删除班次「${row.name}」？`, '删除确认', { type: 'warning' })
  await shiftStore.remove(row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增</el-button>
    </div>
    <el-table :data="shiftStore.list" border>
      <el-table-column prop="name" label="班次名称" />
      <el-table-column prop="startTime" label="开始" width="100" />
      <el-table-column prop="endTime" label="结束" width="100" />
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row as Shift)">编辑</el-button>
          <el-button link type="danger" @click="onRemove(row as Shift)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <ShiftFormDialog v-model="dialogVisible" :shift="editing" @submit="onSubmit" />
  </div>
</template>
