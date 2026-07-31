export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url param' });

  const PROXY_BASE = 'https://iframe-cloud-proxy.vercel.app/api/proxy';

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://api.ortified.ws/'
      },
      redirect: 'follow'
    });

    const contentType = resp.headers.get('content-type') || '';
    const urlLower = url.split('?')[0].toLowerCase();
    const isM3U8 = urlLower.endsWith('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8');

    if (isM3U8) {
      const text = await resp.text();
      const baseUrl = url.replace(/[?#].*$/, '');
      const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      const proxyBase = PROXY_BASE + '?url=';
      const lines = text.split('\n');
      const rewritten = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd();
        if (!line || line.startsWith('#')) {
          rewritten.push(line);
          continue;
        }

        let segUrl = line;
        if (!segUrl.startsWith('http')) {
          segUrl = baseDir + segUrl;
        }

        rewritten.push(proxyBase + encodeURIComponent(segUrl));
      }

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(rewritten.join('\n'));
    } else {
      const arrayBuf = await resp.arrayBuffer();
      const ct = contentType || 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      if (contentType.includes('video') || contentType.includes('octet-stream')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      res.status(resp.status).send(Buffer.from(arrayBuf));
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const config = {
  path: '/api/proxy'
};
