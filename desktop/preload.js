// DDL 小管家 · Electron 预加载脚本
// 只暴露必要的桌面能力给页面（上下文隔离，页面拿不到 Node）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ddlDesktop', {
  isDesktop: true,
  platform: process.platform,

  // 开机自启动
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (on) => ipcRenderer.invoke('autostart:set', !!on),

  // 关闭窗口行为：null=未选、'tray'=最小化到托盘、'quit'=直接退出
  getCloseAction: () => ipcRenderer.invoke('close:get'),
  setCloseAction: (action) => ipcRenderer.invoke('close:set', action),
  applyClose: (action, remember) => ipcRenderer.invoke('close:apply', action, !!remember),

  // 主进程请求页面弹「关闭方式」选择框
  onAskClose: (cb) => {
    const handler = () => { try { cb(); } catch (e) { /* 忽略 */ } };
    ipcRenderer.on('app:ask-close', handler);
    return () => ipcRenderer.removeListener('app:ask-close', handler);
  },

  // 软件内更新（electron-updater）
  getAppVersion: () => ipcRenderer.invoke('update:get-version'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getUpdateFeed: () => ipcRenderer.invoke('update:feed-get'),
  setUpdateFeed: (url) => ipcRenderer.invoke('update:feed-set', url),

  // 缓存（只清缓存，不动用户数据）
  getCacheSize: () => ipcRenderer.invoke('cache:size'),
  clearCache: () => ipcRenderer.invoke('cache:clear'),

  // API Key：加密保存在系统凭据里，页面只能拿到尾号
  saveApiKey: (key) => ipcRenderer.invoke('key:save', key),
  getKeyStatus: () => ipcRenderer.invoke('key:status'),
  clearApiKey: () => ipcRenderer.invoke('key:clear'),
  onUpdateStatus: (cb) => {
    const handler = (_e, payload) => { try { cb(payload); } catch (e) { /* 忽略 */ } };
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },
});
