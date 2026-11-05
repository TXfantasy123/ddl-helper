# DDL 小管家 · 桌面版（Electron）

把网页版打包成 **Windows 桌面应用**：双击即开、独立窗口、无需安装 Node、AI 代理跑在应用内。

## 最快方式

双击 **`一键打包.bat`**，等它跑完，`release\` 里会出现：

```
DDL小管家-安装程序-v2.11.0.exe        ← 安装程序（分发这个）
```

### 安装之后

- **程序名**：`DDL小管家`
- **默认安装目录**：`%LOCALAPPDATA%\Programs\DDL小管家\`（**安装时可自行选择其他位置**）
- **桌面**：自动创建「DDL小管家」快捷方式
- **开始菜单**：自动创建「DDL小管家」
- **安装过程**：向导式（`oneClick: false`）→ 选择安装位置 → 安装；默认装到当前用户、不需要管理员权限，装完自动启动
- **卸载**：控制面板「应用和功能」→ DDL小管家（卸载默认保留数据）

### 便携版（可选）

```cmd
npm run dist:portable    → release\DDL小管家-便携版.exe
```

免安装，放 U 盘/任意目录双击即用。

> ⚠️ 没做代码签名，首次运行可能提示 SmartScreen「Windows 已保护你的电脑」→ 点「更多信息」→「仍要运行」。

## 手动方式

> ⚠️ 在 cmd 里一定要用 `cd /d`，否则只切换目录不切换盘符。

```cmd
cd /d E:\1024\ddl-helper\desktop
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install --registry=https://registry.npmmirror.com
npm run dist
```

PowerShell 写法：

```powershell
cd E:\1024\ddl-helper\desktop
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
npm install --registry=https://npmmirror.com
npm run dist
```

## 开发调试

```cmd
npm start
```
会以窗口形式打开应用（改完前端后需要先 `npm run prep` 同步 `app/`）。

## 打包踩坑记录

| 现象 | 原因 | 解决 |
|---|---|---|
| `spawn EPERM` | 受限环境禁止子进程管道（`npm ls` 收集依赖时） | `build.npmRebuild: false`（本项目无原生依赖）+ 解除进程限制 |
| `Icon must be at least 256x256` | `app.ico` 只有 128 | 已重新生成 7 种尺寸（16–256） |
| NSIS `Error writing temporary file` | `TEMP` 指向受限/低完整性目录 | 打包前把 `TEMP`/`TMP` 指到**可写的普通目录**：`set TEMP=E:\xxx\tmp` |
| 下载 Electron 失败 | GitHub 被墙 | 设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` |

## 结构

| 文件 | 说明 |
|---|---|
| `main.js` | Electron 主进程：随机端口启动内嵌服务、创建窗口、关闭 GPU 加速 |
| `server-core.js` | 由 `../make-desktop-server.js` 从 `server.js` 生成（端口 0、仅 127.0.0.1、静态目录 `app/`） |
| `app/` | 构建产物目录（`npm run prep` 从根目录同步，已被 .gitignore 忽略） |
| `package.json` | 依赖 + electron-builder 打包配置 |

## 说明

- **数据位置**：存在应用自己的存储里（`%APPDATA%\DDL小管家`），和浏览器里的是两套数据；要迁移用「设置 → 导出/导入数据」。
- **GPU 加速已关闭**：避免部分显卡驱动（如 `nvlddmkm.sys` 0x116）崩溃导致蓝屏。
- **AI 解析**：应用内置了 `/api/parse` 代理，和本地 `node server.js` 行为一致。
