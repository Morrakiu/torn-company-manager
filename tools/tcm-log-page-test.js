'use strict';
// Exercises training-log paging decisions and version ranking against the
// real userscript. Requires jsdom: npm install jsdom
//   node tools/tcm-log-page-test.js

const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const scriptPath = require('path').join(__dirname, '..', 'Torn_Company_Manager.user.js');
const script = fs.readFileSync(scriptPath, 'utf8');

function boot() {
  const vc = new VirtualConsole();
  vc.on('error', () => {});
  vc.on('jsdomError', () => {});
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://www.torn.com/companies.php',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;
  w.__TCM_TEST_HOOKS = {};
  w.GM_getValue = (_k, d) => d;
  w.GM_setValue = () => {};
  w.GM_deleteValue = () => {};
  w.GM_listValues = () => [];
  w.GM_addStyle = () => {};
  w.GM_setClipboard = () => {};
  w.GM_xmlhttpRequest = () => {};
  w.eval(script);
  return w.__TCM_TEST_HOOKS;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const api = boot();
assert(typeof api.planTrainingLogPage === 'function', 'hook exports planTrainingLogPage');
assert(typeof api.trainingLogQuery === 'function', 'hook exports trainingLogQuery');
assert(typeof api.versionRank === 'function', 'hook exports versionRank');

const fromTs = 1700000000;
const toTs = 1700001000;
const full = {
  toTs: toTs,
  nanostamp: '',
  fromTs: fromTs,
  entryCount: 100,
  oldest: 1700000900,
  oldestCount: 20,
  pageSize: 100
};

const prevNano = api.planTrainingLogPage({
  _metadata: {
    nanostamp: '111',
    links: { prev: 'https://api.torn.com/v2/user/log?log=6263&from=1700000000&nanostamp=222' }
  }
}, full);
assert(prevNano && prevNano.nanostamp === '222' && prevNano.toTs == null, 'prev nanostamp is used without to');

const metaOnly = api.planTrainingLogPage({
  _metadata: { nanostamp: '333', links: {} }
}, full);
assert(metaOnly && metaOnly.nanostamp === '333' && metaOnly.toTs == null, 'metadata nanostamp is used without to');

const sameSecond = api.planTrainingLogPage({ _metadata: { links: {} } }, {
  toTs: toTs,
  nanostamp: '',
  fromTs: fromTs,
  entryCount: 100,
  oldest: 1700000900,
  oldestCount: 100,
  pageSize: 100
});
assert(sameSecond == null, 'a full page of one second is not stepped to oldest-1');

const mixed = api.planTrainingLogPage({ _metadata: { links: {} } }, full);
assert(mixed && mixed.toTs === 1700000900 && mixed.nanostamp === '', 'a mixed full page re-reads the oldest second once');

const newerNext = api.planTrainingLogPage({
  _metadata: { links: { next: 'https://api.torn.com/v2/user/log?log=6263&to=1700002000' } }
}, full);
assert(newerNext && newerNext.toTs === 1700000900, 'a next link toward newer logs is not followed');

const wrongLog = api.planTrainingLogPage({
  _metadata: { links: { prev: 'https://api.torn.com/v2/user/log?log=1000&nanostamp=999' } }
}, full);
assert(!wrongLog || wrongLog.nanostamp !== '999', 'a prev link for a different log id is ignored');

const url = api.trainingLogQuery('abc key', fromTs, toTs, '222');
assert(url.indexOf('to=') === -1, 'nanostamp query omits to');
assert(url.indexOf('nanostamp=222') !== -1, 'nanostamp query includes the cursor');
assert(url.indexOf('from=' + fromTs) !== -1, 'nanostamp query keeps the lower bound');
assert(url.indexOf('key=abc%20key') !== -1, 'api key is encoded');

const bounded = api.trainingLogQuery('k', fromTs, toTs, '');
assert(bounded.indexOf('to=' + toTs) !== -1 && bounded.indexOf('nanostamp=') === -1, 'first page sends to and not nanostamp');

assert(api.versionRank('10.13.0-alpha') === api.versionRank('10.13.0-beta'), 'suffix does not make the rank NaN');
assert(api.versionRank('10.13.1-alpha') > api.versionRank('10.13.0-alpha'), 'patch ranks above the previous build');
assert(api.versionRank('10.13.0-alpha') > api.versionRank('10.12.2-beta'), 'minor ranks above the previous minor');

console.log(process.exitCode ? 'LOG PAGE TEST FAILED' : 'LOG PAGE TEST PASSED');
process.exit(process.exitCode || 0);
