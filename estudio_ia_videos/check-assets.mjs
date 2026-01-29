const baseUrl = process.argv[2] || 'https://cursostecno.com.br';

const fetchText = async (url) => {
  const res = await fetch(url);
  return await res.text();
};

const headOrGet = async (url) => {
  const head = await fetch(url, { method: 'HEAD' });
  if (head.ok) return head;
  const get = await fetch(url);
  return get;
};

const normalizePath = (path) => {
  let cleaned = path.replace(/\\+$/, '');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/[)>.,]+$/, '');
  return cleaned;
};

const isCss = (url) => url.includes('.css');
const isJs = (url) => url.includes('.js');
const isValidMime = (url, type) => {
  if (isCss(url)) return type.includes('text/css');
  if (isJs(url)) return type.includes('javascript');
  return true;
};

const main = async () => {
  const html = await fetchText(baseUrl);
  const matches = html.match(/\/_next\/static[^\s"'<>]+/g) || [];
  const unique = Array.from(new Set(matches.map(normalizePath)))
    .filter(Boolean)
    .map((path) => new URL(path, baseUrl).toString());
  if (unique.length === 0) {
    console.log('No assets found');
    process.exit(1);
  }

  let failures = 0;

  for (const url of unique) {
    const res = await headOrGet(url);
    const type = res.headers.get('content-type') || '';
    const status = res.status;
    const ok = status >= 200 && status < 300;
    const mimeOk = ok ? isValidMime(url, type) : false;
    if (!ok || !mimeOk) failures += 1;
    const label = ok ? (mimeOk ? 'OK' : 'MIME_MISMATCH') : 'NOT_FOUND';
    console.log(`${label} ${status} ${type} ${url}`);
  }

  if (failures > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
