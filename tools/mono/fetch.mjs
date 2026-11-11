// Monotaro EA11R parts list fetcher.
// Fetches the car-parts search result page (server-rendered table),
// parses it without relying on class/id, and writes mono-data.json.
// Strategy: plain fetch first; if the result table is not found
// (bot protection), retry with headless Chromium (Playwright).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const URL = 'https://www.monotaro.com/monotaroMain.py?func=monotaro.carParts.searchServlet.SearchServlet&mode=searchCarParts&selectCarName=++%BD%BD%DE%B7+%B6%CC%DF%C1%B0%C9+660+DOHC+%C0%B0%CE%DE+E-EA11R+EA11RCAXF+5FMT++199111+199505+F6AT+660+DOHC&selectCategoryName=%83G%83A%83R%83%93%83t%83B%83%8B%83%5E%81%5B+%83x%83%8B%83g+%83K%83X%83P%83b%83g%81E%83p%83b%83L%83%93%81E%83I%83C%83%8B%83V%81%5B%83%8B+%83u%83%8C%81%5B%83L%83%8A%83y%83A+%83I%83C%83%8B%83V%81%5B%83%8B%81E%83x%83A%83%8A%83%93%83O+%83h%83%89%83C%83u%83V%83%83%83t%83g%83u%81%5B%83c+%83S%83%80%83p%81%5B%83c+%83%8A%83r%83%8B%83g%82%B7%82%D7%82%C4+%83I%83%8B%83%BF%83l%81%5B%83%BF%81%5B+%83X%83%BF%81%5B%83%BF%81%5B+%83p%83%8F%83X%83e%83%7C%83%93%83v&search_mode_for_car_select=designate_search&hdnDesignateNo=06963&hdnClassifyNo=0003&hdnTypeNo=&carNo=49489&itemgroup_1=11&itemgroup_1=12&itemgroup_1=16&itemgroup_3=20&itemgroup_3=23&itemgroup_3=21&itemgroup_3=22&monoItem=7';
const OUT = 'partsfan-mobile/mono-data.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function decodeBest(buf) {
  for (const enc of ['utf-8', 'shift_jis', 'euc-jp']) {
    try {
      const t = new TextDecoder(enc).decode(buf);
      if (t.includes('注文コード') && t.includes('純正部品番号')) return t;
    } catch (e) { /* try next */ }
  }
  return new TextDecoder('utf-8').decode(buf);
}

async function fetchHtml() {
  const res = await fetch(URL, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.8' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return decodeBest(Buffer.from(await res.arrayBuffer()));
}

async function fetchHtmlBrowser() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: UA, locale: 'ja-JP' });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  const html = await page.content();
  await browser.close();
  return html;
}

const clean = (s) => (s || '').replace(/[\s　]+/g, ' ').trim();
const SHIP_RE = /(当日出荷|翌々日出荷|\d+日以内出荷|欠品中|取扱い終了|取扱停止中)/;

function parse(html, prevByCode) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const tables = [...doc.querySelectorAll('table')];
  const table = tables.find((t) => {
    const h = t.textContent;
    return h.includes('注文コード') && h.includes('純正部品番号') && h.includes('出荷目安');
  });
  if (!table) return null;
  const items = [];
  for (const tr of table.querySelectorAll('tr')) {
    const tds = [...tr.querySelectorAll('td')];
    if (tds.length < 9) continue;
    // cell 0: order code = numeric link text pointing to /g/<code>/
    let code = '';
    for (const a of tds[0].querySelectorAll('a')) {
      const tx = clean(a.textContent);
      if (/^\d{6,}$/.test(tx)) { code = tx; break; }
    }
    if (!code) continue;
    const pn = clean(tds[1].textContent);
    const quality = clean(tds[2].textContent);
    // cell 3: maker (plain text) + product name (link text)
    const nameLink = tds[3].querySelector('a');
    const name = nameLink ? clean(nameLink.textContent) : '';
    let maker = clean(tds[3].textContent);
    if (name && maker.endsWith(name)) maker = maker.slice(0, maker.length - name.length).trim();
    if (!name) { /* fall back: whole cell as name */ }
    const shipM = clean(tds[4].textContent).match(SHIP_RE);
    const ship = shipM ? shipM[1] : clean(tds[4].textContent).slice(0, 20);
    const unit = clean(tds[5].textContent);
    const priceTxt = clean(tds[6].textContent).replace(/[￥¥,]/g, '');
    const price = /^\d+$/.test(priceTxt) ? parseInt(priceTxt, 10) : null;
    const prev = prevByCode.get(code);
    const cat = prev ? prev[1] : '';
    items.push([pn, cat, maker, name || clean(tds[3].textContent), ship, price, code, quality, unit]);
  }
  return items;
}

async function main() {
  let prevByCode = new Map();
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf-8'));
      for (const it of prev.items || []) prevByCode.set(it[6], it);
    } catch (e) { /* ignore */ }
  }
  let items = null;
  try {
    const html = await fetchHtml();
    items = parse(html, prevByCode);
    console.log('plain fetch parse:', items ? items.length : 'no table');
  } catch (e) {
    console.log('plain fetch failed:', e.message);
  }
  if (!items || items.length === 0) {
    const html = await fetchHtmlBrowser();
    items = parse(html, prevByCode);
    console.log('browser fetch parse:', items ? items.length : 'no table');
  }
  if (!items || items.length === 0) {
    console.error('ERROR: could not extract any rows');
    process.exit(1);
  }
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const asof = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const data = { asof, source: 'monotaro car parts search (EA11R, designate 06963 / classify 0003)', items };
  writeFileSync(OUT, JSON.stringify(data, null, 1));
  console.log('wrote', OUT, 'items:', items.length, 'asof:', asof);
}
main();
