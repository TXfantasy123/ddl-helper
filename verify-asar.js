// 校验打包产物里的 server-core.js 是否正确（防止再次打出启动即崩的包）
const path = require('path');
const asarPath = path.join(__dirname, 'desktop', 'release', 'win-unpacked', 'resources', 'app.asar');
let asar;
try {
  asar = require(path.join(__dirname, 'desktop', 'node_modules', '@electron', 'asar'));
} catch (e) {
  console.log('未找到 @electron/asar，跳过 asar 校验');
  process.exit(0);
}
try {
  const buf = asar.extractFile(asarPath, 'server-core.js');
  const src = buf.toString('utf8');
  const bad = src.includes("path.join(APP_DIR, 'app')");
  const good = src.includes("const APP_DIR = path.join(__dirname, 'app')");
  const hasExport = src.includes('setApiKey');
  console.log('asar 内 server-core.js：');
  console.log('  APP_DIR 自引用（错误）:', bad);
  console.log('  正确定义:', good);
  console.log('  含 setApiKey 导出:', hasExport);
  if (bad || !good) {
    console.error('❌ 打包产物仍有启动崩溃问题');
    process.exit(1);
  }
  console.log('✅ asar 校验通过');
} catch (e) {
  console.error('asar 读取失败：', e && e.message);
  process.exit(1);
}
