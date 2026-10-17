// Vercel serverless 函数：截图识别代理
// 前端调用：fetch('/api/parse-image', { method:'POST', body: JSON.stringify({ image, baseUrl, visionModel, apiKey }) })

const SYSTEM_PROMPT = `你是校园通知解析助手。请从这张校园通知截图里提取：标题(简短概括事项)、时间、地点、截止日期。只输出JSON，格式：{"title":"","time":"","place":"","deadline":""}，没有的字段留空字符串。不要输出JSON以外的任何内容。`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { image, baseUrl, visionModel, apiKey } = req.body || {};
    if (!image) throw new Error('缺少 image');
    if (!apiKey) throw new Error('缺少 apiKey');
    const result = await callLLM({
      baseUrl,
      model: visionModel || 'deepseek-flash',
      apiKey,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [
          { type: 'text', text: '请解析这张校园通知截图，提取事项/时间/地点/截止日期。' },
          { type: 'image_url', image_url: { url: image } },
        ] },
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
