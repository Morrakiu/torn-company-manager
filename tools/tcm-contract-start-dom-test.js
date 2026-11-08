#!/usr/bin/env node
'use strict';
/* Boots the real userscript against a company-page DOM and presses the contract step button.
   One press may change a dropdown, click Update, or click a train link, and never more than one of those. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'Torn_Company_Manager.user.js'), 'utf8');
const body = src.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, '');

function dom(kind) {
    const row = kind === 'pda'
        ? `<div class="employee" id="emp-100">
             <select class="employee-rank">
               <option value="1">Cleaner</option>
               <option value="2" selected>Sales Assistant</option>
             </select>
             <div class="update d-hidden"><button type="button">Update</button></div>
             <a href="companies.php?step=trainemp2&ID=100">Train</a>
           </div>`
        : `<ul id="employees"><li data-user="100">
             <select class="employee-rank">
               <option value="1" selected>Cleaner</option>
               <option value="2">Sales Assistant</option>
             </select>
             <div class="update d-hidden"><button type="button">Update</button></div>
             <a class="train-action" href="companies.php?step=trainemp&ID=100">Train</a>
           </li></ul>`;
    return new JSDOM(`<!doctype html><html><body>
      <div id="company-wrapper"><div class="title-black top-round">Manage Company</div>${row}</div>
      <div id="emp_message"></div>
    </body></html>`, { url: 'https://www.torn.com/companies.php', runScripts: 'outside-only', pretendToBeVisual: true });
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
    window.eval(body);
    return store;
}

function counts(window) {
    return {
        trains: window.__trains || 0,
        updates: window.__updates || 0,
        changes: window.__changes || 0
    };
}
function wire(window, confirmTrain) {
    window.__trains = 0;
    window.__updates = 0;
    window.__changes = 0;
    window.document.addEventListener('click', (ev) => {
        const a = ev.target.closest && ev.target.closest('a[href*="trainemp"]');
        if (a) {
            window.__trains += 1;
            if (confirmTrain) window.document.getElementById('emp_message').textContent = 'You trained JT100';
        }
        if (ev.target.closest && ev.target.closest('.update button')) window.__updates += 1;
    }, true);
    window.document.addEventListener('change', (ev) => {
        if (ev.target.matches && ev.target.matches('select')) window.__changes += 1;
    }, true);
}
function contractState() {
    return {
        typeName: 'Adult Novelties',
        employees: { '100': { name: 'JT100', position: 'Cleaner' } },
        directorId: '1',
        detailed: { trains_available: 3 },
        profile: { rating: 10 }
    };
}
async function flush(ms) { await new Promise((r) => setTimeout(r, ms)); }
async function ready(window) {
    for (let i = 0; i < 20; i++) {
        if (window.document.getElementById('tcm-cr-start')) return;
        await flush(25);
    }
    throw new Error('contract step button was not inserted');
}

async function main() {
    {
        const window = dom('desktop').window;
        const hooks = { Storage: null, UI: { state: null } };
        install(window, hooks);
        await ready(window);
        hooks.Storage.saveSettings({ rotationMode: 'priority' });
        wire(window, true);
        window.document.getElementById('tcm-cr-start').click();
        await flush(20);
        assert.strictEqual(window.document.getElementById('tcm-cr-status').textContent, 'Select Contracts, then press the step button. Changing the mode does not train or move anyone.');
        assert.deepStrictEqual(counts(window), { trains: 0, updates: 0, changes: 0 });
        window.close();
    }
    {
        const window = dom('desktop').window;
        const hooks = { Storage: null, UI: { state: null } };
        install(window, hooks);
        await ready(window);
        hooks.Storage.saveSettings({ rotationMode: 'contract_rotational' });
        wire(window, true);
        window.document.getElementById('tcm-cr-start').click();
        await flush(20);
        assert.strictEqual(window.document.getElementById('tcm-cr-status').textContent, 'Company data is not loaded yet. Open the TCM panel once, then press the step button again.');
        assert.strictEqual(counts(window).trains, 0);
        window.close();
    }
    {
        const window = dom('desktop').window;
        const hooks = { Storage: null, UI: null };
        install(window, hooks);
        await ready(window);
        hooks.UI.state = contractState();
        hooks.Storage.saveSettings({ rotationMode: 'contract_rotational' });
        hooks.Storage.saveTrainSales([{ id: 'c-jt', buyerEmpId: '100', buyerName: 'JT100', preferredStat: 'man', dailyReservation: 2, totalTrains: 4, startDate: '2020-01-01', active: true }]);
        wire(window, true);
        const btn = window.document.getElementById('tcm-cr-start');
        btn.click();
        await flush(30);
        assert.deepStrictEqual(counts(window), { trains: 0, updates: 0, changes: 0 }, 'already in the best position is not a train');
        assert.match(btn.textContent, /^Train JT100 \(1\/2\)$/);
        btn.click();
        btn.click();
        btn.click();
        await flush(250);
        assert.deepStrictEqual(counts(window), { trains: 1, updates: 0, changes: 0 }, 'spam during a train does not queue another');
        await flush(1500);
        assert.strictEqual(counts(window).trains, 1, 'the confirmation wait does not click the next train');
        btn.click();
        await flush(250);
        assert.strictEqual(counts(window).trains, 2);
        window.close();
    }
    {
        const window = dom('pda').window;
        const hooks = { Storage: null, UI: null };
        install(window, hooks);
        await ready(window);
        const pdaState = contractState();
        pdaState.employees['100'].position = 'Sales Assistant';
        hooks.UI.state = pdaState;
        hooks.Storage.saveSettings({ rotationMode: 'contract_rotational' });
        hooks.Storage.saveTrainSales([{ id: 'c-jt', buyerEmpId: '100', buyerName: 'JT100', preferredStat: 'man', dailyReservation: 2, totalTrains: 4, startDate: '2020-01-01', active: true }]);
        wire(window, false);
        const btn = window.document.getElementById('tcm-cr-start');
        const select = window.document.querySelector('#emp-100 select');
        btn.click();
        await flush(30);
        assert.deepStrictEqual(counts(window), { trains: 0, updates: 0, changes: 1 });
        assert.strictEqual(select.value, '1');
        assert.match(btn.textContent, /^Submit move for JT100$/);
        window.document.getElementById('tcm-cr-cancel').click();
        await flush(30);
        assert.deepStrictEqual(counts(window), { trains: 0, updates: 0, changes: 1 }, 'cancel does not restore or train');
        assert.match(btn.textContent, /^Restore JT100 to Sales Assistant$/);
        btn.click();
        await flush(30);
        assert.strictEqual(counts(window).updates, 0);
        assert.strictEqual(select.value, '2');
        assert.match(btn.textContent, /^Submit restore for JT100$/);
        window.close();
    }
    {
        const window = dom('desktop').window;
        const hooks = { Storage: null, UI: null };
        const store = install(window, hooks);
        await ready(window);
        hooks.UI.state = contractState();
        hooks.Storage.saveSettings({ rotationMode: 'contract_rotational' });
        hooks.Storage.saveTrainSales([{ id: 'c-jt', buyerEmpId: '100', buyerName: 'JT100', preferredStat: 'man', dailyReservation: 1, totalTrains: 1, startDate: '2020-01-01', active: true }]);
        wire(window, false);
        const btn = window.document.getElementById('tcm-cr-start');
        btn.click();
        await flush(30);
        btn.click();
        await flush(1800);
        assert.strictEqual(counts(window).trains, 1);
        assert.match(window.document.getElementById('tcm-cr-status').textContent, /not counted/i);
        assert.strictEqual(counts(window).updates, 0, 'a timeout does not restore');
        const saved = store.TCM_v2_contract_stat_run;
        window.close();
        const next = dom('desktop').window;
        const hooks2 = { Storage: null, UI: null };
        install(next, hooks2, { TCM_v2_contract_stat_run: saved });
        await ready(next);
        hooks2.UI.state = contractState();
        hooks2.Storage.saveSettings({ rotationMode: 'contract_rotational' });
        wire(next, false);
        await flush(20);
        assert.deepStrictEqual(counts(next), { trains: 0, updates: 0, changes: 0 });
        assert.strictEqual(next.document.getElementById('tcm-cr-start').textContent, 'Stopped');
        next.document.getElementById('tcm-cr-start').click();
        await flush(50);
        assert.deepStrictEqual(counts(next), { trains: 0, updates: 0, changes: 0 });
        next.close();
    }
    console.log('contract start DOM: one click, one action');
    process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
