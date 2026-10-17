// DDL 小管家 · 本地后端（逻辑与 Vercel api/ 目录一致，便于本地测试）
// 用法：node server.js   （默认 3000 端口）
//   GET  /                    → 托管 index.html
//   POST /api/parse           → 文字解析代理（body: {text, baseUrl, model, apiKey}）
//   POST /api/parse-image     → 截图识别代理（body: {image, baseUrl, visionModel, apiKey}）
//   POST /parse               → 旧接口（用内置默认 key，兼容）

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const TEXT_SYSTEM_PROMPT = `你是校园通知解析助手。用户会提供一条或多条校园通知，请把每一条通知分别解析，提取：标题(简短概括事项，如'创业项目入驻申报')、时间、地点、截止日期。只输出JSON数组，格式：[{"title":"","time":"","place":"","deadline":""}]，每条通知对应数组里的一个对象，没有的字段留空字符串。只有一条通知时也输出长度为1的数组。不要输出JSON以外的任何内容。`;
const IMAGE_SYSTEM_PROMPT = `你是校园通知解析助手。请从这张校园通知截图里提取：标题(简短概括事项)、时间、地点、截止日期。只输出JSON，格式：{"title":"","time":"","place":"","deadline":""}，没有的字段留空字符串。不要输出JSON以外的任何内容。`;

const server = http.createServer((req, res) => {
  // 1) GET / → 托管同目录 index.html
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('index.html 读取失败：' + e.message);
    }
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // 2) POST /api/parse（文字解析，key 由前端传入）
  if (req.method === 'POST' && req.url === '/api/parse') {
    readBody(req).then(body => {
      const { text, baseUrl, model, apiKey } = body || {};
      if (!text) return json(res, 400, { error: '缺少 text' });
      if (!apiKey) return json(res, 400, { error: '缺少 apiKey' });
      callLLM({
        baseUrl, model: model || 'deepseek-flash', apiKey,
        messages: [
          { role: 'system', content: TEXT_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }).then(r => json(res, 200, r)).catch(e => json(res, 500, { error: e.message }));
    }).catch(e => json(res, 400, { error: e.message }));
    return;
  }

  // 3) POST /api/parse-image（截图识别）
  if (req.method === 'POST' && req.url === '/api/parse-image') {
    readBody(req).then(body => {
      const { image, baseUrl, visionModel, apiKey } = body || {};
      if (!image) return json(res, 400, { error: '缺少 image' });
      if (!apiKey) return json(res, 400, { error: '缺少 apiKey' });
      callLLM({
        baseUrl, model: visionModel || 'deepseek-flash', apiKey,
        messages: [
          { role: 'system', content: IMAGE_SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: '请解析这张校园通知截图，提取事项/时间/地点/截止日期。' },
            { type: 'image_url', image_url: { url: image } },
          ] },
        ],
      }).then(r => json(res, 200, r)).catch(e => json(res, 500, { error: e.message }));
    }).catch(e => json(res, 400, { error: e.message }));
    return;
  }

  // 4) POST /parse（旧接口，兼容旧调用；key 由前端传入，不硬编码）
  if (req.method === 'POST' && req.url === '/parse') {
    readBody(req).then(body => {
      const { text, apiKey } = body || {};
      if (!text) return json(res, 400, { error: '缺少 text 字段' });
      if (!apiKey) return json(res, 400, { error: '缺少 apiKey' });
      callLLM({
        baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', apiKey,
        messages: [
          { role: 'system', content: TEXT_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }).then(r => json(res, 200, r)).catch(e => json(res, 500, { error: e.message }));
    }).catch(e => json(res, 400, { error: e.message }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(new Error('JSON 解析失败')); }
    });
    req.on('error', reject);
  });
}

async function callLLM({ baseUrl, model, apiKey, messages }) {
  const url = (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0 }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error('upstream ' + resp.status + ' ' + errText);
  }
  const data = await resp.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('API 返回内容为空');
  try { return JSON.parse(content); }
  catch (e) { return JSON.parse(String(content).replace(/```json|```/g, '').trim()); }
}

server.listen(PORT, () => {
  console.log('DDL 小管家已启动：');
  console.log('  页面：http://localhost:' + PORT + '/');
  console.log('  文字解析：http://localhost:' + PORT + '/api/parse');
  console.log('  截图识别：http://localhost:' + PORT + '/api/parse-image');
});
