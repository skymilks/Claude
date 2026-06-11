// Fetch a prospect's public website and condense it to plain text for the
// drafting prompt — so the drafted office references their real services,
// city, and customers instead of guessing. Only reachable from the founder's
// admin route.

const BLOCKED_HOST = /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1)/i;

export async function fetchSiteText(rawUrl) {
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new Error(`"${rawUrl}" doesn't look like a website address.`);
  }
  if (!/^https?:$/.test(url.protocol) || BLOCKED_HOST.test(url.hostname)) {
    throw new Error('That address can’t be fetched.');
  }
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PocketAgents/1.0; +https://pocketagents.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch {
    throw new Error(`Couldn't reach ${url.hostname} — check the address (or leave it blank and rely on your description).`);
  }
  if (!res.ok) throw new Error(`${url.hostname} answered ${res.status} — double-check the address.`);

  const html = (await res.text()).slice(0, 600_000);
  const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{10,400})/i)?.[1];
  const text = htmlToText(html);
  if (text.length < 80) throw new Error(`${url.hostname} loaded but had almost no readable text (it may be script-rendered). Describe the business instead.`);
  return ((metaDescription ? metaDescription + '\n' : '') + text).slice(0, 7000);
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}
