# DDL 小管家

> 一个面向所有大学生（以江汉大学为试点）的校园事务 AI 备忘工具：把班群、教务处的通知文字、截图或 docx/pdf 文档**一键变成提醒**，内置高校高频事务模板，并用日历直观呈现"哪天有 DDL"。

- **赛道**：OPC / 个人创新 · 个人工作流程
- **版本**：v2.11.0（关闭窗口可选后台托盘运行；设置分类标签；版本检查升级；离线单文件版；PWA 可安装）
- **目标用户**：大学生（尤其大一新生，通知多、容易漏截止日）

---

## 一、解决什么问题

大学生每天被大量零散通知淹没（班群、教务处、社团），关键的时间/地点/截止日埋在冗长文字里，容易漏掉选课、四六级报名、体测、缴费等硬性截止日。通用备忘录要手动输入，且不懂大学事务。

**本工具**：粘贴文字 / 截图 / 上传文档 → AI 提取「事项 / 时间 / 地点 / 截止时间」→ 生成提醒 + 日历 + 统计。

## 二、核心功能

| 功能 | 说明 |
|---|---|
| 📄 文字解析 | 粘贴一条或多条通知，AI 自动提取结构化字段；无 Key / 离线时自动降级本地规则解析 |
| ✅ 解析预览 | 解析结果先预览：可勾选、可编辑字段、可拆分/合并、可换方式（AI/离线）重解析，确认后才入库 |
| 📷 截图识别 | 上传截图 → 前端压缩 → AI 逐字 OCR → **识别原文可编辑** → 再解析 |
| 📄 文档解析 | 上传 docx / pdf，本地提取文字后解析；扫描件会引导改用截图识别 |
| ⏱️ 截止时间 | 截止日期 + 可选具体时刻；提醒按「截止前 X 天 X 小时」精确触发 |
| 📅 日历视图 | 月视图 / **周视图**；每任务一色跨天连线、截止日圆点；**拖拽改期**、回到今天、双击新建 |
| 🗂️ 模板库 | 10 个高校高频事务一键预填，支持自定义添加 / 移除 / 恢复默认 |
| ⏰ 提醒 | 待提醒清单（按今天/本周/以后分组）、到点自动弹窗 + 浏览器通知、稍后提醒（含自定义）、提醒历史、下次提醒时间 |
| 📊 统计 | 本周/本月：新增、完成、未完成、逾期、完成率、平均提前量 |
| 🔍 搜索与筛选 | 关键词高亮；快捷筛选「今天 / 本周 / 已逾期」；只看未完成；显示隐藏事项 |
| ↕️ 排序与整理 | 排序切换（默认/截止/创建/完成）、拖拽排序、卡片详情折叠、批量完成/隐藏/删除/**改期** |
| ⌨️ 快捷键 | `Ctrl/Cmd+K` 搜索、`N` 新建、`Esc` 关闭弹窗 |
| 💾 数据 | 本地 localStorage + **IndexedDB 每日自动备份（保留 7 份）**；导入预览（新增/重复/无效）可选合并或覆盖 |
| 🔐 安全 | API Key 仅存本地、掩码显示、可测试连接；数据不出本机 |
| 🎨 主题 | 浅色 / 深色 / 跟随系统，切换无闪烁 |

## 三、快速开始（电脑端）

> 当前以**电脑端**为主，手机端暂不做适配。

### 方式一：本地运行（推荐，演示/日常用）

> 💡 **最快方式（推荐）**：双击 **`DDL小管家.lnk`**（或 `启动.vbs`）——**无任何黑色终端窗口**，后台静默启动并自动打开浏览器。
> - 已启动过再双击：只打开浏览器，不会重复启动第二个服务
> - **关闭网页后约 90 秒，后台服务会自动退出**（不会一直占着后台/锁住文件夹）
> - 想立刻停止：双击 **`停止.bat`**
> - 想让它常驻（比如随时从书签打开）：用 `node server.js --keep-alive`
> - 想把它放到桌面：把 `DDL小管家.lnk` 复制到桌面即可（图标已内置）

> 需要看日志/调试时可以用 `start.bat`（也会静默启动并立即关闭窗口，日志请用 `node server.js` 手动跑）。

1. 安装 [Node.js](https://nodejs.org)（18 或更高版本）。装好后，命令行输入 `node -v` 能显示版本号即成功。
2. 双击 `DDL小管家.lnk`（或 `启动.vbs`）。
3. 浏览器会自动打开 `http://localhost:3000/`（没自动打开就手动访问）。
4. 进入页面后，点 **设置** 填自己的 API Key 即可使用（不填也能用本地基础解析，但截图识别需要 Key）。
5. 主题可在 **设置 → 主题** 或侧边栏底部切换（浅色 / 深色 / 跟随系统）。

### 方式二：安装为独立应用（PWA）

页面本身就是一个可安装的 PWA：

- **Edge / Chrome**：打开页面后，点侧边栏底部的「**安装应用**」，或点地址栏右侧的「安装」图标 → 会装成一个**独立窗口应用**（无地址栏、有开始菜单/桌面图标、可离线打开）
- **iOS Safari**：分享 → 「添加到主屏幕」
- **Android Chrome**：菜单 → 「安装应用 / 添加到主屏幕」

> 已安装状态下不会再显示「安装应用」按钮。

### 方式三：纯离线单文件版（发给谁都能用，零依赖）

生成一个 **2.8 MB 的 HTML 文件**，里面内联了 docx/pdf 解析依赖：

```bash
node build-offline.js
# → dist/DDL小管家-离线版.html
```

把它发给同学，**双击就能用**（不需要 Node、不需要服务器、不需要联网），用 Edge 打开还能「安装为应用」。
离线版内置本地规则解析；AI 解析需要部署后端（见方式四）。

### 方式四：部署到云端（推荐长期使用）

部署后**不再需要本地 Node.js 和服务进程**，任何设备打开网址即可用。

1. 把仓库推到 GitHub（本项目已在 `github.com/TXfantasy123/ddl-helper`）
2. 打开 [vercel.com/new](https://vercel.com/new) → 导入该仓库 → 直接 Deploy（无需配置）
3. 得到形如 `https://ddl-helper-xxx.vercel.app` 的地址
4. **生成本地快捷方式**：双击 `创建云端快捷方式.vbs` → 粘贴上面的地址 → 会在桌面生成「DDL小管家(云端)」，双击即用**独立窗口**打开云端版（无需本地服务）

> ⚠️ `*.vercel.app` 在国内可能被 DNS 污染导致打不开。面向国内用户建议用国内云（如腾讯云 CloudBase 静态托管 + 云函数，默认域名免备案），或直接用「离线单文件版 / 桌面版」。
> `api/parse.js`、`api/parse-image.js` 是 serverless 代理，API Key 仍由前端传入、服务端不存储。
> `vercel.json` 已配置 `sw.js` / `manifest.json` 的缓存策略。

### 方式五：桌面版（Electron，出 exe）

`desktop/` 目录是一个完整的 Electron 工程：内置 HTTP 服务（随机端口）+ 应用窗口，**不需要用户装 Node**，AI 代理也跑在应用内。

#### ⭐ 方式 A：GitHub Actions 自动构建（不用本地装环境，直接下载 exe）

仓库里已配置 `.github/workflows/build-desktop.yml`，由 GitHub 的 Windows 机器帮你编译：

1. 推送到 GitHub
2. 打开 **Actions** → 左侧选 **Build Windows Installer** → 右侧 **Run workflow** → 选 `main` → 运行
3. 等 3–5 分钟，进入完成的运行记录，页面底部 **Artifacts** → 下载 `DDL小管家-installer`
4. 解压得到 **`DDL小管家-安装程序-v2.11.0.exe`** ← 这就是安装程序，直接双击安装

> 更省事的做法：打一个 tag 推送（`git tag v2.9.0 && git push origin v2.9.0`），会自动创建 **Release** 并把 exe 挂上去，得到一个可以发给别人的下载链接。

#### 方式 B：本机打包

双击 `desktop\一键打包.bat`，跑完在 `desktop\release\` 得到 **`DDL小管家-安装程序-v2.11.0.exe`**。

手动方式（注意 cmd 里要用 `cd /d`，否则不会切换盘符）：

```cmd
cd /d E:\1024\ddl-helper\desktop
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install --registry=https://registry.npmmirror.com   :: 首次约 200MB
npm run dist                                            :: → release\DDL小管家-安装程序-v2.11.0.exe
```

安装后：程序名 **DDL小管家**、桌面快捷方式「DDL小管家」、开始菜单「DDL小管家」、控制面板可卸载；安装向导里**可自选安装位置**；设置里可开**开机自启动**。

- 默认 `app.disableHardwareAcceleration()`，避免显卡驱动不稳的机器蓝屏（TDR）
- 数据存在应用自己的存储里（`%APPDATA%\DDL小管家`），与浏览器数据互相独立，迁移用「设置 → 导出/导入」
- 更详细的说明见 [`desktop/README.md`](desktop/README.md)

### 方式六：桌面安装包（Tauri，可选，需 Rust）

项目结构也可用 [Tauri](https://tauri.app) 打包成 ~10MB 的 exe（需要先装 Rust 工具链）：

```bash
# 1) 安装 Rust：https://rustup.rs  （一次性，约 1–2 GB）
# 2) 安装 Tauri CLI
cargo install tauri-cli --locked
# 3) 在项目目录初始化并打包
cargo tauri init --app-name "DDL小管家" --window-title "DDL 小管家" \
  --dist-dir . --dev-url http://localhost:3000
cargo tauri build
```

> 若显卡驱动不稳（曾出现 `nvlddmkm.sys` 蓝屏），打包时给 WebView2 加 `--disable-gpu` 更稳。

## 四、使用步骤

1. 点右上角 **⚙️ 设置**
2. 选服务商（DeepSeek / 通义千问 / 智谱GLM / Kimi / OpenAI / 自定义），填自己的 **API Key**，保存
3. 粘贴通知文字（多条可用空行分隔）、点「📷 上传截图」或「📄 上传文档」（docx/pdf）
4. 点「✨ 解析成提醒」→ 列表生成提醒
5. 切到「日历」查看哪天有 DDL
6. 需要快速添加可点模板按钮

> 💡 **未填 API Key 也能用**：会自动降级为本地基础解析（正则），不调用任何 API；截图识别需要 Key。

## 五、技术架构

- **前端**：单文件 `index.html`（HTML+CSS+JS 内联，无框架、无构建）
- **后端**：`server.js`（本地）/ `api/*.js`（Vercel serverless），统一走 OpenAI 兼容接口 `/chat/completions`
- **存储**：localStorage 持久化（try-catch 降级内存模式）
- **AI**：多模型可配置，`response_format=json_object`，AI 失败自动回退本地正则解析

## 六、目录结构

```
ddl-helper/
├── index.html            # 主程序（单文件）
├── server.js             # 本地后端（托管页面 + 代理接口）
├── api/
│   ├── parse.js          # 文字解析代理（Vercel serverless）
│   └── parse-image.js    # 截图识别代理（Vercel serverless）
├── vercel.json           # Vercel 配置
├── manifest.json         # PWA 清单（可添加到主屏幕）
├── sw.js                 # PWA service worker（离线缓存）
├── icons/                # PWA 图标
└── vendor/               # 文档解析依赖（mammoth.js / pdf.js，本地离线）
```

## 七、注意事项

- **API Key 安全**：Key 仅保存在浏览器 localStorage，不硬编码在源码中；每个用户填自己的 Key，互不影响。
- **隐私**：提醒数据仅保存在本机浏览器，不会上传到任何服务器。
- **降级策略**：AI 调用失败或无 Key 时，自动回退本地正则解析，保证离线可用。
- **文档解析**：docx/pdf 用本地 `vendor/` 依赖解析（离线可用）；**扫描版 PDF 提取不出文字**，请改用截图识别。
