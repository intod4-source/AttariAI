import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5';

const instructions = `آپ AttariAI ہیں۔ صارف کے دینی سوال کا جواب دیتے وقت web search صرف shamela.ws پر کریں۔ اپنی طرف سے کتاب، مصنف، جلد، صفحہ، حدیث نمبر یا اقتباس نہ بنائیں۔ اگر واضح حوالہ نہ ملے تو صاف بتائیں۔ جواب آسان اردو میں دیں، اور جہاں ممکن ہو اصل عربی عبارت اور Shamela کا لنک دیں۔`;

const page = `<!doctype html><html lang="ur" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AttariAI</title><style>body{font-family:system-ui;background:#f5f5f5;margin:0;padding:25px}.box{max-width:800px;margin:40px auto;background:white;padding:25px;border-radius:16px}textarea{width:100%;box-sizing:border-box;min-height:120px;font-size:18px;padding:12px}button{margin-top:12px;padding:12px 22px;font-size:16px}#a{white-space:pre-wrap;line-height:1.8;margin-top:20px}</style></head><body><main class="box"><h1>AttariAI</h1><p>مکتبہ شاملہ سے حوالوں کے ساتھ سوال پوچھیں</p><textarea id="q" placeholder="اپنا سوال لکھیں"></textarea><br><button id="b">پوچھیں</button><div id="a"></div></main><script>document.getElementById('b').onclick=async()=>{const q=document.getElementById('q').value.trim();if(!q)return;const a=document.getElementById('a');a.textContent='تلاش ہو رہی ہے...';try{const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})});const d=await r.json();a.textContent=d.answer||d.error||'جواب نہیں ملا';}catch(e){a.textContent='کچھ مسئلہ پیش آیا';}};</script></body></html>`;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function ask(question) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY_NOT_SET');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      instructions,
      input: question,
      tools: [{ type: 'web_search', filters: { allowed_domains: ['shamela.ws'] }, search_context_size: 'high' }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'OpenAI request failed');
  const text = [];
  for (const item of data.output || []) {
    if (item.type !== 'message') continue;
    for (const part of item.content || []) if (part.type === 'output_text' && part.text) text.push(part.text);
  }
  return text.join('\n\n').trim();
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page);
  }
  if (req.method === 'GET' && req.url === '/health') return sendJson(res, 200, { ok: true, source: 'shamela.ws', keyConfigured: Boolean(OPENAI_API_KEY) });
  if (req.method === 'POST' && req.url === '/api/ask') {
    try {
      const body = await readBody(req);
      const question = String(body.question || '').trim();
      if (!question) return sendJson(res, 400, { error: 'سوال لکھیں۔' });
      return sendJson(res, 200, { answer: await ask(question) });
    } catch (e) {
      const message = e.message === 'OPENAI_API_KEY_NOT_SET' ? 'Server پر OpenAI API key ابھی set نہیں ہے۔' : (e.message || 'کچھ مسئلہ پیش آیا۔');
      return sendJson(res, 500, { error: message });
    }
  }
  res.writeHead(404).end('Not found');
});

server.listen(PORT, () => console.log(`AttariAI running on port ${PORT}`));
