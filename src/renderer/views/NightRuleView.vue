<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useNightRuleStore } from '@renderer/stores/useNightRuleStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import { REST_RULE_SHIFT_ID, type NightShiftRule } from '@renderer/types/nightRule'
import NightRuleEditor from '@renderer/components/nightRule/NightRuleEditor.vue'

const nightRuleStore = useNightRuleStore()
const shiftStore = useShiftStore()

const addVisible = ref(false)
const selectedShift = ref('')

const rulesClone = computed<NightShiftRule[]>(() =>
  nightRuleStore.rules.map((r) => ({ ...r }))
)

// 所有班次 + 「休息」，允许重复选择（不剔除已加入的规则）
const shiftOptions = computed(() => [
  ...shiftStore.list.map((s) => ({
    id: s.id,
    label: `${s.name}（${s.startTime || '-'}-${s.endTime || '-'}）`
  })),
  { id: REST_RULE_SHIFT_ID, label: '休息' }
])

async function onReorder(rules: NightShiftRule[]) {
  await nightRuleStore.reorder(rules)
}

async function onRemove(id: string) {
  await nightRuleStore.remove(id)
}

async function onAdd() {
  if (!selectedShift.value) return
  await nightRuleStore.add(selectedShift.value)
  selectedShift.value = ''
  addVisible.value = false
  ElMessage.success('已添加')
}
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="hint">拖拽调整夜班班次顺序，循环从上周最后一个夜班的下一个班次开始。</span>
      <el-button type="primary" @click="addVisible = true">添加班次</el-button>
    </div>

    <NightRuleEditor
      :model-value="rulesClone"
      :shift-list="shiftStore.list"
      @update:model-value="onReorder"
      @remove="onRemove"
    />

    <el-empty v-if="nightRuleStore.rules.length === 0" description="暂无夜班循环规则" />

    <el-dialog v-model="addVisible" title="添加夜班班次" width="400px">
      <el-select v-model="selectedShift" placeholder="选择班次或休息" style="width: 100%">
        <el-option
          v-for="opt in shiftOptions"
          :key="opt.id"
          :label="opt.label"
          :value="opt.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="onAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
