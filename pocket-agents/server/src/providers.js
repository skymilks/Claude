// Provider abstraction: one `runChat({ modelId, system, userContent, maxTokens })
// -> { text, tokensUsed, modelUsed }` per vendor, all driven by the PLATFORM's
// own server-side keys (users never bring their own). Anthropic is the real,
// always-present path (extracted from claude.js). OpenAI, xAI (Grok), and
// Google (Gemini, via its OpenAI-compatible endpoint) share one OpenAI-style
// client and light up the moment their platform key is set — until then they
// report unavailable so the roster falls back to Claude.
//
// NOTE: this dev sandbox only has the Anthropic key, so the non-Anthropic paths
// ship but are exercised live only in an environment that has those keys.
import Anthropic from '@anthropic-ai/sdk';

const anthropicClient = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const anthropicProvider = {
  available: () => !!anthropicClient,
  async runChat({ modelId, system, userContent, maxTokens }) {
    const response = await anthropicClient.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    });
    if (response.stop_reason === 'refusal') {
      throw new Error('The model declined this request. Try rephrasing the ask.');
    }
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!text) throw new Error('The model returned no text output.');
    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    const tail = response.stop_reason === 'max_tokens'
      ? '\n\n*(Output hit the length limit — re-run with a narrower ask for the rest.)*'
      : '';
    return { text: text + tail, tokensUsed, modelUsed: response.model };
  },
};

// One factory for every OpenAI-compatible vendor (OpenAI, xAI, Google's
// OpenAI-compat endpoint). They differ only by env key + base URL.
function openAICompatible({ envKey, baseURL, label }) {
  return {
    available: () => !!process.env[envKey],
    async runChat({ modelId, system, userContent, maxTokens }) {
      const apiKey = process.env[envKey];
      if (!apiKey) throw new Error(`${label} is not configured (set ${envKey} on the server).`);
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelId,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent },
          ],
        }),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        throw new Error(`${label} API error (${res.status})${detail ? `: ${detail}` : ''}`);
      }
      const data = await res.json();
      const text = (data.choices?.[0]?.message?.content ?? '').trim();
      if (!text) throw new Error(`${label} returned no text output.`);
      return { text, tokensUsed: data.usage?.total_tokens ?? 0, modelUsed: data.model ?? modelId };
    },
  };
}

export const PROVIDERS = {
  anthropic: anthropicProvider,
  openai: openAICompatible({ envKey: 'OPENAI_API_KEY', baseURL: 'https://api.openai.com/v1', label: 'OpenAI' }),
  xai: openAICompatible({ envKey: 'XAI_API_KEY', baseURL: 'https://api.x.ai/v1', label: 'xAI' }),
  google: openAICompatible({ envKey: 'GOOGLE_API_KEY', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', label: 'Google' }),
};

export const providerAvailable = (provider) => PROVIDERS[provider]?.available() ?? false;
