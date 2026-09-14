<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useNightRuleStore } from '@renderer/stores/useNightRuleStore'
import { useShiftStore } from '@renderer/stores/useShiftStore'
import type { NightShiftRule } from '@renderer/types/nightRule'
import NightRuleEditor from '@renderer/components/nightRule/NightRuleEditor.vue'

const nightRuleStore = useNightRuleStore()
const shiftStore = useShiftStore()

const addVisible = ref(false)
const selectedShift = ref('')

const rulesClone = computed<NightShiftRule[]>(() =>
  nightRuleStore.rules.map((r) => ({ ...r }))
)

const availableShifts = computed(() =>
  shiftStore.list.filter((s) => !nightRuleStore.rules.some((r) => r.shiftId === s.id))
)

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
      <el-select v-model="selectedShift" placeholder="选择班次" style="width: 100%">
        <el-option
          v-for="s in availableShifts"
          :key="s.id"
          :label="`${s.name}（${s.startTime}-${s.endTime}）`"
          :value="s.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="onAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
