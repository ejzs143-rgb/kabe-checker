import fs from 'node:fs';

const question = (process.env.ISSUE_BODY || '').trim().slice(0, 500);
const issueNumber = process.env.ISSUE_NUMBER || '';
const token = process.env.GITHUB_TOKEN || '';

const SYN = {
  'オイルシール': ['seal,oil', 'oil seal', 'seal'], 'ガスケット': ['gasket'], 'ベルト': ['belt'],
  'タイミング': ['timing'], 'ポンプ': ['pump'], 'フィルタ': ['filter', 'element'], 'フィルター': ['filter', 'element'],
  'ベアリング': ['bearing'], 'ブーツ': ['boot'], 'ホース': ['hose'], 'ラジエータ': ['radiator'],
  'ラジエーター': ['radiator'], 'ターボ': ['turbocharger'], 'クラッチ': ['clutch'], 'ブレーキ': ['brake'],
  'パッド': ['pad'], 'ショック': ['shock', 'strut', 'absorber'], 'スプリング': ['spring'], 'アーム': ['arm'],
  'ブッシュ': ['bush'], 'マウント': ['mount'], 'センサ': ['sensor'], 'センサー': ['sensor'],
  'リレー': ['relay'], 'スイッチ': ['switch'], 'モータ': ['motor'], 'モーター': ['motor'], 'ファン': ['fan'],
  'タンク': ['tank'], 'マフラ': ['muffler'], 'マフラー': ['muffler'], 'パイプ': ['pipe'], 'ケーブル': ['cable'],
  'ランプ': ['lamp'], 'ミラー': ['mirror'], 'ガラス': ['glass'], 'ドア': ['door'], 'シート': ['seat'],
  'ヘッド': ['head'], 'カバー': ['cover'], 'バルブ': ['valve'], 'ピストン': ['piston'], 'リング': ['ring'],
  'シャフト': ['shaft'], 'ギア': ['gear'], 'ミッション': ['transmission'], 'デフ': ['differential'],
  'スタビ': ['stabilizer'], 'タイロッド': ['tie rod'], 'ワイパー': ['wiper'], 'オルタ': ['generator'],
  'ジェネレータ': ['generator'], 'スタータ': ['starting', 'starter'], 'セルモータ': ['starting'],
  'エアコン': ['conditioner', 'compressor'], 'コンプレッサ': ['compressor'], 'ヒータ': ['heater'],
  'ヒーター': ['heater'], 'サーモ': ['thermostat'], 'プラグ': ['plug'], 'コード': ['cord', 'cable'],
  'インジェクタ': ['injector'], 'スロットル': ['throttle'], 'エアクリ': ['air cleaner'],
  'フューエル': ['fuel'], '燃料': ['fuel'], '冷却水': ['water'], 'ウォータ': ['water'],
  'エキゾースト': ['exhaust'], 'マニホールド': ['manifold'], '触媒': ['catalyst', 'converter'],
};

function loadJson(path, fallback) {
  try { return JSON.parse(fs.readFileSync(path, 'utf-8')); } catch { return fallback; }
}
const db = loadJson('tools/parts/probe.json', { diagrams: {} });
const mono = loadJson('partsfan-mobile/mono-data.json', { items: [] });

const allParts = [];
for (const [uid, d] of Object.entries(db.diagrams || {})) {
  for (const r of (d.parts || [])) {
    allParts.push({ pn: r[0], raw: r[1], name: r[2], ref: r[3], qty: r[4], sup: r[5] || [], diagram: d.en, uid });
  }
}
function monoBest(pn) {
  const hits = (mono.items || []).filter(it => it[0] === pn);
  const ok = hits.filter(it => it[5] != null && !/欠品|取扱終了|取扱停止/.test(it[4] || ''));
  if (!ok.length) return null;
  ok.sort((a, b) => a[5] - b[5]);
  const b = ok[0];
  return { price: b[5], maker: b[2], stock: b[4], unit: b[8] || '' };
}
function scorePart(p, terms) {
  let sc = 0;
  const name = (p.name || '').toLowerCase();
  const dia = (p.diagram || '').toLowerCase();
  for (const t of terms) {
    if (!t) continue;
    if (p.pn.replace(/-/g, '') === t.replace(/-/g, '').toUpperCase()) sc += 100;
    if (name.includes(t)) sc += 10;
    if (dia.includes(t)) sc += 4;
  }
  return sc;
}
const terms = new Set();
for (const w of question.toLowerCase().split(/[\s、。・,.\/「」『』()（）]+/).filter(Boolean)) terms.add(w);
for (const [jp, ens] of Object.entries(SYN)) if (question.includes(jp)) for (const e of ens) terms.add(e);
for (const w of Object.keys(SYN)) if (question.includes(w)) terms.add(w);
const scored = allParts.map(p => [scorePart(p, [...terms]), p]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
const candidates = scored.slice(0, 40).map(x => x[1]);

let answer = '';
let picks = [];
let aiUsed = false;
if (token && candidates.length) {
  try {
    const candText = candidates.map(p => `${p.pn} | ${p.name} | 図面:${p.diagram} | 図番:${p.ref}`).join('\n');
    const res = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'あなたはスズキ カプチーノ EA11R の部品案内アシスタントです。ユーザーの質問に対し、与えられた候補リストの中からだけ該当部品を最大5件選び、JSONのみで答えてください。形式: {"answer":"日本語の簡潔な説明","picks":["品番1","品番2"]}。候補に無い品番は絶対に出力しないこと。該当が無ければ picks は空にし、その旨を answer に書くこと。' },
          { role: 'user', content: '質問: ' + question + '\n\n候補リスト:\n' + candText },
        ],
      }),
    });
    if (res.ok) {
      const j = await res.json();
      const text = j.choices?.[0]?.message?.content || '';
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        answer = String(parsed.answer || '');
        const valid = new Set(candidates.map(c => c.pn));
        picks = (parsed.picks || []).filter(pn => valid.has(pn)).slice(0, 5);
        aiUsed = true;
      }
    } else {
      answer = 'AI応答エラー（HTTP ' + res.status + '）。候補から機械的に表示します。';
    }
  } catch (e) {
    answer = 'AI接続エラー。候補から機械的に表示します。';
  }
}
if (!aiUsed) {
  picks = candidates.slice(0, 5).map(p => p.pn);
  if (!answer) answer = candidates.length ? '候補を機械検索で表示します（AI未使用）。' : '候補が見つかりませんでした。言葉を変えて試してください。';
}
const pickDetails = picks.map(pn => {
  const p = candidates.find(c => c.pn === pn) || allParts.find(c => c.pn === pn);
  if (!p) return { pn };
  return { pn: p.pn, name: p.name, diagram: p.diagram, uid: p.uid, ref: p.ref, sup: p.sup, mono: monoBest(pn) };
});
const qaPath = 'partsfan-mobile/qa-data.json';
const qa = loadJson(qaPath, { entries: [] });
qa.entries.unshift({ n: Number(issueNumber) || null, q: question, a: answer, ai: aiUsed, picks: pickDetails, at: new Date().toISOString() });
qa.entries = qa.entries.slice(0, 20);
qa.latest = qa.entries[0];
fs.writeFileSync(qaPath, JSON.stringify(qa, null, 1));
console.log(JSON.stringify({ aiUsed, picks: picks.length, candidates: candidates.length }));
