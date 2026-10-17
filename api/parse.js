// Vercel serverless 函数：文字解析代理
// 前端调用：fetch('/api/parse', { method:'POST', body: JSON.stringify({ text, baseUrl, model, apiKey }) })
// 不硬编码任何 key，全部由前端传入。

const SYSTEM_PROMPT = `你是校园通知解析助手。用户会提供一条或多条校园通知，请把每一条通知分别解析，提取：标题(简短概括事项，如'创业项目入驻申报')、时间、地点、截止日期。只输出JSON数组，格式：[{"title":"","time":"","place":"","deadline":""}]，每条通知对应数组里的一个对象，没有的字段留空字符串。只有一条通知时也输出长度为1的数组。不要输出JSON以外的任何内容。`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { text, baseUrl, model, apiKey } = req.body || {};
    if (!text) throw new Error('缺少 text');
    if (!apiKey) throw new Error('缺少 apiKey');
    const result = await callLLM({
      baseUrl,
      model: model || 'deepseek-flash',
      apiKey,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function callLLM({ baseUrl, model, apiKey, messages }) {
  const url = (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0 }),
  });
  if (!resp.ok) {
    throw new Error('upstream ' + resp.status + ' ' + (await resp.text().catch(() => '')));
  }
  const data = await resp.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('API 返回内容为空');
  try {
    return JSON.parse(content);
  } catch (e) {
    return JSON.parse(String(content).replace(/```json|```/g, '').trim());
  }
}
