const DAWAT_SEARCH = 'https://www.dawateislami.net/searchapi';
const OFFICIAL_SEARCH_DOMAINS = ['dawateislami.net', 'dawateislami.org', 'madanichannel.tv'];

const STOP = new Set([
  'کا','کی','کے','کو','سے','میں','پر','اور','یا','ہے','ہیں','تھا','تھی','تھے','ہوں','ہو','کر','کیا','کیسے','کون','کونسا','کونسی',
  'کب','کہاں','کیوں','ایک','یہ','وہ','اس','ان','اپنے','اپنی','اپنا','مجھے','ہمیں','بتائیں','بتائیے','بارے','متعلق','ذرا','کچھ',
  'the','a','an','of','for','to','in','on','about','what','how','is','are','tell','me','please','with','and','or'
]);

const INTENTS = {
  hadith: { q: ['حدیث','احادیث','روایت','فرمان','hadees','hadith'], m: ['حدیث','احادیث','روایت','مروی','ارشاد فرمایا','فرمان','رسول','نبی','الحديث','حديث','قال رسول'] },
  quran: { q: ['قرآن','قرآن','آیت','آیت','سورۃ','سورت','quran'], m: ['قرآن','قرآن','آیت','آیت','سورۃ','سورت','القرآن','الآية'] },
  dua: { q: ['دعا','دعائیں','وظیفہ','wazifa','dua'], m: ['دعا','دعائیں','دعاء','اللهم','رب'] },
  ruling: { q: ['حکم','مسئلہ','فتوی','جائز','ناجائز','حرام','حلال','فرض','واجب','سنت','مکروہ','ruling','fatwa'], m: ['حکم','مسئلہ','فتوی','جائز','ناجائز','حرام','حلال','فرض','واجب','سنت','مکروہ'] },
  virtue: { q: ['فضیلت','ثواب','فائدہ','اہمیت','virtue','reward','importance'], m: ['فضیلت','ثواب','اجر','اہمیت','فضل'] }
};

const URDU_TO_ARABIC = [
  ['والدین','الوالدين'],['ماں باپ','الوالدين'],['والدہ','الأم'],['ماں','الأم'],['والد','الأب'],['باپ','الأب'],
  ['احترام','بر'],['ادب','بر'],['فرمانبرداری','طاعة'],['اطاعت','طاعة'],['نافرمانی','عقوق'],['اولاد','الأولاد'],['بچوں','الأولاد'],
  ['حدیث','حديث'],['احادیث','أحاديث'],['قرآن','القرآن'],['قرآن','القرآن'],['آیت','آية'],['آیت','آية'],['تفسیر','تفسير'],
  ['نماز','الصلاة'],['روزہ','الصيام'],['زکوٰۃ','الزكاة'],['زکوۃ','الزكاة'],['حج','الحج'],['عمرہ','العمرة'],['وضو','الوضوء'],['غسل','الغسل'],
  ['دعا','الدعاء'],['دعائیں','الدعاء'],['درود','الصلاة على النبي'],['قبر','القبر'],['جنازہ','الجنازة'],['غیبت','الغيبة'],['سود','الربا'],
  ['تجارت','البيع'],['خرید و فروخت','البيع'],['سفر','السفر'],['عورت','المرأة'],['خاتون','المرأة'],['مرد','الرجل'],['جمعہ','الجمعة'],
  ['اذان','الأذان'],['جماعت','الجماعة'],['تراویح','التراويح'],['قربانی','الأضحية'],['صدقہ','الصدقة'],['سنت','السنة'],['فرض','الفرض'],
  ['واجب','الواجب'],['فضیلت','فضل'],['ثواب','ثواب'],['حکم','حكم'],['مسئلہ','مسألة'],['فتوی','فتوى'],['نکاح','النكاح'],['طلاق','الطلاق']
];

function normalize(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[يى]/g, 'ی')
    .replace(/ة/g, 'ہ')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokens(value = '') {
  return [...new Set(normalize(value)
    .replace(/[“”"'’‘،,:;؛.!?؟()\[\]{}\/\\|@#$%^&*_+=~`<>-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w))
  )].slice(0, 16);
}

function detectIntents(q) {
  const n = normalize(q);
  return Object.entries(INTENTS).filter(([, v]) => v.q.some(x => n.includes(normalize(x)))).map(([k]) => k);
}

function queryVariants(q) {
  const out = [String(q).trim()];
  const ts = tokens(q);
  if (ts.length) out.push(ts.join(' '));
  if (detectIntents(q).includes('hadith')) out.push([...ts, 'حدیث'].join(' '));
  return [...new Set(out.filter(Boolean))].slice(0, 3);
}

function arabicQuery(q, supplied = '') {
  const given = String(supplied || '').trim();
  if (given && /[\u0600-\u06ff]/.test(given)) return given.slice(0, 200);
  let s = String(q || '')
    .replace(/مکتبہ\s*شاملہ|مکتبہ\s*شاملہ|شاملہ|شاملة|الشاملة|shamela/gi, ' ');
  for (const [ur, ar] of URDU_TO_ARABIC) s = s.split(ur).join(ar);
  let ts = tokens(s).filter(x => !/^(مکتبہ|شاملہ|شاملة|الشاملة|shamela)$/i.test(x));
  if (detectIntents(q).includes('hadith') && !ts.some(x => normalize(x).includes('حديث'))) ts.push('حديث');
  return ts.join(' ').slice(0, 200);
}

function intentBoost(text, intents) {
  const n = normalize(text);
  let score = 0;
  for (const intent of intents) {
    let hits = 0;
    for (const marker of INTENTS[intent].m) if (n.includes(normalize(marker))) hits++;
    score += Math.min(hits, 4) * 9;
  }
  return score;
}

function coverageScore(text, qTokens) {
  const n = normalize(text);
  if (!n || !qTokens.length) return 0;
  let hits = 0;
  const positions = [];
  for (const t of qTokens) {
    const p = n.indexOf(t);
    if (p >= 0) { hits++; positions.push(p); }
  }
  let score = hits * 20 + (hits / qTokens.length) * 60;
  if (positions.length >= 2) {
    const span = Math.max(...positions) - Math.min(...positions);
    if (span < 180) score += 38;
    else if (span < 420) score += 22;
    else if (span < 900) score += 9;
  }
  return score;
}

function makeWindows(text = '') {
  const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const pieces = clean
    .replace(/\s+(سوال\s*[.…:：-]?)/g, '\n$1')
    .replace(/\s+(جواب\s*[.…:：-]?)/g, '\n$1')
    .split(/\n|(?<=[۔!?؟])\s+/)
    .map(x => x.trim()).filter(Boolean);
  const windows = [];
  for (let i = 0; i < pieces.length; i++) {
    let cur = '';
    for (let j = i; j < Math.min(pieces.length, i + 5); j++) {
      cur += (cur ? ' ' : '') + pieces[j];
      if (cur.length >= 220) windows.push(cur.slice(0, 1300));
      if (cur.length >= 1050) break;
    }
  }
  if (!windows.length) for (let i = 0; i < clean.length; i += 650) windows.push(clean.slice(i, i + 1200));
  return windows;
}

function bestSnippet(text, q, heading = '') {
  const qt = tokens(q);
  const intents = detectIntents(q);
  const windows = makeWindows(text);
  let best = { text: String(text || '').slice(0, 1150), score: 0 };
  for (const w of windows) {
    let score = coverageScore(w, qt) + intentBoost(w, intents);
    const nw = normalize(w);
    if (nw.includes('سوال') && nw.includes('جواب')) score += 16;
    if (heading) score += coverageScore(heading, qt) * 0.25;
    if (score > best.score) best = { text: w, score };
  }
  return best;
}

function resultScore(item, q, base = 0) {
  const qt = tokens(q);
  const intents = detectIntents(q);
  const titleHeading = `${item.title || ''} ${item.heading || ''}`;
  const sn = bestSnippet(item.text || item.description || '', q, item.heading || '');
  const score = sn.score + coverageScore(titleHeading, qt) * 0.75 + intentBoost(titleHeading, intents) * 0.45 + base;
  return { ...item, snippet: sn.text, score: Math.round(score * 10) / 10 };
}

function expandQuestion(q, history = []) {
  const current = String(q || '').trim();
  const needsContext = tokens(current).length <= 4 || /(^|\s)(اس|اسے|اسکا|اسکی|اسکے|اس میں|اس کے|اس کی|یہ|وہ|ان|ان کے|ان کی|مزید|اسی|اس بارے)(\s|$)/.test(normalize(current));
  if (!needsContext) return current;
  const prior = [...history].reverse().find(x => x && x.role === 'user' && String(x.text || '').trim());
  if (!prior) return current;
  return `${String(prior.text).trim()} — ${current}`.slice(0, 900);
}

function explicitShamela(q) {
  return /(مکتبہ\s*شاملہ|مکتبہ\s*شاملہ|شاملہ|شاملة|الشاملة|shamela)/i.test(q);
}
function explicitDawat(q) {
  return /(دعوت.?اسلامی|dawat.?e.?islami|مدنی چینل|madani channel|مکتبۃ المدینہ|مکتبہ المدینہ)/i.test(q);
}
function explicitCustom(q) {
  return /(میری\s*(فائل|کتاب|پی\s*ڈی\s*ایف|pdf|ویب\s*سائٹ|سورس)|اپلوڈ|uploaded|attached|my\s*(pdf|file|source|website))/i.test(q);
}
function isOrganizational(q) {
  return /(دعوت.?اسلامی|dawat.?e.?islami|department|شعبہ|مجلس|majlis|shura|شوری|نگران|nigran|مدنی چینل|madani channel|تنظیم|organiz|contact|رابطہ|office|تعارف|بانی|founder|history|تاریخ|مراکز|branches|activities|سرگرم)/i.test(q);
}
function asksForDawatBook(q) {
  return /(کتاب|کتب|رسالہ|مکتبۃ|مکتبہ|book|books|library|کتب خان)/i.test(q);
}

function chooseRoute(q, mode = 'auto') {
  if (['shamela','dawat','custom','all'].includes(mode)) return mode;
  if (explicitShamela(q)) return 'shamela';
  if (explicitCustom(q)) return 'custom';
  if (explicitDawat(q)) return isOrganizational(q) && !asksForDawatBook(q) ? 'dawat-web' : 'dawat';
  return 'all';
}

async function postJson(url, body, timeout = 8500) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'AttariAI/1.1' },
      body: JSON.stringify(body), signal: ctl.signal
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

function bodyFor(keyword, language = 'ur', ps = 28) {
  return { keyword, language, bookIds: [], categories: [], inPageSearch: 0, month: '', pn: 1, ps, writer: null };
}

function fromContentHit(hit) {
  const s = hit?._source || {};
  return {
    sourceGroup: 'dawat-library-content',
    title: s.native_name || s.title || s.roman_name || 'Dawat-e-Islami Books Library',
    heading: s.heading || '',
    page: s.page_number || null,
    url: s.link || (s.book_in_lang_id && s.page_number ? `https://www.dawateislami.net/bookslibrary/${s.book_in_lang_id}/page/${s.page_number}` : ''),
    text: s.text_page || s.search_text || '',
    description: s.description || '',
    language: s.language_code || s.language || '',
    rawScore: Number(hit?._score || 0)
  };
}

function fromBookHit(hit) {
  const s = hit?._source || {};
  return {
    sourceGroup: 'dawat-library-book',
    title: s.native_name || s.title || s.roman_name || 'Dawat-e-Islami Book',
    heading: s.category_name || '',
    page: null,
    url: s.roman_url ? `https://www.dawateislami.net/bookslibrary/${s.language_code || 'ur'}/${s.roman_url}` : '',
    text: s.description || '',
    description: s.description || '',
    language: s.language_code || s.language || '',
    rawScore: Number(hit?._score || 0)
  };
}

async function searchDawatLibrary(q) {
  const variants = queryVariants(q);
  const lang = /[\u0600-\u06ff]/.test(q) ? 'ur' : '';
  const jobs = [];
  for (const v of variants.slice(0, 2)) jobs.push(postJson(`${DAWAT_SEARCH}/book-library/search-content`, bodyFor(v, lang, 32)));
  jobs.push(postJson(`${DAWAT_SEARCH}/book-library/search`, bodyFor(variants[0], lang, 16)));
  const responses = await Promise.all(jobs);
  const out = [];
  for (let i = 0; i < responses.length; i++) {
    const data = responses[i];
    const hits = Array.isArray(data?.hits) ? data.hits : (Array.isArray(data?.hits?.hits) ? data.hits.hits : []);
    for (const h of hits) out.push(i === responses.length - 1 ? fromBookHit(h) : fromContentHit(h));
  }
  return out;
}

function decodeXml(s = '') {
  return s.replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function rssItems(xml = '', group = '') {
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    const grab = tag => decodeXml((b.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [])[1] || '');
    const title = grab('title'), url = grab('link'), description = grab('description');
    if (url) out.push({ sourceGroup: group, title, url, description, text: description, heading: '', page: null });
  }
  return out;
}

async function bingRss(query, group) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6500);
  try {
    const r = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, {
      headers: { 'user-agent': 'Mozilla/5.0 AttariAI' }, signal: ctl.signal
    });
    if (!r.ok) return [];
    return rssItems(await r.text(), group);
  } catch { return []; }
  finally { clearTimeout(timer); }
}

function cleanHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function isOfficialUrl(url) {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return OFFICIAL_SEARCH_DOMAINS.some(d => h === d || h.endsWith('.' + d));
  } catch { return false; }
}

function isPrivateHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const p = h.split('.').map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0 || p[0] >= 224) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  }
  return false;
}

function safeWebUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    if (!['http:', 'https:'].includes(u.protocol) || isPrivateHost(u.hostname)) return null;
    u.hash = '';
    return u.toString();
  } catch { return null; }
}

async function fetchReadable(item, group, timeout = 6500) {
  if (!item?.url) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(item.url, { headers: { 'user-agent': 'Mozilla/5.0 AttariAI' }, redirect: 'follow', signal: ctl.signal });
    if (!r.ok) return { ...item, sourceGroup: group };
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return { ...item, sourceGroup: group, contentType: ct };
    const text = cleanHtml(await r.text()).slice(0, 18000);
    return { ...item, sourceGroup: group, text: text || item.description || '' };
  } catch { return { ...item, sourceGroup: group }; }
  finally { clearTimeout(timer); }
}

async function searchOfficialWeb(q) {
  const concise = tokens(q).slice(0, 9).join(' ') || q;
  const rss = await Promise.all(OFFICIAL_SEARCH_DOMAINS.map(d => bingRss(`site:${d} ${concise}`, `dawat-web:${d}`)));
  const candidates = [];
  for (const list of rss) for (const x of list) {
    if (!isOfficialUrl(x.url) || /\/bookslibrary\//i.test(x.url)) continue;
    if (!candidates.some(y => y.url === x.url)) candidates.push(x);
  }
  if (explicitDawat(q)) {
    for (const url of ['https://www.dawateislami.net/', 'https://www.dawateislami.org/']) {
      if (!candidates.some(y => y.url === url)) candidates.push({ sourceGroup: 'dawat-web', title: 'Dawat-e-Islami Official Website', url, text: '', description: '' });
    }
  }
  const prelim = candidates.map(x => resultScore(x, q)).sort((a, b) => b.score - a.score).slice(0, 7);
  const enriched = await Promise.all(prelim.slice(0, 5).map(x => fetchReadable(x, x.sourceGroup)));
  return enriched.filter(Boolean);
}

async function searchShamela(q, suppliedArabic) {
  const aq = arabicQuery(q, suppliedArabic);
  const original = tokens(String(q).replace(/مکتبہ\s*شاملہ|مکتبہ\s*شاملہ|شاملہ|شاملة|الشاملة|shamela/gi, ' ')).slice(0, 8).join(' ');
  if (!aq && !original) return { query: '', results: [] };
  const searches = await Promise.all([
    aq ? bingRss(`site:shamela.ws/book ${aq}`, 'shamela') : Promise.resolve([]),
    aq ? bingRss(`site:shamela.ws ${aq}`, 'shamela') : Promise.resolve([]),
    original ? bingRss(`site:shamela.ws/book ${original}`, 'shamela') : Promise.resolve([])
  ]);
  const out = [];
  for (const list of searches) for (const x of list) {
    try {
      const h = new URL(x.url).hostname.replace(/^www\./, '');
      if (h !== 'shamela.ws' && !h.endsWith('.shamela.ws')) continue;
    } catch { continue; }
    if (!out.some(y => y.url === x.url)) out.push(x);
  }
  const prelim = out.map(x => resultScore(x, q)).sort((a, b) => b.score - a.score).slice(0, 7);
  const enriched = await Promise.all(prelim.slice(0, 5).map(x => fetchReadable(x, 'shamela', 7000)));
  return { query: aq || original, results: enriched.filter(Boolean) };
}

async function searchCustomUrls(q, rawUrls = []) {
  const urls = [...new Set((Array.isArray(rawUrls) ? rawUrls : []).map(safeWebUrl).filter(Boolean))].slice(0, 8);
  const fetched = await Promise.all(urls.map(url => fetchReadable({ sourceGroup: 'custom-web', title: new URL(url).hostname, url, text: '', description: '' }, 'custom-web', 7000)));
  return fetched.filter(Boolean).map(x => ({ ...x, title: x.title || new URL(x.url).hostname }));
}

function dedupeRank(items, q) {
  const map = new Map();
  for (const item of items) {
    if (!item) continue;
    const key = item.url || `${item.title}|${item.page || ''}|${normalize(item.snippet || item.text || '').slice(0, 140)}`;
    const ranked = resultScore(item, q, Math.log1p(Math.max(0, item.rawScore || 0)) * 3);
    const prev = map.get(key);
    if (!prev || ranked.score > prev.score) map.set(key, ranked);
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const q = String(req.body?.q || '').trim().slice(0, 600);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  const sourceMode = String(req.body?.sourceMode || 'auto');
  const customUrls = Array.isArray(req.body?.customUrls) ? req.body.customUrls : [];
  const suppliedArabic = String(req.body?.arabicQuery || '').trim().slice(0, 200);
  if (!q) return res.status(400).json({ error: 'Please enter a question.' });

  const expandedQ = expandQuestion(q, history);
  const route = chooseRoute(q, sourceMode);
  const wantLibrary = route === 'all' || route === 'dawat';
  const wantWeb = route === 'all' || route === 'dawat' || route === 'dawat-web';
  const wantShamela = route === 'all' || route === 'shamela';
  const wantCustom = route === 'all' || route === 'custom';

  const [library, web, shamela, custom] = await Promise.all([
    wantLibrary ? searchDawatLibrary(expandedQ) : Promise.resolve([]),
    wantWeb ? searchOfficialWeb(expandedQ) : Promise.resolve([]),
    wantShamela ? searchShamela(expandedQ, suppliedArabic) : Promise.resolve({ query: '', results: [] }),
    wantCustom ? searchCustomUrls(expandedQ, customUrls) : Promise.resolve([])
  ]);

  let pool = [];
  if (route === 'shamela') pool = shamela.results;
  else if (route === 'dawat-web') pool = web;
  else if (route === 'dawat') pool = [...library, ...web];
  else if (route === 'custom') pool = custom;
  else pool = [...library, ...web, ...shamela.results, ...custom];

  const ranked = dedupeRank(pool, expandedQ);
  const meaningful = ranked.filter(x => x.score >= 28 || (x.text || x.description || '').length >= 80);
  const results = (meaningful.length ? meaningful : ranked).slice(0, 8);

  return res.status(200).json({
    results,
    count: results.length,
    route,
    expandedQuestion: expandedQ,
    shamelaQuery: shamela.query,
    source: 'Sources are selected from the user question and Settings; no fixed Dawat-e-Islami priority.'
  });
}