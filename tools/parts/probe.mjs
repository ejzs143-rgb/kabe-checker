import fs from 'node:fs';

const DIAGRAMS = [["23053199_0", "工具"], ["23053200_1", "シリンダーヘッド"], ["23053201_2", "シリンダー"], ["23053202_3", "タイミングベルト"], ["23053203_4", "エンジン ガスケットセット"], ["23053204_5", "オイルパン"], ["23053205_6", "エンジンマウント"], ["23033910_7", "ラベル"], ["23053206_8", "クランクシャフト"], ["23037347_9", "カムシャフト／バルブ"], ["23053207_10", "インテークマニホールド（吸気）"], ["23053208_11", "スロットルボディ"], ["23053209_12", "エアクリーナー"], ["23053210_13", "ターボチャージャー"], ["23053211_14", "エキゾーストマニホールド（排気）"], ["23053212_15", "マフラー"], ["23053213_16", "燃料ポンプ"], ["23053214_17", "デリバリーパイプ／インジェクター"], ["23036907_18", "オイルポンプ"], ["23034968_19", "ウォーターポンプ"], ["23053215_20", "ラジエーター"], ["23053216_21", "ウォーターホース"], ["23053217_22", "排出ガス制御（エミッション）"], ["23053218_23", "クラッチ（MT）"], ["23053219_24", "トランスミッションケース（MT）"], ["23053220_25", "トランスミッションギア（MT）"], ["23053221_26", "ギアシフトケース（MT）"], ["23053222_27", "ギアシフトフォーク（MT）"], ["23053223_28", "プロペラシャフト"], ["23053224_29", "ギアシフトコントロール"], ["23053225_30", "リアデフ ギア"], ["23053226_31", "リアデフ マウント"], ["23053227_32", "スターターモーター（セル）"], ["23034983_33", "オルタネーター（発電機）"], ["23053228_34", "ディストリビューター"], ["23053229_35", "バッテリー"], ["23053230_36", "電装コントロール"], ["23053231_37", "スピードメーター"], ["23053232_38", "フロントランプ"], ["23053233_39", "リアランプ"], ["23053234_40", "ワイヤーハーネス（配線）"], ["23053235_41", "ロックセット（キーシリンダー）"], ["23053236_42", "フロントワイパー／ウォッシャー"], ["23053237_43", "ラジオ"], ["23053238_44", "フロントサスペンション"], ["23053239_45", "リアサスペンション"], ["23053240_46", "ホイール／タイヤ"], ["23053241_47", "フロントホイールハブ"], ["23053242_48", "リアドライブシャフト"], ["23053243_49", "フロントサスペンションフレーム"], ["23053244_50", "リアサスペンションフレーム"], ["23053245_51", "ステアリングホイール（ハンドル）"], ["23053246_52", "ステアリングコラム"], ["23053247_53", "ステアリングユニット"], ["23053248_54", "ペダル／ペダルブラケット"], ["23053249_55", "ブレーキマスターシリンダー"], ["23053250_56", "ブレーキパイピング（配管）"], ["23053251_57", "リアホイールブレーキ"], ["23053252_58", "パーキングブレーキ"], ["23053253_59", "フロントホイールブレーキ"], ["23053254_60", "フロントフード（ボンネット）"], ["23053255_61", "フロントフェンダー"], ["23053256_62", "フロントボディパネル"], ["23053257_63", "フロアパネル"], ["23053258_64", "サイドボディパネル"], ["23053259_65", "トランクリッド"], ["23053260_66", "カバー／キャップ"], ["23053261_67", "フロントドアパネル"], ["23053262_68", "フロントバンパー"], ["23053263_69", "リアバンパー"], ["23053264_70", "フューエルリッドオープナー（給油口）"], ["23053265_71", "インストルメントパネル"], ["23053266_72", "インパネ ガーニッシュ"], ["23053267_73", "ベンチレーター（送風口）"], ["23053268_74", "ヒーターコントロール"], ["23053269_75", "フロアマット／カーペット"], ["23053270_76", "コンソールボックス"], ["23053271_77", "内装トリム"], ["23053272_78", "アウターガーニッシュ（外装モール）"], ["23053273_79", "トランクルーム"], ["23053274_80", "エンブレム"], ["23053275_81", "リアピラーパネル"], ["23053276_82", "センタールーフ"], ["23053277_83", "サイドルーフ"], ["23053278_84", "フロントドアロック"], ["23053279_85", "フロントドアレギュレーター（窓）"], ["23053280_86", "ウェザーストリップ／ガラス"], ["23053281_87", "ミラー／サンバイザー"], ["23053282_88", "シートベルト"], ["23053283_89", "フロントシート"], ["23053284_90", "燃料タンク"], ["23053285_91", "エアコン"], ["23053286_92", "コンプレッサー（エアコン）"], ["23053287_93", "エバポレーター"], ["23053288_94", "エアコン ハーネス"]];
const VARIANT = 'cappuccino/ea11r-japan-dohc-turbo--5mt-std-t1-1';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function payloadFor(uid) {
  const arr = [["__skrao", 1], { brand: 2, diagramUid: 3, variantPath: 4, vehicleType: 5 }, "suzuki", uid, VARIANT, "car"];
  return Buffer.from(JSON.stringify(arr), 'utf-8').toString('base64url');
}
function hydrate(values) {
  const cache = new Map();
  function resolve(i) {
    if (typeof i !== 'number') return i;
    if (i === -1) return undefined;
    if (i === -2) return NaN;
    if (i === -3) return Infinity;
    if (i === -4) return -Infinity;
    if (i === -5) return -0;
    if (cache.has(i)) return cache.get(i);
    const v = values[i];
    if (Array.isArray(v)) {
      const arr = []; cache.set(i, arr);
      for (const el of v) arr.push(resolve(el));
      return arr;
    }
    if (v && typeof v === 'object') {
      const obj = {}; cache.set(i, obj);
      for (const k of Object.keys(v)) obj[k] = resolve(v[k]);
      return obj;
    }
    return v;
  }
  return resolve(0);
}
function formatPn(raw) {
  if (!raw) return raw;
  const s = String(raw).replace(/-/g, '');
  if (!/^[0-9A-Za-z]+$/.test(s) || s.length < 10) return raw;
  let out = s.slice(0, 5) + '-' + s.slice(5, 10);
  const rest = s.slice(10);
  if (rest && rest !== '000') out += '-' + rest;
  return out;
}
async function fetchDiagram(uid) {
  const url = 'https://www.megazip.net/_app/remote/v0cwks/getDiagram?payload=' + payloadFor(uid);
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.megazip.net/' } });
    if (res.status === 429) { lastErr = new Error('HTTP 429'); await new Promise(r => setTimeout(r, 20000 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const values = JSON.parse(j.data);
    const r0 = hydrate(values);
    return (r0 && typeof r0 === 'object' && r0._ && typeof r0._ === 'object') ? r0._ : r0;
  }
  throw lastErr || new Error('fetch failed');
}

const out = { asof: new Date().toISOString().slice(0, 10), source: 'MegaZip getDiagram (EA11R)', diagrams: {}, debug: {} };
let fail = 0;
for (const [uid, en] of DIAGRAMS) {
  try {
    const root = await fetchDiagram(uid);
    const parts = (root && root.parts) || [];
    const rows = [];
    for (const p of parts) {
      if (!p || typeof p !== 'object') continue;
      const rawUid = p.uid || p.partNumber || p.number || '';
      const rawPn = String(rawUid).replace(/^suzuki-/i, '');
      const name = p.name || p.title || '';
      const ref = p.refNumber != null ? String(p.refNumber) : (p.ref != null ? String(p.ref) : '');
      const qty = p.quantity != null ? p.quantity : (p.qty != null ? p.qty : (p.perAssembly != null ? p.perAssembly : null));
      rows.push([formatPn(rawPn), rawPn, name, ref, qty]);
      if (!out.debug.sampleParts && rows.length >= 3) out.debug.sampleParts = parts.slice(0, 3);
      if (!out.debug.partKeys && p) out.debug.partKeys = Object.keys(p);
    }
    out.diagrams[uid] = { en, parts: rows };
  } catch (e) {
    fail++;
    out.diagrams[uid] = { en, parts: [], error: String(e && e.message || e) };
  }
  await new Promise(r => setTimeout(r, 1200));
}
out.debug.failures = fail;
out.debug.totalDiagrams = Object.keys(out.diagrams).length;
out.debug.totalParts = Object.values(out.diagrams).reduce((a, d) => a + d.parts.length, 0);
fs.writeFileSync('probe.json', JSON.stringify(out));
console.log(JSON.stringify(out.debug));
