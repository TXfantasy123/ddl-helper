// Vercel serverless 函数：截图识别代理（v1.5.3 两步法）
// 前端调用：
//   OCR 转写：fetch('/api/parse-image', { method:'POST', body: JSON.stringify({ image, baseUrl, visionModel, apiKey, mode:'ocr' }) }) → { text }
//   旧版直读：fetch('/api/parse-image', { method:'POST', body: JSON.stringify({ image, baseUrl, visionModel, apiKey }) }) → JSON 数组/对象

// 第一步：逐字 OCR 转写（纯文本，不强制 json_object）
const OCR_SYSTEM_PROMPT = `你是校园通知图片转写助手。请逐字原样转写图片里出现的所有文字，要求：
1. 不总结、不翻译、不改写，保留原始数字、时间、标点符号和换行；
2. 忽略手机状态栏、时间、电量、聊天头像/昵称/群名/时间戳等界面元素；
3. 如果图片里有多条通知，用空行分隔；
4. 只输出转写出来的文字本身，不要输出任何解释、标题或代码块。`;

// 回退路径：旧版一次性 JSON 提取，prompt 同步升级（支持多条、24 小时制、中文数字）
const IMAGE_SYSTEM_PROMPT = `你是校园通知解析助手。请从这张（或这些）校园通知截图里提取事项，只输出JSON数组，不要输出JSON以外的任何内容。数组每一项格式：{"title":"","time":"","place":"","deadline":""}，没有的字段留空字符串；一张图里有多条通知时输出多个对象。
要求：
1. 时间、截止日期统一输出 "YYYY-MM-DD HH:MM"（24小时制）；时间段输出 "YYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM"；缺年份时补当前年份。
2. 中文数字时间必须转成阿拉伯数字，并按上午/下午/晚上/中午/凌晨换算成24小时制：晚上十一点二十一→23:21，下午三点→15:00，上午九点→09:00，中午十二点→12:00。
3. 截止日期优先读取「截止」「截止时间」「报名时间」「缴费截止」「报名截止」后面的日期和时间。
4. title 必须简短具体；确实无法提炼时用正文首句前20字概括，不要输出空标题或"待办事项"。`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { image, baseUrl, visionModel, apiKey, mode } = req.body || {};
    if (!image) throw new Error('缺少 image');
    if (!apiKey) throw new Error('缺少 apiKey');
    const isOcr = mode === 'ocr';
    const content = await callLLM({
      baseUrl,
      model: visionModel || 'deepseek-flash',
      apiKey,
      jsonMode: false, // 不再强制 response_format: json_object
      messages: [
        { role: 'system', content: isOcr ? OCR_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT },
        { role: 'user', content: [
          { type: 'text', text: isOcr ? '请逐字转写这张图片里的所有文字，只输出转写文字。' : '请解析这张校园通知截图里的所有事项，按 JSON 数组输出。' },
          { type: 'image_url', image_url: { url: image } },
        ] },
      ],
    });
    if (isOcr) {
      res.status(200).json({ text: cleanPlainText(content) });
      return;
    }
    res.status(200).json(parseJsonLoose(content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// 清洗 OCR 返回的纯文本（去掉可能包裹的代码块标记）
function cleanPlainText(content) {
  return String(content || '')
    .replace(/^```[^\n]*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

// 宽松 JSON 解析：兼容代码块、数组、单个对象
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

// jsonMode=false 时返回模型原始文本（OCR 场景）
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
    throw new Error('upstream ' + resp.status + ' ' + (await resp.text().catch(() => '')));
  }
  const data = await resp.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('API 返回内容为空');
  if (!jsonMode) return content;
  try {
    return JSON.parse(content);
  } catch (e) {
    return JSON.parse(String(content).replace(/```json|```/g, '').trim());
  }
}
