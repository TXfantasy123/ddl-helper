// 从根目录 server.js 生成 Electron 用的内嵌服务端（随机端口 + 不自动退出）
const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

let out = src;

// 1) 端口改为随机（0 = 系统分配）
out = out.replace('const PORT = 3000;', 'const PORT = 0;');

// 2) 去掉「页面关闭后自动退出」逻辑（桌面应用里页面关闭不应杀服务）
out = out.replace(/const KEEP_ALIVE[\s\S]*?let pendingExitAt = 0;/, '');
out = out.replace(/  \/\/ 0\) 页面关闭通知[\s\S]*?  pendingExitAt = 0;\n\n/, '');
out = out.replace(/\/\/ 页面关闭后延迟退出[\s\S]*?\}, 5000\)\.unref\(\);/, '');

// 3) 静态目录改为桌面版 app/ 目录
out = out.replace("const path = require('path');", "const path = require('path');\nconst APP_DIR = path.join(__dirname, 'app');");
out = out.replace(/__dirname/g, 'APP_DIR');

// 4) 替换 listen 段为可导出的 startServer
out = out.replace(/server\.listen\(PORT, \(\) => \{[\s\S]*?\}\);/, `
function startServer(port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port || 0, '127.0.0.1', () => {
      const p = server.address().port;
      resolve(p);
    });
  });
}
module.exports = { startServer };
`);

// 5) 日志文案
out = out.replace(/console\.log\('DDL 小管家已启动：'\);[\s\S]*?\}\);/g, '');

const outFile = path.join(root, 'desktop', 'server-core.js');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out, 'utf8');
console.log('✅ 生成 desktop/server-core.js (' + out.length + ' 字符)');
