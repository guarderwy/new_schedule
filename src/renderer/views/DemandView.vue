<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDemandStore } from '@renderer/stores/useDemandStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'
import type { Demand } from '@renderer/types/demand'
import DemandList from '@renderer/components/demand/DemandList.vue'
import DemandFormDialog from '@renderer/components/demand/DemandFormDialog.vue'

const demandStore = useDemandStore()
const staffStore = useStaffStore()

const dialogVisible = ref(false)
const editing = ref<Demand | null>(null)

const filterStaff = ref<string>('')
const filterDateRange = ref<[string, string] | null>(null)

const filtered = computed(() => {
  return demandStore.list.filter((d) => {
    if (filterStaff.value && d.staffId !== filterStaff.value) return false
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
  if (editing.value) {
    await demandStore.update(editing.value.id, payload)
    ElMessage.success('已更新')
  } else {
    await demandStore.add(payload)
    ElMessage.success('已新增')
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
      <el-date-picker
        v-model="filterDateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
      />
      <el-button @click="filterStaff = ''; filterDateRange = null">重置筛选</el-button>
    </div>

    <DemandList :rows="filtered" @edit="openEdit" />

    <DemandFormDialog v-model="dialogVisible" :demand="editing" @submit="onSubmit" />
  </div>
</template>
