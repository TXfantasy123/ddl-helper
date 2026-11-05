// 修正 latest.yml 里的文件名，使其与实际产物一致
// （electron-builder 对含中文的 artifactName 会回退成 ASCII 默认名，导致软件内更新找错文件）
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'release');
const ymlPath = path.join(dir, 'latest.yml');
if (!fs.existsSync(ymlPath)) {
  console.log('[fix-update-yml] 未找到 latest.yml，跳过');
  process.exit(0);
}

const exes = fs
  .readdirSync(dir)
  .filter((f) => /\.exe$/i.test(f) && !/__uninstaller/i.test(f))
  .map((f) => ({ name: f, size: fs.statSync(path.join(dir, f)).size }))
  .sort((a, b) => b.size - a.size);

if (!exes.length) {
  console.log('[fix-update-yml] 未找到 exe，跳过');
  process.exit(0);
}

const target = exes[0].name;
let text = fs.readFileSync(ymlPath, 'utf8');
text = text.replace(/^(\s*- url: ).+$/m, '$1' + target);
text = text.replace(/^path: .+$/m, 'path: ' + target);
fs.writeFileSync(ymlPath, text, 'utf8');
console.log('[fix-update-yml] latest.yml 指向: ' + target);
