# DDL 小管家

> 校园事务 AI 备忘工具：把班群、教务处的通知文字、截图或 docx/pdf 文档**一键变成提醒**，内置高校高频事务模板，并用日历直观呈现"哪天有 DDL"。

- **版本**：v2.14.2
- **目标用户**：大学生（尤其大一新生，通知多、容易漏截止日）
- **形态**：**Windows 桌面版为主**（exe 安装包），网页版作为「下载前的试用」同时保留

---

## 一、两种用法

| | 桌面版（推荐） | 网页版（试用） |
|---|---|---|
| 获取 | 下载 `DDLHelper-Setup-v2.13.1.exe` 安装 | 打开网址即可 |
| 系统通知 / 托盘 / 开机自启 | ✅ | ❌（受浏览器限制） |
| 软件内更新 | ✅ 一键下载并重启安装 | ❌ |
| 离线使用 | ✅ | 需要联网首次加载 |
| 数据 | 存在应用自己目录（`%APPDATA%\DDL小管家`） | 存在浏览器 localStorage |

> 两者数据互相独立，迁移用「设置 → 数据 → 导出/导入」。

---

## 二、桌面版（主推）

### 安装

1. 到 [Releases](https://github.com/TXfantasy123/ddl-helper/releases) 下载最新的 `DDLHelper-Setup-vX.Y.Z.exe`
   （Release 里另有中文名副本 `DDL小管家-安装程序-vX.Y.Z.exe`，内容相同，**自动更新用的是 ASCII 名那份**，因为 GitHub 会把中文文件名清洗成 ASCII 导致下载 404）
2. 双击 → **选择安装位置** → 安装
3. 自动创建桌面图标 + 开始菜单项，装完自动启动

安装后：程序名「DDL小管家」、控制面板可卸载。

### 特性

- **系统托盘**：关闭窗口可选「最小化到托盘（继续提醒）」或「直接退出」，首次关闭时询问并可记住选择
- **开机自启动**：设置 → 桌面 → 开机自启动（开机后最小化启动，不抢焦点）
- **软件内更新**：设置 → 关于 → 检查更新（基于 electron-updater，直接下载并重启安装）
- **内置服务**：AI 解析代理跑在应用内（随机端口、仅监听本机），不需要另装 Node

### 自己构建

```cmd
cd /d E:\1024\ddl-helper\desktop
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install --registry=https://registry.npmmirror.com
npm run dist
```

产物：`desktop\release\DDLHelper-Setup-v{版本}.exe`

> ⚠️ 构建产物不要放在 DSH 沙箱工作区里运行（那里文件被标为低完整性，双击安装会报 `Error writing temporary file`），复制到桌面或其他盘再用。

---

## 三、网页版（试用 / 在线使用）

### 直接访问

部署后打开网址即可，登录后同样可以解析通知、看日历、收提醒（需页面保持打开）。

### 自行部署

- **Vercel**：导入本仓库 → Deploy（`api/` 下已有 serverless 代理）
  > `*.vercel.app` 在国内可能被 DNS 污染，国内用户建议用国内云（如腾讯云 CloudBase）或直接用桌面版
- **本地运行**：`node server.js` → 打开 http://localhost:3000
- **PWA 安装**：浏览器打开后点侧边栏「安装应用」，可装成独立窗口（`manifest.json` + `sw.js` 已配置）

网页版数据存在浏览器 localStorage，清理浏览器数据会丢，重要数据请导出备份。

---

## 四、功能一览

| 模块 | 说明 |
|---|---|
| **解析** | 粘贴文字 / 上传截图（需 AI Key）/ 上传 docx·pdf；AI 与本地规则双通道，AI 失败自动回退 |
| **预览确认** | 拆分、合并、改字段；可开启「解析后直接添加」跳过确认 |
| **提醒** | 自定义提前量（年/月/周/天/小时/分钟，最多 6 组）；到期弹窗 + 系统通知 |
| **日历** | 月视图（事件文字，可配置密度/条数/悬停/右侧面板）+ 议程视图（按天分组） |
| **列表** | 搜索、筛选、排序、批量操作、拖拽排序、快捷键、分页 |
| **数据** | 导出/导入 JSON、每日自动备份（IndexedDB）、重复事项一键合并、全局撤销 |
| **设置** | 常规 / 日历 / 数据 / 桌面 / 关于 五个分类 |

> 不填 API Key 也能用：自动走本地规则解析，覆盖常见校园通知格式。

---

## 五、目录结构

```
ddl-helper/
├─ index.html              主程序（单文件，HTML+CSS+JS 内联，无构建）
├─ server.js               本地 / 桌面版内置后端（AI 代理 + 静态托管）
├─ api/                    Vercel serverless 代理（网页版部署用）
├─ vendor/                 docx / pdf 解析依赖（本地优先）
├─ icons/                  应用图标（app.ico） + PWA 图标
├─ manifest.json  sw.js    PWA（网页版安装为独立窗口）
├─ desktop/                Electron 桌面版工程
│   ├─ main.js             主进程（窗口 / 托盘 / 自启 / 更新 / 关闭行为）
│   ├─ preload.js          受限 IPC 桥
│   ├─ server-core.js      内嵌 HTTP 服务（由 server.js 生成）
│   ├─ package.json        打包配置（NSIS、publish、electron-updater）
│   └─ 一键打包.bat         双击出安装包
├─ make-desktop-app.js     同步前端产物到 desktop/app
├─ make-desktop-server.js  由 server.js 生成 desktop/server-core.js
├─ .github/workflows/      GitHub Actions：推送 tag 自动构建安装包 + 发 Release
└─ 更新日志.md
```

---

## 六、发版流程

```powershell
# 1. 改版本号（index.html 的 APP_VERSION / desktop/package.json / 更新日志）
git add -A; git commit -m "更新 vX.Y.Z：..."
git push origin main
# 2. 打 tag → GitHub Actions 自动构建安装包并创建 Release
git tag vX.Y.Z; git push origin vX.Y.Z
```

用户端：设置 → 关于 → 检查更新 → 发现新版本 → 下载 → 重启并安装。

---

## 七、更新源（由发布者固定，用户不可改）

默认更新源是 **GitHub Releases**。更新源刻意做成**只读**，不开放用户填写——否则任何人都能把更新指向自己的服务器，伪造 `latest.yml` 让应用下载运行任意程序。

设置里只显示：
```
更新源
  来源   官方 GitHub Releases
```

### 换成国内镜像（发版者操作）

1. 把 `desktop/release/` 里的两样东西上传到你的静态存储（腾讯云 COS / 阿里云 OSS / Gitee Release / 自建 Nginx）：
   ```
   DDLHelper-Setup-vX.Y.Z.exe
   latest.yml
   ```
2. 修改 `desktop/main.js` 里的常量：
   ```js
   const FIXED_UPDATE_FEED = 'https://cdn.example.com/ddl';  // 留空 = GitHub
   ```
3. 重新打包发版。之后所有用户都会从该地址检查/下载更新。

> `latest.yml` 里的 `path` / `files[].url` 必须与该目录下的真实文件名一致。

---

## 八、常见问题

**Q：安装时提示「Windows 已保护你的电脑」？**
A：因为没有代码签名证书。点「更多信息」→「仍要运行」即可。

**Q：安装包双击报 `Error writing temporary file`？**
A：安装包被放在了受限目录（如 DSH 沙箱工作区）。复制到桌面/其他盘再运行。

**Q：AI 解析要花钱吗？**
A：用自己的 API Key（DeepSeek 等），解析一条通知通常不到 0.001 元；不填 Key 也能用本地规则解析。

**Q：手机能用吗？**
A：网页版部署后手机浏览器可打开并「添加到主屏幕」，但目前未做移动端专门适配。
