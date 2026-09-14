<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref } from 'vue'
import { usePostStore } from '@renderer/stores/usePostStore'

const postStore = usePostStore()
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
  if (!name.value.trim()) {
    ElMessage.warning('请输入岗位名称')
    return
  }
  if (editingId.value) {
    await postStore.update(editingId.value, { name: name.value.trim() })
    ElMessage.success('已更新')
  } else {
    await postStore.add(name.value.trim())
    ElMessage.success('已新增')
  }
  dialogVisible.value = false
}

async function onRemove(id: string, current: string) {
  await ElMessageBox.confirm(`确认删除岗位「${current}」？`, '删除确认', { type: 'warning' })
  await postStore.remove(id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">新增</el-button>
    </div>
    <el-table :data="postStore.list" border>
      <el-table-column prop="name" label="岗位名称" />
      <el-table-column prop="updatedAt" label="更新时间" width="220" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row.id, row.name)">编辑</el-button>
          <el-button link type="danger" @click="onRemove(row.id, row.name)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑岗位' : '新增岗位'" width="400px">
      <el-input v-model="name" placeholder="岗位名称" />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
