<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Staff } from '@renderer/types/staff'

const props = defineProps<{
  modelValue: boolean
  /** 可加入的人员（尚未进入该周排班的人员） */
  candidates: Staff[]
  /** 弹窗标题，如“添加人员到本周” */
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [staffIds: string[]]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const selectedIds = ref<string[]>([])

const allSelected = computed(
  () => props.candidates.length > 0 && selectedIds.value.length === props.candidates.length
)

function toggleAll() {
  selectedIds.value = allSelected.value ? [] : props.candidates.map((s) => s.id)
}

function onSubmit() {
  if (selectedIds.value.length === 0) return
  emit('confirm', selectedIds.value)
  selectedIds.value = []
  visible.value = false
}

function onClose() {
  selectedIds.value = []
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" :title="title ?? '添加人员'" width="480px" @closed="selectedIds = []">
    <el-empty v-if="candidates.length === 0" description="没有可添加的人员" :image-size="60" />
    <template v-else>
      <div class="picker-toolbar">
        <el-checkbox :model-value="allSelected" @change="toggleAll">全选</el-checkbox>
        <span class="hint">已选 {{ selectedIds.length }} / {{ candidates.length }} 人</span>
      </div>
      <el-checkbox-group v-model="selectedIds" class="picker-list">
        <el-checkbox v-for="s in candidates" :key="s.id" :value="s.id" class="picker-item">
          {{ s.name }}（{{ s.employeeNo }}）
        </el-checkbox>
      </el-checkbox-group>
    </template>
    <template #footer>
      <el-button @click="onClose">取消</el-button>
      <el-button
        type="primary"
        :disabled="selectedIds.length === 0"
        @click="onSubmit"
      >
        添加
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.picker-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow: auto;
}
.picker-item {
  margin-right: 0;
}
</style>
