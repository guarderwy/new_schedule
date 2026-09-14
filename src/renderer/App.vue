<script setup lang="ts">
import { onMounted, ref } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { ElMessage } from 'element-plus'
import CurrentWeekView from './views/CurrentWeekView.vue'
import NextWeekView from './views/NextWeekView.vue'
import StaffView from './views/StaffView.vue'
import PostView from './views/PostView.vue'
import ShiftView from './views/ShiftView.vue'
import NightRuleView from './views/NightRuleView.vue'
import DemandView from './views/DemandView.vue'
import SettingsView from './views/SettingsView.vue'
import { useStaffStore } from './stores/useStaffStore'
import { usePostStore } from './stores/usePostStore'
import { useShiftStore } from './stores/useShiftStore'
import { useScheduleStore } from './stores/useScheduleStore'
import { useNightRuleStore } from './stores/useNightRuleStore'
import { useDemandStore } from './stores/useDemandStore'
import { useSettingsStore } from './stores/useSettingsStore'

const activeTab = ref('current')

const staffStore = useStaffStore()
const postStore = usePostStore()
const shiftStore = useShiftStore()
const scheduleStore = useScheduleStore()
const nightRuleStore = useNightRuleStore()
const demandStore = useDemandStore()
const settingsStore = useSettingsStore()

onMounted(async () => {
  await Promise.all([
    staffStore.load(),
    postStore.load(),
    shiftStore.load(),
    scheduleStore.load(),
    nightRuleStore.load(),
    demandStore.load(),
    settingsStore.load()
  ])
  try {
    await window.storage.backup()
    await settingsStore.update({ lastBackupAt: new Date().toISOString() })
  } catch (e) {
    console.error(e)
    ElMessage.warning('自动备份失败')
  }
})
</script>

<template>
  <el-config-provider :locale="zhCn">
    <div class="app-container">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="本周排班" name="current">
          <CurrentWeekView />
        </el-tab-pane>
        <el-tab-pane label="下周排班" name="next">
          <NextWeekView />
        </el-tab-pane>
        <el-tab-pane label="人员管理" name="staff">
          <StaffView />
        </el-tab-pane>
        <el-tab-pane label="岗位管理" name="post">
          <PostView />
        </el-tab-pane>
        <el-tab-pane label="班次管理" name="shift">
          <ShiftView />
        </el-tab-pane>
        <el-tab-pane label="夜班循环规则" name="nightRule">
          <NightRuleView />
        </el-tab-pane>
        <el-tab-pane label="需求管理" name="demand">
          <DemandView />
        </el-tab-pane>
        <el-tab-pane label="系统设置" name="settings">
          <SettingsView />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-config-provider>
</template>
