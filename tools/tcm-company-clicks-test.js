#!/usr/bin/env node
'use strict';
/* Company-page click paths. Representative DOM only. This is not Torn PDA and not a live Torn session. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'Torn_Company_Manager.user.js'), 'utf8');
const body = src.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, '');

function row(id, selected) {
    const sel = (v) => selected === v ? ' selected' : '';
    return `<li data-user="${id}">
      <select class="employee-rank">
        <option value="1"${sel('1')}>Cleaner</option>
        <option value="2"${sel('2')}>Sales Assistant</option>
      </select>
      <div class="update d-hidden"><button type="button">Update</button></div>
      <a class="train-action" href="companies.php?step=trainemp&ID=${id}">Train</a>
    </li>`;
}

function dom(extra) {
    return new JSDOM(`<!doctype html><html><body>
      <div class="option-tab"><input name="amount" value=""><button type="button">Withdraw</button></div>
      <div id="company-wrapper"><div class="title-black top-round">Manage Company</div>
        <ul id="employees">${row(100, '2')}${row(200, '1')}</ul>
      </div>
      <div id="emp_message"></div>
      ${extra || ''}
    </body></html>`, { url: 'https://www.torn.com/companies.php#/option=funds', runScripts: 'outside-only', pretendToBeVisual: true });
}

function install(window, hooks, seed) {
    const store = Object.assign({}, seed || {});
    window.GM_getValue = (k, d) => (k in store ? store[k] : d);
    window.GM_setValue = (k, v) => { store[k] = v; };
    window.GM_deleteValue = (k) => { delete store[k]; };
    window.GM_listValues = () => Object.keys(store);
    window.GM_addStyle = () => {};
    window.GM_setClipboard = () => {};
    window.GM_xmlhttpRequest = () => {};
    window.requestIdleCallback = (cb) => setTimeout(() => cb({ timeRemaining: () => 50, didTimeout: false }), 0);
    window.__TCM_TEST_HOOKS = hooks;
    window.__counts = { trains: 0, updates: 0, changes: 0, withdraws: 0 };
    window.eval(body);
    return store;
}
function wire(window, mode) {
    window.document.addEventListener('click', (ev) => {
        const a = ev.target.closest && ev.target.closest('a[href*="trainemp"]');
        if (a) {
            window.__counts.trains += 1;
            const msg = window.document.getElementById('emp_message');
            if (mode === 'fresh' && msg) msg.textContent = 'You trained employee ' + window.__counts.trains + '-' + Math.random();
            if (mode === 'stale' && msg) msg.textContent = 'You trained JT100';
        }
        if (ev.target.closest && ev.target.closest('.update button')) {
            window.__counts.updates += 1;
            const box = ev.target.closest('.update');
            if (box) { box.classList.remove('t-show'); box.classList.add('d-hidden'); }
            const msg = window.document.getElementById('emp_message');
            if (msg) msg.textContent = 'Position updated ' + window.__counts.updates;
        }
        if (ev.target.textContent === 'Withdraw') window.__counts.withdraws += 1;
    }, true);
    window.document.addEventListener('change', (ev) => {
        if (ev.target.matches && ev.target.matches('select.employee-rank')) window.__counts.changes += 1;
    }, true);
}
function state() {
    return {
        typeName: 'Adult Novelties',
        employees: {
            '100': { name: 'JT100', position: 'Sales Assistant' },
            '200': { name: 'JT200', position: 'Cleaner' }
        },
        directorId: '1',
        detailed: { trains_available: 5 },
        profile: { rating: 10 }
    };
}
const sales = [
    { id: 'c-jt', buyerEmpId: '100', buyerName: 'JT100', preferredStat: 'man', dailyReservation: 2, totalTrains: 4, startDate: '2020-01-01', active: true },
    { id: 'c-jt2', buyerEmpId: '200', buyerName: 'JT200', dailyReservation: 1, totalTrains: 2, startDate: '2020-01-01', active: true }
];
async function flush(ms) { await new Promise((r) => setTimeout(r, ms)); }
async function ready(window) {
    for (let i = 0; i < 30; i++) {
        if (window.document.getElementById('tcm-cr-start')) return;
        await flush(25);
    }
    throw new Error('company bar was not inserted');
}
async function boot(seed) {
    const window = dom().window;
    const hooks = { Storage: null, UI: null };
    const store = install(window, hooks, seed);
    hooks.UI.state = state();
    hooks.Storage.saveSettings({ rotationMode: 'contract_rotational' });
    hooks.Storage.saveTrainSales(sales);
    await ready(window);
    return { window, hooks, store };
}

async function main() {
    {
        const { window } = await boot();
        wire(window, 'fresh');
        const btn = window.document.getElementById('tcm-cr-start');
        const select = window.document.querySelector('li[data-user="100"] select');
        btn.click();
        await flush(40);
        assert.deepStrictEqual(window.__counts, { trains: 0, updates: 0, changes: 1, withdraws: 0 });
        assert.match(btn.textContent, /^Submit move for JT100$/);
        await flush(700);
        assert.strictEqual(window.__counts.updates, 0, 'a timer must not submit the move');
        btn.click();
        await flush(200);
        assert.strictEqual(window.__counts.updates, 1);
        assert.strictEqual(window.__counts.trains, 0);
        assert.match(btn.textContent, /^Train JT100 \(1\/2\)$/);
        btn.click();
        btn.click();
        await flush(250);
        assert.strictEqual(window.__counts.trains, 1, 'a second press during the wait is not queued');
        await flush(1500);
        assert.strictEqual(window.__counts.trains, 1, 'the confirmation wait does not train again');
        btn.click();
        await flush(250);
        assert.strictEqual(window.__counts.trains, 2);
        assert.match(btn.textContent, /^Restore JT100 to Sales Assistant$/);
        btn.click();
        await flush(40);
        assert.strictEqual(select.value, '2');
        assert.strictEqual(window.__counts.updates, 1);
        assert.match(btn.textContent, /^Submit restore for JT100$/);
        btn.click();
        await flush(200);
        assert.strictEqual(window.__counts.updates, 2);
        assert.strictEqual(window.__counts.trains, 2, 'restore must not train the next contract');
        assert.match(btn.textContent, /^Train JT200 \(1\/1\)$/);
        btn.click();
        await flush(250);
        assert.strictEqual(window.__counts.trains, 3);
        window.close();
    }
    {
        const { window } = await boot();
        wire(window, 'stale');
        window.document.getElementById('emp_message').textContent = 'You trained JT100';
        const btn = window.document.getElementById('tcm-cr-start');
        btn.click();
        await flush(40);
        btn.click();
        await flush(200);
        window.document.getElementById('emp_message').textContent = 'You trained JT100';
        btn.click();
        await flush(1800);
        assert.strictEqual(window.__counts.trains, 1);
        assert.match(window.document.getElementById('tcm-cr-status').textContent, /not counted|not be sent again/i);
        const again = window.document.getElementById('tcm-cr-start');
        again.click();
        await flush(50);
        assert.strictEqual(window.__counts.trains, 1, 'an ambiguous train is not sent again');
        window.close();
    }
    {
        const { window } = await boot();
        wire(window, 'fresh');
        const old = window.document.getElementById('tcm-cr-start');
        const neu = old.cloneNode(true);
        old.replaceWith(neu);
        neu.click();
        await flush(40);
        assert.strictEqual(window.__counts.changes, 1, 'a replaced button still performs one move');
        assert.strictEqual(window.__counts.trains, 0);
        window.close();
    }
    {
        const legacy = {
            active: true, phase: 'train', index: 0, manual: 0, stopAfterRestore: false, error: '', trainsLeft: 3,
            queue: [{ contractId: 'old', empId: '100', empName: 'JT100', stat: 'man', trainPosName: 'Cleaner', origPosName: 'Sales Assistant', origPosVal: '2', toTrain: 2, trainsDone: 0, todayAtStart: 0, contractDoneAtStart: 0, switched: true, restored: false }]
        };
        const { window, hooks } = await boot({ TCM_v2_contract_stat_run: JSON.stringify(legacy) });
        wire(window, 'fresh');
        await flush(30);
        const btn = window.document.getElementById('tcm-cr-start');
        assert.match(btn.textContent, /^Restore JT100 to Sales Assistant$/);
        assert.strictEqual(window.__counts.trains, 0, 'an old automatic run does not resume');
        const savedRun = hooks.Storage.get('contract_stat_run');
        assert.ok(savedRun && savedRun.manual && savedRun.phase === 'restore-set', JSON.stringify(savedRun && { manual: savedRun.manual, phase: savedRun.phase, active: savedRun.active }));
        const nextBtn = window.document.getElementById('tcm-train-next-btn');
        nextBtn.click();
        await flush(80);
        assert.strictEqual(window.__counts.trains, 0);
        assert.match(window.document.getElementById('tcm-ti-feedback').textContent, /restore/i);
        window.close();
    }
    {
        const { window } = await boot();
        wire(window, 'fresh');
        const stat = window.document.getElementById('tcm-sr-stat');
        stat.value = 'man';
        const sr = window.document.getElementById('tcm-sr-btn');
        sr.click();
        await flush(40);
        assert.strictEqual(window.__counts.changes, 0);
        assert.match(sr.textContent, /^Move /);
        sr.click();
        await flush(40);
        assert.strictEqual(window.__counts.changes, 1);
        assert.strictEqual(window.__counts.updates, 0);
        await flush(700);
        assert.strictEqual(window.__counts.updates, 0, 'stat rotation must not submit from a timer');
        window.document.getElementById('tcm-sr-cancel').click();
        await flush(40);
        assert.strictEqual(window.__counts.updates, 0, 'cancel must not restore by itself');
        assert.match(sr.textContent, /^Restore /);
        window.close();
    }
    {
        const { window } = await boot();
        wire(window, 'fresh');
        const emp = window.document.getElementById('tcm-ps-emp');
        emp.value = '100';
        emp.dispatchEvent(new window.Event('change', { bubbles: true }));
        const pos = window.document.getElementById('tcm-ps-pos');
        pos.value = '1';
        const btn = window.document.getElementById('tcm-ps-btn');
        btn.click();
        await flush(40);
        assert.strictEqual(window.__counts.changes, 1);
        assert.strictEqual(window.__counts.updates, 0);
        await flush(700);
        assert.strictEqual(window.__counts.updates, 0, 'quick train must not submit from a timer');
        assert.strictEqual(btn.textContent, 'Submit move');
        btn.click();
        await flush(200);
        assert.strictEqual(window.__counts.updates, 1);
        assert.strictEqual(window.__counts.trains, 0);
        const restore = window.document.getElementById('tcm-ps-restore');
        restore.click();
        await flush(40);
        assert.strictEqual(window.document.querySelector('li[data-user="100"] select').value, '2');
        assert.strictEqual(window.__counts.updates, 1);
        await flush(700);
        assert.strictEqual(window.__counts.updates, 1, 'restore must not press Update by itself');
        assert.strictEqual(restore.textContent, 'Submit restore');
        window.close();
    }
    {
        const { window } = await boot();
        wire(window, 'fresh');
        const next = window.document.getElementById('tcm-train-next-btn');
        next.click();
        await flush(40);
        assert.strictEqual(window.__counts.trains, 0, 'the first Train Next press only prepares the step');
        next.click();
        next.click();
        await flush(250);
        assert.strictEqual(window.__counts.trains, 1);
        await flush(1500);
        assert.strictEqual(window.__counts.trains, 1, 'Train Next does not continue by itself');
        window.close();
    }
    {
        const { window } = await boot();
        wire(window, 'fresh');
        for (let i = 0; i < 20 && !window.document.getElementById('tcm-wd-wrap'); i++) await flush(100);
        const preset = window.document.querySelector('#tcm-wd-wrap button');
        assert.ok(preset, 'withdrawal presets were inserted');
        preset.click();
        await flush(400);
        assert.strictEqual(window.__counts.withdraws, 0, 'a preset fills the amount and does not press Withdraw');
        assert.notStrictEqual(window.document.querySelector('input[name="amount"]').value, '');
        window.close();
    }
    console.log('company clicks: one press, one request');
    process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
