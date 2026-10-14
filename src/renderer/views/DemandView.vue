<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DEMAND_STATUS_LABEL } from '@renderer/constants'
import { reportError } from '@renderer/core/feedback'
import type { Demand, DemandStatus } from '@renderer/types/demand'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import DemandList from '@renderer/components/demand/DemandList.vue'
import DemandFormDialog from '@renderer/components/demand/DemandFormDialog.vue'

const demandStore = useDemandStore()
const staffStore = useStaffStore()

const dialogVisible = ref(false)
const editing = ref<Demand | null>(null)

const filterStaff = ref<string>('')
const filterStatus = ref<DemandStatus | ''>('')
const filterDateRange = ref<[string, string] | null>(null)

const filtered = computed(() => {
  return demandStore.list.filter((d) => {
    if (filterStaff.value && d.staffId !== filterStaff.value) return false
    if (filterStatus.value && d.status !== filterStatus.value) return false
    if (filterDateRange.value) {
      const [start, end] = filterDateRange.value
      if (d.date < start || d.date > end) return false
    }
    return true
  })
})

function openAdd() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(row: Demand) {
  editing.value = row
  dialogVisible.value = true
}

async function onSubmit(payload: Omit<Demand, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    if (editing.value) {
      await demandStore.update(editing.value.id, payload)
      ElMessage.success('已更新')
    } else {
      await demandStore.add(payload)
      ElMessage.success('已新增')
    }
  } catch (e) {
    reportError('保存需求', e)
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增需求</el-button>
      <el-select v-model="filterStaff" clearable placeholder="按人员筛选" filterable style="width: 200px">
        <el-option
          v-for="s in staffStore.list"
          :key="s.id"
          :label="s.name"
          :value="s.id"
        />
      </el-select>
      <el-select v-model="filterStatus" clearable placeholder="按状态筛选" style="width: 150px">
        <el-option
          v-for="(label, value) in DEMAND_STATUS_LABEL"
          :key="value"
          :label="label"
          :value="value"
        />
      </el-select>
      <el-date-picker
        v-model="filterDateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
      />
      <el-button @click="filterStaff = ''; filterStatus = ''; filterDateRange = null">重置筛选</el-button>
      <span class="hint">共 {{ filtered.length }} 条</span>
    </div>

    <DemandList :rows="filtered" @edit="openEdit" />

    <DemandFormDialog v-model="dialogVisible" :demand="editing" @submit="onSubmit" />
  </div>
</template>
