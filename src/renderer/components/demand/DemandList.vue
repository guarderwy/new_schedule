<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import { DEMAND_STATUS_LABEL, DEMAND_TYPE_LABEL } from '@renderer/constants'
import type { Demand } from '@renderer/types/demand'

const props = defineProps<{
  rows: Demand[]
}>()

const emit = defineEmits<{
  edit: [demand: Demand]
}>()

const demandStore = useDemandStore()
const staffStore = useStaffStore()
const shiftStore = useShiftStore()

function staffName(id: string): string {
  return staffStore.list.find((s) => s.id === id)?.name ?? id
}

function shiftName(id: string | null): string {
  if (!id) return '-'
  return shiftStore.list.find((s) => s.id === id)?.name ?? id
}

async function onRemove(row: Demand) {
  await ElMessageBox.confirm('确认删除该需求？', '删除确认', { type: 'warning' })
  await demandStore.remove(row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <el-table :data="rows" border>
    <el-table-column label="人员" width="140">
      <template #default="{ row }">{{ staffName(row.staffId) }}</template>
    </el-table-column>
    <el-table-column prop="date" label="日期" width="140" />
    <el-table-column label="类型" width="120">
      <template #default="{ row }">{{ DEMAND_TYPE_LABEL[row.type] }}</template>
    </el-table-column>
    <el-table-column label="班次" width="140">
      <template #default="{ row }">{{ row.type === 'shift' ? shiftName(row.shiftId) : '-' }}</template>
    </el-table-column>
    <el-table-column prop="remark" label="备注" />
    <el-table-column label="状态" width="100">
      <template #default="{ row }">
        <el-tag :type="row.status === 'met' ? 'success' : row.status === 'rejected' ? 'danger' : 'info'">
          {{ DEMAND_STATUS_LABEL[row.status] }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="160" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="emit('edit', row as Demand)">编辑</el-button>
        <el-button link type="danger" @click="onRemove(row as Demand)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
