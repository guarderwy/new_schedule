<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { confirmAction, reportError } from '@renderer/core/feedback'
import { DEMAND_STATUS_LABEL, DEMAND_TYPE_LABEL } from '@renderer/constants'
import type { Demand } from '@renderer/types/demand'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'

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
  const ok = await confirmAction('确认删除该需求？', '删除确认')
  if (!ok) return
  try {
    await demandStore.remove(row.id)
    ElMessage.success('已删除')
  } catch (e) {
    reportError('删除需求', e)
  }
}

async function onMarkMet(row: Demand) {
  try {
    await demandStore.update(row.id, { status: 'met' })
    ElMessage.success('已标记为已满足')
  } catch (e) {
    reportError('标记需求', e)
  }
}

async function onReject(row: Demand) {
  const ok = await confirmAction(
    `确认拒绝「${staffName(row.staffId)} ${row.date}」的需求？`,
    '拒绝确认'
  )
  if (!ok) return
  try {
    await demandStore.update(row.id, { status: 'rejected' })
    ElMessage.success('已拒绝')
  } catch (e) {
    reportError('拒绝需求', e)
  }
}

async function onReopen(row: Demand) {
  try {
    await demandStore.update(row.id, { status: 'pending' })
    ElMessage.success('已恢复为待处理')
  } catch (e) {
    reportError('恢复需求', e)
  }
}
</script>

<template>
  <el-table :data="rows" border>
    <el-table-column label="人员" width="140">
      <template #default="{ row }">{{ staffName(row.staffId) }}</template>
    </el-table-column>
    <el-table-column prop="date" label="日期" width="140" sortable />
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
    <el-table-column label="操作" width="260" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="emit('edit', row as Demand)">编辑</el-button>
        <el-button
          v-if="row.status !== 'met'"
          link
          type="success"
          @click="onMarkMet(row as Demand)"
        >
          标记满足
        </el-button>
        <el-button
          v-if="row.status !== 'rejected'"
          link
          type="warning"
          @click="onReject(row as Demand)"
        >
          拒绝
        </el-button>
        <el-button
          v-if="row.status !== 'pending'"
          link
          type="info"
          @click="onReopen(row as Demand)"
        >
          恢复待处理
        </el-button>
        <el-button link type="danger" @click="onRemove(row as Demand)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
