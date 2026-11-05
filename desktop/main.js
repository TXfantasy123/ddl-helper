// DDL 小管家 · Electron 主进程
// 启动内嵌 HTTP 服务（随机端口），再用应用窗口打开；无需安装 Node，也不会弹浏览器。
const { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage, session, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
// 内嵌服务：加载失败也不能让整个应用崩掉（退化为本地文件模式，离线解析仍可用）
let serverCore = null;
try {
  serverCore = require('./server-core.js');
} catch (e) {
  console.error('[main] server-core 加载失败：', e && e.message);
  serverCore = null;
}

// 显卡驱动不稳定的机器（曾出现 nvlddmkm.sys 0x116 蓝屏）默认关掉 GPU 加速
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

// 开机自启动时带 --hidden 参数：启动后最小化，不打断用户
const START_HIDDEN = process.argv.includes('--hidden');

let mainWindow = null;
let tray = null;
let quitting = false;

/* ---------- 设置持久化（userData/settings.json） ---------- */
let settings = { closeAction: null, trayHintShown: false };

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}
function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsFile(), 'utf8');
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') settings = Object.assign(settings, obj);
  } catch (e) { /* 首次运行没有文件 */ }
}
function saveSettings() {
  try {
    const file = settingsFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) { /* 忽略 */ }
}

/* ---------- 开机自启动（Windows 登录项） ---------- */
function isAutoStartOn() {
  try {
    return !!app.getLoginItemSettings().openAtLogin;
  } catch (e) {
    return false;
  }
}
function setAutoStart(on) {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!on,
      path: process.execPath,
      args: ['--hidden'],
    });
  } catch (e) { /* 忽略 */ }
  return isAutoStartOn();
}

/* ---------- 托盘 ---------- */
function showWindow() {
  if (!mainWindow) { createWindow(); return; }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function rebuildTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: '打开主界面', click: () => showWindow() },
    { type: 'separator' },
    {
      label: '开机自启动',
      type: 'checkbox',
      checked: isAutoStartOn(),
      click: (item) => { setAutoStart(item.checked); rebuildTrayMenu(); },
    },
    {
      label: '检查更新…',
      click: () => {
        showWindow();
        const up = getUpdater();
        if (up && app.isPackaged) up.checkForUpdates().catch(() => {});
      },
    },
    { type: 'separator' },
    { label: '退出 DDL 小管家', click: () => { quitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  if (tray) return;
  try {
    const iconPath = path.join(__dirname, 'app', 'icons', 'app.ico');
    let img = nativeImage.createFromPath(iconPath);
    if (img.isEmpty()) img = nativeImage.createEmpty();
    tray = new Tray(img);
    tray.setToolTip('DDL 小管家');
    rebuildTrayMenu();
    tray.on('click', () => showWindow());
    tray.on('double-click', () => showWindow());
  } catch (e) {
    tray = null;
  }
}

function hideToTray() {
  createTray();
  if (mainWindow) mainWindow.hide();
  if (tray && !settings.trayHintShown) {
    try {
      tray.displayBalloon({
        title: 'DDL 小管家仍在后台运行',
        content: '已最小化到托盘，右键托盘图标可退出。',
      });
    } catch (e) { /* 部分系统不支持气泡 */ }
    settings.trayHintShown = true;
    saveSettings();
  }
}

/* ---------- IPC ---------- */
ipcMain.handle('autostart:get', () => isAutoStartOn());
ipcMain.handle('autostart:set', (_e, on) => setAutoStart(on));

/* ---------- 软件内更新（electron-updater：默认 GitHub，可切换国内源） ---------- */
// 更新源由发版者固定，不开放给用户修改（防止被指向恶意 latest.yml 下载任意程序）
// 需要用国内镜像时：改这里 → 重新发版。留空 = GitHub Releases（build.publish 配置）
const FIXED_UPDATE_FEED = '';
let autoUpdater = null;
function getUpdater() {
  if (autoUpdater) return autoUpdater;
  try {
    // 延迟 require：开发环境没有 app-update.yml 时不至于报错
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }));
    autoUpdater.on('update-available', (info) => sendUpdateStatus({ state: 'available', version: info && info.version }));
    autoUpdater.on('update-not-available', (info) => sendUpdateStatus({ state: 'latest', version: info && info.version }));
    autoUpdater.on('download-progress', (p) => sendUpdateStatus({ state: 'downloading', percent: Math.round((p && p.percent) || 0) }));
    autoUpdater.on('update-downloaded', (info) => sendUpdateStatus({ state: 'downloaded', version: info && info.version }));
    autoUpdater.on('error', (err) => sendUpdateStatus({ state: 'error', message: String((err && err.message) || err) }));
    applyUpdateFeed(autoUpdater);
  } catch (e) {
    autoUpdater = null;
  }
  return autoUpdater;
}
function sendUpdateStatus(payload) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update:status', payload);
  }
}

ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { ok: false, state: 'dev', message: '开发模式不检查更新' };
  const up = getUpdater();
  if (!up) return { ok: false, state: 'error', message: '更新模块不可用' };
  try {
    applyUpdateFeed(up);
    const r = await up.checkForUpdates();
    return { ok: true, state: 'checking', version: r && r.updateInfo && r.updateInfo.version };
  } catch (e) {
    return { ok: false, state: 'error', message: String((e && e.message) || e) };
  }
});
ipcMain.handle('update:download', async () => {
  const up = getUpdater();
  if (!up) return { ok: false, message: '更新模块不可用' };
  try {
    await up.downloadUpdate();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
});
ipcMain.handle('update:install', () => {
  const up = getUpdater();
  if (!up) return { ok: false };
  quitting = true;
  try {
    up.quitAndInstall();
  } catch (e) {
    quitting = false;
    return { ok: false, message: String((e && e.message) || e) };
  }
  return { ok: true };
});
ipcMain.handle('update:get-version', () => app.getVersion());

/* ---------- API Key 安全存储（DPAPI 加密，页面拿不到明文） ---------- */
function encryptKey(plain) {
  try {
    if (!safeStorage.isEncryptionAvailable()) return '';
    return safeStorage.encryptString(String(plain)).toString('base64');
  } catch (e) {
    return '';
  }
}
function decryptKey() {
  try {
    const b64 = settings.apiKeyEnc;
    if (!b64) return '';
    if (!safeStorage.isEncryptionAvailable()) return '';
    return safeStorage.decryptString(Buffer.from(b64, 'base64'));
  } catch (e) {
    return '';
  }
}
function syncApiKeyToServer() {
  const key = decryptKey();
  try { if (serverCore) serverCore.setApiKey(key); } catch (e) { /* 忽略 */ }
  return key;
}
ipcMain.handle('key:save', (_e, plain) => {
  const value = String(plain || '').trim();
  if (!value) return { ok: false, message: '内容为空' };
  const enc = encryptKey(value);
  if (!enc) return { ok: false, message: '系统加密不可用，未保存' };
  settings.apiKeyEnc = enc;
  saveSettings();
  syncApiKeyToServer();
  return { ok: true, tail: '****' + value.slice(-4) };
});
ipcMain.handle('key:status', () => {
  const key = decryptKey();
  return { has: !!key, tail: key ? ('****' + key.slice(-4)) : '' };
});
ipcMain.handle('key:clear', () => {
  delete settings.apiKeyEnc;
  saveSettings();
  syncApiKeyToServer();
  return { ok: true };
});

/* ---------- 缓存清理（只清缓存，不动用户数据） ---------- */
const CACHE_DIRS = [
  'Cache', 'Code Cache', 'GPUCache', 'GPUPersistentCache', 'GrShaderCache',
  'ShaderCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'Service Worker',
  'Shared Dictionary', 'Dictionaries', 'blob_storage',
];
function dirSize(p) {
  try {
    let total = 0;
    for (const name of fs.readdirSync(p)) {
      const fp = path.join(p, name);
      const st = fs.statSync(fp);
      if (st.isDirectory()) total += dirSize(fp);
      else total += st.size;
    }
    return total;
  } catch (e) {
    return 0;
  }
}
ipcMain.handle('cache:size', () => {
  try {
    const base = app.getPath('userData');
    let total = 0;
    for (const d of CACHE_DIRS) {
      const p = path.join(base, d);
      if (fs.existsSync(p)) total += dirSize(p);
    }
    return { bytes: total };
  } catch (e) {
    return { bytes: 0, error: String((e && e.message) || e) };
  }
});
ipcMain.handle('cache:clear', async () => {
  try {
    const sess = session.defaultSession;
    // 只清缓存类存储：不动 localstorage / indexdb（事项、备份、API Key 都在那里）
    try { await sess.clearCache(); } catch (e) { /* 忽略 */ }
    try {
      await sess.clearStorageData({ storages: ['appcache', 'cachestorage', 'serviceworkers', 'shadercache'] });
    } catch (e) { /* 忽略 */ }
    // 清完后顺手删掉残留的缓存目录
    const base = app.getPath('userData');
    for (const d of CACHE_DIRS) {
      const p = path.join(base, d);
      try { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { /* 占用中就算了 */ }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
});

/* 更新源：由发版者固定（FIXED_UPDATE_FEED 为空 = 走 GitHub Releases） */
function applyUpdateFeed(up) {
  if (!up) return;
  const feed = String(FIXED_UPDATE_FEED || '').trim();
  if (!feed) return;
  try {
    up.setFeedURL({ provider: 'generic', url: feed.replace(/\/+$/, '') + '/' });
  } catch (e) { /* 忽略无效地址 */ }
}
ipcMain.handle('update:feed-get', () => {
  const feed = String(FIXED_UPDATE_FEED || '').trim();
  return feed || 'https://github.com/TXfantasy123/ddl-helper/releases';
});

ipcMain.handle('close:get', () => settings.closeAction || null);
ipcMain.handle('close:set', (_e, action) => {
  settings.closeAction = action === 'quit' ? 'quit' : 'tray';
  saveSettings();
  return settings.closeAction;
});
ipcMain.handle('close:apply', (_e, action, remember) => {
  const next = action === 'quit' ? 'quit' : 'tray';
  if (remember) {
    settings.closeAction = next;
    saveSettings();
  }
  if (next === 'quit') {
    quitting = true;
    app.quit();
    return 'quit';
  }
  hideToTray();
  return 'tray';
});

/* ---------- 窗口 ---------- */
async function createWindow() {
  let url = null;
  try {
    if (!serverCore) throw new Error('内嵌服务不可用');
    const port = await serverCore.startServer(0);
    url = 'http://127.0.0.1:' + port + '/';
  } catch (e) {
    // 服务起不来就退回本地文件（离线解析仍可用，AI 不可用）
    url = null;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: 'DDL 小管家',
    backgroundColor: '#fafafa',
    icon: path.join(__dirname, 'app', 'icons', 'app.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  if (url) {
    mainWindow.loadURL(url);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    // 开机自启动过来：只最小化到任务栏，不抢焦点
    if (START_HIDDEN) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  // 关闭行为：未选择 → 询问；托盘 → 隐藏；退出 → 正常关闭
  mainWindow.on('close', (e) => {
    if (quitting) return;
    const action = settings.closeAction;
    if (action === 'quit') return;
    e.preventDefault();
    if (action === 'tray') {
      hideToTray();
      return;
    }
    // 还没选过：让页面弹一次选择框
    showWindow();
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app:ask-close');
    }
  });

  // 外部链接交给系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:/i.test(target)) shell.openExternal(target);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  loadSettings();
  syncApiKeyToServer(); // 把加密保存的 Key 注入内嵌服务，页面无需持有明文
  createWindow();
  // 安装版启动 10 秒后静默检查一次更新（不打扰使用）
  if (app.isPackaged) {
    setTimeout(() => {
      const up = getUpdater();
      if (up) up.checkForUpdates().catch(() => {});
    }, 10000);
  }
});

app.on('window-all-closed', () => {
  // 托盘模式（closeAction=tray）下窗口是 hide 不是 close，不会走到这里
  if (quitting || !tray) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
