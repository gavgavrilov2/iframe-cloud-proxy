Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const proxyUrl = url.searchParams.get('proxy');
  if (!proxyUrl) return new Response('Usage: ?proxy=URL', { status: 400, headers: cors });
  try {
    const resp = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      redirect: 'follow',
    });
    const ct = resp.headers.get('Content-Type') || 'text/html; charset=utf-8';
    return new Response(resp.body, {
      status: resp.status,
      headers: { ...cors, 'Content-Type': ct },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
});
