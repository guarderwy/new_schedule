<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { confirmAction, reportError } from '@renderer/core/feedback'
import { buildPostDeleteWarning, countPostReferences } from '@renderer/core/reference'
import { usePostStore } from '@renderer/stores/usePostStore'
import { useStaffStore } from '@renderer/stores/useStaffStore'

const postStore = usePostStore()
const staffStore = useStaffStore()

const dialogVisible = ref(false)
const name = ref('')
const editingId = ref<string | null>(null)

function openAdd() {
  editingId.value = null
  name.value = ''
  dialogVisible.value = true
}

function openEdit(id: string, current: string) {
  editingId.value = id
  name.value = current
  dialogVisible.value = true
}

async function onSave() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    ElMessage.warning('请输入岗位名称')
    return
  }
  // 岗位名称唯一性校验（编辑时排除自身）
  const duplicated = postStore.list.some((p) => p.name.trim() === trimmed && p.id !== editingId.value)
  if (duplicated) {
    ElMessage.warning(`岗位名称「${trimmed}」已存在`)
    return
  }
  try {
    if (editingId.value) {
      await postStore.update(editingId.value, { name: trimmed })
      ElMessage.success('已更新')
    } else {
      await postStore.add(trimmed)
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    reportError('保存岗位', e)
  }
}

async function onRemove(id: string, current: string) {
  const count = countPostReferences(id, staffStore.list)
  const ok = await confirmAction(buildPostDeleteWarning(current, count))
  if (!ok) return
  try {
    await postStore.remove(id)
    ElMessage.success('已删除')
  } catch (e) {
    reportError('删除岗位', e)
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增</el-button>
      <span class="hint">删除岗位会清空引用该岗位的人员的岗位信息</span>
    </div>
    <el-table :data="postStore.list" border>
      <el-table-column prop="name" label="岗位名称" sortable />
      <el-table-column prop="updatedAt" label="更新时间" width="220" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row.id, row.name)">编辑</el-button>
          <el-button link type="danger" @click="onRemove(row.id, row.name)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑岗位' : '新增岗位'" width="400px">
      <el-input
        v-model="name"
        placeholder="岗位名称"
        @keyup.enter="onSave"
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
