// DDL 小管家 · 本地后端（逻辑与 Vercel api/ 目录一致，便于本地测试）
// 用法：node server.js   （默认 3000 端口）
//   GET  /                    → 托管 index.html
//   POST /api/parse           → 文字解析代理（body: {text, baseUrl, model, apiKey}）
//   POST /api/parse-image     → 截图识别代理（body: {image, baseUrl, visionModel, apiKey, mode?}；mode='ocr' 返回 {text}）
//   POST /parse               → 旧接口（用内置默认 key，兼容）

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const TEXT_SYSTEM_PROMPT = `你是校园通知解析助手。用户会提供一条或多条校园通知，请把每一条通知分别解析，提取：标题(简短概括事项，如'创业项目入驻申报')、时间、地点、截止日期。只输出JSON数组，格式：[{"title":"","time":"","place":"","deadline":""}]，每条通知对应数组里的一个对象，没有的字段留空字符串。只有一条通知时也输出长度为1的数组。不要输出JSON以外的任何内容。`;
// v1.5.3：截图识别改为两步法 —— 第一步逐字 OCR 转写，第二步交给前端文字解析链
const OCR_SYSTEM_PROMPT = `你是校园通知图片转写助手。请逐字原样转写图片里出现的所有文字，要求：
1. 不总结、不翻译、不改写，保留原始数字、时间、标点符号和换行；
2. 忽略手机状态栏、时间、电量、聊天头像/昵称/群名/时间戳等界面元素；
3. 如果图片里有多条通知，用空行分隔；
4. 只输出转写出来的文字本身，不要输出任何解释、标题或代码块。`;
// v1.5.3：旧版一次性 JSON 提取（OCR 失败时的回退路径），prompt 同步升级
const IMAGE_SYSTEM_PROMPT = `你是校园通知解析助手。请从这张（或这些）校园通知截图里提取事项，只输出JSON数组，不要输出JSON以外的任何内容。数组每一项格式：{"title":"","time":"","place":"","deadline":""}，没有的字段留空字符串；一张图里有多条通知时输出多个对象。
要求：
1. 时间、截止日期统一输出 "YYYY-MM-DD HH:MM"（24小时制）；时间段输出 "YYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM"；缺年份时补当前年份。
2. 中文数字时间必须转成阿拉伯数字，并按上午/下午/晚上/中午/凌晨换算成24小时制：晚上十一点二十一→23:21，下午三点→15:00，上午九点→09:00，中午十二点→12:00。
3. 截止日期优先读取「截止」「截止时间」「报名时间」「缴费截止」「报名截止」后面的日期和时间。
4. title 必须简短具体；确实无法提炼时用正文首句前20字概括，不要输出空标题或"待办事项"。`;

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
  //    mode='ocr' → 逐字转写，返回 { text }（纯文本，不强制 json_object）
  //    不带 mode  → 旧行为：直接 JSON 提取（prompt 已升级，支持多条，返回数组）
  if (req.method === 'POST' && req.url === '/api/parse-image') {
    readBody(req).then(body => {
      const { image, baseUrl, visionModel, apiKey, mode } = body || {};
      if (!image) return json(res, 400, { error: '缺少 image' });
      if (!apiKey) return json(res, 400, { error: '缺少 apiKey' });
      const isOcr = mode === 'ocr';
      callLLM({
        baseUrl, model: visionModel || 'deepseek-flash', apiKey,
        jsonMode: false,
        messages: [
          { role: 'system', content: isOcr ? OCR_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: isOcr ? '请逐字转写这张图片里的所有文字，只输出转写文字。' : '请解析这张校园通知截图里的所有事项，按 JSON 数组输出。' },
            { type: 'image_url', image_url: { url: image } },
          ] },
        ],
      }).then(content => {
        if (isOcr) return json(res, 200, { text: cleanPlainText(content) });
        return json(res, 200, parseJsonLoose(content));
      }).catch(e => json(res, 500, { error: e.message }));
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

// 清洗 OCR 返回的纯文本（去掉可能包裹的代码块标记）
function cleanPlainText(content) {
  return String(content || '')
    .replace(/^```[^\n]*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

// 宽松 JSON 解析：兼容代码块、数组、单个对象（旧版截图直接提取的回退路径）
function parseJsonLoose(content) {
  const s = String(content || '').trim();
  const cleaned = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(cleaned); } catch (e) { /* 继续尝试 */ }
  const arr = cleaned.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch (e) { /* 继续尝试 */ } }
  const obj = cleaned.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch (e) { /* 继续尝试 */ } }
  throw new Error('AI 返回内容不是合法 JSON');
}

// jsonMode=false 时不传 response_format，直接返回模型原始文本（OCR 场景）
async function callLLM({ baseUrl, model, apiKey, messages, jsonMode = true }) {
  const url = (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
  const payload = { model, messages, temperature: 0 };
  if (jsonMode) payload.response_format = { type: 'json_object' };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error('upstream ' + resp.status + ' ' + errText);
  }
  const data = await resp.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('API 返回内容为空');
  if (!jsonMode) return content;
  try { return JSON.parse(content); }
  catch (e) { return JSON.parse(String(content).replace(/```json|```/g, '').trim()); }
}

server.listen(PORT, () => {
  console.log('DDL 小管家已启动：');
  console.log('  页面：http://localhost:' + PORT + '/');
  console.log('  文字解析：http://localhost:' + PORT + '/api/parse');
  console.log('  截图识别：http://localhost:' + PORT + '/api/parse-image');
});
