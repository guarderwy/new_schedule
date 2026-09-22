<script setup lang="ts">
import { onMounted, ref } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import CurrentWeekView from './views/CurrentWeekView.vue'
import NextWeekView from './views/NextWeekView.vue'
import StaffView from './views/StaffView.vue'
import PostView from './views/PostView.vue'
import ShiftView from './views/ShiftView.vue'
import NightRuleView from './views/NightRuleView.vue'
import DemandView from './views/DemandView.vue'
import SettingsView from './views/SettingsView.vue'
import { buildDemoData } from './core/demoData'
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

async function seedDemoData() {
  const demo = buildDemoData()
  staffStore.list = demo.staff
  postStore.list = demo.posts
  shiftStore.list = demo.shifts
  nightRuleStore.rules = demo.nightRules
  settingsStore.settings = demo.settings
  scheduleStore.weeks = Object.fromEntries(demo.weeks.map((w) => [w.weekKey, w]))
  await Promise.all([
    staffStore.persist(),
    postStore.persist(),
    shiftStore.persist(),
    nightRuleStore.persist(),
    settingsStore.persist(),
    scheduleStore.persist()
  ])
}

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

  // 首次打开且数据为空时，自动载入模拟数据
  if (staffStore.list.length === 0 && Object.keys(scheduleStore.weeks).length === 0) {
    try {
      await seedDemoData()
    } catch (e) {
      console.error('载入示例数据失败', e)
    }
  }

  // 自动备份：仅记录日志，不再弹窗打扰
  try {
    const ok = await window.storage.backup()
    if (ok) {
      await settingsStore.update({ lastBackupAt: new Date().toISOString() })
    } else {
      console.warn('自动备份未成功完成（已忽略）')
    }
  } catch (e) {
    console.error('自动备份失败', e)
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
