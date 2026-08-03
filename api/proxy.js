export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url param' });

  const customReferer = req.query.referer || '';
  const PROXY_BASE = 'https://iframe-cloud-proxy.vercel.app/api/proxy';

  function resolveUrl(segUrl, baseDir) {
    if (segUrl.startsWith('http')) return segUrl;
    return baseDir + segUrl;
  }

  function rewriteUrl(u, baseDir) {
    var full = resolveUrl(u, baseDir);
    var r = PROXY_BASE + '?url=' + encodeURIComponent(full);
    if (customReferer) r += '&referer=' + encodeURIComponent(customReferer);
    return r;
  }

  function buildHeaders(targetUrl) {
    var h = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    };
    if (customReferer) {
      h['Referer'] = customReferer;
    } else if (targetUrl.includes('ortified')) {
      h['Referer'] = 'https://api.ortified.ws/';
    } else if (targetUrl.includes('cinemar.cc')) {
      h['Referer'] = 'https://uakinogo.io/';
    } else if (targetUrl.includes('cinemap.cc')) {
      h['Referer'] = 'https://cinemar.cc/';
      h['Origin'] = 'https://cinemar.cc';
    } else if (targetUrl.includes('interkh.com') || targetUrl.includes('delivembd')) {
      h['Referer'] = 'https://kinokrad.my';
      h['Origin'] = 'https://kinokrad.my';
    }
    return h;
  }

  try {
    var resp = await fetch(url, {
      headers: buildHeaders(url),
      redirect: 'follow'
    });

    const contentType = resp.headers.get('content-type') || '';
    const urlLower = url.split('?')[0].toLowerCase();
    const isM3U8 = urlLower.endsWith('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8');

    if (isM3U8) {
      const text = await resp.text();
      const baseUrl = url.replace(/[?#].*$/, '');
      const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      const lines = text.split('\n');
      const rewritten = [];

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        line = line.replace(/URI="([^"]+)"/gi, function(match, u) {
          return 'URI="' + rewriteUrl(u, baseDir) + '"';
        });

        if (line.trim() && !line.trim().startsWith('#')) {
          let segUrl = line.trim();
          if (!segUrl.startsWith('http')) {
            segUrl = baseDir + segUrl;
          }
          line = PROXY_BASE + '?url=' + encodeURIComponent(segUrl);
          if (customReferer) line += '&referer=' + encodeURIComponent(customReferer);
        }

        rewritten.push(line);
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
