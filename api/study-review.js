const rateBuckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_BODY_BYTES = 64_000;

const SHARED_SUPABASE_URL = 'https://asgwpmsuutigtvaxuxmr.supabase.co';
const SHARED_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fi3mpoY8ZrymYbnxdpREYw_hnUmTYxG';

function jsonSize(value) {
  try { return new TextEncoder().encode(JSON.stringify(value)).length; } catch { return Infinity; }
}

function getClientAddress(req) {
  return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
}

async function authenticateRequest(req) {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return null;
  const accessToken = authorization.slice(7).trim();
  if (!accessToken) return null;
  try {
    const response = await fetch(`${SHARED_SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SHARED_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

function allowRateLimit(userId, ip) {
  const now = Date.now();
  const key = `${userId}:${ip}`;
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function cleanupRateBuckets() {
  if (rateBuckets.size < 500) return;
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, bucket] of rateBuckets) if (bucket.startedAt < cutoff) rateBuckets.delete(key);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  cleanupRateBuckets();
  const user = await authenticateRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const ip = getClientAddress(req);
  if (!allowRateLimit(user.id, ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'AI request limit reached. Try again in a minute.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY is not configured' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (jsonSize(body) > MAX_BODY_BYTES) return res.status(413).json({ error: 'Request payload is too large' });

  const { phase = 'questions', payload, answers = null } = body;
  if (phase !== 'questions' && phase !== 'decision') return res.status(400).json({ error: 'Invalid phase' });
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'payload is required' });

  const model = 'gemini-3.6-flash';
  const schema = phase === 'decision'
    ? { type: 'object', properties: { decision: { type: 'object', properties: { priority: { type: 'string' }, reason: { type: 'string' }, nextReview: { type: 'string' }, recommendedMinutes: { type: 'number' }, focus: { type: 'string' } }, required: ['priority','reason','nextReview','recommendedMinutes','focus'] } }, required: ['decision'] }
    : { type: 'object', properties: { summary: { type: 'string' }, strengths: { type: 'string' }, weakArea: { type: 'string' }, nextReview: { type: 'string' }, questions: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } }, required: ['id','text','options'] } } }, required: ['summary','strengths','weakArea','nextReview','questions'] };
  const phaseInstruction = phase === 'decision'
    ? 'Make one clear next-study decision from the activity and the user answers. Do not invent facts. Include priority, reason, next-review timing, a realistic session length in minutes, and the focus area.'
    : 'Analyze the completed study cycle and today’s activity. Generate exactly three meaningful check-in questions based on what the user actually did. Do not repeat generic questions unnecessarily.';
  const systemInstruction = ['You are the study-intelligence layer inside an existing learning app.', phaseInstruction, 'Use only supplied app data.', 'Do not invent facts.', 'Do not teach a lesson.', 'Do not request information already present.', 'Keep the output concise, specific, and practical.'].join(' ');
  const userInput = JSON.stringify({ userId: user.id, activity: payload, userAnswers: answers });

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ model, input: userInput, system_instruction: systemInstruction, response_format: { type: 'text', mime_type: 'application/json', schema }, generation_config: { thinking_level: 'high', max_output_tokens: 2000 }, store: false }),
    });
    const raw = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: raw.slice(0, 1500) });
    let data;
    try { data = JSON.parse(raw); } catch { return res.status(502).json({ error: 'Gemini returned invalid API JSON', raw: raw.slice(0, 1500) }); }
    let outputText = typeof data?.output_text === 'string' ? data.output_text.trim() : '';
    if (!outputText && Array.isArray(data?.steps)) outputText = data.steps.filter((step) => step?.type === 'model_output').flatMap((step) => Array.isArray(step?.content) ? step.content : []).filter((content) => content?.type === 'text').map((content) => content.text || '').join('').trim();
    if (!outputText && Array.isArray(data?.outputs)) outputText = data.outputs.filter((output) => output?.type === 'text').map((output) => output.text || '').join('').trim();
    if (!outputText) return res.status(502).json({ error: 'Gemini returned no text' });
    try { return res.status(200).json(JSON.parse(outputText)); } catch { return res.status(502).json({ error: 'Gemini returned invalid structured JSON', raw: outputText.slice(0, 1500) }); }
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Gemini study review failed' });
  }
}
