'use strict';
// Boot Torn_Company_Manager.user.js against a stub torn.com page.
// Requires jsdom: npm install jsdom
//   node tools/tcm-boot-check.js
//   node tools/tcm-boot-check.js Torn_Company_Manager.min.user.js

const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const scriptPath = process.argv[2] || require('path').join(__dirname, '..', 'Torn_Company_Manager.user.js');
const script = fs.readFileSync(scriptPath, 'utf8');

function boot(label, setup) {
  const vc = new VirtualConsole();
  const logs = [];
  vc.on('error', (...a) => logs.push(['error', a.map(String).join(' ')]));
  vc.on('warn', (...a) => logs.push(['warn', a.map(String).join(' ')]));
  vc.on('jsdomError', (e) => logs.push(['jsdomError', String(e)]));
  const dom = new JSDOM(
    '<!DOCTYPE html><html><head></head><body><div id="company-wrapper"><ul id="employees"></ul></div></body></html>',
    {
      url: 'https://www.torn.com/companies.php',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      virtualConsole: vc,
      userAgent: setup.userAgent || 'Mozilla/5.0 (Linux; Android 14) TornPDA AppleWebKit/537.36'
    }
  );
  const w = dom.window;
  const calls = { xhr: [], pda: [], pdaPost: [], gmSet: 0, gmStyle: 0 };
  if (setup.gm) {
    w.GM_getValue = (k, d) => (String(k).indexOf('apiKey') >= 0 ? w.btoa('test-key-123456') : d);
    w.GM_setValue = () => { calls.gmSet++; };
    w.GM_deleteValue = () => {};
    w.GM_listValues = () => [];
    w.GM_addStyle = () => { calls.gmStyle++; };
    w.GM_setClipboard = () => {};
    w.GM_xmlhttpRequest = (opts) => { calls.xhr.push(opts && opts.url); };
  }
  if (setup.pda) {
    w.localStorage.setItem('TCM_v2_apiKey', 's:' + w.btoa('test-key-123456'));
    w.PDA_httpGet = (url) => {
      calls.pda.push(url);
      return Promise.resolve('{"error":{"code":2,"error":"Incorrect key"}}');
    };
    w.PDA_httpPost = (url) => {
      calls.pdaPost.push(url);
      return Promise.resolve('{}');
    };
  }
  if (setup.loading) {
    Object.defineProperty(w.document, 'readyState', { configurable: true, get: () => 'loading' });
  }
  let threw = null;
  try { w.eval(script); }
  catch (e) { threw = e; }
  return { label, dom, w, calls, logs, threw };
}

function summarize(r) {
  const doc = r.w.document;
  const launcher = !!doc.getElementById('tcm-launcher');
  const wrap = !!doc.getElementById('tcm-wrap');
  const badge = doc.getElementById('tcm-boot-error');
  const errors = r.logs.filter(l => l[0] === 'error' || l[0] === 'jsdomError');
  console.log('\n== ' + r.label + ' ==');
  console.log(JSON.stringify({
    threw: r.threw && (r.threw.stack || String(r.threw)).split('\n').slice(0, 6),
    launcher, wrap,
    badge: badge && badge.textContent,
    gmSet: r.calls.gmSet,
    gmStyle: r.calls.gmStyle,
    xhr: r.calls.xhr.length,
    pda: r.calls.pda.length,
    errorCount: errors.length,
    errors: errors.slice(0, 8).map(e => e[1].slice(0, 300))
  }, null, 2));
  return { launcher, wrap, badge, threw: r.threw, errors };
}

async function main() {
  const desktop = boot('desktop GM present', {
    gm: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
  });
  const pda = boot('TornPDA no GM, PDA_httpGet', { pda: true });
  const early = boot('TornPDA document still loading', { pda: true, loading: true });

  let earlyLauncher = !!early.w.document.getElementById('tcm-launcher');
  // DOM becomes ready
  Object.defineProperty(early.w.document, 'readyState', { configurable: true, get: () => 'interactive' });
  early.w.document.dispatchEvent(new early.w.Event('DOMContentLoaded'));

  await new Promise(r => setTimeout(r, 600));

  const a = summarize(desktop);
  const b = summarize(pda);
  summarize(early);
  console.log('early launcher before DOMContentLoaded:', earlyLauncher, 'after:', !!early.w.document.getElementById('tcm-launcher'));

  const fail = [];
  if (a.threw || !a.launcher || a.badge) fail.push('desktop');
  if (b.threw || !b.launcher || b.badge) fail.push('pda');
  if (early.threw || !early.w.document.getElementById('tcm-launcher') || early.w.document.getElementById('tcm-boot-error')) fail.push('early');
  if (earlyLauncher) fail.push('early-ran-too-soon');
  if (desktop.calls.gmStyle < 1) fail.push('gm style not used');
  if (desktop.calls.xhr < 1) fail.push('gm xhr not used');
  if (pda.calls.pda < 1) fail.push('pda http not used');
  try { desktop.w.close(); pda.w.close(); early.w.close(); } catch (e) {}
  if (fail.length) {
    console.error('BOOT CHECK FAILED:', fail.join(', '));
    process.exit(1);
  }
  console.log('\nBOOT CHECK PASSED');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
