'use strict';
// Contract preferred-stat planner. No DOM, no Torn clicks.
//   node tools/tcm-contract-stat-test.js

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const script = fs.readFileSync(path.join(__dirname, '..', 'Torn_Company_Manager.user.js'), 'utf8');
const vc = new VirtualConsole();
vc.on('error', () => {});
vc.on('jsdomError', () => {});
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://www.torn.com/companies.php',
  runScripts: 'outside-only',
  virtualConsole: vc
});
const w = dom.window;
w.__TCM_TEST_HOOKS = {};
w.GM_getValue = (_k, d) => d;
w.GM_setValue = () => {};
w.GM_deleteValue = () => {};
w.GM_listValues = () => [];
w.GM_addStyle = () => {};
w.GM_xmlhttpRequest = () => {};
w.eval(script);
const R = w.__TCM_TEST_HOOKS.ContractStatRun;
if (!R) { console.error('missing ContractStatRun'); process.exit(1); }

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL:', msg); }
  else console.log('ok:', msg);
}

const positions = {
  Cleaner: { primary: 'man', secondary: 'end', priReq: 100, priGain: 30, secGain: 10 },
  Manager: { primary: 'int', secondary: 'man', priReq: 1, priGain: 10, secGain: 40 },
  Guard: { primary: 'man', secondary: 'end', priReq: 99999, priGain: 55, secGain: 5 },
  Twin: { primary: 'man', secondary: 'end', priReq: 1, priGain: 55, secGain: 1 }
};

const jt = R.bestPosition(positions, 'man', 'Cleaner');
assert(jt.ok && jt.name === 'Guard', 'JT100 MAN picks the higher MAN gain, not the lower requirement');
assert(jt.gain === 55, 'JT100 MAN gain is 55');

const tieOrig = R.bestPosition({
  Alpha: { primary: 'man', priGain: 40 },
  Cleaner: { primary: 'man', priGain: 40 },
  Zebra: { primary: 'man', priGain: 40 }
}, 'man', 'Cleaner');
assert(tieOrig.name === 'Cleaner', 'equal gains keep the original position');

const tieAlpha = R.bestPosition({
  Zebra: { primary: 'man', priGain: 40 },
  Alpha: { primary: 'man', priGain: 40 }
}, 'man', 'Cleaner');
assert(tieAlpha.name === 'Alpha', 'equal gains with no original match use the name sort');

assert(R.bestPosition({ OnlyInt: { primary: 'int', priGain: 90, priReq: 1 } }, 'man', 'OnlyInt').ok === false, 'missing MAN gain stops instead of guessing');
assert(R.bestPosition(positions, '', 'Cleaner').reason === 'no-stat', 'blank stat does not choose a position');

const logs = {
  '100': [
    { _logId: 'L1', ts: 2000, date: '2026-01-02' },
    { _logId: 'L1', ts: 2001, date: '2026-01-02' },
    { _logId: 'L2', ts: 1000, date: '2026-01-01' }
  ]
};
assert(R.countToday(logs['100'], 1500) === 1, 'duplicate imported log id counts once today');
assert(R.countContract(logs['100'], '2026-01-01') === 2, 'contract total still counts distinct log ids');

const employees = { '100': { name: 'JT100', position: 'Cleaner' }, '200': { name: 'NoStat', position: 'Guard' } };
const contracts = [
  { id: 'c-jt', buyerEmpId: '100', buyerName: 'JT100', active: true, preferredStat: 'MAN', totalTrains: 10, startDate: '2026-01-01', openEnded: false },
  { id: 'c-plain', buyerEmpId: '200', active: true, totalTrains: 5, startDate: '2026-01-01', openEnded: false }
];
const plan = R.planQueue({
  contracts: contracts,
  logs: logs,
  reservations: { 'c-jt': 3, 'c-plain': 2 },
  trainsAvailable: 10,
  employees: employees,
  positions: positions,
  tornDayStartMs: 1500
});
assert(!plan.blocked, 'plan is not blocked when gains exist');
assert(plan.queue.length === 2, 'both contracts are queued');
assert(plan.queue[0].empName === 'JT100' && plan.queue[0].toTrain === 2 && plan.queue[0].trainPosName === 'Guard', 'JT100 MAN allots 3 minus 1 logged train and moves to Guard');
assert(plan.queue[1].stat === '' && plan.queue[1].trainPosName === '' && plan.queue[1].toTrain === 2, 'a contract with no stat is not given a position');

const partial = R.planQueue({
  contracts: [contracts[0]],
  logs: { '100': [] },
  reservations: { 'c-jt': 5 },
  trainsAvailable: 2,
  employees: employees,
  positions: positions,
  tornDayStartMs: 0
});
assert(partial.queue[0].toTrain === 2, 'company train pool caps the allotment');

const none = R.planQueue({
  contracts: [contracts[0]],
  logs: { '100': [] },
  reservations: { 'c-jt': 3 },
  trainsAvailable: 0,
  employees: employees,
  positions: positions,
  tornDayStartMs: 0
});
assert(none.queue.length === 0, 'no company trains means an empty queue');

const missing = R.planQueue({
  contracts: [contracts[0], contracts[1]],
  logs: { '100': [], '200': [] },
  reservations: { 'c-jt': 3, 'c-plain': 2 },
  trainsAvailable: 10,
  employees: employees,
  positions: { OnlyInt: { primary: 'int', priGain: 9 } },
  tornDayStartMs: 0
});
assert(missing.queue.length === 0 && missing.blocked && missing.blocked.stat === 'man', 'missing MAN gain blocks before any later contract');

let begun = R.begin(plan, 10);
assert(begun.run.active && begun.run.phase === 'capture', 'a preferred-stat contract starts by capturing the original position');
let run = begun.run;
assert(R.action(run).type === 'capture', 'first action is capture, not a move');
run = R.reduce(run, { type: 'captured', origPosVal: '7', origPosName: 'Cleaner', samePosition: false });
assert(run.queue[0].origPosVal === '7' && run.phase === 'switch-set', 'original position is stored before the switch');
run = R.reduce(run, { type: 'switch-set-ok' });
run = R.reduce(run, { type: 'switch-confirm-ok' });
assert(run.phase === 'train' && run.queue[0].switched && !run.queue[0].restored, 'training waits until the move is confirmed');
run = R.reduce(run, { type: 'train-ok', currentToday: 2, currentContractDone: 3 });
assert(run.queue[0].trainsDone === 1 && run.phase === 'train', 'one confirmed train does not finish a 2-train allotment');
run = R.reduce(run, { type: 'fail', message: 'Train was not confirmed.' });
assert(run.queue[0].trainsDone === 1 && run.phase === 'restore-set' && run.stopAfterRestore, 'a failed train is not counted and restore starts');
const advancedTooSoon = R.reduce(run, { type: 'advance' });
assert(advancedTooSoon.phase === 'restore-set', 'the next contract cannot start while restoration is open');
run = R.reduce(run, { type: 'restore-set-ok' });
run = R.reduce(run, { type: 'restore-confirm-ok' });
assert(!run.active && run.phase === 'idle', 'cancel/failure restore does not continue to the next contract');

begun = R.begin(plan, 10);
run = begun.run;
run = R.reduce(run, { type: 'captured', origPosVal: '7', origPosName: 'Cleaner', samePosition: false });
run = R.reduce(run, { type: 'switch-set-ok' });
run = R.reduce(run, { type: 'switch-confirm-ok' });
run = R.reduce(run, { type: 'train-ok', currentToday: 2, currentContractDone: 3 });
run = R.reduce(run, { type: 'train-ok', currentToday: 3, currentContractDone: 4 });
assert(run.phase === 'restore-set', 'after the allotment the employee is restored before anyone else');
run = R.reduce(run, { type: 'restore-set-ok' });
run = R.reduce(run, { type: 'restore-confirm-ok' });
assert(run.phase === 'advance', 'restore confirmation is required before advance');
run = R.reduce(run, { type: 'advance' });
assert(run.index === 1 && run.phase === 'train' && run.queue[1].stat === '', 'the next contract trains in place because it has no preferred stat');

const second = JSON.parse(JSON.stringify(run));
const resumed = second.active ? second : R.begin(plan, 10).run;
assert(resumed.index === 1 && resumed.queue[0].origPosVal === '7', 'a second start resumes the saved run instead of rebuilding it');

run = R.reduce(run, { type: 'cancel' });
assert(!run.active, 'cancel with nothing unrestored stops');

begun = R.begin({ queue: [plan.queue[0]], blocked: null }, 1);
run = begun.run;
run.trainsLeft = 1;
run = R.reduce(run, { type: 'captured', origPosVal: '7', origPosName: 'Cleaner', samePosition: false });
run = R.reduce(run, { type: 'switch-set-ok' });
run = R.reduce(run, { type: 'switch-confirm-ok' });
run = R.reduce(run, { type: 'train-ok', currentToday: 1, currentContractDone: 1 });
assert(run.phase === 'restore-set', 'the last company train still restores before stopping');

const dupItem = plan.queue[0];
assert(R.remaining(dupItem, dupItem.todayAtStart, dupItem.contractDoneAtStart, 5) === dupItem.toTrain, 'a duplicate import that does not raise the unique count does not shrink the allotment');

try { w.close(); } catch (e) {}
if (failed) {
  console.error('CONTRACT STAT TEST FAILED', failed);
  process.exit(1);
}
console.log('CONTRACT STAT TEST PASSED');
process.exit(0);
