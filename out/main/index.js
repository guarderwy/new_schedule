"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const BACKUP_KEEP_DAYS = 7;
function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const text = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(text);
  } catch (e) {
    const bakPath = filePath + ".bak";
    if (fs.existsSync(bakPath)) {
      try {
        return JSON.parse(fs.readFileSync(bakPath, "utf-8"));
      } catch {
      }
    }
    console.error("read json failed", filePath, e);
    return null;
  }
}
function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = filePath + ".tmp";
  const bakPath = filePath + ".bak";
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, bakPath);
  }
  fs.renameSync(tmpPath, filePath);
}
function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}
function backupDataDir(dataDir) {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const backupRoot = path.join(dataDir, "backup");
    if (!fs.existsSync(backupRoot)) {
      fs.mkdirSync(backupRoot, { recursive: true });
    } else if (!isDirectory(backupRoot)) {
      fs.rmSync(backupRoot, { recursive: true, force: true });
      fs.mkdirSync(backupRoot, { recursive: true });
    }
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const target = path.join(backupRoot, stamp);
    if (fs.existsSync(target) && !isDirectory(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    for (const f of fs.readdirSync(dataDir)) {
      if (f === "backup") continue;
      if (f.endsWith(".tmp") || f.endsWith(".bak")) continue;
      const src = path.join(dataDir, f);
      if (isDirectory(src)) continue;
      try {
        fs.copyFileSync(src, path.join(target, f));
      } catch (copyErr) {
        console.error("backup copy failed for", f, copyErr);
      }
    }
    const cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1e3;
    for (const name of fs.readdirSync(backupRoot)) {
      const dir = path.join(backupRoot, name);
      if (!isDirectory(dir)) continue;
      const time = Date.parse(name);
      if (!Number.isNaN(time) && time < cutoff) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    return true;
  } catch (e) {
    console.error("backupDataDir failed", e);
    return false;
  }
}
function ensureDataFiles(dataDir) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const defaults = {
    "staff.json": { version: 1, list: [] },
    "posts.json": { version: 1, list: [] },
    "shifts.json": { version: 1, list: [] },
    "schedules.json": { version: 1, weeks: {} },
    "night_shift_rules.json": { version: 1, rules: [] },
    "demands.json": { version: 1, list: [] },
    "settings.json": {
      version: 1,
      assistNightShiftId: null,
      weekdayRequiredShiftIds: [],
      weekendRequiredShiftIds: [],
      lastBackupAt: null
    }
  };
  for (const [name, content] of Object.entries(defaults)) {
    const filePath = path.join(dataDir, name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf-8");
    }
  }
}
const DATA_FILE_NAMES = [
  "staff.json",
  "posts.json",
  "shifts.json",
  "schedules.json",
  "night_shift_rules.json",
  "demands.json",
  "settings.json"
];
const FILE_SHAPES = {
  "staff.json": "list",
  "posts.json": "list",
  "shifts.json": "list",
  "demands.json": "list",
  "schedules.json": "weeks",
  "night_shift_rules.json": "rules",
  "settings.json": "object"
};
function isValidBundleFile(name, content) {
  const shape = FILE_SHAPES[name];
  if (!shape || content == null || typeof content !== "object") return false;
  if (shape === "list") return Array.isArray(content.list);
  if (shape === "weeks") {
    const weeks = content.weeks;
    return typeof weeks === "object" && weeks !== null;
  }
  if (shape === "rules") return Array.isArray(content.rules);
  return true;
}
function exportDataBundle(dataDir, targetPath) {
  const files = {};
  for (const name of DATA_FILE_NAMES) {
    files[name] = readJsonSafe(path.join(dataDir, name));
  }
  atomicWriteJson(targetPath, {
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    files
  });
  return true;
}
function importDataBundle(dataDir, sourcePath) {
  const payload = readJsonSafe(sourcePath);
  if (!payload?.files || typeof payload.files !== "object") return false;
  const entries = Object.entries(payload.files).filter(
    ([name]) => DATA_FILE_NAMES.includes(name)
  );
  if (entries.length === 0) return false;
  for (const [name, content] of entries) {
    if (!isValidBundleFile(name, content)) {
      console.error("import rejected: invalid file in bundle", name);
      return false;
    }
  }
  backupDataDir(dataDir);
  ensureDataFiles(dataDir);
  for (const [name, content] of entries) {
    atomicWriteJson(path.join(dataDir, name), content);
  }
  return true;
}
const ALLOWED_DATA_FILES = /* @__PURE__ */ new Set([
  "staff.json",
  "posts.json",
  "shifts.json",
  "schedules.json",
  "night_shift_rules.json",
  "demands.json",
  "settings.json"
]);
function safeDataFileName(fileName) {
  if (typeof fileName !== "string" || fileName.length === 0) return null;
  const base = path.basename(fileName);
  return ALLOWED_DATA_FILES.has(base) ? base : null;
}
function getDataDir() {
  return path.join(electron.app.getPath("userData"), "data");
}
function registerStorageIPC() {
  electron.ipcMain.handle("storage:read", async (_e, fileName) => {
    const safe = safeDataFileName(fileName);
    if (!safe) return null;
    return readJsonSafe(path.join(getDataDir(), safe));
  });
  electron.ipcMain.handle("storage:write", async (_e, fileName, data) => {
    const safe = safeDataFileName(fileName);
    if (!safe) return false;
    await Promise.resolve(atomicWriteJson(path.join(getDataDir(), safe), data));
    return true;
  });
  electron.ipcMain.handle("storage:list", async () => {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) return [];
    return fs.readdirSync(dataDir).filter((name) => {
      try {
        return fs.statSync(path.join(dataDir, name)).isFile();
      } catch {
        return false;
      }
    });
  });
  electron.ipcMain.handle("storage:export", async (_e, targetPath) => {
    return exportDataBundle(getDataDir(), targetPath);
  });
  electron.ipcMain.handle("storage:import", async (_e, sourcePath) => {
    return importDataBundle(getDataDir(), sourcePath);
  });
  electron.ipcMain.handle("storage:backup", async () => {
    return backupDataDir(getDataDir());
  });
  electron.ipcMain.handle("storage:chooseExportFile", async () => {
    const win = electron.BrowserWindow.getFocusedWindow();
    const options = {
      title: "导出排班数据",
      defaultPath: `schedule-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }]
    };
    const result = win ? await electron.dialog.showSaveDialog(win, options) : await electron.dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });
  electron.ipcMain.handle("storage:chooseImportFile", async () => {
    const win = electron.BrowserWindow.getFocusedWindow();
    const options = {
      title: "导入排班数据",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    };
    const result = win ? await electron.dialog.showOpenDialog(win, options) : await electron.dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  const dataDir = path.join(electron.app.getPath("userData"), "data");
  ensureDataFiles(dataDir);
  backupDataDir(dataDir);
  registerStorageIPC();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
