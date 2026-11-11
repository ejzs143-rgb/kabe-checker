import { chromium } from 'playwright';
import fs from 'node:fs';

const DIAGRAM_URL = 'https://www.megazip.net/parts/cars/suzuki/diagrams/cappuccino/ea11r-japan-dohc-turbo--5mt-std-t1-1?diagram=23053202_3';
const out = { requests: [], dialogItems: [], detailText: '', note: '' };
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('response', async (res) => {
  try {
    const req = res.request();
    const type = req.resourceType();
    if (type !== 'xhr' && type !== 'fetch') return;
    const rec = { url: res.url(), status: res.status(), type };
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('json')) {
      const body = await res.text().catch(() => '');
      rec.jsonSample = body.slice(0, 1500);
    }
    out.requests.push(rec);
  } catch {}
});
await page.goto(DIAGRAM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => { out.note += 'goto: ' + e.message; });
await page.waitForTimeout(8000);
// ダイアログの一覧項目を取得
try {
  const items = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, li, a')].filter(e => e.offsetParent !== null);
    return els.slice(0, 400).map(e => (e.textContent || '').trim().replace(/\s+/g, ' ')).filter(t => t.length > 1 && t.length < 120);
  });
  out.dialogItems = items.slice(0, 120);
} catch (e) { out.note += ' items: ' + e.message; }
// 最初の部品らしき項目をクリックして詳細（品番）表示を試す
try {
  const clicked = await page.evaluate(() => {
    const cands = [...document.querySelectorAll('button, li, a')].filter(e => e.offsetParent !== null && /Belt Set|Seal Set|Grommet|Cover,/.test(e.textContent || ''));
    if (cands.length) { cands[0].click(); return (cands[0].textContent || '').trim(); }
    return '';
  });
  out.note += ' clicked: ' + clicked;
  await page.waitForTimeout(5000);
  const txt = await page.evaluate(() => (document.body.innerText || '').slice(0, 3000));
  out.detailText = txt;
} catch (e) { out.note += ' click: ' + e.message; }
await browser.close();
fs.writeFileSync('tools/parts/probe.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ requests: out.requests.length, items: out.dialogItems.length, note: out.note }));
