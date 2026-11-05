// 生成「便携版」分发目录 + zip：离线单文件 HTML + 启动器 + 图标 + 说明
// 用法：node build-portable.js（会先确保 dist/DDL小管家-离线版.html 存在）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = __dirname;
const distDir = path.join(root, 'dist');
const offlineHtml = path.join(distDir, 'DDL小管家-离线版.html');

if (!fs.existsSync(offlineHtml)) {
  console.log('未找到离线单文件，先执行 build-offline.js …');
  execFileSync(process.execPath, [path.join(root, 'build-offline.js')], { stdio: 'inherit' });
}

const pkgDir = path.join(distDir, 'DDL小管家-便携版');
fs.rmSync(pkgDir, { recursive: true, force: true });
fs.mkdirSync(path.join(pkgDir, 'icons'), { recursive: true });

// 1) 离线单文件
fs.copyFileSync(offlineHtml, path.join(pkgDir, 'DDL小管家-离线版.html'));

// 2) 图标
fs.copyFileSync(path.join(root, 'icons', 'app.ico'), path.join(pkgDir, 'icons', 'app.ico'));

// 3) 启动器（用 Edge app 窗口打开离线 HTML，无地址栏）
//    注意：wscript 按 ANSI/GBK 读 .vbs，UTF-8 中文会乱码 —— 这里全部用 ASCII。
const launcher = `Option Explicit
Dim fso, sh, dir, edge, target, url, f

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

' Find the offline html in this folder (avoids non-ASCII literals in the script)
target = ""
For Each f In fso.GetFolder(dir).Files
    If LCase(fso.GetExtensionName(f.Name)) = "html" Then target = f.Path
Next

If target = "" Then
    MsgBox "Offline HTML not found. Keep the launcher in the same folder as the html.", 48, "DDL Helper"
    WScript.Quit
End If

url = "file:///" & Replace(target, "\\", "/")

edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
If Not fso.FileExists(edge) Then edge = "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"

If fso.FileExists(edge) Then
    sh.Run """" & edge & """ --app=""" & url & """", 1, False
Else
    sh.Run """" & target & """", 1, False
End If
`;
fs.writeFileSync(path.join(pkgDir, '启动 DDL小管家.vbs'), launcher, 'ascii');

// 4) 说明
const readme = `DDL 小管家 · 便携版
==================================

【怎么用】
双击「启动 DDL小管家.vbs」即可打开（独立窗口，无地址栏）。

【特点】
- 不需要安装 Node.js，不需要联网，不需要服务器
- 数据保存在本机浏览器里（换设备/清缓存前请用 设置 → 导出数据 备份）
- 解析：内置本地规则解析（离线可用）；配置 API Key 后可在有网络时用 AI 解析

【想放到桌面】
右键「启动 DDL小管家.vbs」→ 发送到 → 桌面快捷方式
（图标可在快捷方式属性里改成 icons\\app.ico）

【AI 解析说明】
离线版不带后端代理，AI 解析需要部署后端（Vercel / 国内云函数），
详见项目 README 的「方式四：部署到云端」。
不配 Key 也能用本地规则解析，覆盖常见校园通知格式。
`;
fs.writeFileSync(path.join(pkgDir, '使用说明.txt'), readme, 'utf8');

console.log('✅ 便携版目录已生成：' + pkgDir);

// 5) 打包 zip
const zipPath = path.join(distDir, 'DDL小管家-便携版.zip');
fs.rmSync(zipPath, { force: true });
try {
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Compress-Archive -Path "${pkgDir}\\*" -DestinationPath "${zipPath}" -Force`
  ], { stdio: 'inherit' });
  const size = fs.statSync(zipPath).size;
  console.log('✅ 已打包：' + zipPath + '（' + (size / 1024 / 1024).toFixed(2) + ' MB）');
} catch (e) {
  console.log('⚠️ 自动打包失败，请手动压缩目录：' + pkgDir);
}
