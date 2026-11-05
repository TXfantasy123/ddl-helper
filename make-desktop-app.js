// 把前端产物复制到 desktop/app/（Electron 打包前自动执行）
const fs = require('fs');
const path = require('path');

const root = __dirname;
const target = path.join(root, 'desktop', 'app');

const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};
const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const s = path.join(from, name);
    const d = path.join(to, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
};

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

copy(path.join(root, 'index.html'), path.join(target, 'index.html'));
copy(path.join(root, 'sw.js'), path.join(target, 'sw.js'));
copy(path.join(root, 'manifest.json'), path.join(target, 'manifest.json'));
copyDir(path.join(root, 'vendor'), path.join(target, 'vendor'));
copyDir(path.join(root, 'icons'), path.join(target, 'icons'));

console.log('✅ desktop/app 已同步（index.html + sw.js + manifest.json + vendor + icons）');
