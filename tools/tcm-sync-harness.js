'use strict';
// Two-device journal sync harness. Uses the real GistJournal / GistSync
// from the userscript and a fake gist. No network and no user data.
//   node tools/tcm-sync-harness.js

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const script = fs.readFileSync(path.join(__dirname, '..', 'Torn_Company_Manager.user.js'), 'utf8');

function boot() {
  const vc = new VirtualConsole();
  vc.on('error', () => {});
  vc.on('jsdomError', () => {});
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://www.torn.com/companies.php',
    runScripts: 'outside-only',
    virtualConsole: vc
  });
  const w = dom.window;
  const store = new Map();
  w.__TCM_TEST_HOOKS = {};
  w.GM_getValue = (k, d) => store.has(k) ? store.get(k) : d;
  w.GM_setValue = (k, v) => { store.set(k, v); };
  w.GM_deleteValue = (k) => { store.delete(k); };
  w.GM_listValues = () => Array.from(store.keys());
  w.GM_addStyle = () => {};
  w.GM_setClipboard = () => {};
  w.GM_xmlhttpRequest = () => {};
  w.eval(script);
  return { w, hooks: w.__TCM_TEST_HOOKS, store, close: () => { try { w.close(); } catch (e) {} } };
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

function dev(J, id) {
  return { id, journal: J.emptyJournal(id) };
}

const { hooks, close } = boot();
const J = hooks.GistJournal;
const GS = hooks.GistSync;
assert(J && GS, 'hooks export the journal and sync controller');

const sample = {
  trained_log: { '12': [{ _logId: 'a', ts: 10, date: '2026-01-01', name: 'A' }] },
  train_sales: [{ id: 'c1', pricePerTrain: 5, note: 'n', payments: [{ id: 'p1', amount: 10, date: '2026-01-02' }] }],
  paid_contracts: [],
  snapshots: [{ date: '2026-01-03', daily: 4 }],
  rotation: { queue: ['12'], pointer: 1, excluded: ['9'], startDate: '2026-01-01', joinDates: { '12': '2026-01-01' }, resetDates: { '12': '2026-02-01' } },
  settings: { theme: 'dark', apiRateLimit: 60, panels: { health: true } },
  schedule_config: { enabled: false },
  schedule_overrides: { '12': 2 },
  google_sync_cfg: { enabled: false },
  discord_cfg: { logWebhook: 'https://discord.com/api/webhooks/1/abc', meta: { lastLogPostDateTCT: '2026-01-04', lastPostDateTCT: '2026-01-04' } },
  overrides: { rank: 1 }
};
const flat = J.flatten(sample);
const back = J.flatten(J.unflatten(flat));
assert(J.diff(flat, back).length === 0, 'flatten/unflatten roundtrip');

function adopt(device, flatMap) {
  device.journal = J.append(device.journal, J.diff({}, flatMap));
  return device;
}

const A = adopt(dev(J, 'aaaaaaaa'), flat);
const B = adopt(dev(J, 'bbbbbbbb'), flat);
let remote = { bases: [{ schema: 2, kind: 'base', deviceId: 'aaaaaaaa', legacyHash: 'empty', flat: {} }], journals: [A.journal, B.journal], files: {} };
let folded = J.fold(remote.bases, remote.journals);
assert(J.diff(flat, folded.flat).length === 0, 'identical offline copies fold to the same state');
assert(folded.conflicts.length === 0, 'identical values are not conflicts');

// Independent fields after both devices have seen the shared copy.
A.journal = J.observe(A.journal, [B.journal]);
B.journal = J.observe(B.journal, [A.journal]);
let aFlat = J.flatten(J.unflatten(folded.flat));
let bFlat = J.flatten(J.unflatten(folded.flat));
aFlat['set/theme'] = 'light';
bFlat['set/apiRateLimit'] = 30;
A.journal = J.append(A.journal, J.diff(flat, aFlat));
B.journal = J.append(B.journal, J.diff(flat, bFlat));
folded = J.fold(remote.bases, [A.journal, B.journal]);
assert(folded.flat['set/theme'] === 'light' && folded.flat['set/apiRateLimit'] === 30, 'independent settings fields both survive');
assert(!folded.conflicts.some(c => c.path === 'set/theme' || c.path === 'set/apiRateLimit'), 'independent fields are not conflicts');

// Contract fields and a payment deletion.
const saleId = Object.keys(flat).find(p => p.indexOf('sale/') === 0 && p.endsWith('/@'));
const saleBase = saleId.slice(0, saleId.length - 2);
aFlat = Object.assign({}, folded.flat);
bFlat = Object.assign({}, folded.flat);
aFlat[saleBase + '/f/' + J.enc('note')] = 'from-a';
delete bFlat[saleBase + '/p/' + J.enc('p1')];
const aBefore = J.flatten(J.unflatten(folded.flat));
A.journal = J.observe(A.journal, [B.journal]);
B.journal = J.observe(B.journal, [A.journal]);
A.journal = J.append(A.journal, J.diff(aBefore, aFlat));
B.journal = J.append(B.journal, J.diff(aBefore, bFlat));
folded = J.fold(remote.bases, [A.journal, B.journal]);
assert(folded.flat[saleBase + '/f/' + J.enc('note')] === 'from-a', 'contract note merges independently');
assert(!Object.prototype.hasOwnProperty.call(folded.flat, saleBase + '/p/' + J.enc('p1')), 'deleted payment stays deleted');

// Excluded, join date, settings field deletions.
aFlat = Object.assign({}, folded.flat);
delete aFlat['rot/ex/' + J.enc('9')];
delete aFlat['rot/join/' + J.enc('12')];
delete aFlat['set/panels/' + J.enc('health')];
const prevEx = Object.assign({}, folded.flat);
A.journal = J.observe(A.journal, [B.journal]);
A.journal = J.append(A.journal, J.diff(prevEx, aFlat));
folded = J.fold(remote.bases, [A.journal, B.journal]);
assert(!folded.flat['rot/ex/' + J.enc('9')], 'un-exclude is not unioned back');
assert(!Object.prototype.hasOwnProperty.call(folded.flat, 'rot/join/' + J.enc('12')), 'cleared join date stays cleared');
assert(!Object.prototype.hasOwnProperty.call(folded.flat, 'set/panels/' + J.enc('health')), 'removed settings field stays removed');

// 401 distinct deletions survive compaction.
let bulk = J.emptyJournal('cccccccc');
const bulkOps = [];
for (let i = 0; i < 401; i++) bulkOps.push({ path: 'log/' + J.enc('1') + '/' + J.enc('id' + i), op: 'del' });
bulk.journal = J.append(bulk, bulkOps);
assert(bulk.journal.ops.length === 401, '401 distinct deletions are retained');
const again = J.append(bulk.journal, [{ path: 'log/' + J.enc('1') + '/' + J.enc('id0'), op: 'set', value: { _logId: 'id0' } }]);
assert(again.ops.filter(op => op.path.indexOf('id0') >= 0).length === 1 && again.ops.find(op => op.path.indexOf('id0') >= 0).op === 'set', 'a later set supersedes a delete on the same path');

// Concurrent conflict is explicit and deterministic. Wall-clock fields are ignored.
let C1 = J.emptyJournal('aaaaaaaa');
let C2 = J.emptyJournal('bbbbbbbb');
C1 = J.append(C1, [{ path: 'set/theme', op: 'set', value: 'dark' }]);
C2 = J.append(C2, [{ path: 'set/theme', op: 'set', value: 'light' }]);
C1.ops[0].wall = 9999999999999;
C2.ops[0].wall = 1;
let conflicted = J.fold([], [C1, C2]);
assert(conflicted.conflicts.length === 1, 'concurrent different values are reported');
assert(conflicted.flat['set/theme'] === 'light', 'tie uses device id, not the wall clock');
assert(conflicted.conflicts[0].values.length === 2, 'the losing value is kept on the conflict');
const againFold = J.fold([], [C2, C1]);
assert(J.canon(againFold.flat) === J.canon(conflicted.flat), 'fold is deterministic regardless of journal order');

// Causal later edit wins even if the earlier op claims a later wall time.
C2 = J.observe(C2, [C1]);
C2 = J.append(C2, [{ path: 'set/theme', op: 'set', value: 'blue' }]);
C2.ops[C2.ops.length - 1].wall = 1;
conflicted = J.fold([], [C1, C2]);
assert(conflicted.flat['set/theme'] === 'blue' && conflicted.conflicts.length === 0, 'an edit made after seeing the other device wins');

// Discord post date keeps the later calendar day.
let D1 = J.append(J.emptyJournal('aaaaaaaa'), [{ path: 'disc/meta/' + J.enc('lastLogPostDateTCT'), op: 'set', value: '2026-01-01' }]);
let D2 = J.append(J.emptyJournal('bbbbbbbb'), [{ path: 'disc/meta/' + J.enc('lastLogPostDateTCT'), op: 'set', value: '2026-02-02' }]);
assert(J.fold([], [D1, D2]).flat['disc/meta/' + J.enc('lastLogPostDateTCT')] === '2026-02-02', 'later Discord post date wins');

// Duplicate and reordered ops.
const dup = J.fold([], [C2, C2, C1]);
assert(dup.flat['set/theme'] === 'blue', 'duplicate journal delivery is idempotent');

// Offline then merge.
let off = J.emptyJournal('dddddddd');
off = J.append(off, [{ path: 'log/' + J.enc('5') + '/' + J.enc('new'), op: 'set', value: { _logId: 'new', ts: 3 } }]);
const online = J.fold(remote.bases, [A.journal, off]);
assert(online.flat['log/' + J.enc('5') + '/' + J.enc('new')]._logId === 'new', 'offline op appears after merge');

// Restore is re-stamped after the journals we have seen.
const pending = Object.assign({}, conflicted.flat, { 'set/theme': 'restored' });
const restored = J.integrate(J.emptyJournal('eeeeeeee'), { bases: [], journals: [C1, C2], files: {} }, pending);
assert(restored.flat['set/theme'] === 'restored', 'restore wins over journals observed first');
assert(restored.journal.ops.some(op => op.path === 'set/theme' && op.value === 'restored' && (op.seen.bbbbbbbb || 0) >= 1), 'restore op records that it saw the other device');

// In-flight mutation, headerless responses, dropped peer file, failed attempt.
async function publishCase() {
  GS.arm();
  GS._journal = J.append(J.emptyJournal(GS._journal.deviceId), [{ path: 'set/theme', op: 'set', value: 'one' }]);
  const peerName = 'tcm-j-peerpeer.json';
  const peerBody = J.canonical(J.append(J.emptyJournal('peerpeer'), [{ path: 'set/apiRateLimit', op: 'set', value: 10 }]));
  const files = {};
  files[peerName] = peerBody;
  let patches = 0;
  let sawIfMatch = false;
  let dropPeerOnce = true;
  let failOnce = true;
  GS._request = (cfg, method, url, body, etag) => {
    if (etag) sawIfMatch = true;
    if (method === 'PATCH') {
      patches++;
      if (failOnce) { failOnce = false; return Promise.reject(new Error('timeout')); }
      if (GS._inflight) GS._inflight();
      const map = {};
      for (const name of Object.keys(body.files || {})) map[name] = body.files[name].content;
      if (dropPeerOnce) { dropPeerOnce = false; delete files[peerName]; }
      Object.assign(files, map);
      return Promise.resolve({ status: 200, data: { updated_at: '2026-01-01T00:00:00Z', files: {} }, headers: '' });
    }
    const gistFiles = {};
    for (const name of Object.keys(files)) gistFiles[name] = { content: files[name] };
    return Promise.resolve({ status: 200, data: { updated_at: '2026-01-01T00:00:00Z', files: gistFiles }, headers: '' });
  };
  GS._inflight = () => {
    GS._journal = J.append(GS._journal, [{ path: 'set/theme', op: 'set', value: 'two' }]);
    GS._inflight = null;
  };
  const result = await GS._publish({ token: 't', gistId: 'g' }, Object.assign({}, files));
  assert(result && result.ok, 'publish retries until this device journal matches');
  assert(!sawIfMatch, 'publish does not send If-Match');
  const own = files[J.journalName(GS._journal.deviceId)];
  assert(J.fileMatches(own, GS._journal) && J.parseJournal(own).ops.some(op => op.value === 'two'), 'in-flight edit is in the stored journal');
  assert(files[peerName] === peerBody, 'a peer journal dropped by a racing write is put back from the bytes we had read');
  assert(patches >= 2, 'a failed attempt is retried');

  GS.holdPushes();
  let calls = 0;
  const prev = GS._request;
  GS._request = () => { calls++; return prev(); };
  const held = await GS.syncNow('manual');
  assert(held && held.held === true && calls === 0, 'manual Sync Now does not release a company-change hold');
  GS.releasePushes();
}

publishCase().then(() => {
  close();
  if (failed) {
    console.error('SYNC HARNESS FAILED', failed);
    process.exit(1);
  }
  console.log('SYNC HARNESS PASSED');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
