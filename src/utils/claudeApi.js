// ─── Local Claude API helper ──────────────────────────────────────
// Routes via Vite proxy → https://api.anthropic.com/v1/messages
// This sidesteps the browser CORS block on direct API calls.
//
// SETUP: Add your free Anthropic API key to danos/.env.local
//   VITE_ANTHROPIC_KEY=sk-ant-...
// Get one at https://console.anthropic.com (free tier available)
// Then restart: npm run dev

const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''

export async function claudeMessage(prompt, systemPrompt = '', maxTokens = 1000) {
  if (!API_KEY) throw new Error('NO_KEY')

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
    ...(systemPrompt ? { system: systemPrompt } : {}),
  }
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}
