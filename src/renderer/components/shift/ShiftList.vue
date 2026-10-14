<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import type { Shift } from '@renderer/types/shift'
import { confirmAction, reportError } from '@renderer/core/feedback'
import { buildShiftDeleteWarning, countShiftReferences } from '@renderer/core/reference'
import { useNightRuleStore } from '@renderer/stores/useNightRuleStore'
import { useScheduleStore } from '@renderer/stores/useScheduleStore'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import ShiftFormDialog from './ShiftFormDialog.vue'

const shiftStore = useShiftStore()
const scheduleStore = useScheduleStore()
const nightRuleStore = useNightRuleStore()
const settingsStore = useSettingsStore()

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
  try {
    if (editing.value) {
      await shiftStore.update(editing.value.id, payload)
      ElMessage.success('已更新')
    } else {
      await shiftStore.add(payload)
      ElMessage.success('已新增')
    }
  } catch (e) {
    reportError('保存班次', e)
  }
}

async function onRemove(row: Shift) {
  const count = countShiftReferences(
    row.id,
    scheduleStore.weeks,
    nightRuleStore.rules,
    settingsStore.settings
  )
  const ok = await confirmAction(buildShiftDeleteWarning(row.name, count))
  if (!ok) return
  try {
    await shiftStore.remove(row.id)
    ElMessage.success('已删除，相关引用已清理')
  } catch (e) {
    reportError('删除班次', e)
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增</el-button>
      <span class="hint">删除班次会自动清理排班、夜班规则与系统设置中的引用</span>
    </div>
    <el-table :data="shiftStore.list" border>
      <el-table-column prop="name" label="班次名称" sortable />
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
