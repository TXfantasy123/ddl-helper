// 构建「纯离线单文件版」：把 vendor 依赖（mammoth / pdf.js / pdf.worker）全部内联进一个 HTML
// 用法：node build-offline.js   → 输出 dist/DDL小管家-离线版.html
const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'dist');
const outFile = path.join(outDir, 'DDL小管家-离线版.html');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mammoth = fs.readFileSync(path.join(root, 'vendor', 'mammoth.browser.min.js'), 'utf8');
const pdfjs = fs.readFileSync(path.join(root, 'vendor', 'pdf.min.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'vendor', 'pdf.worker.min.js'), 'utf8');

// 内联脚本里不能出现 </script
const escapeScript = (s) => s.replace(/<\/script/gi, '<\\/script');

// pdf worker 用 base64 内嵌，运行时转 Blob URL（单文件下没有独立 worker 文件）
const workerB64 = Buffer.from(worker, 'utf8').toString('base64');

const vendorBlock = `
  <!-- ===== 离线单文件版：内联依赖 ===== -->
  <script>${escapeScript(mammoth)}</script>
  <script>${escapeScript(pdfjs)}</script>
  <script>
  (function () {
    try {
      var b64 = "${workerB64}";
      var bin = atob(b64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/javascript' }));
      window.__DDL_PDF_WORKER_URL__ = url;
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = url;
      }
    } catch (e) {
      console.warn('[offline] pdf worker 内联失败，PDF 解析可能不可用：', e);
    }
  })();
  </script>
  <!-- ===== 内联依赖结束 ===== -->
`;

if (!html.includes('</body>')) {
  console.error('未找到 </body>，构建中止');
  process.exit(1);
}

let out = html.replace('</body>', vendorBlock + '\n</body>');

// 标题标注离线版
out = out.replace('<title>DDL 小管家</title>', '<title>DDL 小管家 · 离线版</title>');

// 去掉 PWA manifest / 图标引用（file:// 下无意义）
out = out.replace(/\s*<link rel="manifest"[^>]*>/i, '');
out = out.replace(/\s*<link rel="apple-touch-icon"[^>]*>/i, '');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, out, 'utf8');

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log('✅ 已生成：' + outFile);
console.log('   原始 index.html：' + kb(html.length));
console.log('   内联 mammoth  ：' + kb(mammoth.length));
console.log('   内联 pdf.js   ：' + kb(pdfjs.length));
console.log('   内联 worker   ：' + kb(worker.length) + '（base64 内嵌）');
console.log('   最终文件      ：' + kb(out.length));
