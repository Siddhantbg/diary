const express = require('express');

const router = express.Router();

const MODES = new Set(['fix', 'complete', 'suggest']);

const SYSTEM = `You help someone write a private personal diary.
Stay in first person when generating diary text.
Keep the writer's voice, tone, and language (match whatever language they used).
Be concise. Do not add titles, markdown, or meta commentary unless asked.
Never invent shocking private facts; only gently extend what they already wrote.`;

function promptFor(mode, text, title) {
  const titleLine = title?.trim() ? `Entry title: ${title.trim()}\n` : '';
  const body = (text || '').trim();

  if (mode === 'fix') {
    return `${titleLine}Fix spelling, grammar, punctuation, and clarity in this diary entry.
Keep meaning and voice the same. Return ONLY the corrected entry text, nothing else.

---
${body || '(empty)'}`;
  }

  if (mode === 'complete') {
    return `${titleLine}Continue this diary entry naturally from where it left off.
Write 1–3 short sentences the writer might add next.
Return ONLY the continuation text to append (no leading ellipsis, no quotes).

---
${body || '(just started writing)'}`;
  }

  // suggest
  return `${titleLine}Suggest three short ideas for what to write next in this diary entry.
Each idea should be one plain sentence the writer could type.
Return exactly three lines, numbered 1. 2. 3. — no other text.

---
${body || '(blank page)'}`;
}

function parseSuggestions(raw) {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+[\).\:\-]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length >= 3) return lines.slice(0, 3);
  if (lines.length) return lines;
  const chunks = String(raw || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return chunks.slice(0, 3);
}

async function callGemini(apiKey, userPrompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      (res.status === 400
        ? 'Gemini rejected the request'
        : `Gemini error (${res.status})`);
    const err = new Error(msg);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) {
    const err = new Error('Gemini returned empty text');
    err.status = 502;
    throw err;
  }
  return text;
}

/**
 * POST /assist
 * body: { mode: 'fix'|'complete'|'suggest', text: string, title?: string }
 */
router.post('/', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Writing help is not configured (missing GEMINI_API_KEY on server).',
    });
  }

  const mode = String(req.body?.mode || '').toLowerCase();
  if (!MODES.has(mode)) {
    return res.status(400).json({
      error: 'mode must be fix, complete, or suggest',
    });
  }

  const text = String(req.body?.text ?? '');
  const title = String(req.body?.title ?? '');
  if (!text.trim() && mode === 'fix') {
    return res.status(400).json({ error: 'Nothing to fix yet — write something first.' });
  }
  if (text.length > 12000) {
    return res.status(400).json({ error: 'Entry is too long for writing help.' });
  }

  try {
    const raw = await callGemini(apiKey, promptFor(mode, text, title));
    if (mode === 'suggest') {
      return res.json({ mode, suggestions: parseSuggestions(raw), text: raw });
    }
    return res.json({ mode, text: raw });
  } catch (err) {
    console.error('assist:', err.message);
    res.status(err.status || 502).json({ error: err.message || 'Writing help failed' });
  }
});

router.get('/status', (_req, res) => {
  const configured = !!(process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY);
  res.json({
    configured,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  });
});

module.exports = router;
