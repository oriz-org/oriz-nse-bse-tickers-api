// oriz-nse-bse-tickers-api scrape — ToS-conservative posture.
// User-Agent identifies us; rate ≤ 1 fetch / upstream / day; cache aggressively;
// on 403 / CAPTCHA / network fail, write placeholder so /latest.json stays valid.
import { writeFileSync, mkdirSync } from 'node:fs';
import { load } from 'cheerio';

const today = new Date().toISOString().slice(0, 10);
const UA = "oriz-api-bot/0.1 (+https://oriz.in/about; contact: privacy@oriz.in)";
const placeholder = {"source":"placeholder","indices":[]};
const seed = {"source":"placeholder","indices":[{"symbol":"NIFTY 50","last":0,"change":0,"changePct":0},{"symbol":"NIFTY BANK","last":0,"change":0,"changePct":0},{"symbol":"SENSEX","last":0,"change":0,"changePct":0}]};
const HEADERS = { 'User-Agent': UA, 'Accept': 'application/json, text/html;q=0.9' };

async function safe(fn) { try { return await fn(); } catch (e) { console.error('upstream:', e.message); return null; } }

async function scrape() {
  // NSE indices snapshot. NSE rejects calls without a session cookie — warm up first.
  const warm = await fetch('https://www.nseindia.com/', { headers: { 'User-Agent': UA } });
  const cookie = warm.headers.getSetCookie?.().join('; ') ?? warm.headers.get('set-cookie') ?? '';
  const r = await fetch('https://www.nseindia.com/api/allIndices', {
    headers: { ...HEADERS, Referer: 'https://www.nseindia.com/', Cookie: cookie },
  });
  if (!r.ok) throw new Error('NSE ' + r.status);
  const j = await r.json();
  const wanted = ['NIFTY 50','NIFTY BANK','SENSEX','NIFTY IT','NIFTY AUTO','NIFTY PHARMA','NIFTY FMCG','NIFTY METAL'];
  return {
    source: 'nse',
    indices: (j.data ?? [])
      .filter((d) => wanted.includes(d.index))
      .map((d) => ({ symbol: d.index, last: +d.last || 0, change: +d.variation || 0, changePct: +d.percentChange || 0 })),
  };
}
let result = await safe(scrape) ?? seed;
const payload = { date: today, ...result };
mkdirSync('data', { recursive: true });
writeFileSync('data/' + today + '.json', JSON.stringify(payload, null, 2) + '\n');
writeFileSync('data/latest.json', JSON.stringify(payload, null, 2) + '\n');
console.log('wrote data/latest.json source=', payload.source);
