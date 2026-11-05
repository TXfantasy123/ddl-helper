// DDL 小管家 · Electron 主进程
// 启动内嵌 HTTP 服务（随机端口），再用应用窗口打开；无需安装 Node，也不会弹浏览器。
const { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer } = require('./server-core.js');

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
    const port = await startServer(0);
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
  createWindow();
});

app.on('window-all-closed', () => {
  // 托盘模式（closeAction=tray）下窗口是 hide 不是 close，不会走到这里
  if (quitting || !tray) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
