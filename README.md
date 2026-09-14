# schedule-manager 排班管理系统

医院 / 科室本地排班管理系统，基于 Electron 桌面端运行，数据全部保存在本地，无需联网。

## 技术栈

- **Electron 30** + **electron-vite** —— 桌面运行时与构建工具
- **Vue 3**（`<script setup>`）+ **TypeScript** —— 前端框架
- **Pinia** —— 状态管理
- **Element Plus** —— UI 组件库（按需自动引入）
- **vuedraggable** —— 拖拽排序（如夜班循环规则）
- **dayjs** —— 日期处理

## 功能模块

应用以标签页组织，覆盖排班全流程：

| 模块 | 说明 |
| --- | --- |
| 本周排班 | 查看与编辑当前周排班表 |
| 下周排班 | 生成排班、复制上周排班、删除排班 |
| 人员管理 | 维护排班人员及其状态、分组类型 |
| 岗位管理 | 维护岗位信息 |
| 班次管理 | 维护班次（名称、时间等） |
| 夜班循环规则 | 配置夜班循环规则，支持拖拽排序 |
| 需求管理 | 维护各岗位 / 时段的排班需求 |
| 系统设置 | 应用级配置 |

删除类操作均通过居中、灰白风格的确认弹窗（`ElMessageBox.confirm`）进行二次确认。

## 环境要求

- Node.js 18+（建议 20 LTS）
- npm 9+
- Windows / macOS / Linux（Electron 跨平台）

## 开发 / 构建

```bash
# 安装依赖
npm install

# 启动开发模式（带热重载）
npm run dev

# 类型检查
npm run typecheck

# 打包生产版本
npm run build

# 预览生产构建
npm run preview
```

## 数据存储

数据由 Electron **主进程**负责持久化，渲染进程通过预加载脚本暴露的 `window.storage` 接口访问，所有数据保存在本地文件，不上传任何服务器。

`window.storage` 提供的方法：

- `read(fileName)` / `write(fileName, data)` —— 读写数据文件
- `list()` —— 列出已有数据文件
- `backup()` —— 自动备份
- `export(targetPath)` / `import(sourcePath)` —— 导出 / 导入数据
- `chooseExportFile()` / `chooseImportFile()` —— 弹出文件选择框

> 备份动作会在应用启动时自动执行一次（见 `App.vue` 的 `onMounted`）。

## 项目结构

```
src/
├── main/                # Electron 主进程
│   ├── index.ts         # 主进程入口
│   ├── ipc/             # IPC 通信（storage.ts 数据读写）
│   └── utils/           # 工具（fileSystem.ts 等）
├── preload/             # 预加载脚本，向渲染进程暴露 window.storage
└── renderer/            # Vue 渲染进程
    ├── App.vue          # 入口与标签页布局
    ├── main.ts          # 渲染进程入口
    ├── styles.css       # 全局样式
    ├── views/           # 各功能页（本周/下周排班、人员、岗位、班次…）
    ├── components/      # 业务组件（列表、表单弹窗等）
    ├── stores/          # Pinia 状态（useStaffStore 等）
    ├── types/           # TypeScript 类型定义
    └── constants/       # 常量（状态、分组等枚举标签）
```

## 说明

- 组件与 API 经 `unplugin-vue-components` / `unplugin-auto-import` 按需自动引入，无需手动 `import` 组件。
- 删除确认弹窗的居中样式与灰白风格在 `src/renderer/styles.css` 中统一配置（`#f5f7fa` 系统灰白底）。
