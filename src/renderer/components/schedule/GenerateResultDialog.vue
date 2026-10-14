<script setup lang="ts">
import { computed } from 'vue'
import type { GenerateResult } from '@renderer/core/scheduler'
import type { Shift } from '@renderer/types/shift'

const props = defineProps<{
  modelValue: boolean
  result: GenerateResult | null
  shiftList: Shift[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

function shiftName(id: string): string {
  return props.shiftList.find((s) => s.id === id)?.name ?? id
}
</script>

<template>
  <el-dialog v-model="visible" title="生成结果校验" width="560px">
    <template v-if="result">
      <el-alert
        v-if="result.missingRequired.length === 0 && result.warnings.length === 0"
        type="success"
        :closable="false"
        title="校验通过：必备班次齐全，未发现问题。"
      />
      <template v-else>
        <el-alert
          v-if="result.missingRequired.length"
          type="error"
          :closable="false"
          title="缺失的必备班次："
        />
        <ul v-if="result.missingRequired.length" class="result-list">
          <li v-for="(m, i) in result.missingRequired" :key="i">
            {{ m.date }} 缺少班次「{{ shiftName(m.shiftId) }}」（需要 {{ m.need }}，实际 {{ m.actual }}）
          </li>
        </ul>
        <el-alert
          v-if="result.warnings.length"
          type="warning"
          :closable="false"
          title="警告："
        />
        <ul v-if="result.warnings.length" class="result-list">
          <li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li>
        </ul>
      </template>
    </template>
    <template #footer>
      <el-button type="primary" @click="visible = false">知道了</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.result-list {
  margin: 8px 0 16px;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
}
</style>
