// ==UserScript==
// @name         Morrakiu's Company Manager
// @namespace    https://github.com/Morrakiu/torn-company-manager
// @version      3.25.4
// @description  Training contracts, plan, calculator. Peer role-mix advisor (API only). Full positions, PDA, JSONBin, Sheets, TornStats.
// @author       Morrakiu
// @match        https://www.torn.com/companies.php*
// @match        https://www.torn.com/page.php?sid=companies*
// @match        https://www.torn.com/joblist.php*
// @match        https://torn.com/companies.php*
// @match        https://tornstats.com/*
// @match        https://www.tornstats.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @connect      api.torn.com
// @connect      discord.com
// @connect      discordapp.com
// @connect      api.jsonbin.io
// @connect      yata.yt
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @downloadURL  https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js
// @updateURL    https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Top window only (never run inside iframes)
    if (window.top !== window.self) return;

    // ---------- TornStats finance helper (only on tornstats.com while you view the page) ----------
    if (/tornstats\.com$/i.test(location.hostname) || /\.tornstats\.com$/i.test(location.hostname)) {
        const HEADERS = {
            date: /date/i,
            daily: /income/i,
            salaries: /wage|salar/i,
            adBudget: /ad\s*budget/i,
            dailyStockCost: /stock/i,
            netProfit: /profit/i
        };

        function parseAmount(text) {
            const cleaned = String(text || '').replace(/[^0-9.\-]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? 0 : Math.round(n);
        }

        function findFinanceTable() {
            const tables = Array.from(document.querySelectorAll('table'));
            for (const table of tables) {
                const firstRow = table.querySelector('thead tr') || table.querySelector('tr');
                if (!firstRow) continue;
                const headerCells = Array.from(firstRow.querySelectorAll('th, td')).map(c => c.textContent.trim());
                if (headerCells.some(t => HEADERS.daily.test(t)) && headerCells.some(t => HEADERS.netProfit.test(t))) {
                    return { table, headerCells };
                }
            }
            return null;
        }

        function scrapeRows() {
            const found = findFinanceTable();
            if (!found) return [];
            const { table, headerCells } = found;
            const colIndex = {};
            headerCells.forEach((h, i) => {
                Object.keys(HEADERS).forEach(key => {
                    if (HEADERS[key].test(h) && colIndex[key] == null) colIndex[key] = i;
                });
            });
            if (colIndex.date == null || colIndex.daily == null) return [];

            const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
            const rows = (bodyRows.length ? bodyRows : Array.from(table.querySelectorAll('tr')).slice(1));
            const out = [];
            rows.forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
                if (!cells.length) return;
                const rawDate = cells[colIndex.date] || '';
                // Normalize to YYYY-MM-DD when possible
                let date = rawDate;
                const m = rawDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
                if (m) {
                    let d = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0'), y = m[3];
                    if (y.length === 2) y = '20' + y;
                    // TornStats often DD/MM/YY
                    date = y + '-' + mo + '-' + d;
                }
                out.push({
                    date,
                    daily: colIndex.daily != null ? parseAmount(cells[colIndex.daily]) : 0,
                    salaries: colIndex.salaries != null ? parseAmount(cells[colIndex.salaries]) : 0,
                    adBudget: colIndex.adBudget != null ? parseAmount(cells[colIndex.adBudget]) : 0,
                    dailyStockCost: colIndex.dailyStockCost != null ? parseAmount(cells[colIndex.dailyStockCost]) : 0,
                    netProfit: colIndex.netProfit != null ? parseAmount(cells[colIndex.netProfit]) : 0
                });
            });
            return out.filter(r => r.date);
        }

        function formatRowsForClipboard(rows) {
            return rows.map(r => {
                const parts = String(r.date).split('-');
                let label = r.date;
                if (parts.length === 3) label = parts[2] + '/' + parts[1] + '/' + String(parts[0]).slice(-2);
                return label + '  $' + r.daily + '  $' + r.salaries + '  $' + r.adBudget + '  $' + r.dailyStockCost + '  $' + r.netProfit;
            }).join('\n');
        }

        function copyText(text) {
            try { if (typeof GM_setClipboard === 'function') GM_setClipboard(text, 'text'); } catch (e) {}
            try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text); } catch (e) {}
        }

        function ensureBadge(rows) {
            let el = document.getElementById('tcm-tornstats-badge');
            if (!el) {
                el = document.createElement('div');
                el.id = 'tcm-tornstats-badge';
                el.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:999999;background:#1a2332;color:#e8eef7;' +
                    'border:1px solid #3d5a80;border-radius:8px;padding:10px 14px;font:13px/1.4 system-ui,sans-serif;' +
                    'box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:280px';
                document.body.appendChild(el);
            }
            if (!rows.length) {
                el.innerHTML = '<strong>TCM</strong><br>No company finance table detected on this page.';
                return;
            }
            el.innerHTML = '<strong>TCM · TornStats helper</strong><br>' +
                rows.length + ' finance day(s) captured.<br>' +
                '<button id="tcm-ts-copy" style="margin-top:6px;padding:4px 10px;cursor:pointer">Copy for TCM</button> ' +
                '<button id="tcm-ts-stage" style="margin-top:6px;padding:4px 10px;cursor:pointer">Stage for import</button>';
            const copyBtn = document.getElementById('tcm-ts-copy');
            const stageBtn = document.getElementById('tcm-ts-stage');
            if (copyBtn) copyBtn.onclick = () => {
                copyText(formatRowsForClipboard(rows));
                copyBtn.textContent = 'Copied!';
            };
            if (stageBtn) stageBtn.onclick = () => {
                try {
                    GM_setValue('tcmTornstatsStaging', JSON.stringify({ rows, capturedAt: Date.now() }));
                    stageBtn.textContent = 'Staged!';
                } catch (e) {
                    stageBtn.textContent = 'Failed';
                }
            };
        }

        function run() {
            const rows = scrapeRows();
            if (rows.length) {
                try { GM_setValue('tcmTornstatsStaging', JSON.stringify({ rows, capturedAt: Date.now() })); } catch (e) {}
            }
            ensureBadge(rows);
        }

        // Passive: only the page the user is viewing; re-scan as SPA content settles
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(run, 800));
        else setTimeout(run, 800);
        setTimeout(run, 2500);
        setTimeout(run, 6000);
        return; // do not load the company dashboard on TornStats
    }

    const API_BASE_V1 = 'https://api.torn.com';
    const API_BASE_V2 = 'https://api.torn.com/v2';
    const CACHE_MS = 45 * 1000;
    // Pre-fills Torn's custom key form with only the selections this script needs
    const CUSTOM_KEY_URL = 'https://www.torn.com/preferences.php#tab=api?step=addNewKey&title=Company+Manager&user=profile,job,basic&company=profile,employees,stock,detailed';
    // ----- Torn PDA compatibility -----
    // GMforPDA maps GM_* → localStorage + PDA_httpGet/Post/Put/Patch/Delete.
    // Prefer native PDA_http* when present so JSONBin PUT / Discord PATCH work even
    // if an older compatibility layer only wrapped GET/POST.
    const IS_PDA = (function () {
        try {
            if (typeof PDA_httpGet === 'function' || typeof PDA_httpPost === 'function') return true;
            if (typeof window !== 'undefined' && window.flutter_inappwebview) return true;
            const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
            if (/TornPDA|torn.?pda/i.test(ua)) return true;
        } catch (e) {}
        return false;
    })();

    function readStored(key, def) {
        try {
            const v = GM_getValue(key, def);
            // GMforPDA may return already-parsed values; Tampermonkey returns as stored
            return v == null ? def : v;
        } catch (e) {
            return def;
        }
    }
    function writeStored(key, val) {
        try { GM_setValue(key, val); } catch (e) { console.warn('[TCM] GM_setValue failed', key, e); }
    }

    // PDA injects the player key when this exact token appears in source
    const PDA_KEY_TOKEN = '###PDA-APIKEY###';
    let apiKey = '';
    (function initApiKey() {
        // If PDA replaced the token at install/runtime, use it
        if (PDA_KEY_TOKEN && PDA_KEY_TOKEN.indexOf('###') === -1 && PDA_KEY_TOKEN.length > 8) {
            apiKey = String(PDA_KEY_TOKEN).trim();
            writeStored('tornCompanyApiKey', apiKey);
            return;
        }
        apiKey = String(readStored('tornCompanyApiKey', '') || '').trim();
    })();
    // Dual Discord webhooks: permanent log (append) + live data panel (edit same message)
    let discordLogWebhook = GM_getValue('tcmDiscordLogWebhook', '') || GM_getValue('tcmDiscordWebhook', '');
    let discordPanelWebhook = GM_getValue('tcmDiscordPanelWebhook', '');
    let discordWeeklyWebhook = GM_getValue('tcmDiscordWeeklyWebhook', '');
    let jsonbinId = GM_getValue('tcmJsonbinId', '');
    let jsonbinKey = GM_getValue('tcmJsonbinKey', '');
    let sheetsWebAppUrl = GM_getValue('tcmSheetsWebAppUrl', '');
    let sheetsOpts = (function () {
        try {
            const o = JSON.parse(GM_getValue('tcmSheetsOpts', 'null'));
            if (o && typeof o === 'object') return Object.assign({ finance: true, trains: true, peers: true, metrics: true, stock: true, tornstats: true }, o);
        } catch (e) {}
        return { finance: true, trains: true, peers: true, metrics: true, stock: true, tornstats: true };
    })();
    function saveSheetsOpts(o) {
        sheetsOpts = o || sheetsOpts;
        GM_setValue('tcmSheetsOpts', JSON.stringify(sheetsOpts));
    }
    const DEFAULT_DISCORD_OPTS = {
        unusedTrains: false,
        dailyMetrics: false,
        employeeAlerts: false,
        starChange: false,
        autoPost: true,
        weeklyPanel: true
    };
    // Discord report options (synced via JSONBin) — loaded after helper fns via initDiscordState()
    let discordOpts = Object.assign({}, DEFAULT_DISCORD_OPTS);
    let discordMeta = {};

    let lastFetch = 0;
    let companyData = null;
    let userInfo = null; // { name, position, company_id, company_name, isDirector }
    let lastPeerReport = null; // cached comparison result for UI
    try { lastPeerReport = JSON.parse(GM_getValue('tcmLastPeerReport', 'null')); } catch (e) { lastPeerReport = null; }
    const PEER_ID_KEY = 'tcmPeerIdsByType'; // { [typeName]: { ids: number[], updated: ts } }
    const PEER_VISIT_KEY = 'tcmPeerManualVisits'; // { [companyId]: ts } — clicked for manual role check
    const TRAIN_LOG_KEY = 'tcmTrainLog'; // { [employeeId]: { trains: n, lastTrain: ts } }
    const METRICS_LOG_KEY = 'tcmMetricsLog'; // weekly company/employee metric snapshots
    const PEER_MAX = 40; // max peers to profile via API per refresh (full 10★ list is cached)
    const SALARY_RATIO_WARN = 0.60; // payroll / daily income
    const EE_TIERS = [50, 100, 150, 200];
    const TRAIN_PRIMARY = 50;   // director train: +50 primary work stat
    const TRAIN_SECONDARY = 25; // director train: +25 secondary work stat
    const TRAINER_TRAINS = { 50: 1, 100: 1, 150: 2, 200: 3 };
    const TRAIN_EXCLUDE_KEY = 'tcmTrainExclude';
    const TRAIN_SETTLE_KEY = 'tcmTrainSettlingDays';
    const TRAIN_CONTRACTS_KEY = 'tcmTrainContracts';
    // Normalize abbreviated job titles (from community TCM scripts)
    const POSITION_ALIASES = {
        'hr officer': 'human resources', 'h.r. officer': 'human resources',
        'marketing mgr': 'marketing manager', 'store mgr': 'store manager',
        'line mgr': 'line manager', 'quality ctrl': 'quality control',
        'p.i.': 'private investigator', 'chief inv.': 'chief investigator',
        'disk jockey': 'disk-jockey', 'dj': 'disk-jockey',
        'personal asst': 'personal assistant', 'supply chain mgr': 'supply chain manager',
        'warehouse mgr': 'warehouse manager', 'procurement mgr': 'procurement manager',
        'mktg. manager': 'marketing manager', 'advertising mgr': 'advertising manager',
        'farm mgr': 'farm manager', 'site mgr': 'site manager', 'team mgr': 'team manager'
    };
    function loadBenchFilter() {
        const f = GM_getValue('tcmBenchFilter', 'ten');
        return ['ten', 'same', 'above', 'top'].includes(f) ? f : 'ten';
    }
    function loadBenchSameSize() {
        return GM_getValue('tcmBenchSameSize', false) === true || GM_getValue('tcmBenchSameSize', '0') === '1';
    }
    const PEER_LIST_CLAIM_MS = 90 * 1000;
    // YATA company type IDs (https://yata.yt/company/browse/)
    const YATA_COMPANY_TYPE_IDS = {
        'Hair Salon': 1, 'Law Firm': 2, 'Flower Shop': 3, 'Car Dealership': 4,
        'Clothing Store': 5, 'Gun Shop': 6, 'Game Shop': 7, 'Candle Shop': 8,
        'Toy Shop': 9, 'Adult Novelties': 10, 'Cyber Cafe': 11, 'Grocery Store': 12,
        'Theater': 13, 'Sweet Shop': 14, 'Cruise Line': 15, 'Television Network': 16,
        'Zoo': 18, 'Firework Stand': 19, 'Property Broker': 20, 'Furniture Store': 21,
        'Gas Station': 22, 'Music Store': 23, 'Nightclub': 24, 'Pub': 25,
        'Gents Strip Club': 26, 'Restaurant': 27, 'Oil Rig': 28, 'Fitness Center': 29,
        'Mechanic Shop': 30, 'Amusement Park': 31, 'Lingerie Store': 32,
        'Meat Warehouse': 33, 'Farm': 34, 'Software Corporation': 35,
        'Ladies Strip Club': 36, 'Private Security Firm': 37, 'Mining Corporation': 38,
        'Detective Agency': 39, 'Logistics Management': 40
    };
    const PEER_STAR = 10;
    const DISCORD_OPTS_KEY = 'tcmDiscordOpts';
    const DISCORD_META_KEY = 'tcmDiscordMeta';
    const CLIENT_ID_KEY = 'tcmClientId';
    // Keep recent ISO weeks for comparisons (JSONBin size control)
    const METRICS_KEEP_WEEKS = 4;
    // Stock smart-balance target: equalize run-out around this many days
    const STOCK_TARGET_DAYS = 7;
    // Training priority mode: 'fair' (tenure share) or 'star' (push EE / stars)
    let trainMode = GM_getValue('tcmTrainMode', 'fair') === 'star' ? 'star' : 'fair';

    /** Stable per-install id for multi-device log dedupe */
    function getClientId() {
        let id = GM_getValue(CLIENT_ID_KEY, '');
        if (!id || typeof id !== 'string' || id.length < 8) {
            id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
            GM_setValue(CLIENT_ID_KEY, id);
        }
        return id;
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /**
     * Coordinate permanent-log posts across devices via JSONBin.
     * Returns true if this client should post the daily log message.
     * Manual force=true bypasses (always allowed to post).
     * Without JSONBin only local meta is used (cannot stop other devices).
     */
    async function shouldPostDailyLog(dateStr, force) {
        if (force) return true;
        const myId = getClientId();
        const now = Date.now();
        const CLAIM_MS = 3 * 60 * 1000; // claim reserved for 3 minutes

        // Refresh shared meta when Data Sync is configured
        if (jsonbinId && jsonbinKey) {
            try { await pullTrainLogRemote(); } catch (e) { /* use local */ }
        }

        // Already completed today
        if (discordMeta.lastLogPostDateTCT === dateStr) return false;
        // Back-compat: older builds only set lastPostDateTCT
        if (discordMeta.lastLogPostDateTCT == null && discordMeta.lastPostDateTCT === dateStr) return false;

        // Another device holds an active claim
        if (
            discordMeta.logClaimDate === dateStr &&
            discordMeta.logClaimId &&
            discordMeta.logClaimId !== myId &&
            (now - (Number(discordMeta.logClaimTs) || 0)) < CLAIM_MS
        ) {
            return false;
        }

        // Claim the slot
        discordMeta.logClaimDate = dateStr;
        discordMeta.logClaimId = myId;
        discordMeta.logClaimTs = now;
        saveDiscordMeta(discordMeta);

        if (jsonbinId && jsonbinKey) {
            try {
                await pushTrainLogRemote(loadTrainLog());
                // Settle race: last writer of claim wins
                await sleep(900);
                try { await pullTrainLogRemote(); } catch (e) { /* ignore */ }
                if (discordMeta.lastLogPostDateTCT === dateStr) return false;
                if (discordMeta.logClaimDate === dateStr && discordMeta.logClaimId && discordMeta.logClaimId !== myId) {
                    return false;
                }
            } catch (e) {
                console.warn('[TCM] log claim push failed', e);
                // Still allow local post if we cannot coordinate
            }
        }
        return true;
    }

    function markDailyLogPosted(dateStr) {
        discordMeta.lastLogPostDateTCT = dateStr;
        discordMeta.lastPostDateTCT = dateStr;
        discordMeta.lastPostTs = Date.now();
        discordMeta.logClaimDate = dateStr;
        discordMeta.logClaimId = getClientId();
        discordMeta.logClaimTs = Date.now();
        saveDiscordMeta(discordMeta);
    }

    function loadJson(key, fallback) {
        const fb = fallback !== undefined ? fallback : {};
        try {
            const raw = GM_getValue(key, null);
            if (raw == null || raw === '') return fb;
            const parsed = JSON.parse(raw);
            return parsed != null ? parsed : fb;
        } catch (e) {
            return fb;
        }
    }

    /** Run async work over items with a concurrency limit (Torn rate-friendly). */
    async function mapPool(items, limit, fn) {
        const list = items || [];
        const results = new Array(list.length);
        let next = 0;
        const workers = Math.min(Math.max(1, limit || 1), list.length || 1);
        async function worker() {
            while (next < list.length) {
                const idx = next++;
                try {
                    results[idx] = { ok: true, value: await fn(list[idx], idx) };
                } catch (err) {
                    results[idx] = { ok: false, error: err };
                }
            }
        }
        await Promise.all(Array.from({ length: workers }, () => worker()));
        return results;
    }

    /** Employees object/array from company payload or bare map */
    function companyRoster(data) {
        if (!data) return {};
        // Prefer detailed employees selection over profile's basic roster
        const detailed = data.company_employees;
        if (detailed && typeof detailed === 'object' && Object.keys(detailed).length) return detailed;
        if (data.employees && typeof data.employees === 'object' && Object.keys(data.employees).length) {
            // Profile-style employees are basic (no work stats) — still usable as fallback
            return data.employees;
        }
        const c = data.company;
        if (c) {
            if (c.company_employees && Object.keys(c.company_employees).length) return c.company_employees;
            if (c.employees && Object.keys(c.employees).length) return c.employees;
        }
        return {};
    }

    function numField(obj, keys) {
        if (!obj || typeof obj !== 'object') return null;
        for (const k of keys) {
            if (obj[k] != null && obj[k] !== '' && !Number.isNaN(Number(obj[k]))) {
                return Number(obj[k]);
            }
        }
        return null;
    }

    function empStats(e) {
        if (!e || typeof e !== 'object') return { man: 0, int: 0, end: 0 };
        // Nested bags used by some v1/v2 shapes
        const bag = e.stats || e.work_stats || e.working_stats || e.employee_stats || e;
        const man = numField(e, ['manual_labor', 'manualLabor', 'manual', 'man', 'ml'])
            ?? numField(bag, ['manual_labor', 'manualLabor', 'manual', 'man', 'ml'])
            ?? 0;
        const int = numField(e, ['intelligence', 'intel', 'int', 'iq'])
            ?? numField(bag, ['intelligence', 'intel', 'int', 'iq'])
            ?? 0;
        const end = numField(e, ['endurance', 'end', 'endu'])
            ?? numField(bag, ['endurance', 'end', 'endu'])
            ?? 0;
        return { man: man || 0, int: int || 0, end: end || 0 };
    }

    function companyCapacity(p, employees) {
        if (!p) p = {};
        const upgrades = p.upgrades || {};
        const cap = numField(p, ['employees_capacity', 'employee_capacity', 'capacity', 'max_employees', 'company_size'])
            ?? numField(upgrades, ['company_size', 'employees_capacity'])
            ?? null;
        if (cap != null && cap > 0) return cap;
        const hired = numField(p, ['employees_hired', 'hired']) ?? Object.keys(employees || {}).length;
        return hired > 0 ? hired : null;
    }

    function companyHired(p, employees) {
        if (!p) p = {};
        return numField(p, ['employees_hired', 'hired', 'employee_count'])
            ?? Object.keys(employees || {}).length
            ?? 0;
    }


    // Position requirements (M / I / E) – extend as needed
        const COMPANY_POSITIONS = {
        "Adult Novelties": [
            { name: "Human Resources", man: 0, int: 12000, end: 6000 },
            { name: "Sexpert", man: 0, int: 10000, end: 5000 },
            { name: "Store Manager", man: 0, int: 4000, end: 8000 },
            { name: "Marketing Manager", man: 0, int: 8000, end: 4000 },
            { name: "Receptionist", man: 0, int: 3000, end: 6000 },
            { name: "Sales Assistant", man: 2000, int: 0, end: 4000 },
            { name: "Cleaner", man: 2000, int: 0, end: 1000 },
        ],
        "Amusement Park": [
            { name: "Inspector", man: 0, int: 135000, end: 67500 },
            { name: "Manager", man: 0, int: 45000, end: 90000 },
            { name: "Marketer", man: 0, int: 90000, end: 45000 },
            { name: "Security Guard", man: 79000, int: 0, end: 39500 },
            { name: "Mechanic", man: 67500, int: 33750, end: 0 },
            { name: "Accountant", man: 0, int: 33750, end: 67500 },
            { name: "Ride Attendant", man: 0, int: 22500, end: 45000 },
            { name: "Entertainer", man: 34000, int: 0, end: 17000 },
            { name: "Ticket Agent", man: 0, int: 11250, end: 22500 },
            { name: "Janitor", man: 22500, int: 0, end: 11250 },
        ],
        "Candle Shop": [
            { name: "Chandler", man: 4500, int: 2250, end: 0 },
            { name: "Trainer", man: 0, int: 4500, end: 2250 },
            { name: "Quality Control", man: 0, int: 1500, end: 3000 },
            { name: "Bookkeeper", man: 0, int: 1250, end: 2500 },
            { name: "Salesperson", man: 0, int: 750, end: 1500 },
            { name: "Cleaner", man: 1000, int: 0, end: 500 },
        ],
        "Car Dealership": [
            { name: "Training Adviser", man: 0, int: 63000, end: 31500 },
            { name: "Manager", man: 0, int: 21000, end: 42000 },
            { name: "Webmaster", man: 0, int: 42000, end: 21000 },
            { name: "Receptionist", man: 0, int: 15750, end: 31500 },
            { name: "Mechanic", man: 26500, int: 0, end: 13250 },
            { name: "Sales Executive", man: 0, int: 21000, end: 10500 },
            { name: "Cleaner", man: 10500, int: 0, end: 5250 },
            { name: "Sales Apprentice", man: 0, int: 5500, end: 2750 },
        ],
        "Clothing Store": [
            { name: "Line Manager", man: 0, int: 6000, end: 3000 },
            { name: "Store Manager", man: 0, int: 2000, end: 4000 },
            { name: "Marketing Manager", man: 0, int: 4000, end: 2000 },
            { name: "Accountant", man: 0, int: 1500, end: 3000 },
            { name: "Security Guard", man: 3000, int: 0, end: 1500 },
            { name: "Salesperson", man: 0, int: 2000, end: 1000 },
            { name: "Cashier", man: 750, int: 0, end: 1500 },
            { name: "Cleaner", man: 1000, int: 0, end: 500 },
            { name: "Sales Trainee", man: 0, int: 500, end: 250 },
        ],
        "Cruise Line": [
            { name: "Captain", man: 0, int: 154500, end: 77250 },
            { name: "First Officer", man: 0, int: 105000, end: 52500 },
            { name: "Doctor", man: 0, int: 103000, end: 51500 },
            { name: "Specialist", man: 0, int: 90000, end: 45000 },
            { name: "Bosun", man: 0, int: 37000, end: 74000 },
            { name: "Marketer", man: 0, int: 72000, end: 36000 },
            { name: "Chef", man: 0, int: 64500, end: 32250 },
            { name: "Engineer", man: 54500, int: 27250, end: 0 },
            { name: "Receptionist", man: 0, int: 21000, end: 42000 },
            { name: "Steward", man: 0, int: 20750, end: 41500 },
            { name: "Bartender", man: 19250, int: 0, end: 38500 },
            { name: "Deckhand", man: 26000, int: 0, end: 13000 },
            { name: "Ticket Agent", man: 0, int: 13000, end: 26000 },
        ],
        "Cyber Cafe": [
            { name: "Teacher", man: 0, int: 30000, end: 15000 },
            { name: "Manager", man: 0, int: 10000, end: 20000 },
            { name: "Marketer", man: 0, int: 20000, end: 10000 },
            { name: "Administrator", man: 0, int: 20000, end: 10000 },
            { name: "Receptionist", man: 0, int: 7500, end: 15000 },
            { name: "Technician", man: 8750, int: 17500, end: 0 },
            { name: "Cashier", man: 0, int: 5000, end: 10000 },
            { name: "Cleaner", man: 5000, int: 0, end: 2500 },
        ],
        "Detective Agency": [
            { name: "Chief Investigator", man: 40000, int: 80000, end: 0 },
            { name: "Client Liaison", man: 0, int: 62000, end: 31000 },
            { name: "Intelligence Analyst", man: 0, int: 58000, end: 29000 },
            { name: "Surveillance", man: 26000, int: 52000, end: 0 },
            { name: "Private Investigator", man: 22500, int: 45500, end: 0 },
            { name: "Trainee Investigator", man: 14000, int: 28000, end: 0 },
            { name: "Secretary", man: 12500, int: 0, end: 25000 },
        ],
        "Farm": [
            { name: "Consultant", man: 0, int: 55500, end: 27750 },
            { name: "Farm Manager", man: 0, int: 18500, end: 37000 },
            { name: "Bookkeeper", man: 0, int: 14000, end: 28000 },
            { name: "Delivery Driver", man: 23000, int: 0, end: 11500 },
            { name: "Dairy Farmer", man: 23000, int: 0, end: 11500 },
            { name: "Herdsperson", man: 18500, int: 0, end: 9250 },
            { name: "Poultry Farmer", man: 18500, int: 0, end: 9250 },
            { name: "Retailer", man: 0, int: 18500, end: 9250 },
            { name: "Harvester", man: 14000, int: 0, end: 7000 },
        ],
        "Firework Stand": [
            { name: "Trainer", man: 0, int: 3000, end: 1500 },
            { name: "Pyrotechnician", man: 3000, int: 1500, end: 0 },
            { name: "Manager", man: 0, int: 1000, end: 2000 },
            { name: "Advertising Manager", man: 0, int: 2000, end: 1000 },
            { name: "Bookkeeper", man: 0, int: 750, end: 1500 },
            { name: "Salesperson", man: 0, int: 500, end: 1000 },
            { name: "Picker Packer", man: 500, int: 0, end: 250 },
        ],
        "Fitness Center": [
            { name: "Manager", man: 0, int: 31000, end: 62000 },
            { name: "Marketer", man: 0, int: 62000, end: 31000 },
            { name: "Nutritionist", man: 27250, int: 54500, end: 0 },
            { name: "Swimming Instructor", man: 23250, int: 0, end: 46500 },
            { name: "Human Resources", man: 0, int: 23250, end: 46500 },
            { name: "Fitness Instructor", man: 46500, int: 0, end: 23250 },
            { name: "Lifeguard", man: 19500, int: 0, end: 39000 },
            { name: "Personal Trainer", man: 31000, int: 0, end: 15500 },
            { name: "Cleaner", man: 15500, int: 0, end: 7750 },
            { name: "Receptionist", man: 0, int: 5000, end: 10000 },
        ],
        "Flower Shop": [
            { name: "Manager", man: 0, int: 1000, end: 2000 },
            { name: "Marketer", man: 0, int: 2000, end: 1000 },
            { name: "Accountant", man: 0, int: 750, end: 1500 },
            { name: "Florist", man: 500, int: 0, end: 1000 },
            { name: "Arranger", man: 500, int: 1000, end: 0 },
            { name: "Cleaner", man: 500, int: 0, end: 250 },
            { name: "Apprentice", man: 250, int: 0, end: 500 },
        ],
        "Furniture Store": [
            { name: "Trainer", man: 0, int: 19500, end: 9750 },
            { name: "Marketer", man: 0, int: 13000, end: 6500 },
            { name: "Manager", man: 0, int: 6500, end: 13000 },
            { name: "Receptionist", man: 0, int: 5000, end: 10000 },
            { name: "Delivery Driver", man: 8000, int: 0, end: 4000 },
            { name: "Sales Clerk", man: 0, int: 3250, end: 6500 },
            { name: "Cleaner", man: 3500, int: 0, end: 1750 },
            { name: "Apprentice", man: 0, int: 750, end: 1500 },
        ],
        "Game Shop": [
            { name: "Store Manager", man: 0, int: 3000, end: 6000 },
            { name: "Marketer", man: 0, int: 6000, end: 3000 },
            { name: "Game Advisor", man: 0, int: 4500, end: 2250 },
            { name: "Accountant", man: 0, int: 2250, end: 4500 },
            { name: "Clerk", man: 1500, int: 0, end: 3000 },
            { name: "Cleaner", man: 1500, int: 0, end: 750 },
        ],
        "Gas Station": [
            { name: "Trainer", man: 0, int: 70500, end: 35250 },
            { name: "Manager", man: 0, int: 30000, end: 60000 },
            { name: "Marketer", man: 0, int: 40000, end: 20000 },
            { name: "Attendant", man: 0, int: 13000, end: 26000 },
            { name: "Cleaner", man: 17500, int: 0, end: 8750 },
        ],
        "Gents Strip Club": [
            { name: "Photographer", man: 0, int: 29000, end: 14500 },
            { name: "Security", man: 29000, int: 0, end: 14500 },
            { name: "Manager", man: 0, int: 14500, end: 29000 },
            { name: "Bookkeeper", man: 0, int: 11000, end: 22000 },
            { name: "Stripper", man: 7250, int: 0, end: 14500 },
            { name: "Cleaner", man: 7500, int: 0, end: 3750 },
        ],
        "Grocery Store": [
            { name: "Trainer", man: 0, int: 18000, end: 9000 },
            { name: "Manager", man: 0, int: 6000, end: 12000 },
            { name: "Marketer", man: 0, int: 12000, end: 6000 },
            { name: "Accountant", man: 0, int: 4500, end: 9000 },
            { name: "Delivery Driver", man: 7500, int: 0, end: 3750 },
            { name: "Cashier", man: 3000, int: 0, end: 6000 },
            { name: "Stock Clerk", man: 4500, int: 0, end: 2250 },
            { name: "Cleaner", man: 3000, int: 0, end: 1500 },
            { name: "Cart Attendant", man: 3000, int: 0, end: 1500 },
        ],
        "Gun Shop": [
            { name: "Instructor", man: 0, int: 22500, end: 11250 },
            { name: "Gunsmith", man: 15000, int: 7500, end: 0 },
            { name: "Manager", man: 0, int: 7500, end: 15000 },
            { name: "Marketer", man: 0, int: 15000, end: 7500 },
            { name: "Bookkeeper", man: 0, int: 5750, end: 11500 },
            { name: "Clerk", man: 3750, int: 0, end: 7500 },
            { name: "Cleaner", man: 4000, int: 0, end: 2000 },
        ],
        "Hair Salon": [
            { name: "Trainer", man: 0, int: 4500, end: 2250 },
            { name: "Aesthetician", man: 0, int: 4500, end: 2250 },
            { name: "Senior Stylist", man: 3000, int: 0, end: 1500 },
            { name: "Receptionist", man: 0, int: 1250, end: 2500 },
            { name: "Colorist", man: 2000, int: 0, end: 1000 },
            { name: "Stylist", man: 1500, int: 0, end: 750 },
            { name: "Nail Technician", man: 750, int: 0, end: 1500 },
            { name: "Shampooist", man: 1000, int: 0, end: 500 },
            { name: "Apprentice", man: 500, int: 0, end: 250 },
        ],
        "Ladies Strip Club": [
            { name: "Photographer", man: 0, int: 33000, end: 16500 },
            { name: "Manager", man: 0, int: 16500, end: 33000 },
            { name: "Bookkeeper", man: 0, int: 12500, end: 25000 },
            { name: "Security", man: 29000, int: 0, end: 14500 },
            { name: "Male Stripper", man: 7250, int: 0, end: 14500 },
            { name: "Cleaner", man: 8500, int: 0, end: 4250 },
        ],
        "Law Firm": [
            { name: "Consultant", man: 0, int: 33000, end: 16500 },
            { name: "Marketer", man: 0, int: 22000, end: 11000 },
            { name: "Secretary", man: 0, int: 8250, end: 16500 },
            { name: "Attorney", man: 0, int: 11000, end: 5500 },
            { name: "Cleaner", man: 5500, int: 0, end: 2750 },
            { name: "Assistant", man: 0, int: 2750, end: 5500 },
        ],
        "Lingerie Store": [
            { name: "Human Resources", man: 0, int: 13500, end: 6750 },
            { name: "Store Manager", man: 0, int: 4500, end: 9000 },
            { name: "Lingerie Model", man: 0, int: 9000, end: 4500 },
            { name: "Salesperson", man: 0, int: 2250, end: 4500 },
            { name: "Cleaner", man: 2500, int: 0, end: 1250 },
            { name: "Trainee", man: 0, int: 500, end: 1000 },
        ],
        "Logistics Management": [
            { name: "Procurement Manager", man: 0, int: 140000, end: 70000 },
            { name: "Supply Chain Manager", man: 0, int: 125000, end: 62500 },
            { name: "Warehouse Manager", man: 0, int: 115000, end: 57500 },
            { name: "Transport Coordinator", man: 0, int: 85000, end: 42500 },
            { name: "Shift Manager", man: 0, int: 90000, end: 45000 },
            { name: "Forklift Operator", man: 30000, int: 0, end: 60000 },
            { name: "Driver", man: 28750, int: 0, end: 57500 },
            { name: "Lumper", man: 45000, int: 0, end: 22500 },
        ],
        "Meat Warehouse": [
            { name: "Supervisor", man: 0, int: 37500, end: 18750 },
            { name: "Quality Controller", man: 12500, int: 25000, end: 0 },
            { name: "Manager", man: 0, int: 12500, end: 25000 },
            { name: "Assistant", man: 0, int: 9500, end: 19000 },
            { name: "Retailer", man: 0, int: 12500, end: 6250 },
            { name: "Butcher", man: 12500, int: 0, end: 6250 },
            { name: "Packer", man: 9500, int: 0, end: 4750 },
            { name: "Cleaner", man: 6500, int: 0, end: 3250 },
            { name: "Apprentice Butcher", man: 3000, int: 0, end: 1500 },
        ],
        "Mechanic Shop": [
            { name: "Trainer", man: 0, int: 25500, end: 12750 },
            { name: "Manager", man: 0, int: 8500, end: 17000 },
            { name: "Receptionist", man: 0, int: 6500, end: 13000 },
            { name: "Technician", man: 8500, int: 0, end: 4250 },
            { name: "Cleaner", man: 4500, int: 0, end: 2250 },
            { name: "Apprentice Technician", man: 2000, int: 0, end: 1000 },
        ],
        "Mining Corporation": [
            { name: "Secretary", man: 0, int: 39000, end: 78000 },
            { name: "Site Manager", man: 0, int: 97000, end: 48750 },
            { name: "Safety Inspector", man: 47500, int: 95000, end: 0 },
            { name: "Mine Engineer", man: 0, int: 81000, end: 40500 },
            { name: "Sales Executive", man: 0, int: 83000, end: 41500 },
            { name: "Electrician", man: 39000, int: 0, end: 78000 },
            { name: "Production Foreman", man: 39500, int: 0, end: 79000 },
            { name: "Mill Operator", man: 75000, int: 0, end: 37500 },
        ],
        "Music Store": [
            { name: "Trainer", man: 0, int: 10500, end: 5250 },
            { name: "Musician", man: 4500, int: 9000, end: 0 },
            { name: "Supervisor", man: 0, int: 3500, end: 7000 },
            { name: "Bookkeeper", man: 0, int: 2750, end: 5500 },
            { name: "Sales Assistant", man: 0, int: 1750, end: 3500 },
            { name: "Cleaner", man: 2000, int: 0, end: 1000 },
            { name: "Sales Apprentice", man: 0, int: 500, end: 1000 },
        ],
        "Nightclub": [
            { name: "Trainer", man: 0, int: 81000, end: 40500 },
            { name: "Manager", man: 0, int: 27000, end: 54000 },
            { name: "Promoter", man: 0, int: 54000, end: 27000 },
            { name: "Disk-jockey", man: 0, int: 40500, end: 20250 },
            { name: "Personal Assistant", man: 0, int: 20250, end: 40500 },
            { name: "Bouncer", man: 48000, int: 0, end: 24000 },
            { name: "Bartender", man: 13500, int: 0, end: 27000 },
            { name: "Barback", man: 10250, int: 0, end: 20500 },
            { name: "Cleaner", man: 13500, int: 0, end: 6750 },
        ],
        "Oil Rig": [
            { name: "Inspector", man: 0, int: 225000, end: 112500 },
            { name: "Driller", man: 150000, int: 75000, end: 0 },
            { name: "Sales Executive", man: 0, int: 131500, end: 65750 },
            { name: "Motor Hand", man: 112500, int: 56250, end: 0 },
            { name: "Secretary", man: 0, int: 56250, end: 112500 },
            { name: "Derrick Hand", man: 94000, int: 0, end: 47000 },
            { name: "Roughneck", man: 75000, int: 0, end: 37500 },
        ],
        "Private Security Firm": [
            { name: "Chief Strategist", man: 0, int: 165000, end: 82500 },
            { name: "Defense Consultant", man: 0, int: 135000, end: 67500 },
            { name: "Team Leader", man: 110000, int: 0, end: 55000 },
            { name: "Medic", man: 0, int: 90000, end: 45000 },
            { name: "Disposal Engineer", man: 0, int: 85000, end: 42500 },
            { name: "Comms Engineer", man: 0, int: 85000, end: 42500 },
            { name: "Armorer", man: 40000, int: 0, end: 80000 },
            { name: "Spokesperson", man: 0, int: 80000, end: 40000 },
            { name: "Reconnaissance", man: 80000, int: 40000, end: 0 },
            { name: "Security Contractor", man: 70000, int: 0, end: 35000 },
            { name: "Company Liaison", man: 0, int: 57500, end: 115000 },
        ],
        "Property Broker": [
            { name: "Broker Support", man: 0, int: 4500, end: 2250 },
            { name: "Valuation Specialist", man: 0, int: 3000, end: 1500 },
            { name: "Team Manager", man: 0, int: 1500, end: 3000 },
            { name: "Graphic Designer", man: 0, int: 3000, end: 1500 },
            { name: "Receptionist", man: 0, int: 1250, end: 2500 },
            { name: "Property Broker", man: 0, int: 750, end: 1500 },
            { name: "Cleaner", man: 1000, int: 0, end: 500 },
            { name: "Associate Broker", man: 0, int: 250, end: 500 },
        ],
        "Pub": [
            { name: "Trainer", man: 0, int: 9000, end: 4500 },
            { name: "Manager", man: 0, int: 3000, end: 6000 },
            { name: "Bouncer", man: 6000, int: 0, end: 3000 },
            { name: "Promoter", man: 0, int: 6000, end: 3000 },
            { name: "Bookkeeper", man: 0, int: 2250, end: 4500 },
            { name: "Bartender", man: 1500, int: 0, end: 3000 },
            { name: "Waiter", man: 1500, int: 0, end: 3000 },
            { name: "Cleaner", man: 1500, int: 0, end: 750 },
        ],
        "Restaurant": [
            { name: "Head Chef", man: 0, int: 2500, end: 5000 },
            { name: "Sous Chef", man: 0, int: 4000, end: 2000 },
            { name: "Head Waiter", man: 0, int: 2000, end: 4000 },
            { name: "Chef", man: 1500, int: 3000, end: 0 },
            { name: "Line Cook", man: 1250, int: 2500, end: 0 },
            { name: "Waiter", man: 1250, int: 0, end: 2500 },
            { name: "Kitchen Assistant", man: 1500, int: 0, end: 750 },
            { name: "Dishwasher", man: 1500, int: 0, end: 750 },
            { name: "Apprentice Chef", man: 750, int: 1500, end: 0 },
        ],
        "Software Corporation": [
            { name: "Consultant", man: 0, int: 72000, end: 36000 },
            { name: "Lead Developer", man: 0, int: 24000, end: 48000 },
            { name: "Marketer", man: 0, int: 48000, end: 24000 },
            { name: "Analyst", man: 0, int: 18000, end: 36000 },
            { name: "Developer", man: 0, int: 24000, end: 12000 },
            { name: "Cleaner", man: 12000, int: 0, end: 6000 },
            { name: "Graphic Designer", man: 0, int: 18000, end: 9000 },
            { name: "Tester", man: 0, int: 12000, end: 6000 },
            { name: "Apprentice", man: 0, int: 6000, end: 3000 },
        ],
        "Sweet Shop": [
            { name: "Manager", man: 0, int: 2000, end: 4000 },
            { name: "Marketer", man: 0, int: 4000, end: 2000 },
            { name: "Bookkeeper", man: 0, int: 1500, end: 3000 },
            { name: "Confectionist", man: 0, int: 2500, end: 1250 },
            { name: "Clerk", man: 1000, int: 0, end: 2000 },
            { name: "Packager", man: 750, int: 0, end: 1500 },
            { name: "Cleaner", man: 1000, int: 0, end: 500 },
        ],
        "Television Network": [
            { name: "Anchor", man: 0, int: 132000, end: 66000 },
            { name: "Attorney", man: 0, int: 132000, end: 66000 },
            { name: "Marketer", man: 0, int: 132000, end: 66000 },
            { name: "Writer", man: 0, int: 115500, end: 57750 },
            { name: "Secretary", man: 0, int: 49500, end: 99000 },
            { name: "Producer", man: 0, int: 99000, end: 49500 },
            { name: "Reporter", man: 0, int: 82500, end: 41250 },
            { name: "Camera Operator", man: 24750, int: 49500, end: 0 },
            { name: "Sales Executive", man: 0, int: 24750, end: 49500 },
            { name: "Stagehand", man: 33000, int: 0, end: 16500 },
            { name: "Cleaner", man: 33000, int: 0, end: 16500 },
            { name: "Programmer", man: 0, int: 66000, end: 33000 },
        ],
        "Theater": [
            { name: "Manager", man: 0, int: 40000, end: 80000 },
            { name: "Marketing Manager", man: 0, int: 80000, end: 40000 },
            { name: "Technician", man: 60000, int: 30000, end: 0 },
            { name: "Accountant", man: 0, int: 30000, end: 60000 },
            { name: "Programmer", man: 0, int: 50000, end: 25000 },
            { name: "Ticketing Agent", man: 0, int: 10000, end: 20000 },
            { name: "Usher", man: 10000, int: 0, end: 20000 },
            { name: "Janitor", man: 20000, int: 0, end: 10000 },
        ],
        "Toy Shop": [
            { name: "Training Advisor", man: 0, int: 15000, end: 7500 },
            { name: "Store Manager", man: 0, int: 5000, end: 10000 },
            { name: "Marketing Executive", man: 0, int: 10000, end: 5000 },
            { name: "Office Clerk", man: 0, int: 3750, end: 7500 },
            { name: "Sales Assistant", man: 2500, int: 0, end: 5000 },
            { name: "Stock Clerk", man: 4000, int: 0, end: 2000 },
            { name: "Cleaner", man: 2500, int: 0, end: 1250 },
        ],
        "Zoo": [
            { name: "Consultant", man: 0, int: 174000, end: 87000 },
            { name: "Manager", man: 0, int: 58000, end: 116000 },
            { name: "Photographer", man: 0, int: 116000, end: 58000 },
            { name: "Veterinarian", man: 58000, int: 116000, end: 0 },
            { name: "Bookkeeper", man: 0, int: 43500, end: 87000 },
            { name: "Animal Trainer", man: 36250, int: 72500, end: 0 },
            { name: "Zoo Keeper", man: 58000, int: 0, end: 29000 },
            { name: "Aquarist", man: 0, int: 29000, end: 58000 },
            { name: "Cashier", man: 0, int: 14500, end: 29000 },
            { name: "Intern", man: 14500, int: 0, end: 7250 },
        ],
    };


    // Normalize API fields that may be string OR object {name, id, ...} in v2
    function safeStr(val) {
        if (val == null || val === '') return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        if (typeof val === 'object') {
            return String(
                val.name || val.position || val.title || val.label ||
                val.company_type || val.type || val.id || ''
            );
        }
        return String(val);
    }
    function calcStatEff(stat, required) {
        if (!required || required <= 0 || !stat || stat <= 0) return 0;
        const ratio = stat / required;
        return Math.floor(Math.min(45, 45 * ratio) + Math.max(0, 5 * Math.log2(ratio)));
    }

    function calcPositionEff(man, int, end, pos) {
        const reqs = [
            { stat: man, req: pos.man },
            { stat: int, req: pos.int },
            { stat: end, req: pos.end }
        ].filter(r => r.req > 0);
        if (!reqs.length) return 0;
        reqs.sort((a, b) => b.req - a.req);
        return calcStatEff(reqs[0].stat, reqs[0].req) + (reqs[1] ? calcStatEff(reqs[1].stat, reqs[1].req) : 0);
    }

    /**
     * Company-aware role fit (0–100-ish).
     * Caps benefit of dumping high stats into low-req roles (e.g. Cleaner),
     * and rewards meeting the role's real requirements.
     */
    function roleFitScore(man, int, end, pos) {
        if (!pos) return 0;
        const pairs = [
            { stat: man, req: Number(pos.man) || 0 },
            { stat: int, req: Number(pos.int) || 0 },
            { stat: end, req: Number(pos.end) || 0 }
        ].filter(r => r.req > 0);
        if (!pairs.length) return 0;
        pairs.sort((a, b) => b.req - a.req);
        const primary = pairs[0];
        const secondary = pairs[1] || null;

        function one(stat, req) {
            const ratio = (Number(stat) || 0) / req;
            if (ratio <= 0) return 0;
            // Strong reward up to meeting reqs; soft cap beyond ~1.25×
            if (ratio < 1) return 50 * ratio;           // 0–50 while under
            if (ratio < 1.25) return 50 + 30 * ((ratio - 1) / 0.25); // 50–80 in sweet spot
            // Diminishing returns for massive overshoot (stops Cleaner-stacking)
            return 80 + Math.min(20, 8 * Math.log2(ratio / 1.25 + 1));
        }

        let score = one(primary.stat, primary.req);
        if (secondary) score = score * 0.55 + one(secondary.stat, secondary.req) * 0.45;
        // Prefer harder roles when scores are close (company needs high-req coverage)
        const demand = pairs.reduce((s, r) => s + r.req, 0);
        score += Math.min(6, demand / 4000);
        return Math.round(score * 10) / 10;
    }

    function getPositionsForType(companyType) {
        let typeKey = safeStr(companyType);
        if (!typeKey && userInfo && userInfo.company_type != null) {
            typeKey = safeStr(userInfo.company_type);
        }
        if (!typeKey) return null;
        // Numeric type id → name
        if (/^\d+$/.test(typeKey)) {
            const named = resolveCompanyTypeName(typeKey, null);
            if (named) typeKey = named;
        } else {
            // Ensure canonical name when possible
            const named = resolveCompanyTypeName(typeKey, null);
            if (named && COMPANY_POSITIONS[named]) typeKey = named;
        }
        const lower = typeKey.toLowerCase();
        let key = Object.keys(COMPANY_POSITIONS).find(k => k.toLowerCase() === lower);
        if (!key) {
            // Fuzzy: substring match (e.g. "gents strip" → Gents Strip Club)
            key = Object.keys(COMPANY_POSITIONS).find(k => {
                const kl = k.toLowerCase();
                return kl.includes(lower) || lower.includes(kl);
            });
        }
        return key ? COMPANY_POSITIONS[key] : null;
    }

    function listSupportedCompanyTypes() {
        return Object.keys(COMPANY_POSITIONS).sort();
    }

    function isPriorityRoleName(name) {
        const n = safeStr(name).toLowerCase();
        return /manager|trainer|promoter|marketer|hr|bouncer|director|secretary|bookkeeper/.test(n);
    }

    function rankPositionsForEmployee(man, int, end, companyType, currentPos) {
        const positions = getPositionsForType(companyType);
        if (!positions || !positions.length) return [];
        const cur = safeStr(currentPos).toLowerCase();
        const ranked = positions.map(pos => ({
            name: pos.name,
            eff: calcPositionEff(man, int, end, pos),
            fit: roleFitScore(man, int, end, pos),
            current: cur && pos.name.toLowerCase() === cur,
            priority: isPriorityRoleName(pos.name)
        }));
        // Sort by company fit, not raw WS (WS still shown in dropdown)
        ranked.sort((a, b) => b.fit - a.fit || b.eff - a.eff || a.name.localeCompare(b.name));
        if (ranked.length) {
            const topFit = ranked[0].fit;
            ranked.forEach(r => { if (Math.abs(r.fit - topFit) < 0.05) r.best = true; });
        }
        return ranked;
    }

    function findBestPosition(man, int, end, companyType) {
        const ranked = rankPositionsForEmployee(man, int, end, companyType, '');
        if (!ranked.length) return null;
        return { name: ranked[0].name, eff: ranked[0].eff, fit: ranked[0].fit };
    }

    /**
     * Peer role-mix targets scaled to our headcount.
     * Uses lastPeerReport.rows (API peer role averages) when available.
     * Returns null when no usable peer data for this company type.
     */
    function getPeerRoleTargets(nStaff, companyType) {
        if (!lastPeerReport || !Array.isArray(lastPeerReport.rows) || !lastPeerReport.rows.length) return null;
        if (!(nStaff > 0)) return null;

        // Prefer matching company type so we don't apply Strip Club mix to a Pub
        const reportType = safeStr(lastPeerReport.typeName).toLowerCase();
        let ourType = safeStr(companyType).toLowerCase();
        if (/^\d+$/.test(ourType)) {
            const named = resolveCompanyTypeName(ourType, null);
            if (named) ourType = named.toLowerCase();
        } else {
            const named = resolveCompanyTypeName(ourType, null);
            if (named) ourType = named.toLowerCase();
        }
        if (reportType && ourType && reportType !== ourType) {
            // Allow fuzzy containment (e.g. "pub" vs "Candlewick Pub")
            if (!reportType.includes(ourType) && !ourType.includes(reportType)) return null;
        }

        const rows = lastPeerReport.rows;
        const sumAvg = rows.reduce((s, r) => s + (Number(r.peerAvg) || 0), 0);
        if (sumAvg <= 0.05) return null;

        // Map peer role names → targets; also build lowercase lookup for fuzzy match later
        const targets = {};
        rows.forEach(r => {
            const name = safeStr(r.role);
            if (!name) return;
            targets[name] = ((Number(r.peerAvg) || 0) / sumAvg) * nStaff;
        });
        return targets;
    }

    /**
     * Greedy company-wide assignment: fit scores + anti-stacking, priority roles first.
     * When peer role-mix data is available (lastPeerReport), targets are scaled to our
     * headcount so the plan prefers under-filled roles vs high-earning peers.
     */
    function suggestCompanyAssignments(empArr, companyType) {
        const positions = getPositionsForType(companyType);
        if (!positions || !positions.length || !empArr.length) return [];

        const people = empArr.map((e, idx) => {
            const st = empStats(e);
            const scores = positions.map(pos => ({
                name: pos.name,
                fit: roleFitScore(st.man, st.int, st.end, pos),
                eff: calcPositionEff(st.man, st.int, st.end, pos),
                priority: isPriorityRoleName(pos.name)
            }));
            return {
                idx,
                emp: e,
                name: e.name || e.playername || e.id || ('#' + idx),
                current: safeStr(e.position),
                st,
                scores,
                totalStats: st.man + st.int + st.end
            };
        });

        const assigned = new Map(); // idx -> role name
        const roleLoad = {};
        positions.forEach(p => { roleLoad[p.name] = 0; });
        const n = people.length;
        // Soft capacity per role (fallback when no peer mix): spread staff
        const softCap = Math.max(1, Math.ceil(n / Math.max(3, Math.min(positions.length, 6))));

        // Peer-informed targets (fractional). null → pure softCap logic
        const peerTargetsRaw = getPeerRoleTargets(n, companyType);
        const peerTargets = {}; // canonical position name → target count
        let usingPeerMix = false;
        if (peerTargetsRaw) {
            // Match peer role strings to our position table (case-insensitive / fuzzy)
            const posByLower = {};
            positions.forEach(p => { posByLower[p.name.toLowerCase()] = p.name; });
            Object.keys(peerTargetsRaw).forEach(role => {
                const rl = role.toLowerCase();
                let canon = posByLower[rl];
                if (!canon) {
                    // Fuzzy: substring either way
                    const hit = Object.keys(posByLower).find(k => k.includes(rl) || rl.includes(k));
                    if (hit) canon = posByLower[hit];
                }
                if (canon) {
                    peerTargets[canon] = (peerTargets[canon] || 0) + peerTargetsRaw[role];
                    usingPeerMix = true;
                }
            });
            // Ensure every known position has a key (0 target if peers never staff it)
            positions.forEach(p => {
                if (peerTargets[p.name] == null) peerTargets[p.name] = 0;
            });
        }

        function crowdingPenalty(roleName) {
            const load = roleLoad[roleName] || 0;
            if (usingPeerMix) {
                const tgt = peerTargets[roleName] != null ? peerTargets[roleName] : softCap;
                // Under target → bonus (negative penalty); over → rising cost
                // Gentle slope so fit still matters; steeper once past target+0.5
                if (load + 0.5 < tgt) return -(tgt - load) * 7;
                if (load < tgt + 0.5) return (load - tgt) * 5;
                return (load - tgt) * 14 + 4;
            }
            // Fallback: mild until soft cap, then steep — stops everyone → Cleaner
            if (load < softCap) return load * 4;
            return softCap * 4 + (load - softCap) * 14;
        }

        function bestOpenRole(person, { priorityOnly } = {}) {
            let best = null;
            for (const s of person.scores) {
                if (priorityOnly && !s.priority) continue;
                const adjusted = s.fit - crowdingPenalty(s.name);
                if (!best || adjusted > best.adjusted) {
                    best = { name: s.name, fit: s.fit, eff: s.eff, adjusted };
                }
            }
            return best;
        }

        // Pass 1: strongest staff → priority roles (one seat each first)
        // Still respect peer underfill: prefer priority roles that peers actually staff
        const priorityNames = positions.filter(p => isPriorityRoleName(p.name)).map(p => p.name);
        const byStrength = people.slice().sort((a, b) => b.totalStats - a.totalStats);
        // When peer mix exists, order priority roles by how under-filled they are first
        const orderedPriority = priorityNames.slice().sort((a, b) => {
            if (!usingPeerMix) return 0;
            const gapA = (peerTargets[a] || 0) - (roleLoad[a] || 0);
            const gapB = (peerTargets[b] || 0) - (roleLoad[b] || 0);
            return gapB - gapA;
        });
        for (const roleName of orderedPriority) {
            // Skip priority roles peers essentially never use (target ~0) unless no peer data
            if (usingPeerMix && (peerTargets[roleName] || 0) < 0.25) continue;
            let pick = null;
            for (const person of byStrength) {
                if (assigned.has(person.idx)) continue;
                const s = person.scores.find(x => x.name === roleName);
                if (!s) continue;
                // Only seat them if they're a reasonable fit (not forcing a 0-stat Manager)
                if (s.fit < 35) continue;
                const adjusted = s.fit - crowdingPenalty(roleName);
                if (!pick || adjusted > pick.adjusted) {
                    pick = { person, roleName, fit: s.fit, eff: s.eff, adjusted };
                }
            }
            if (pick) {
                assigned.set(pick.person.idx, pick.roleName);
                roleLoad[pick.roleName] = (roleLoad[pick.roleName] || 0) + 1;
            }
        }

        // Pass 2: everyone else — best fit with anti-stacking / peer-target bias
        byStrength.forEach(person => {
            if (assigned.has(person.idx)) return;
            const choice = bestOpenRole(person, { priorityOnly: false });
            if (!choice) return;
            assigned.set(person.idx, choice.name);
            roleLoad[choice.name] = (roleLoad[choice.name] || 0) + 1;
        });

        return people.map(person => {
            const suggested = assigned.get(person.idx) || person.current;
            const sugScore = person.scores.find(s => s.name === suggested) || { fit: 0, eff: 0 };
            const curScore = person.scores.find(s => s.name.toLowerCase() === person.current.toLowerCase())
                || { fit: 0, eff: 0 };
            return {
                name: person.name,
                current: person.current || '—',
                suggested,
                currentFit: curScore.fit,
                suggestedFit: sugScore.fit,
                currentEff: curScore.eff,
                suggestedEff: sugScore.eff,
                improve: sugScore.fit - curScore.fit,
                emp: person.emp,
                usedPeerMix: usingPeerMix
            };
        });
    }

    /**
     * Dropdown of role fit + WS for every role in this company type.
     * recommendedRole: company-plan suggestion (shown as "rec" and in the move hint).
     */
    function roleEffDropdownHtml(man, int, end, companyType, currentPos, recommendedRole) {
        const ranked = rankPositionsForEmployee(man, int, end, companyType, currentPos);
        if (!ranked.length) {
            if (man || int || end) return `<span class="tcm-warn">No pos data</span>`;
            return '—';
        }
        const recName = safeStr(recommendedRole);
        const curName = safeStr(currentPos);
        const needsMove = !!(recName && curName && recName.toLowerCase() !== curName.toLowerCase());
        const recEntry = recName ? ranked.find(r => r.name.toLowerCase() === recName.toLowerCase()) : null;

        let html = `<select class="tcm-role-dd" title="Fit score (company-aware) · WS eff — ★ best fit, rec = suggested move">`;
        ranked.forEach(r => {
            const isRec = !!(recName && r.name.toLowerCase() === recName.toLowerCase());
            const marks = [];
            if (r.best) marks.push('★');
            if (isRec && needsMove) marks.push('rec');
            if (r.current) marks.push('now');
            const prefix = marks.length ? marks.join(' ') + ' ' : '';
            const cls = isRec && needsMove ? 'rec' : (r.best ? 'best' : (r.current ? 'current' : ''));
            // Prefer showing recommended role selected when a move is advised
            let selected = '';
            if (needsMove && isRec) selected = ' selected';
            else if (!needsMove && r.current) selected = ' selected';
            else if (!needsMove && !ranked.some(x => x.current) && r.best) selected = ' selected';
            html += `<option class="${cls}" value="${r.name}"${selected}>${prefix}${r.name} · fit ${r.fit} (WS ${r.eff})</option>`;
        });
        html += `</select>`;
        if (needsMove && recEntry) {
            html += ` <span class="tcm-warn tcm-move-hint" title="Company plan suggested role">→ ${recEntry.name}</span>`;
        } else if (needsMove && recName) {
            html += ` <span class="tcm-warn tcm-move-hint">→ ${recName}</span>`;
        }
        return html;
    }

    GM_addStyle(`
        #tcm-panel{
            position:fixed;top:80px;right:12px;
            width:min(520px, calc(100vw - 16px));
            max-width:calc(100vw - 16px);
            max-height:min(85vh, calc(100dvh - 24px));
            background:#1a1a1a;color:#ddd;border:1px solid #444;border-radius:8px;
            z-index:99999;font-family:Arial,sans-serif;font-size:13px;
            box-shadow:0 4px 20px rgba(0,0,0,.6);
            overflow:hidden;display:flex;flex-direction:column;
            box-sizing:border-box;
            left:auto;
        }
        #tcm-header{
            background:#2c2c2c;padding:8px 10px;cursor:move;
            display:flex;justify-content:space-between;align-items:center;
            border-bottom:1px solid #444;gap:6px;flex-shrink:0;flex-wrap:wrap;
        }
        #tcm-header h3{margin:0;font-size:14px;color:#fff;flex:1 1 auto;min-width:0}
        #tcm-header > div{display:flex;flex-wrap:wrap;gap:2px;align-items:center;justify-content:flex-end}
        #tcm-body{
            padding:10px;overflow-y:auto;overflow-x:hidden;flex:1 1 auto;
            -webkit-overflow-scrolling:touch;overscroll-behavior:contain;
            min-height:0;
        }
        /* Only #tcm-body scrolls; content/tables expand the scrollable area */
        #tcm-content,.tcm-tab-panel,.tcm-section{overflow:visible}
        /* Minimized: small floating TCM square (Solenya-style) */
        #tcm-panel.collapsed{
            width:48px !important;
            height:48px !important;
            min-width:48px !important;
            max-width:48px !important;
            max-height:48px !important;
            border-radius:10px;
            cursor:pointer;
            box-shadow:0 2px 12px rgba(0,0,0,.55);
        }
        #tcm-panel.collapsed #tcm-header{
            height:100%;
            padding:0;
            border-bottom:none;
            justify-content:center;
            align-items:center;
            cursor:pointer;
            background:#1e2a3a;
        }
        #tcm-panel.collapsed #tcm-header h3{
            margin:0;
            font-size:13px;
            font-weight:700;
            letter-spacing:.6px;
            color:#7eb8ff;
            text-align:center;
            flex:none;
            line-height:1;
            user-select:none;
        }
        #tcm-panel.collapsed #tcm-header > div{display:none !important}
        #tcm-panel.collapsed #tcm-body{display:none !important}
        .tcm-section{margin-bottom:14px}
        .tcm-section h4{margin:0 0 6px;color:#7eb8ff;font-size:13px;border-bottom:1px solid #333;padding-bottom:3px}
        .tcm-row{display:flex;justify-content:space-between;gap:8px;margin:3px 0;flex-wrap:wrap}
        .tcm-label{color:#aaa;flex:0 1 auto}.tcm-value{font-weight:bold;text-align:right;flex:1 1 auto;min-width:0;word-break:break-word}
        .tcm-good{color:#6f6}.tcm-warn{color:#fc6}.tcm-bad{color:#f66}
        /* Tables flow in #tcm-body scroll — no nested vertical scrollbars.
           Horizontal wrap only on narrow viewports (see media query). */
        .tcm-table-wrap{width:100%;overflow:visible;margin:4px 0;border-radius:4px}
        table.tcm-emp{width:100%;border-collapse:collapse;font-size:12px;table-layout:auto}
        table.tcm-emp th,table.tcm-emp td{padding:4px 5px;text-align:left;border-bottom:1px solid #333;vertical-align:top}
        table.tcm-emp th{background:#2a2a2a;color:#ccc}
        table.tcm-emp td{color:#c8c8c8}
        .tcm-btn{background:#3a6ea5;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:12px;margin:2px;touch-action:manipulation}
        .tcm-btn:hover{background:#4a8ec5}.tcm-btn.danger{background:#a53a3a}.tcm-btn.secondary{background:#555}
        #tcm-status{font-size:11px;color:#888;margin-top:6px}
        .tcm-reco{background:#252525;border-left:3px solid #7eb8ff;padding:6px 8px;margin:4px 0;border-radius:0 4px 4px 0}
        .best-pos{color:#7eb8ff;font-weight:bold}.stats-mini{font-size:11px;color:#c8c8c8}
        select.tcm-role-dd{
            max-width:150px;background:#1e1e1e;color:#c8c8c8;border:1px solid #555;
            border-radius:4px;padding:2px 4px;font-size:11px;cursor:pointer;
        }
        select.tcm-role-dd:focus{outline:1px solid #3a6ea5;border-color:#3a6ea5}
        select.tcm-role-dd option{background:#1e1e1e;color:#c8c8c8}
        select.tcm-role-dd option.best{color:#8f8;font-weight:bold}
        select.tcm-role-dd option.current{color:#fc8}
        select.tcm-role-dd option.rec{color:#7eb8ff;font-weight:bold}
        .tcm-move-hint{font-size:11px;white-space:nowrap;margin-left:2px}
        .dir-badge{background:#1a4a2a;color:#8f8;padding:1px 6px;border-radius:3px;font-size:11px;margin-left:6px}
        .emp-badge{background:#4a3a1a;color:#fc8;padding:1px 6px;border-radius:3px;font-size:11px;margin-left:6px}
        #tcm-view-mode.view-director{background:#1a4a2a}
        #tcm-view-mode.view-employee{background:#4a3a1a}
        .tcm-key-box{background:#222;border:1px solid #555;border-radius:6px;padding:12px;margin-bottom:12px}
        .tcm-key-box input{width:100%;padding:8px;background:#111;border:1px solid #555;color:#fff;border-radius:4px;font-size:13px;box-sizing:border-box;margin:6px 0}
        .tcm-key-box label{display:block;margin-bottom:4px;color:#ccc}
        .tcm-key-note{font-size:11px;color:#888;margin-top:6px;line-height:1.4}
        .tcm-error-box{background:#2a1515;border:1px solid #a53a3a;border-radius:6px;padding:12px;margin-bottom:12px;color:#fcc;line-height:1.5}
        .tcm-error-box strong{color:#f88}
        .tcm-info-box{background:#15202a;border:1px solid #3a6ea5;border-radius:6px;padding:10px;margin-bottom:12px;color:#cde;line-height:1.45;font-size:12px}
        table.tcm-peer{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;table-layout:auto}
        table.tcm-peer th,table.tcm-peer td{padding:3px 5px;text-align:left;border-bottom:1px solid #333}
        table.tcm-peer th{background:#2a2a2a;color:#ccc}
        table.tcm-peer td{color:#c8c8c8}
        .tcm-gap{color:#fc6;font-weight:bold}
        .tcm-ok{color:#6f6}
        .tcm-peer-note{font-size:11px;color:#888;margin-top:6px;line-height:1.4}
 /* roles cached */
        .tcm-tabs{display:flex;gap:4px;margin:8px 0 10px;border-bottom:1px solid #333;padding-bottom:0;flex-wrap:wrap}
        .tcm-tab{background:transparent;border:1px solid transparent;border-bottom:none;color:#aaa;padding:6px 12px;border-radius:6px 6px 0 0;cursor:pointer;font-size:12px;touch-action:manipulation}
        .tcm-tab:hover{color:#ddd;background:#252525}
        .tcm-tab.active{background:#2a2a2a;color:#7eb8ff;border-color:#333;font-weight:bold}
        .tcm-tab-panel{display:none}
        .tcm-tab-panel.active{display:block}
        /* Phones / narrow PDA viewports */
        @media (max-width:640px){
            #tcm-panel:not(.collapsed){
                top:max(8px, env(safe-area-inset-top, 0px));
                right:max(8px, env(safe-area-inset-right, 0px));
                left:max(8px, env(safe-area-inset-left, 0px));
                width:auto;
                max-width:none;
                max-height:calc(100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
                border-radius:10px;
                font-size:12px;
            }
            #tcm-panel:not(.collapsed) #tcm-header{padding:8px;cursor:default}
            #tcm-panel:not(.collapsed) #tcm-header h3{font-size:13px}
            #tcm-body{padding:8px}
            .tcm-btn{padding:6px 10px;font-size:12px;min-height:32px}
            .tcm-tab{padding:8px 10px;font-size:12px}
            /* Horizontal-only scroll for wide tables on phones; vertical stays on #tcm-body */
            .tcm-table-wrap{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}
            table.tcm-emp,table.tcm-peer{font-size:11px;min-width:280px}
            table.tcm-emp th,table.tcm-emp td,
            table.tcm-peer th,table.tcm-peer td{padding:4px 3px}
            .stats-mini{font-size:10px}
        }
        @media (max-width:400px){
            #tcm-panel:not(.collapsed){top:4px;left:4px;right:4px;max-height:calc(100dvh - 8px)}
            #tcm-panel:not(.collapsed) #tcm-header h3{font-size:12px}
            .tcm-tab{padding:6px 8px;font-size:11px}
        }
        @media (max-height:500px) and (max-width:900px){
            #tcm-panel:not(.collapsed){max-height:calc(100dvh - 12px);top:6px}
        }
    `);

    function createPanel() {
        if (document.getElementById('tcm-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'tcm-panel';
        panel.innerHTML = `
            <div id="tcm-header">
                <h3>Company Manager</h3>
                <div>
                    <button class="tcm-btn secondary" id="tcm-view-mode" title="Switch Employee / Director view">Employee View</button>
                    <button class="tcm-btn" id="tcm-refresh" title="Refresh company">↻</button>
                    <button class="tcm-btn secondary" id="tcm-change-key" title="Change API Key">Key</button>
                    <button class="tcm-btn secondary" id="tcm-sync-settings" title="Data Sync (JSONBin)">Data Sync</button>
                    <button class="tcm-btn" id="tcm-toggle">−</button>
                    <button class="tcm-btn danger" id="tcm-close">×</button>
                </div>
            </div>
            <div id="tcm-body">
                <div id="tcm-content"></div>
                <div id="tcm-status"></div>
            </div>`;
        document.body.appendChild(panel);

        const header = panel.querySelector('#tcm-header');
        const titleEl = header.querySelector('h3');
        let dragging = false, dragMoved = false, ox, oy;
        const isNarrow = () => window.matchMedia('(max-width: 640px)').matches;
        const PAD = 8;
        const MINI = 48;

        function savePanelPos() {
            try {
                const r = panel.getBoundingClientRect();
                GM_setValue('tcmPanelPos', JSON.stringify({
                    left: Math.round(r.left),
                    top: Math.round(r.top),
                    collapsed: panel.classList.contains('collapsed')
                }));
            } catch (e) { /* ignore */ }
        }

        function clampPoint(left, top, width, height) {
            const maxL = Math.max(PAD, window.innerWidth - width - PAD);
            const maxT = Math.max(PAD, window.innerHeight - height - PAD);
            return {
                left: Math.min(maxL, Math.max(PAD, left)),
                top: Math.min(maxT, Math.max(PAD, top))
            };
        }

        /** Place panel with explicit left/top (clears right so layout is stable). */
        function placePanel(left, top) {
            panel.style.left = Math.round(left) + 'px';
            panel.style.top = Math.round(top) + 'px';
            panel.style.right = 'auto';
        }

        /**
         * Minimize → 48px square at the top-right of the current panel.
         * Expand → grow from that corner, pinned so the full panel stays on-screen
         * (prefer right-edge anchor when the badge was on the right half).
         */
        function setPanelCollapsed(on) {
            const wantCollapsed = !!on;
            const wasCollapsed = panel.classList.contains('collapsed');
            if (wantCollapsed === wasCollapsed) {
                // Still refresh label/button if needed
            }

            const before = panel.getBoundingClientRect();

            if (wantCollapsed) {
                // Anchor mini square to top-right corner of current panel
                let left = before.right - MINI;
                let top = before.top;
                // If panel had no useful box yet, fall back to saved / default
                if (!before.width || before.width < 10) {
                    left = window.innerWidth - MINI - 12;
                    top = 80;
                }
                const c = clampPoint(left, top, MINI, MINI);
                panel.classList.add('collapsed');
                placePanel(c.left, c.top);
            } else {
                panel.classList.remove('collapsed');
                // Measure expanded size, then position without an off-screen flash:
                // prefer keeping the right edge near where the badge was.
                const afterW = panel.offsetWidth || Math.min(520, window.innerWidth - 16);
                const afterH = panel.offsetHeight || Math.min(window.innerHeight * 0.85, window.innerHeight - 24);
                const badgeRight = before.right || (window.innerWidth - 12);
                const badgeTop = before.top || 80;
                const nearRight = badgeRight >= window.innerWidth * 0.55;

                let left, top;
                if (nearRight) {
                    left = window.innerWidth - afterW - 12;
                    top = badgeTop;
                } else {
                    left = before.left;
                    top = badgeTop;
                }
                const c = clampPoint(left, top, afterW, afterH);
                placePanel(c.left, c.top);
                // Second pass after layout settles (content height may change)
                requestAnimationFrame(() => {
                    if (!panel.classList.contains('collapsed')) {
                        const r = panel.getBoundingClientRect();
                        const c2 = clampPoint(r.left, r.top, r.width, r.height);
                        if (Math.abs(c2.left - r.left) > 1 || Math.abs(c2.top - r.top) > 1) {
                            placePanel(c2.left, c2.top);
                        }
                        savePanelPos();
                    }
                });
            }

            if (titleEl) {
                if (!titleEl.dataset.fullTitle) titleEl.dataset.fullTitle = 'Company Manager';
                titleEl.textContent = wantCollapsed ? 'TCM' : (titleEl.dataset.fullTitle || 'Company Manager');
                titleEl.title = wantCollapsed ? 'Open Company Manager' : '';
            }
            const toggleBtn = panel.querySelector('#tcm-toggle');
            if (toggleBtn) toggleBtn.textContent = wantCollapsed ? '+' : '−';
            try { GM_setValue('tcmPanelCollapsed', wantCollapsed); } catch (e) { /* ignore */ }
            savePanelPos();
        }

        header.addEventListener('mousedown', e => {
            // Allow dragging the minimized square on all viewports; expanded: desktop only
            if (!panel.classList.contains('collapsed') && (isNarrow() || e.target.closest('button'))) return;
            if (panel.classList.contains('collapsed') && e.target.closest('button')) return;
            dragging = true;
            dragMoved = false;
            ox = e.clientX - panel.getBoundingClientRect().left;
            oy = e.clientY - panel.getBoundingClientRect().top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            dragMoved = true;
            const w = panel.offsetWidth;
            const h = panel.offsetHeight;
            let nx = e.clientX - ox;
            let ny = e.clientY - oy;
            const c = clampPoint(nx, ny, w, h);
            placePanel(c.left, c.top);
        });
        document.addEventListener('mouseup', () => {
            if (dragging && dragMoved) savePanelPos();
            dragging = false;
        });

        // Click minimized square (without dragging) → expand
        header.addEventListener('click', e => {
            if (!panel.classList.contains('collapsed')) return;
            if (dragMoved) return;
            if (e.target.closest('button')) return;
            setPanelCollapsed(false);
        });

        // Keep panel on-screen after rotate / resize (no hard jump to defaults)
        window.addEventListener('resize', () => {
            if (!document.getElementById('tcm-panel')) return;
            if (isNarrow() && !panel.classList.contains('collapsed')) {
                panel.style.left = '';
                panel.style.right = '';
                panel.style.top = '';
                panel.style.width = '';
                return;
            }
            const r = panel.getBoundingClientRect();
            const c = clampPoint(r.left, r.top, r.width, r.height);
            if (Math.abs(c.left - r.left) > 1 || Math.abs(c.top - r.top) > 1) {
                placePanel(c.left, c.top);
                savePanelPos();
            }
        });

        panel.querySelector('#tcm-refresh').onclick = () => { if (!apiKey) showKeyInput(); else fetchAll(true); };
        panel.querySelector('#tcm-change-key').onclick = () => showKeyInput();
        panel.querySelector('#tcm-sync-settings').onclick = () => showSyncSettings();
        panel.querySelector('#tcm-view-mode').onclick = () => {
            const next = getPreferredViewMode() === 'director' ? 'employee' : 'director';
            setPreferredViewMode(next);
            updateViewModeButton();
            if (companyData) render(companyData);
            else if (apiKey) fetchAll(true);
        };
        panel.querySelector('#tcm-toggle').onclick = (e) => {
            e.stopPropagation();
            setPanelCollapsed(!panel.classList.contains('collapsed'));
        };
        panel.querySelector('#tcm-close').onclick = () => panel.remove();
        updateViewModeButton();

        // Restore position + minimized state
        try {
            const saved = JSON.parse(GM_getValue('tcmPanelPos', 'null'));
            if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
                const mini = saved.collapsed === true;
                if (mini) panel.classList.add('collapsed');
                const w = mini ? MINI : (panel.offsetWidth || 520);
                const h = mini ? MINI : (panel.offsetHeight || 200);
                const c = clampPoint(saved.left, saved.top, w, h);
                placePanel(c.left, c.top);
                if (mini) {
                    if (titleEl) {
                        titleEl.dataset.fullTitle = titleEl.dataset.fullTitle || 'Company Manager';
                        titleEl.textContent = 'TCM';
                        titleEl.title = 'Open Company Manager';
                    }
                    const toggleBtn = panel.querySelector('#tcm-toggle');
                    if (toggleBtn) toggleBtn.textContent = '+';
                }
            } else if (GM_getValue('tcmPanelCollapsed', false) === true || GM_getValue('tcmPanelCollapsed', '0') === '1') {
                setPanelCollapsed(true);
            }
        } catch (e) {
            if (GM_getValue('tcmPanelCollapsed', false) === true) setPanelCollapsed(true);
        }
    }

    /** Preferred UI mode: 'employee' | 'director'. Defaults from role if never set. */
    function getPreferredViewMode() {
        const saved = GM_getValue('tcmViewMode', '');
        if (saved === 'employee' || saved === 'director') return saved;
        return (userInfo && userInfo.isDirector) ? 'director' : 'employee';
    }
    function setPreferredViewMode(mode) {
        GM_setValue('tcmViewMode', mode === 'director' ? 'director' : 'employee');
    }
    function isDirectorUi() {
        return getPreferredViewMode() === 'director';
    }
    function updateViewModeButton() {
        const btn = document.getElementById('tcm-view-mode');
        if (!btn) return;
        const dir = isDirectorUi();
        btn.textContent = dir ? 'Director View' : 'Employee View';
        btn.classList.toggle('view-director', dir);
        btn.classList.toggle('view-employee', !dir);
        btn.title = dir
            ? 'Showing full director tools – click for simplified Employee View'
            : 'Showing simplified employee summary – click for full Director View';
    }

    function setStatus(msg, isError) {
        const el = document.getElementById('tcm-status');
        if (el) { el.textContent = msg; el.style.color = isError ? '#f66' : '#888'; }
    }

    /** Horizontal scroll wrappers so wide tables fit phones without blowing the panel width */
    function wrapWideTables(root) {
        if (!root) return;
        root.querySelectorAll('table.tcm-emp, table.tcm-peer').forEach(t => {
            if (t.parentElement && t.parentElement.classList.contains('tcm-table-wrap')) return;
            const w = document.createElement('div');
            w.className = 'tcm-table-wrap';
            t.parentNode.insertBefore(w, t);
            w.appendChild(t);
        });
    }

    function showKeyInput() {
        const content = document.getElementById('tcm-content');
        if (!content) return;
        const hasKey = !!(apiKey && apiKey.length);
        content.innerHTML = `
            <div class="tcm-key-box">
                <label><strong>Torn API Key</strong></label>
                <input type="text" id="tcm-key-input" placeholder="Paste your 16-character API key here" value="${apiKey || ''}" autocomplete="off" spellcheck="false">
                <div>
                    <button class="tcm-btn" id="tcm-save-key">Save Key & Load Company</button>
                    ${!hasKey ? '<button class="tcm-btn" id="tcm-create-key" style="background:#2a7a4a">Create Custom Key</button>' : ''}
                    ${hasKey ? '<button class="tcm-btn secondary" id="tcm-clear-key">Clear Key</button>' : ''}
                </div>
                <div class="tcm-key-note">
                    ${!hasKey ? '• <strong>Create Custom Key</strong> opens Torn preferences with only the permissions this script needs (user: profile, job, basic · company: profile, employees, stock, detailed). Confirm on that page, then paste the new key here.<br>' : ''}
                    • Or create manually at <strong>Preferences → API</strong><br>
                    • You must be the <strong>Director</strong> for full employee/stock data<br>
                    • This script uses the <strong>Torn API only</strong> (no page scraping)<br>
                    • Key stays in your browser (GM storage). On <strong>Torn PDA</strong>, API key can auto-fill via PDA.<br>
                    • Optional Data Sync uses JSONBin (needs PUT — PDA with GMforPDA 2.3+ recommended);<br>
                    &nbsp;&nbsp;Discord webhooks post only what you enable<br>
                    • Rate limit: stay under ~100 API requests/minute<br>
                    • Key is stored only in this browser
                </div>
            </div>`;
        document.getElementById('tcm-save-key').onclick = () => {
            const val = (document.getElementById('tcm-key-input').value || '').trim();
            if (val.length < 16) { setStatus('Key looks too short (should be 16 characters)', true); return; }
            apiKey = val;
            GM_setValue('tornCompanyApiKey', apiKey);
            setStatus('Key saved. Checking director status…');
            fetchAll(true);
        };

        const createBtn = document.getElementById('tcm-create-key');
        if (createBtn) {
            createBtn.onclick = () => {
                // Opens Torn API key form pre-filled with minimal custom selections.
                // User confirms creation on Torn; then pastes the key back here.
                window.open(CUSTOM_KEY_URL, '_blank');
                setStatus('Confirm the key on the Torn page, then paste it here');
            };
        }

        const clearBtn = document.getElementById('tcm-clear-key');
        if (clearBtn) clearBtn.onclick = () => { apiKey = ''; GM_setValue('tornCompanyApiKey', ''); showKeyInput(); setStatus('Key cleared'); };
        setTimeout(() => { const i = document.getElementById('tcm-key-input'); if (i) i.focus(); }, 80);
    }

    function showErrorBox(title, messages) {
        const content = document.getElementById('tcm-content');
        if (!content) return;
        let html = `<div class="tcm-error-box"><strong>${title}</strong><br><br>`;
        messages.forEach(m => { html += `• ${m}<br>`; });
        html += `<br><button class="tcm-btn" id="tcm-retry">Retry</button>
                 <button class="tcm-btn secondary" id="tcm-change-key-err">Change Key</button></div>`;
        content.innerHTML = html;
        document.getElementById('tcm-retry').onclick = () => fetchAll(true);
        document.getElementById('tcm-change-key-err').onclick = () => showKeyInput();
    }

    // ---------- Native API v2 layer ----------
    // v2 path style:  /v2/{section}/{selection}?key=
    // v2 query style: /v2/{section}/?selections=a,b&key=
    // v1 fallback:    /{section}/?selections=a,b&key=  (only on error 22)

    function normalizeXhrResponse(res) {
        // PDA_http* and GM may return slightly different shapes
        const status = res && (res.status != null ? res.status : (res.statusCode != null ? res.statusCode : 200));
        const raw = res && (res.responseText != null ? res.responseText
            : (res.response != null ? res.response
            : (typeof res === 'string' ? res : '')));
        let data = null;
        if (raw != null && raw !== '') {
            try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { data = raw; }
        } else if (res && res.data != null) {
            data = res.data;
        }
        return { status: Number(status) || 0, data, raw };
    }

    function xhrJson(method, url, headers, body) {
        const m = String(method || 'GET').toUpperCase();
        const h = Object.assign({}, headers || {});
        const payload = body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;

        function finish(res, resolve, reject) {
            const n = normalizeXhrResponse(res);
            if (n.status >= 200 && n.status < 300) resolve({ status: n.status, data: n.data });
            else {
                const err = new Error('HTTP ' + n.status);
                err.status = n.status;
                err.data = n.data;
                reject(err);
            }
        }

        // Prefer native PDA handlers when available (reliable PUT/PATCH on mobile)
        const pdaGet = typeof PDA_httpGet === 'function' ? PDA_httpGet : null;
        const pdaPost = typeof PDA_httpPost === 'function' ? PDA_httpPost : null;
        const pdaPut = typeof PDA_httpPut === 'function' ? PDA_httpPut : null;
        const pdaPatch = typeof PDA_httpPatch === 'function' ? PDA_httpPatch : null;
        const pdaDel = typeof PDA_httpDelete === 'function' ? PDA_httpDelete : null;

        if (IS_PDA || pdaGet || pdaPost) {
            return new Promise((resolve, reject) => {
                let p = null;
                try {
                    if (m === 'GET' && pdaGet) p = pdaGet(url, h);
                    else if (m === 'POST' && pdaPost) p = pdaPost(url, h, payload || '');
                    else if (m === 'PUT' && pdaPut) p = pdaPut(url, h, payload || '');
                    else if (m === 'PATCH' && pdaPatch) p = pdaPatch(url, h, payload || '');
                    else if (m === 'DELETE' && pdaDel) p = pdaDel(url, h);
                    else if (m === 'PUT' && pdaPost) {
                        // Older PDA: no PUT — try POST (JSONBin may reject; caller can fallback)
                        p = pdaPost(url, h, payload || '');
                    } else if (m === 'PATCH' && pdaPost) {
                        p = pdaPost(url, h, payload || '');
                    } else if (pdaGet && m === 'GET') {
                        p = pdaGet(url, h);
                    }
                } catch (e) {
                    p = null;
                }
                if (p && typeof p.then === 'function') {
                    p.then(res => finish(res, resolve, reject)).catch(err => reject(err || new Error('Network error')));
                    return;
                }
                // Fall through to GM_xmlhttpRequest
                if (typeof GM_xmlhttpRequest !== 'function') {
                    reject(new Error('No HTTP transport (install GMforPDA or update Torn PDA)'));
                    return;
                }
                GM_xmlhttpRequest({
                    method: m,
                    url,
                    headers: h,
                    data: payload,
                    onload: res => finish(res, resolve, reject),
                    onerror: () => reject(new Error('Network error'))
                });
            });
        }

        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'function') {
                reject(new Error('GM_xmlhttpRequest unavailable'));
                return;
            }
            GM_xmlhttpRequest({
                method: m,
                url,
                headers: h,
                data: payload,
                onload: res => finish(res, resolve, reject),
                onerror: () => reject(new Error('Network error'))
            });
        });
    }

    function rawGet(url) {
        if (!apiKey) return Promise.reject(Object.assign(new Error('No API key set'), { code: 1 }));
        const full = url + (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(apiKey) + '&comment=CompanyManager';
        return xhrJson('GET', full).then(r => {
            const data = r.data;
            if (data && data.error) {
                const err = new Error(data.error.code + ': ' + data.error.error);
                err.code = data.error.code;
                throw err;
            }
            return data;
        });
    }

    // Try v2 path, then v2 query, then v1 query (only if needed)
    async function apiGet(section, selection) {
        const tries = [
            // Native v2 path-style (preferred)
            API_BASE_V2 + '/' + section + '/' + selection,
            // v2 query-style
            API_BASE_V2 + '/' + section + '/?selections=' + selection,
            // v1 query-style last resort
            API_BASE_V1 + '/' + section + '/?selections=' + selection
        ];
        let lastErr = null;
        for (const url of tries) {
            try {
                return await rawGet(url);
            } catch (err) {
                lastErr = err;
                // 23 = must use v2 → skip pure v1 later is automatic since we try v2 first
                // 22 = v1 only → continue to next
                // 4 = wrong fields → try next style
                if ([22, 23, 4, 3].includes(err.code)) continue;
                // other errors (7, 2, 16, network) – stop
                throw err;
            }
        }
        throw lastErr || new Error('API request failed for ' + section + '/' + selection);
    }

    // Multi-selection helper: fetch selections in parallel, merge what succeeds
    async function apiGetMany(section, selections) {
        const list = selections.split(',').map(s => s.trim()).filter(Boolean);
        const merged = {};
        let any = false;
        let lastErr = null;
        const settled = await Promise.all(list.map(sel =>
            apiGet(section, sel).then(data => ({ sel, data })).catch(err => ({ sel, err }))
        ));
        for (const r of settled) {
            if (r.data) {
                Object.assign(merged, r.data);
                any = true;
            } else if (r.err) {
                lastErr = r.err;
                if ([1, 2, 16].includes(r.err.code)) throw r.err;
            }
        }
        if (!any) throw lastErr || new Error('No data returned for ' + section);
        return merged;
    }

    // Pull company membership from many possible response shapes (v1/v2)
    function extractJobInfo(data) {
        const profile = data.profile || data;
        const job = data.job || profile.job || profile.jobinfo || data.jobinfo || {};
        const basic = data.basic || profile.basic || {};

        const name = profile.name || profile.playername || basic.name || data.name || 'Unknown';
        const playerId = Number(
            profile.player_id || profile.id || profile.user_id ||
            basic.player_id || basic.id ||
            data.player_id || data.id || data.user_id || 0
        ) || 0;

        const companyId = Number(
            job.company_id || job.companyId ||
            profile.company_id || profile.companyId ||
            data.company_id || data.companyId ||
            basic.company_id || 0
        ) || 0;

        const companyName = (
            job.company_name || job.companyName || job.company ||
            profile.company_name || profile.companyName ||
            data.company_name || null
        );

        // Employees often only get type on user/job — not on limited company profile
        let companyType = job.company_type != null ? job.company_type
            : (job.companyType != null ? job.companyType
            : (profile.company_type != null ? profile.company_type
            : (data.company_type != null ? data.company_type : null)));
        // v2 sometimes nests type as object
        if (companyType && typeof companyType === 'object') {
            companyType = companyType.id != null ? companyType.id
                : (companyType.name || companyType.type || null);
        }

        let position = safeStr(
            job.position || job.job || job.role ||
            profile.position || profile.job ||
            ''
        );

        const explicitDirector = !!(
            job.director || profile.director || data.director ||
            (job.is_director === true) || (profile.is_director === true)
        );

        const isDirector = explicitDirector || /director/i.test(position);

        const posLower = position.toLowerCase();
        const unemployed = !position || posLower === 'none' || posLower === 'unemployed' || posLower === 'jobless';
        const inCompany = !!(companyId || companyName || (position && !unemployed));

        return {
            name,
            player_id: playerId,
            position: position || (inCompany ? 'Employee' : 'None'),
            company_id: companyId,
            company_name: companyName,
            company_type: companyType,
            isDirector,
            inCompany
        };
    }

    /** Promote to director when company profile's director id matches this player. */
    function applyDirectorFromCompanyData(data) {
        if (!userInfo || !data) return;
        const c = data.company || data.profile || data;
        const directorId = Number(c.director || c.director_id || c.directorId || 0) || 0;
        const myId = Number(userInfo.player_id || 0) || 0;
        if (directorId && myId && directorId === myId) {
            userInfo.isDirector = true;
            userInfo.company_name = userInfo.company_name || c.name || null;
            userInfo.company_id = userInfo.company_id || Number(c.ID || c.id || 0) || userInfo.company_id;
        }
        if (userInfo && (c.company_type != null || c.type != null)) {
            const t = c.company_type != null ? c.company_type : c.type;
            userInfo.company_type = t && typeof t === 'object'
                ? (t.id != null ? t.id : t.name)
                : t;
        }
        // detailed / stock only succeed for directors
        if (data.company_bank != null || data.company_stock || data.stock ||
            (c && (c.company_bank != null || c.advertising_budget != null || c.trains_available != null))) {
            userInfo.isDirector = true;
        }
    }

    async function checkDirectorStatus() {
        // Prefer discrete v2 endpoints, then combined
        const tries = [
            () => apiGetMany('user', 'profile,job'),
            () => apiGet('user', 'profile'),
            () => apiGet('user', 'job'),
            () => apiGet('user', 'basic'),
            () => apiGetMany('user', 'profile,basic')
        ];
        let lastErr = null;
        let data = null;

        for (const fn of tries) {
            try {
                data = await fn();
                break;
            } catch (err) {
                lastErr = err;
                if ([22, 23, 4, 3].includes(err.code)) continue;
                throw err;
            }
        }

        if (!data) throw lastErr || new Error('Could not load user profile');

        userInfo = extractJobInfo(data);

        // Always probe company profile for membership + director id match
        try {
            const cdata = await apiGet('company', 'profile');
            const c = cdata.company || cdata.profile || cdata;
            if (c && (c.name || c.rating != null || c.company_type || c.type)) {
                userInfo.inCompany = true;
                userInfo.company_name = userInfo.company_name || c.name || null;
                userInfo.company_id = userInfo.company_id || Number(c.ID || c.id || 0) || userInfo.company_id;
                applyDirectorFromCompanyData(cdata);
                // Director-only fields on profile response
                if (c.company_bank != null || c.daily_income != null || c.employees_capacity != null) {
                    // capacity is public; bank is often director-only depending on access
                }
            }
        } catch (e) { /* ignore */ }

        return userInfo;
    }

    async function fetchCompanyData(isDirector) {
        // Parallel company selections (profile / employees / stock / detailed)
        const wanted = isDirector
            ? ['profile', 'employees', 'stock', 'detailed']
            : ['profile', 'employees'];

        const settled = await Promise.all(wanted.map(sel =>
            apiGet('company', sel).then(data => ({ sel, data })).catch(err => ({ sel, err }))
        ));

        const merged = {};
        const got = [];
        let lastError = null;
        for (const r of settled) {
            if (r.data) {
                Object.assign(merged, r.data);
                got.push(r.sel);
            } else if (r.err) {
                lastError = r.err;
                // Director-only / field-shape errors: skip; auth errors: hard fail
                if ([1, 2, 16].includes(r.err.code)) throw r.err;
            }
        }

        if (!got.length) throw lastError || new Error('Failed to load company data');
        return { data: merged, selections: got.join(',') };
    }


    // ---------- Peer ID cache (Torn API / weekly JSONBin) + 10★ comparison ----------
    function loadPeerIdCache() { return loadJson(PEER_ID_KEY, {}); }


    function fmtTime(ts) {
        if (!ts) return 'never';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return 'never';
        return d.toLocaleString();
    }

    function showToast(msg, ms) {
        let toast = document.getElementById('tcm-joblist-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tcm-joblist-toast';
            toast.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#1a4a2a;color:#cfc;padding:8px 12px;border-radius:6px;z-index:99999;font:12px Arial;border:1px solid #3a6a4a;box-shadow:0 2px 10px rgba(0,0,0,.4)';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        clearTimeout(toast._hide);
        toast._hide = setTimeout(() => { if (toast.parentNode) toast.remove(); }, ms || 3500);
    }


    function peerCacheInfo(typeName) {
        const cache = loadPeerIdCache();
        const typed = typeName ? cache[String(typeName).toLowerCase()] : null;
        const all = cache['_all'];
        const entry = (typed && typed.ids && typed.ids.length) ? typed : all;
        return {
            ids: entry && entry.ids ? entry.ids : [],
            updated: entry && entry.updated ? entry.updated : null,
            source: (typed && typed.ids && typed.ids.length) ? 'type' : (all && all.ids && all.ids.length ? 'all' : 'none')
        };
    }

    function savePeerIds(typeName, ids, meta) {
        if (!typeName || !ids || !ids.length) return;
        const cache = loadPeerIdCache();
        const key = String(typeName).toLowerCase();
        const prev = cache[key] && cache[key].ids ? cache[key].ids : [];
        const merged = Array.from(new Set(prev.concat(ids).map(Number).filter(n => n > 0)));
        cache[key] = Object.assign({}, cache[key], meta || {}, {
            ids: merged.slice(-500),
            updated: Date.now()
        });
        GM_setValue(PEER_ID_KEY, JSON.stringify(cache));
    }

    /** Replace peer ID list for a type (used for weekly full 10★ refresh). */
    function setPeerListForType(typeName, entry) {
        if (!typeName) return;
        const cache = loadPeerIdCache();
        const key = String(typeName).toLowerCase();
        cache[key] = Object.assign({}, entry, {
            ids: (entry.ids || []).map(Number).filter(n => n > 0),
            updated: entry.updated || Date.now()
        });
        GM_setValue(PEER_ID_KEY, JSON.stringify(cache));
    }

    function getPeerListEntry(typeName) {
        const cache = loadPeerIdCache();
        return cache[String(typeName).toLowerCase()] || null;
    }

    /**
     * Week key for peer-list refresh = calendar date (UTC) of the most recent
     * Sunday 18:00 TCT that has already passed.
     */
    function peerListWeekKey(date) {
        const now = date ? new Date(date) : new Date();
        const day = now.getUTCDay(); // 0 = Sunday
        const sunday = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - day,
            18, 0, 0, 0
        ));
        if (now.getTime() < sunday.getTime()) {
            sunday.setUTCDate(sunday.getUTCDate() - 7);
        }
        return sunday.toISOString().slice(0, 10);
    }

    function peerListNeedsWeeklyRefresh(entry) {
        const week = peerListWeekKey();
        if (!entry || !entry.ids || !entry.ids.length) return true;
        if (entry.weekKey !== week) return true;
        return false;
    }

    /** Wipe local peer ID list and last comparison report. */
    function clearPeerCaches() {
        try { GM_setValue(PEER_ID_KEY, '{}'); } catch (e) { /* ignore */ }
        lastPeerReport = null;
        try { GM_setValue('tcmLastPeerReport', 'null'); } catch (e) { /* ignore */ }
    }


    /** Force Update: clear peer ID cache and rebuild 10★ list from Torn API. */
    async function forceUpdatePeers() {
        if (!apiKey) { showKeyInput(); return; }
        if (!companyData && !userInfo) {
            setStatus('Load company data first', true);
            return;
        }
        setStatus('Force update: clearing peer cache…');
        clearPeerCaches();
        showToast('Peer cache cleared — reloading from Torn API…', 3000);
        await refreshPeers({ force: true });
    }

    function resolveYataTypeId(companyType) {
        const raw = safeStr(companyType);
        if (!raw) return null;
        if (/^\d+$/.test(raw)) {
            const n = Number(raw);
            return Object.values(YATA_COMPANY_TYPE_IDS).includes(n) ? n : n;
        }
        const key = Object.keys(YATA_COMPANY_TYPE_IDS).find(k => k.toLowerCase() === raw.toLowerCase());
        if (key) return YATA_COMPANY_TYPE_IDS[key];
        // Partial match (API sometimes returns shortened names)
        const partial = Object.keys(YATA_COMPANY_TYPE_IDS).find(k =>
            k.toLowerCase().includes(raw.toLowerCase()) || raw.toLowerCase().includes(k.toLowerCase())
        );
        return partial ? YATA_COMPANY_TYPE_IDS[partial] : null;
    }

    function resolveCompanyTypeName(companyType, p) {
        const raw = safeStr(companyType) || safeStr(p && (p.company_type || p.type));
        if (!raw) return '';
        if (!/^\d+$/.test(raw)) return raw;
        const n = Number(raw);
        const named = Object.keys(YATA_COMPANY_TYPE_IDS).find(k => YATA_COMPANY_TYPE_IDS[k] === n);
        return named || raw;
    }

    /**
     * Resolve company type for peer list (works for employees).
     * Sources: company profile, userInfo.company_type (from job), cached peer entry.
     */
    function collectCompanyTypeCandidates() {
        const p = (companyData && (companyData.company || companyData.profile)) || {};
        const candidates = [];
        const push = (v) => {
            if (v == null || v === '') return;
            if (typeof v === 'object') {
                if (v.id != null) candidates.push(v.id);
                if (v.name) candidates.push(v.name);
                if (v.type != null && typeof v.type !== 'object') candidates.push(v.type);
                return;
            }
            candidates.push(v);
        };
        push(p.company_type);
        push(p.type);
        push(p.company_type_id);
        push(p.type_id);
        if (userInfo) {
            push(userInfo.company_type);
            push(userInfo.company_type_id);
        }
        // Last peer report / cache may remember type name
        if (lastPeerReport && lastPeerReport.typeName) push(lastPeerReport.typeName);
        return candidates;
    }

    function resolveOwnTypeNameSync() {
        const cands = collectCompanyTypeCandidates();
        for (const c of cands) {
            const name = resolveCompanyTypeName(c, null);
            if (name && resolveYataTypeId(name)) return name;
            if (name && !/^\d+$/.test(String(name))) return name;
        }
        // Numeric type id alone
        for (const c of cands) {
            const id = resolveYataTypeId(c);
            if (id) return resolveCompanyTypeName(id, null) || String(id);
        }
        return '';
    }

    /** If type still unknown, fetch public profile for our company_id. */
    async function ensureOwnCompanyType() {
        let typeName = resolveOwnTypeNameSync();
        if (typeName && resolveYataTypeId(typeName)) return typeName;

        const cid = Number(
            (userInfo && userInfo.company_id) ||
            ((companyData && (companyData.company || companyData.profile) || {}).ID) ||
            ((companyData && (companyData.company || companyData.profile) || {}).id) || 0
        ) || 0;
        if (!cid) return typeName || '';

        try {
            const data = await fetchPeerCompany(cid);
            const meta = extractCompanyMeta(data);
            const c = (meta && meta.c) || data.company || data.profile || data || {};
            let t = c.company_type != null ? c.company_type : c.type;
            if (t && typeof t === 'object') t = t.id != null ? t.id : (t.name || null);
            typeName = resolveCompanyTypeName(t, c) || resolveCompanyTypeName(meta && meta.cType, c) || '';
            if (userInfo && t != null) userInfo.company_type = t;
            // Stash onto companyData so later renders see it
            if (companyData && typeName) {
                const root = companyData.company || companyData.profile || companyData;
                if (root && root.company_type == null && t != null) root.company_type = t;
            }
        } catch (e) {
            console.warn('[TCM] ensureOwnCompanyType profile fetch failed', e && e.message);
        }
        return typeName || resolveOwnTypeNameSync() || '';
    }

    function parseYataCompanyTable(html) {
        if (!html || typeof html !== 'string') return [];
        const rows = [];
        const re = /<tr[^>]*data-tId="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const id = Number(m[1]);
            const block = m[2];
            const nameMatch = block.match(/title="([^"]+?)\s*\[\d+\]"/i) || block.match(/>([^<]+?)\s*\[\d+\]</);
            let name = nameMatch ? nameMatch[1].replace(/\s*\[\d+\]\s*$/, '').trim() : null;
            const starTitle = block.match(/title="(\d+)\s*stars?"/i);
            let rating = starTitle ? Number(starTitle[1]) : null;
            if (rating == null) {
                const stars = (block.match(/fa-star/g) || []).length;
                if (stars > 0) rating = stars;
            }
            const incomeMatch = block.match(/\$([0-9,]+)/);
            const income = incomeMatch ? Number(incomeMatch[1].replace(/,/g, '')) : null;
            const daysMatch = block.match(/(\d+)\s*days/i);
            const daysOld = daysMatch ? Number(daysMatch[1]) : null;
            if (id > 0) rows.push({ id, name, rating, income, daysOld });
        }
        return rows;
    }

    async function fetchYataPeerListings(companyType) {
        const typeId = resolveYataTypeId(companyType);
        if (!typeId) {
            const err = new Error('Unknown company type for YATA: ' + companyType);
            err.code = 'yata-type';
            throw err;
        }
        const collected = [];
        const seen = new Set();
        for (let page = 1; page <= 4; page++) {
            const url = 'https://yata.yt/company/browse/companies/?company_id=' + typeId +
                (page > 1 ? ('&page=' + page) : '');
            const res = await xhrJson('GET', url, { Accept: 'text/html' });
            const html = typeof res.data === 'string' ? res.data : String(res.data || '');
            const rows = parseYataCompanyTable(html);
            if (!rows.length) break;
            rows.forEach(r => {
                if (!seen.has(r.id)) {
                    seen.add(r.id);
                    collected.push(r);
                }
            });
            // YATA pages ~25 rows; stop early if short page
            if (rows.length < 20) break;
        }
        return {
            typeId,
            rows: collected,
            tenStarIds: collected.filter(r => r.rating != null && r.rating >= 10).map(r => r.id),
            allIds: collected.map(r => r.id)
        };
    }

    async function importPeersFromYata(companyType) {
        const typeName = resolveCompanyTypeName(companyType) || safeStr(companyType);
        setStatus('Fetching peer list from YATA…');
        const yata = await fetchYataPeerListings(typeName || companyType);
        // Prefer 10★; fall back to top of list (already income-sorted by YATA)
        const prefer = yata.tenStarIds.length ? yata.tenStarIds : yata.allIds;
        if (!prefer.length) throw new Error('YATA returned no companies for this type');
        savePeerIds(typeName || String(yata.typeId), prefer, { source: 'yata', yataTypeId: yata.typeId });
        savePeerIds('_all', prefer, { source: 'yata' });
        return yata;
    }

    function getCachedPeerIds(typeName) {
        const cache = loadPeerIdCache();
        const entry = cache[String(typeName).toLowerCase()];
        return entry && entry.ids ? entry.ids : [];
    }

    function normalizeEmployeeList(data) {
        const raw = companyRoster(data);
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'object') return Object.values(raw);
        return [];
    }

    // Always return an array of employee objects from various shapes
    function getEmpList(dataOrMap) {
        if (!dataOrMap) return [];
        if (Array.isArray(dataOrMap)) return dataOrMap;
        const fromNorm = normalizeEmployeeList(dataOrMap);
        if (fromNorm.length) return fromNorm;
        if (typeof dataOrMap === 'object') {
            // bare employees map
            const vals = Object.values(dataOrMap);
            if (vals.length && vals[0] && typeof vals[0] === 'object') return vals;
        }
        return [];
    }

    function normalizePositionName(pos) {
        let p = safeStr(pos).toLowerCase().replace(/\s+/g, ' ').trim();
        if (!p) return '';
        if (POSITION_ALIASES[p]) p = POSITION_ALIASES[p];
        return p;
    }

    function countRoles(employees) {
        const counts = {};
        getEmpList(employees).forEach(e => {
            if (!e || typeof e !== 'object') return;
            let pos = safeStr(e.position || e.job || e.role || e.job_position || e.position_name);
            if (!pos && e.position && typeof e.position === 'object') {
                pos = safeStr(e.position.name || e.position.title);
            }
            pos = normalizePositionName(pos) || 'unknown';
            // Director is not a staffing slot for peer role-mix averages
            if (pos === 'director' || pos === 'unknown' || !pos) return;
            counts[pos] = (counts[pos] || 0) + 1;
        });
        return counts;
    }


    /** Company day key (rolls ~18:00 TCT/UTC). */
    function tornCompanyDayKey(d) {
        const t = d ? new Date(d) : new Date();
        const shifted = new Date(t.getTime() - 18 * 3600 * 1000);
        return shifted.toISOString().slice(0, 10);
    }
    function loadTrainExclude() {
        try {
            const o = JSON.parse(GM_getValue(TRAIN_EXCLUDE_KEY, '{}') || '{}');
            return o && typeof o === 'object' ? o : {};
        } catch (e) { return {}; }
    }
    function saveTrainExclude(map) {
        try { GM_setValue(TRAIN_EXCLUDE_KEY, JSON.stringify(map || {})); } catch (e) {}
    }
    function loadSettlingDays() {
        const n = Number(GM_getValue(TRAIN_SETTLE_KEY, 3));
        return isFinite(n) && n >= 0 && n <= 30 ? Math.floor(n) : 3;
    }
    function saveSettlingDays(n) {
        const v = Math.max(0, Math.min(30, Math.floor(Number(n) || 0)));
        GM_setValue(TRAIN_SETTLE_KEY, v);
        return v;
    }
    function trainerExtraTrains(empList) {
        let extra = 0, trainers = 0;
        getEmpList(empList).forEach(e => {
            const pos = safeStr(e.position).toLowerCase();
            if (!(/trainer|human resources|^hr\b|hr officer|training advis/.test(pos))) return;
            trainers++;
            const eff = Number(empEffectiveness(e)) || 0;
            let add = 0;
            const tiers = Object.keys(TRAINER_TRAINS).map(Number).sort((a, b) => b - a);
            for (const t of tiers) {
                if (eff >= t) { add = TRAINER_TRAINS[t]; break; }
            }
            extra += add;
        });
        return { extra, trainers };
    }

    function loadTrainContracts() {
        try {
            const a = JSON.parse(GM_getValue(TRAIN_CONTRACTS_KEY, '[]') || '[]');
            return Array.isArray(a) ? a : [];
        } catch (e) { return []; }
    }
    function saveTrainContracts(list) {
        try { GM_setValue(TRAIN_CONTRACTS_KEY, JSON.stringify(list || [])); } catch (e) {}
    }
    function newContractId() {
        return 'tc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    /** Count director trains logged for employee on/after startDate (company days). */
    function countContractTrainsDone(buyerId, startDate) {
        const log = loadTrainLog();
        const e = log[String(buyerId)];
        if (!e) return 0;
        const start = safeStr(startDate) || '';
        let done = 0;
        if (e.byDay && typeof e.byDay === 'object') {
            Object.keys(e.byDay).forEach(day => {
                if (!start || day >= start) done += Number(e.byDay[day]) || 0;
            });
            if (done > 0) return done;
        }
        // Fallback: if only lifetime total and lastTrain after start, can't split — use 0 rather than over-count
        if (e.lastTrain && start) {
            const day = tornCompanyDayKey(e.lastTrain);
            if (day >= start) return Math.min(Number(e.trains) || 0, Number(e.trains) || 0);
        }
        return 0;
    }
    function enrichContract(c) {
        const total = Math.max(0, Number(c.totalTrains) || 0);
        const price = Math.max(0, Number(c.pricePerTrain) || 0);
        const done = countContractTrainsDone(c.buyerEmpId, c.startDate);
        const remaining = Math.max(0, total - done);
        const active = c.active !== false && !c.deleted && remaining > 0;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        const dailyRes = Math.max(0, Number(c.dailyReservation) || 0);
        const prepaid = Math.max(0, Number(c.prepaidAmount) || 0);
        return Object.assign({}, c, {
            totalTrains: total,
            pricePerTrain: price,
            done,
            remaining,
            pct,
            active,
            cashEarned: done * price,
            cashRemaining: remaining * price,
            totalValue: total * price,
            dailyReservation: dailyRes,
            prepaidAmount: prepaid
        });
    }
    function getActiveTrainContracts() {
        return loadTrainContracts().map(enrichContract).filter(c => c.active && !c.deleted);
    }
    function totalDailyReservations() {
        return getActiveTrainContracts().reduce((s, c) => s + (c.dailyReservation || 0), 0);
    }
    /** Merge remote contracts by id; prefer newer createdAt / non-deleted. */
    function mergeTrainContractsFromRemote(remoteList) {
        if (!Array.isArray(remoteList)) return;
        const local = loadTrainContracts();
        const byId = {};
        local.forEach(c => { if (c && c.id) byId[c.id] = c; });
        remoteList.forEach(c => {
            if (!c || !c.id) return;
            const prev = byId[c.id];
            if (!prev) {
                byId[c.id] = c;
                return;
            }
            const pt = Number(prev.createdAt) || 0;
            const rt = Number(c.createdAt) || 0;
            // Prefer non-deleted; then newer
            if (prev.deleted && !c.deleted) byId[c.id] = c;
            else if (!prev.deleted && c.deleted) { /* keep local */ }
            else if (rt >= pt) byId[c.id] = Object.assign({}, prev, c);
        });
        saveTrainContracts(Object.values(byId));
    }

    function trainsLoggedToday(id) {
        const log = loadTrainLog();
        const e = log[String(id)];
        if (!e) return 0;
        const day = tornCompanyDayKey();
        if (e.byDay && typeof e.byDay === 'object' && e.byDay[day] != null) {
            return Number(e.byDay[day]) || 0;
        }
        if (e.lastTrain && tornCompanyDayKey(e.lastTrain) === day) return 1;
        return 0;
    }
    /**
     * Simulate director trains on current position until total EE crosses next tier.
     */
    function trainsToNextEffTier(e, companyType) {
        if (!e) return null;
        const posName = safeStr(e.position);
        if (/director/i.test(posName)) return null;
        const positions = getPositionsForType(companyType) || [];
        let pos = positions.find(p => p.name.toLowerCase() === posName.toLowerCase());
        if (!pos && positions.length) {
            const norm = normalizePositionName(posName);
            pos = positions.find(p => normalizePositionName(p.name) === norm || p.name.toLowerCase() === norm);
        }
        if (!pos) return null;
        const st = empStats(e);
        const ps = positionPrimarySecondary(pos);
        if (!ps.primary) return null;
        const priKey = ps.primary.key;
        const secKey = ps.secondary ? ps.secondary.key : null;
        let priStat = st[priKey] || 0;
        let secStat = secKey ? (st[secKey] || 0) : 0;
        const baseWs = calcPositionEff(st.man, st.int, st.end, pos);
        const totalEff = Number(empEffectiveness(e));
        const bonuses = (totalEff != null && isFinite(totalEff)) ? (totalEff - baseWs) : 0;
        const startEff = totalEff != null && isFinite(totalEff) ? totalEff : baseWs;
        const next = EE_TIERS.find(t => t > startEff);
        if (!next) return { trains: 0, next: null, startEff, pos: pos.name };
        let trains = 0;
        let p = priStat, s = secStat;
        while (trains < 500) {
            trains++;
            p += TRAIN_PRIMARY;
            if (secKey) s += TRAIN_SECONDARY;
            const man = priKey === 'man' ? p : (secKey === 'man' ? s : st.man);
            const intv = priKey === 'int' ? p : (secKey === 'int' ? s : st.int);
            const endv = priKey === 'end' ? p : (secKey === 'end' ? s : st.end);
            const ws = calcPositionEff(man, intv, endv, pos);
            if (ws + bonuses >= next) {
                return { trains, next, startEff, projected: Math.round((ws + bonuses) * 10) / 10, pos: pos.name };
            }
        }
        return { trains: null, next, startEff, pos: pos.name, capped: true };
    }

    /** EE promotion projection using simulated trains-to-tier when possible. */
    function eePromotionHints(empList, companyType) {
        const out = [];
        getEmpList(empList).forEach(e => {
            if (!e) return;
            const pos = normalizePositionName(e.position || '');
            if (pos === 'director') return;
            const sim = trainsToNextEffTier(e, companyType);
            if (sim && sim.trains != null && sim.next) {
                out.push({
                    name: safeStr(e.name || e.playername) || 'Employee',
                    eff: sim.startEff,
                    next: sim.next,
                    gap: Math.max(0, sim.next - (sim.startEff || 0)),
                    trains: sim.trains,
                    pos
                });
                return;
            }
            let eff = Number(empEffectiveness(e)) || 0;
            if (eff <= 0) return;
            const next = EE_TIERS.find(t => t > eff);
            if (!next) return;
            out.push({
                name: safeStr(e.name || e.playername) || 'Employee',
                eff, next, gap: next - eff,
                trains: Math.max(1, Math.ceil((next - eff) / TRAIN_PRIMARY)),
                pos
            });
        });
        out.sort((a, b) => (a.trains || 99) - (b.trains || 99) || a.gap - b.gap);
        return out.slice(0, 8);
    }

    function salaryRatioAlert(dailyIncome, payrollTotal) {
        if (dailyIncome == null || dailyIncome <= 0 || payrollTotal == null) return null;
        const ratio = payrollTotal / dailyIncome;
        if (ratio < SALARY_RATIO_WARN) return null;
        return {
            ratio,
            pct: Math.round(ratio * 1000) / 10,
            msg: 'Payroll is ' + (Math.round(ratio * 1000) / 10) + '% of daily income (warn ≥' +
                Math.round(SALARY_RATIO_WARN * 100) + '%)'
        };
    }

    const INACTIVE_WARN_DAYS = 3;
    const INACTIVE_REPLACE_DAYS = 7;

    function daysSinceLastAction(emp) {
        if (!emp || typeof emp !== 'object') return null;
        const la = emp.last_action;
        let ts = null;
        if (typeof la === 'object' && la) {
            ts = Number(la.timestamp) || null;
        } else if (la != null) {
            ts = Number(la) || null;
        }
        if (!ts && emp.last_action_timestamp) ts = Number(emp.last_action_timestamp);
        if (!ts || ts < 1e9) return null;
        // API may return seconds
        if (ts < 1e12) ts *= 1000;
        return (Date.now() - ts) / 86400000;
    }

    function inactiveEmployeeAlerts(empList) {
        const alerts = [];
        getEmpList(empList).forEach(e => {
            if (!e) return;
            const pos = safeStr(e.position || '').toLowerCase();
            if (pos === 'director') return;
            const days = daysSinceLastAction(e);
            if (days == null) return;
            const name = safeStr(e.name || e.playername || e.employee_name) || 'Employee';
            if (days >= INACTIVE_REPLACE_DAYS) {
                alerts.push({ level: 'high', name, days: Math.floor(days),
                    msg: name + ' — ' + Math.floor(days) + 'd inactive (consider replace)' });
            } else if (days >= INACTIVE_WARN_DAYS) {
                alerts.push({ level: 'med', name, days: Math.floor(days),
                    msg: name + ' — ' + Math.floor(days) + 'd inactive' });
            }
        });
        return alerts.sort((a, b) => b.days - a.days);
    }

    function extractCompanyMeta(data) {
        const c = data.company || data.profile || data;
        const rating = Number(
            c.rating != null ? c.rating :
            c.stars != null ? c.stars :
            c.company_rating != null ? c.company_rating : 0
        );
        const cType = safeStr(c.company_type || c.type || c.company_type_name || '');
        return {
            c,
            rating,
            cType,
            name: safeStr(c.name) || null,
            hired: c.employees_hired != null ? c.employees_hired : null,
            capacity: c.employees_capacity != null ? c.employees_capacity : null
        };
    }


    /** Company endpoints that need an ID in the path (type id or company id). */
    async function apiGetCompanyId(id, selection) {
        const tries = [
            API_BASE_V2 + '/company/' + id + '/' + selection,
            API_BASE_V2 + '/company/' + id + '/?selections=' + selection,
            API_BASE_V1 + '/company/' + id + '?selections=' + selection
        ];
        let lastErr = null;
        for (const url of tries) {
            try {
                return await rawGet(url);
            } catch (err) {
                lastErr = err;
                if ([22, 23, 4, 3].includes(err.code)) continue;
                throw err;
            }
        }
        throw lastErr || new Error('API request failed for company/' + id + '/' + selection);
    }

    function parseTornCompaniesList(data) {
        // Response shapes: { company: { id: {...} } }, { companies: {...} }, or flat map
        const bag = data.company || data.companies || data.cards || data;
        if (!bag || typeof bag !== 'object') return [];
        const rows = [];
        Object.keys(bag).forEach(k => {
            const c = bag[k];
            if (!c || typeof c !== 'object') return;
            const id = Number(c.ID != null ? c.ID : (c.id != null ? c.id : k)) || 0;
            if (!id) return;
            rows.push({
                id,
                name: safeStr(c.name) || null,
                rating: c.rating != null ? Number(c.rating) : null,
                income: c.weekly_income != null ? Number(c.weekly_income)
                    : (c.daily_income != null ? Number(c.daily_income) : null),
                hired: c.employees_hired != null ? Number(c.employees_hired) : null,
                capacity: c.employees_capacity != null ? Number(c.employees_capacity) : null,
                daysOld: c.days_old != null ? Number(c.days_old) : null,
                director: c.director != null ? Number(c.director) : null,
                companyType: c.company_type != null ? Number(c.company_type) : null
            });
        });
        return rows;
    }

    /**
     * Primary peer source: Torn public API
     * GET /company/{typeId}?selections=companies  (or v2 /company/{typeId}/companies)
     */
    async function importPeersFromTorn(companyType) {
        const typeName = resolveCompanyTypeName(companyType) || safeStr(companyType);
        const typeId = resolveYataTypeId(typeName || companyType); // same numeric map
        if (!typeId) throw new Error('Unknown company type id for: ' + (companyType != null && companyType !== '' ? companyType : '(empty — employee profile missing company_type)'));

        const data = await apiGetCompanyId(typeId, 'companies');
        const rows = parseTornCompaniesList(data);
        if (!rows.length) throw new Error('Torn companies list empty for type ' + typeId);

        // Full 10★ set for this type (income-sorted); fall back to all if none rated 10
        const ten = rows.filter(r => r.rating != null && r.rating >= PEER_STAR);
        const pool = (ten.length ? ten : rows).slice().sort((a, b) =>
            (b.income || 0) - (a.income || 0) || (b.rating || 0) - (a.rating || 0)
        );
        const ids = pool.map(r => r.id);
        const weekKey = peerListWeekKey();
        const typeKey = typeName || String(typeId);

        // Keep slim company rows for benchmark filters / income rank (API list fields only)
        const slimRows = rows.map(r => ({
            id: r.id, name: r.name, rating: r.rating, income: r.income,
            hired: r.hired, capacity: r.capacity
        }));
        setPeerListForType(typeKey, {
            ids: rows.map(r => r.id),
            tenStarIds: ten.map(r => r.id),
            rows: slimRows,
            weekKey,
            source: 'torn',
            tornTypeId: typeId,
            listed: rows.length,
            tenStar: ten.length,
            updated: Date.now()
        });
        savePeerIds('_all', ten.length ? ten.map(r => r.id) : ids, { source: 'torn', weekKey });

        return {
            typeId,
            typeName: typeKey,
            rows,
            tenStarIds: ten.map(r => r.id),
            allIds: rows.map(r => r.id),
            weekKey,
            source: 'torn'
        };
    }

    /** Filter companies for benchmark (same / above / top / ten). */
    function filterPeerPool(rows, opts) {
        const filter = (opts && opts.filter) || loadBenchFilter();
        const sameSize = !!(opts && opts.sameSize != null ? opts.sameSize : loadBenchSameSize());
        const myStars = Number(opts && opts.myStars) || 0;
        const myCap = Number(opts && opts.myCap) || 0;
        const myIncome = Number(opts && opts.myIncome) || 0;
        const ownId = Number(opts && opts.ownId) || 0;
        const hasInc = rows.some(c => (c.income || 0) > 0);

        let pool = rows.filter(c => Number(c.id) !== ownId);
        if (sameSize && myCap > 0) {
            pool = pool.filter(c => {
                const cap = Number(c.capacity != null ? c.capacity : c.hired) || 0;
                return cap === myCap;
            });
        }
        if (filter === 'ten') {
            pool = pool.filter(c => (c.rating || 0) >= 10);
        } else if (filter === 'top') {
            pool = pool.filter(c => (c.rating || 0) >= 8 && (!hasInc || (c.income || 0) > myIncome));
        } else if (filter === 'above') {
            pool = pool.filter(c => {
                const s = c.rating || 0;
                return s >= myStars + 1 && s <= myStars + 3 &&
                    (!hasInc || (c.income || 0) > myIncome);
            });
        } else if (filter === 'same') {
            pool = pool.filter(c => (c.rating || 0) === myStars &&
                (!hasInc || (c.income || 0) > myIncome));
        }
        pool = pool.slice().sort((a, b) => (b.income || 0) - (a.income || 0) || (b.rating || 0) - (a.rating || 0));
        return { pool, filter, sameSize };
    }

    function incomeRankAmongType(rows, ownId, ownIncome) {
        if (!rows || !rows.length) return null;
        const sorted = rows.slice().sort((a, b) => (b.income || 0) - (a.income || 0));
        let rank = sorted.findIndex(c => Number(c.id) === Number(ownId));
        if (rank < 0 && ownIncome != null) {
            rank = sorted.findIndex(c => (c.income || 0) <= ownIncome);
            if (rank < 0) rank = sorted.length;
        }
        return { rank: rank >= 0 ? rank + 1 : null, total: sorted.length };
    }

    function mergePeerCaches(localCache, remotePeers) {
        const out = Object.assign({}, localCache || {});
        if (!remotePeers || typeof remotePeers !== 'object') return out;
        Object.keys(remotePeers).forEach(key => {
            const r = remotePeers[key];
            if (!r || !Array.isArray(r.ids) || !r.ids.length) return;
            const l = out[key];
            // Prefer remote if newer weekKey or newer updated
            const rWeek = r.weekKey || '';
            const lWeek = l && l.weekKey ? l.weekKey : '';
            if (!l || rWeek > lWeek || (rWeek === lWeek && (r.updated || 0) >= (l.updated || 0))) {
                out[key] = {
                    ids: r.ids.map(Number).filter(n => n > 0),
                    tenStarIds: (r.tenStarIds || r.ids).map(Number).filter(n => n > 0),
                    weekKey: r.weekKey || null,
                    source: r.source || 'jsonbin',
                    tornTypeId: r.tornTypeId,
                    listed: r.listed,
                    tenStar: r.tenStar,
                    updated: r.updated || Date.now(),
                    claimId: r.claimId,
                    claimTs: r.claimTs,
                    claimWeek: r.claimWeek
                };
            }
        });
        return out;
    }

    function peerCacheForRemote() {
        const cache = loadPeerIdCache();
        const slim = {};
        Object.keys(cache).forEach(k => {
            if (k === '_all') return;
            const e = cache[k];
            if (!e || !e.ids || !e.ids.length) return;
            slim[k] = {
                ids: e.ids,
                tenStarIds: e.tenStarIds || e.ids,
                weekKey: e.weekKey || null,
                source: e.source || null,
                tornTypeId: e.tornTypeId || null,
                listed: e.listed,
                tenStar: e.tenStar,
                updated: e.updated || null,
                claimId: e.claimId,
                claimTs: e.claimTs,
                claimWeek: e.claimWeek
            };
        });
        return slim;
    }

    /**
     * Ensure weekly full 10★ list is available: JSONBin first, Torn API only once
     * per week (after Sunday 18:00 TCT), with a claim so multi-device doesn't all pull.
     * Pass force:true to bypass week gate / claims and always re-fetch Torn.
     */
    async function ensureWeeklyPeerList(companyType, force) {
        const typeName = resolveCompanyTypeName(companyType) || safeStr(companyType);
        const typeKey = (typeName || String(resolveYataTypeId(companyType) || '')).toLowerCase();
        const week = peerListWeekKey();
        const myId = getClientId();

        // Sync from JSONBin when available (skip on force — local cache was just cleared)
        if (!force && jsonbinId && jsonbinKey) {
            try {
                await pullTrainLogRemote();
            } catch (e) { /* local */ }
        }

        let entry = getPeerListEntry(typeKey) || getPeerListEntry(typeName);

        if (!force && entry && entry.ids && entry.ids.length && entry.weekKey === week) {
            return {
                ids: entry.tenStarIds && entry.tenStarIds.length ? entry.tenStarIds : entry.ids,
                allIds: entry.ids,
                weekKey: week,
                source: entry.source || 'cache',
                refreshed: false,
                tenStar: (entry.tenStarIds || entry.ids).length
            };
        }

        if (!force && !peerListNeedsWeeklyRefresh(entry) && entry && entry.ids && entry.ids.length) {
            return {
                ids: entry.tenStarIds && entry.tenStarIds.length ? entry.tenStarIds : entry.ids,
                allIds: entry.ids,
                weekKey: entry.weekKey,
                source: entry.source || 'cache',
                refreshed: false,
                tenStar: (entry.tenStarIds || entry.ids).length
            };
        }

        // Another device may be refreshing — honour claim (not on force)
        if (!force && entry && entry.claimWeek === week && entry.claimId && entry.claimId !== myId &&
            (Date.now() - (Number(entry.claimTs) || 0)) < PEER_LIST_CLAIM_MS) {
            if (jsonbinId && jsonbinKey) {
                await sleep(2500);
                try { await pullTrainLogRemote(); } catch (e) { /* ignore */ }
                entry = getPeerListEntry(typeKey) || entry;
                if (entry && entry.weekKey === week && entry.ids && entry.ids.length) {
                    return {
                        ids: entry.tenStarIds && entry.tenStarIds.length ? entry.tenStarIds : entry.ids,
                        allIds: entry.ids,
                        weekKey: week,
                        source: entry.source || 'jsonbin',
                        refreshed: false,
                        tenStar: (entry.tenStarIds || entry.ids).length
                    };
                }
            }
        }

        if (!force) {
            // Claim + fetch Torn
            setPeerListForType(typeKey, Object.assign({}, entry || {}, {
                ids: (entry && entry.ids) || [],
                claimId: myId,
                claimTs: Date.now(),
                claimWeek: week
            }));
            if (jsonbinId && jsonbinKey) {
                try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }
                await sleep(800);
                try { await pullTrainLogRemote(); } catch (e) { /* ignore */ }
                entry = getPeerListEntry(typeKey) || entry;
                if (entry && entry.claimWeek === week && entry.claimId && entry.claimId !== myId &&
                    (Date.now() - (Number(entry.claimTs) || 0)) < PEER_LIST_CLAIM_MS) {
                    await sleep(2500);
                    try { await pullTrainLogRemote(); } catch (e) { /* ignore */ }
                    entry = getPeerListEntry(typeKey) || entry;
                    if (entry && entry.weekKey === week && entry.ids && entry.ids.length) {
                        return {
                            ids: entry.tenStarIds && entry.tenStarIds.length ? entry.tenStarIds : entry.ids,
                            allIds: entry.ids,
                            weekKey: week,
                            source: 'jsonbin',
                            refreshed: false,
                            tenStar: (entry.tenStarIds || entry.ids).length
                        };
                    }
                }
            }
        }

        // Pull full type list from Torn (always on force)
        const torn = await importPeersFromTorn(typeName || companyType);
        if (jsonbinId && jsonbinKey) {
            try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }
        }
        return {
            ids: torn.tenStarIds.length ? torn.tenStarIds : torn.allIds,
            allIds: torn.allIds,
            weekKey: torn.weekKey || week,
            source: force ? 'torn-force' : 'torn',
            refreshed: true,
            tenStar: torn.tenStarIds.length,
            listed: torn.rows.length
        };
    }

    /**
     * Peer company data via Torn API only:
     * 1) profile → name, rating, income, hired/capacity
     * 2) employees selection → company_employees with position names
     * Never stops after profile alone (that was dropping role data).
     */
    async function fetchPeerCompany(id) {
        let merged = {}, any = false, lastErr = null;

        const profileUrls = [
            API_BASE_V2 + '/company/' + id + '/profile',
            API_BASE_V2 + '/company/' + id + '/?selections=profile',
            API_BASE_V1 + '/company/' + id + '?selections=profile'
        ];
        for (const url of profileUrls) {
            try {
                Object.assign(merged, await rawGet(url));
                any = true;
                break;
            } catch (err) {
                lastErr = err;
                if ([2, 16].includes(err.code)) throw err;
            }
        }

        // Dedicated employees call (public) — source of peer role mix
        try {
            const emp = await apiGetCompanyId(id, 'employees');
            Object.assign(merged, emp);
            any = true;
        } catch (err) {
            lastErr = err;
            // Fall through: profile-only peers still useful for income/staffing
            if ([2, 16].includes(err.code)) throw err;
        }

        // Combined profile+employees as last resort
        if (!companyRoster(merged) || !Object.keys(companyRoster(merged)).length) {
            const comboUrls = [
                API_BASE_V1 + '/company/' + id + '?selections=profile,employees',
                API_BASE_V2 + '/company/' + id + '/?selections=profile,employees'
            ];
            for (const url of comboUrls) {
                try {
                    Object.assign(merged, await rawGet(url));
                    any = true;
                    break;
                } catch (err) {
                    lastErr = err;
                    if ([2, 16].includes(err.code)) throw err;
                }
            }
        }

        if (!any) throw lastErr || new Error('Peer fetch failed for ' + id);
        return merged;
    }

    async function refreshPeers(opts) {
        if (!apiKey) { showKeyInput(); return; }
        if (!companyData && !userInfo) {
            setStatus('Load company data first', true);
            return;
        }
        const force = !!(opts && opts.force);

        const p = (companyData && (companyData.company || companyData.profile)) || {};
        setStatus((force ? 'Force update. ' : '') + 'Resolving company type…');
        let typeName = await ensureOwnCompanyType();
        if (!typeName) {
            typeName = resolveCompanyTypeName(p.company_type || p.type || '', p) ||
                resolveCompanyTypeName(userInfo && userInfo.company_type, p);
        }
        const typeId = resolveYataTypeId(typeName);
        const ownId = (userInfo && userInfo.company_id) || p.ID || p.id || 0;
        const ownName = safeStr(p.name || (userInfo && userInfo.company_name) || '');
        let sourceNote = force ? 'Force update. ' : '';
        let allTenStarIds = [];

        if (!typeName || !typeId) {
            showErrorBox('Cannot resolve company type', [
                'Peer lists need your company <strong>type</strong> (e.g. Pub, Hair Salon).',
                'As an employee the API sometimes omits type on the company blob — the script now reads <code>user/job.company_type</code> and can fetch your company profile by ID.',
                'Try <strong>Refresh</strong> on the main dashboard first, then Refresh Peers again.',
                'Detected company id: <strong>' + (ownId || 'none') + '</strong> · name: <strong>' +
                    (ownName || 'unknown') + '</strong>'
            ]);
            setStatus('No company type — cannot load peers', true);
            return;
        }

        // Weekly full 10★ list: JSONBin shared cache; Torn API only after Sun 18:00 TCT week rollover
        // force:true always re-fetches Torn and repopulates cache
        try {
            setStatus(sourceNote + 'Loading weekly 10★ peer list for ' + typeName + ' (JSONBin / Torn)…');
            const weekly = await ensureWeeklyPeerList(typeName, force);
            allTenStarIds = weekly.ids || [];
            sourceNote += (weekly.refreshed ? 'Torn refresh' : (weekly.source || 'cache')) +
                ': ' + allTenStarIds.length + '×10★' +
                (weekly.weekKey ? (' · week ' + weekly.weekKey) : '') + '. ';
            setStatus(sourceNote + 'Preparing peer profiles…');
        } catch (e) {
            console.warn('[TCM] weekly peer list failed', e && e.message);
            sourceNote = 'Weekly list failed (' + (e && e.message ? e.message : 'error') + '). ';
            try {
                setStatus(sourceNote + 'Trying YATA…');
                const yata = await importPeersFromYata(typeName);
                allTenStarIds = yata.tenStarIds.length ? yata.tenStarIds : yata.allIds;
                const weekKey = peerListWeekKey();
                setPeerListForType(typeName || String(yata.typeId), {
                    ids: allTenStarIds,
                    tenStarIds: allTenStarIds,
                    weekKey,
                    source: 'yata',
                    updated: Date.now()
                });
                if (jsonbinId && jsonbinKey) {
                    try { await pushTrainLogRemote(loadTrainLog()); } catch (e3) { /* ignore */ }
                }
                sourceNote += 'YATA: ' + allTenStarIds.length + '×10★. ';
            } catch (e2) {
                console.warn('[TCM] YATA peer import failed', e2 && e2.message);
                sourceNote += 'YATA failed. Using any local cache. ';
            }
        }

        // Benchmark filters: list from API, then filter
        const entry = getPeerListEntry(typeName) || getPeerListEntry(String(typeName).toLowerCase()) || {};
        let rowsMeta = Array.isArray(entry.rows) ? entry.rows.slice() : [];
        if (!rowsMeta.length && allTenStarIds.length) {
            rowsMeta = allTenStarIds.map(id => ({ id: Number(id), rating: 10 }));
        }
        if (!rowsMeta.length) {
            const fallbackIds = getCachedPeerIds(typeName).concat(getCachedPeerIds('_all'));
            rowsMeta = fallbackIds.map(id => ({ id: Number(id) }));
        }

        const myStars = p.rating != null ? Number(p.rating) : 0;
        const myCap = companyCapacity(p, companyData && companyData.company_employees) || 0;
        const ownIncome = p.weekly_income != null ? Number(p.weekly_income) :
            (p.daily_income != null ? Number(p.daily_income) * 7 : 0);
        const benchFilter = loadBenchFilter();
        const benchSame = loadBenchSameSize();
        const { pool, filter, sameSize } = filterPeerPool(rowsMeta, {
            filter: benchFilter, sameSize: benchSame,
            myStars, myCap, myIncome: ownIncome, ownId
        });
        const rankInfo = incomeRankAmongType(rowsMeta, ownId, ownIncome);

        let workIds = pool.map(r => Number(r.id)).filter(n => n > 0);
        // Prefer list-order (already income-sorted); cap API profile fetches
        let ids = workIds.slice(0, PEER_MAX);

        if (!ids.length) {
            showErrorBox('No peer companies for this filter', [
                'Filter: <strong>' + filter + '</strong>' + (sameSize ? ' · same size' : '') + '.',
                'Try <strong>10★</strong> or turn off same-size, or Force Update the company list.',
                'Data from Torn API <code>company/{type}/companies</code> only.'
            ]);
            setStatus(sourceNote + 'No peers match filter ' + filter, true);
            return;
        }

        sourceNote += 'Filter ' + filter + (sameSize ? '+sameSize' : '') +
            ': ' + workIds.length + ' match · profiling ' + ids.length +
            (rankInfo && rankInfo.rank ? (' · your income rank ~' + rankInfo.rank + '/' + rankInfo.total) : '') + '. ';

        setStatus(sourceNote + 'Loading peer profiles (0/' + ids.length + ')…');
        let done = 0;

        async function loadOnePeer(id) {
            let rating = null, name = null, cType = '', hired = null, capacity = null, income = null;
            let roles = {}, roleCount = 0, source = 'torn';

            try {
                const data = await fetchPeerCompany(id);
                const meta = extractCompanyMeta(data);
                if (meta.rating) rating = meta.rating;
                if (meta.name) name = meta.name;
                if (meta.cType) cType = meta.cType;
                if (meta.hired != null) hired = meta.hired;
                if (meta.capacity != null) capacity = meta.capacity;
                const c = meta.c || {};
                if (c.weekly_income != null) income = Number(c.weekly_income);
                // employees selection (public role mix)
                const empList = normalizeEmployeeList(data);
                const apiRoles = countRoles(empList);
                const apiCount = Object.values(apiRoles).reduce((a, b) => a + b, 0);
                if (apiCount >= 1) {
                    roles = apiRoles;
                    roleCount = apiCount;
                    source = 'api';
                }
            } catch (e) {
                console.warn('[TCM] peer profile fetch failed', id, e && e.message);
            }

            done++;
            setStatus(sourceNote + 'Loading peer profiles (' + done + '/' + ids.length + ')…');

            // List endpoint already filtered; keep peers even if profile rating missing
            return {
                id,
                name: name || ('Company #' + id),
                rating: rating != null ? rating : '?',
                type: cType,
                roles,
                roleCount,
                hired: hired != null ? hired : null,
                capacity: capacity != null ? capacity : null,
                income: income,
                fetchedAt: Date.now(),
                source: source
            };
        }

        const peerResults = await mapPool(ids, 4, loadOnePeer);
        let starPeers = peerResults
            .filter(r => r.ok && r.value)
            .map(r => r.value);

        // Sort by income when available
        starPeers.sort((a, b) => (b.income || 0) - (a.income || 0));

        const ownEmpList = normalizeEmployeeList(companyData || {});
        const ownRoles = countRoles(ownEmpList);
        const ownHired = companyHired(p, companyData && companyData.company_employees) || ownEmpList.length || null;
        const ownCap = myCap || companyCapacity(p, companyData && companyData.company_employees) || null;
        // ownIncome already computed for filter

        // Pull opt-in shares before averaging
        if (jsonbinId && jsonbinKey) {
            try { await pullTrainLogRemote(); } catch (e) { /* ignore */ }
        }

        const peersWithRoles = starPeers.filter(p => p.roleCount >= 2 && p.roles && Object.keys(p.roles).length);
        const roleTotals = {};
        peersWithRoles.forEach(peer => {
            Object.keys(peer.roles).forEach(role => {
                roleTotals[role] = (roleTotals[role] || 0) + peer.roles[role];
            });
        });

        Object.keys(ownRoles).forEach(role => {
            if (roleTotals[role] == null) roleTotals[role] = 0;
        });

        const denom = peersWithRoles.length;
        const rows = Object.keys(roleTotals).sort().map(role => {
            const peerAvg = denom ? (roleTotals[role] / denom) : 0;
            const yours = ownRoles[role] || 0;
            return { role, yours, peerAvg, gap: peerAvg - yours };
        });

        const cacheInfo = peerCacheInfo(typeName);
        lastPeerReport = {
            typeName: typeName || 'Unknown',
            peerCount: starPeers.length,
            peersWithRoles: peersWithRoles.length,
            scanned: ids.length,
            peers: starPeers,
            rows,
            ownHired,
            ownCap,
            ownIncome: ownIncome || null,
            filter: benchFilter,
            sameSize: benchSame,
            incomeRank: rankInfo,
            updated: Date.now(),
            idsCachedAt: cacheInfo.updated,
            idsCount: cacheInfo.ids.length,
            noRoleData: starPeers.length > 0 && peersWithRoles.length === 0
        };
        try { GM_setValue('tcmLastPeerReport', JSON.stringify(lastPeerReport)); } catch (e) { /* ignore */ }

        if (companyData) render(companyData);
        else renderPeerOnly();

        if (!starPeers.length) {
            setStatus(sourceNote + 'No ' + PEER_STAR + '★ peers in ' + ids.length + ' IDs', true);
        } else if (!peersWithRoles.length) {
            setStatus(
                sourceNote + starPeers.length + ' × ' + PEER_STAR +
                '★ via Torn API (staffing/income). No employee roles returned yet — try again later.',
                false
            );
        } else {
            setStatus(
                sourceNote + 'Peers: ' + starPeers.length + '×' + PEER_STAR + '★ · roles from ' +
                peersWithRoles.length + ' API'
            );
        }
    }

    function renderPeerSectionHtml() {
        const p = (companyData && (companyData.company || companyData.profile)) || {};
        const typeGuess = safeStr(p.company_type || p.type || '') ||
            (lastPeerReport && lastPeerReport.typeName) || '';
        const cacheInfo = peerCacheInfo(typeGuess);
        const hasImportedIds = cacheInfo.ids.length > 0;

        const curFilter = loadBenchFilter();
        const curSame = loadBenchSameSize();
        let html = `<div class="tcm-section"><h4>Peers / Benchmark</h4>`;
        html += `<div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
            <label style="font-size:11px;color:#aaa">Filter</label>
            <select id="tcm-bench-filter" class="tcm-input" style="width:auto;min-width:110px">
                <option value="ten"${curFilter==='ten'?' selected':''}>10★ only</option>
                <option value="same"${curFilter==='same'?' selected':''}>Same ★ (higher $)</option>
                <option value="above"${curFilter==='above'?' selected':''}>Above ★ (≤+3)</option>
                <option value="top"${curFilter==='top'?' selected':''}>Top (8★+ higher $)</option>
            </select>
            <label style="font-size:11px;color:#ccc;display:flex;align-items:center;gap:4px">
                <input type="checkbox" id="tcm-bench-samesize"${curSame?' checked':''}> Same size
            </label>
        </div>`;

        if (!hasImportedIds) {
            html += `<div class="tcm-error-box">
                <strong>No peer companies imported</strong><br><br>
                Click <strong>Refresh Peers</strong> to load current 10★ companies of your type
                from Torn’s public API (<code>company/{type}/companies</code>).
                Lists refresh after Sunday 18:00 TCT and can be shared via Data Sync.
            </div></div>`;
            return html;
        }

        if (!lastPeerReport) {
            html += `<div class="tcm-warn">
                ${cacheInfo.ids.length} company ID(s) cached
                (last import: ${fmtTime(cacheInfo.updated)}).
                Click <strong>Refresh Peers</strong> to load 10★ profiles via the Torn API.
            </div></div>`;
            return html;
        }

        const r = lastPeerReport;
        html = `<div class="tcm-section">
            <h4>10★ Peers
                <span style="color:#888;font-weight:normal">(${r.peerCount} · ${r.typeName || typeGuess || '?'})</span>
            </h4>`;
        const rankStr = r.incomeRank && r.incomeRank.rank
            ? (' · Income rank <strong>#' + r.incomeRank.rank + '/' + r.incomeRank.total + '</strong>')
            : '';
        html += `<div class="tcm-peer-note" style="margin-bottom:6px">
            Filter: <strong>${r.filter || curFilter}</strong>${r.sameSize ? ' · same size' : ''}
            · IDs: <strong>${r.idsCount != null ? r.idsCount : cacheInfo.ids.length}</strong>
            · List: <strong>${fmtTime(r.idsCachedAt || cacheInfo.updated)}</strong>
            · Profiles: <strong>${fmtTime(r.updated)}</strong>${rankStr}<br>
            Source: Torn API <code>companies</code> + <code>employees</code>
        </div>`;

        if (!r.peerCount) {
            html += `<div class="tcm-error-box">
                <strong>No 10★ peers found</strong><br>
                Scanned ${r.scanned || 0} IDs. Try <strong>Force Update</strong> after Sunday 18:00 TCT.
            </div></div>`;
            return html;
        }

        const ownHired = r.ownHired != null ? r.ownHired : '—';
        const ownCap = r.ownCap != null ? r.ownCap : '—';
        const ownInc = r.ownIncome != null ? ('$' + Number(r.ownIncome).toLocaleString()) : '—';
        html += `<div class="tcm-peer-note" style="margin-bottom:6px">
            <strong>You:</strong> ${ownHired}/${ownCap} staffed · weekly income ${ownInc}
        </div>`;
        html += `<table class="tcm-peer">
            <thead><tr><th>Company</th><th>★</th><th>Staff</th><th>Weekly $</th></tr></thead><tbody>`;
        (r.peers || []).forEach(peer => {
            const staff = (peer.hired != null || peer.capacity != null)
                ? ((peer.hired != null ? peer.hired : '?') + '/' + (peer.capacity != null ? peer.capacity : '?'))
                : '—';
            const inc = peer.income != null ? ('$' + Number(peer.income).toLocaleString()) : '—';
            html += `<tr>
                <td>${peer.name || ('#' + peer.id)}</td>
                <td>${peer.rating}</td>
                <td>${staff}</td>
                <td>${inc}</td>
            </tr>`;
        });
        html += `</tbody></table>`;

        if (r.peersWithRoles > 0 && r.rows && r.rows.length) {
            html += `<h4 style="margin-top:12px">Role mix
                <span style="color:#888;font-weight:normal">(${r.peersWithRoles || 0} API)</span>
            </h4>`;
            html += `<table class="tcm-peer">
                <thead><tr><th>Position</th><th>You</th><th>Peer avg</th><th>Gap</th></tr></thead><tbody>`;
            r.rows.forEach(row => {
                const gapCls = row.gap >= 0.75 ? 'tcm-gap' : row.gap <= -0.75 ? 'tcm-ok' : '';
                const gapStr = (row.gap >= 0 ? '+' : '') + Number(row.gap).toFixed(1);
                html += `<tr>
                    <td>${row.role}</td>
                    <td>${row.yours}</td>
                    <td>${Number(row.peerAvg).toFixed(1)}</td>
                    <td class="${gapCls}">${gapStr}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
            html += `<div class="tcm-peer-note">Roles from Torn API <code>company/{id}?selections=employees</code>.</div>`;
        } else {
            html += `<div class="tcm-peer-note" style="margin-top:8px">
                <strong>Role mix:</strong> staffing/income from Torn API
                <code>company/{id}?selections=employees</code>. Refresh peers if role data is missing.
            </div>`;
        }

        html += `</div>`;
        return html;
    }


    function renderPeerOnly() {
        const content = document.getElementById('tcm-content');
        if (!content) return;
        if (companyData) { render(companyData); return; }
        content.innerHTML = `<div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="tcm-btn" id="tcm-peers">Refresh Peers</button>
            <button type="button" class="tcm-btn" id="tcm-peers-force" title="Clear peer cache and rebuild 10★ list from Torn API">Force Update</button>
        </div>` + renderPeerSectionHtml();
        wirePeerButtons();
    }


    function wireTrainCalculator() {
        const empSel = document.getElementById('tcm-tc-emp');
        const posSel = document.getElementById('tcm-tc-pos');
        const result = document.getElementById('tcm-tc-result');
        if (!posSel || !result) return;

        function num(id) {
            const el = document.getElementById(id);
            const v = el ? Number(el.value) : 0;
            return isFinite(v) && v >= 0 ? v : 0;
        }
        function setNum(id, v) {
            const el = document.getElementById(id);
            if (el) el.value = String(Math.max(0, Math.round(Number(v) || 0)));
        }
        function selectedPos() {
            const opt = posSel.options[posSel.selectedIndex];
            if (!opt || !opt.value) return null;
            return {
                name: opt.value,
                man: Number(opt.getAttribute('data-man')) || 0,
                int: Number(opt.getAttribute('data-int')) || 0,
                end: Number(opt.getAttribute('data-end')) || 0
            };
        }
        function fillFromEmployee() {
            if (!empSel) return;
            const opt = empSel.options[empSel.selectedIndex];
            if (!opt || !opt.value) return;
            setNum('tcm-tc-cman', opt.getAttribute('data-man'));
            setNum('tcm-tc-cint', opt.getAttribute('data-int'));
            setNum('tcm-tc-cend', opt.getAttribute('data-end'));
            const posName = opt.getAttribute('data-pos') || '';
            if (posName && posSel) {
                for (let i = 0; i < posSel.options.length; i++) {
                    if (posSel.options[i].value.toLowerCase() === posName.toLowerCase()) {
                        posSel.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        function useRoleReqs() {
            const pos = selectedPos();
            if (!pos) return;
            setNum('tcm-tc-tman', pos.man);
            setNum('tcm-tc-tint', pos.int);
            setNum('tcm-tc-tend', pos.end);
        }
        function runCalc() {
            const pos = selectedPos();
            if (!pos) {
                result.innerHTML = '<span class="tcm-bad">Select a position (company type must have a position table).</span>';
                return;
            }
            const cur = { man: num('tcm-tc-cman'), int: num('tcm-tc-cint'), end: num('tcm-tc-cend') };
            const tgt = { man: num('tcm-tc-tman'), int: num('tcm-tc-tint'), end: num('tcm-tc-tend') };
            if (tgt.man + tgt.int + tgt.end <= 0) {
                result.innerHTML = '<span class="tcm-warn">Set target stats (or click “Use role requirements as target”).</span>';
                return;
            }
            const r = calcMinDirectorTrains(cur, tgt, pos);
            if (!r.ok) {
                result.innerHTML = '<span class="tcm-bad">' + (r.error || 'Cannot calculate') + '</span>';
                return;
            }
            const ps = positionPrimarySecondary(pos);
            const priL = (ps.primary && ps.primary.key || '').toUpperCase();
            const secL = (ps.secondary && ps.secondary.key || '').toUpperCase();
            let html = '<div style="line-height:1.55">';
            html += '<strong>Minimum director trains: <span class="tcm-good" style="font-size:15px">' + r.trains + '</span></strong>';
            html += ' while trained as <strong>' + (pos.name || '') + '</strong>';
            html += '<br><span style="color:#aaa;font-size:11px">Each train: +' + TRAIN_PRIMARY + ' ' + priL +
                (secL ? (' + ' + TRAIN_SECONDARY + ' ' + secL) : '') + '</span>';
            html += '<br>Primary gap (' + priL + '): ' + r.priGap + ' → ' + r.priTrains + ' train(s) at +' + TRAIN_PRIMARY + '/train';
            if (r.secKey) {
                html += '<br>Secondary gap (' + secL + '): ' + r.secGap + ' → ' + r.secTrains + ' train(s) at +' + TRAIN_SECONDARY + '/train';
            }
            html += '<br>Trains needed = max(primary, secondary) = <strong>' + r.trains + '</strong>';
            html += '<br>Stats after ' + r.trains + ' train(s): MAN ' + r.after.man + ' · INT ' + r.after.int + ' · END ' + r.after.end;
            // Optional days estimate from company trains/day
            try {
                const root = (companyData && (companyData.company || companyData.profile)) || {};
                const est = estimateDailyTrains(root, getEmpList(companyData || {}));
                if (est.daily > 0 && r.trains > 0) {
                    const days = Math.ceil(r.trains / est.daily);
                    html += '<br>At ~' + est.daily + ' trains/day (★' + est.rating +
                        (est.hasTrainer ? ' + trainer' : '') + '): about <strong>' + days + ' day(s)</strong> if all trains go to this person.';
                }
            } catch (e) { /* ignore */ }
            if (r.unreachable && r.unreachable.length) {
                html += '<br><span class="tcm-warn">Cannot raise via this role:</span> ';
                html += r.unreachable.map(u => u.key.toUpperCase() + ' (+' + u.need + ' needed)').join('; ');
                html += '.';
            }
            if (r.trains === 0 && !(r.unreachable && r.unreachable.length)) {
                html += '<br><span class="tcm-good">Already at or above primary/secondary targets for this role.</span>';
            }

            // Recommend best training role when current role misses a wanted stat (or is suboptimal)
            try {
                const pRoot = (companyData && (companyData.company || companyData.profile)) || {};
                let cType = resolveCompanyTypeName(pRoot.company_type || pRoot.type, pRoot) || '';
                if (!cType && userInfo) cType = resolveCompanyTypeName(userInfo.company_type, pRoot) || '';
                const path = recommendTrainingPath(cur, tgt, cType, pos.name);
                if (path.best) {
                    const b = path.best;
                    const selMisses = r.unreachable && r.unreachable.length;
                    const different = b.name.toLowerCase() !== String(pos.name || '').toLowerCase();
                    if (selMisses || (different && path.switchRecommended)) {
                        html += '<div style="margin-top:8px;padding:8px;border-radius:6px;background:rgba(80,140,220,0.12);border:1px solid rgba(80,140,220,0.35)">';
                        html += '<strong style="color:#9cf">Recommended training role:</strong> <span class="tcm-good">' + b.name + '</span>';
                        html += ' — <strong>' + b.trains + '</strong> train(s)';
                        html += '<br><span style="font-size:11px;color:#bbb">Covers ' +
                            b.covered.map(k => k.toUpperCase()).join(' + ') +
                            (b.missed.length ? ('; · still misses ' + b.missed.map(k => k.toUpperCase()).join(', ')) : ' (all needed stats)') +
                            '</span>';
                        if (b.after) {
                            html += '<br><span style="font-size:11px">After those trains: MAN ' + b.after.man +
                                ' · INT ' + b.after.int + ' · END ' + b.after.end + '</span>';
                        }
                        if (path.alts && path.alts.length) {
                            html += '<br><span style="font-size:11px;color:#f0c674">Also for missing stats:</span> ';
                            html += path.alts.map(a =>
                                a.stat.toUpperCase() + ' → <strong>' + a.role + '</strong> (~' + a.trains + ' trains)'
                            ).join('; ');
                            html += '<br><span style="font-size:10px;color:#888">No single role trains all three stats — switch roles between train batches if you need the third.</span>';
                        }
                        html += '<br><button type="button" class="tcm-btn secondary" id="tcm-tc-apply-best" style="margin-top:6px;padding:2px 8px;font-size:11px">Use recommended role</button>';
                        html += '</div>';
                    } else if (!selMisses && !different) {
                        html += '<br><span class="tcm-good">Selected role is optimal (or tied) for these targets among company positions.</span>';
                    }
                }
            } catch (e) {
                console.warn('[TCM] train role recommend', e);
            }

            html += '</div>';
            result.innerHTML = html;

            const applyBest = document.getElementById('tcm-tc-apply-best');
            if (applyBest) {
                applyBest.onclick = () => {
                    try {
                        const pRoot = (companyData && (companyData.company || companyData.profile)) || {};
                        let cType = resolveCompanyTypeName(pRoot.company_type || pRoot.type, pRoot) || '';
                        if (!cType && userInfo) cType = resolveCompanyTypeName(userInfo.company_type, pRoot) || '';
                        const path = recommendTrainingPath(cur, tgt, cType, pos.name);
                        if (!path.best || !posSel) return;
                        for (let i = 0; i < posSel.options.length; i++) {
                            if (posSel.options[i].value.toLowerCase() === path.best.name.toLowerCase()) {
                                posSel.selectedIndex = i;
                                break;
                            }
                        }
                        runCalc();
                    } catch (e2) { /* ignore */ }
                };
            }
        }

        if (empSel) empSel.onchange = fillFromEmployee;
        const useReq = document.getElementById('tcm-tc-use-req');
        if (useReq) useReq.onclick = () => { useRoleReqs(); runCalc(); };
        const calcBtn = document.getElementById('tcm-tc-calc');
        if (calcBtn) calcBtn.onclick = runCalc;
    }


    function wireTrainContracts() {
        const startEl = document.getElementById('tcm-tc-start');
        if (startEl && !startEl.value) {
            try { startEl.value = tornCompanyDayKey(); } catch (e) {}
        }
        const addBtn = document.getElementById('tcm-tc-add');
        if (addBtn) {
            addBtn.onclick = () => {
                const buyerSel = document.getElementById('tcm-tc-buyer');
                const buyerId = buyerSel && buyerSel.value;
                if (!buyerId) {
                    setStatus('Select a buyer employee', true);
                    return;
                }
                const opt = buyerSel.options[buyerSel.selectedIndex];
                const buyerName = (opt && opt.textContent ? opt.textContent.split('(')[0].trim() : '') || ('#' + buyerId);
                const total = Math.max(1, Math.floor(Number((document.getElementById('tcm-tc-total') || {}).value) || 0));
                const price = Math.max(0, Number((document.getElementById('tcm-tc-price') || {}).value) || 0);
                const reserve = Math.max(0, Math.min(20, Math.floor(Number((document.getElementById('tcm-tc-reserve') || {}).value) || 0)));
                const prepaid = Math.max(0, Number((document.getElementById('tcm-tc-prepaid') || {}).value) || 0);
                const startDate = (document.getElementById('tcm-tc-start') || {}).value || tornCompanyDayKey();
                const list = loadTrainContracts();
                list.push({
                    id: newContractId(),
                    buyerEmpId: String(buyerId),
                    buyerName,
                    totalTrains: total,
                    pricePerTrain: price,
                    dailyReservation: reserve,
                    prepaidAmount: prepaid,
                    startDate,
                    active: true,
                    deleted: false,
                    createdAt: Date.now()
                });
                saveTrainContracts(list);
                setStatus('Contract added for ' + buyerName + ' (' + total + ' trains)');
                if (jsonbinId && jsonbinKey) {
                    pushTrainLogRemote(loadTrainLog()).catch(() => {});
                }
                if (companyData) render(companyData);
            };
        }
        document.querySelectorAll('.tcm-tc-archive').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-cid');
                const list = loadTrainContracts().map(c => {
                    if (c.id === id) return Object.assign({}, c, { active: false });
                    return c;
                });
                saveTrainContracts(list);
                setStatus('Contract archived');
                if (companyData) render(companyData);
            };
        });
        document.querySelectorAll('.tcm-tc-del').forEach(btn => {
            btn.onclick = () => {
                if (!confirm('Delete this contract?')) return;
                const id = btn.getAttribute('data-cid');
                const list = loadTrainContracts().filter(c => c.id !== id);
                saveTrainContracts(list);
                setStatus('Contract deleted');
                if (jsonbinId && jsonbinKey) {
                    pushTrainLogRemote(loadTrainLog()).catch(() => {});
                }
                if (companyData) render(companyData);
            };
        });
    }

    function wirePeerButtons() {
        const peersBtn = document.getElementById('tcm-peers');
        if (peersBtn) peersBtn.onclick = () => { if (!apiKey) showKeyInput(); else refreshPeers(); };
        const forceBtn = document.getElementById('tcm-peers-force');
        if (forceBtn) {
            forceBtn.onclick = () => {
                if (!apiKey) { showKeyInput(); return; }
                if (!confirm('Clear cached peer IDs and rebuild the full 10★ list from Torn API?')) return;
                forceUpdatePeers();
            };
        }
        const filt = document.getElementById('tcm-bench-filter');
        if (filt) {
            filt.onchange = () => {
                GM_setValue('tcmBenchFilter', filt.value || 'ten');
                setStatus('Benchmark filter: ' + filt.value + ' — click Refresh Peers');
            };
        }
        const sameCb = document.getElementById('tcm-bench-samesize');
        if (sameCb) {
            sameCb.onchange = () => {
                GM_setValue('tcmBenchSameSize', !!sameCb.checked);
                setStatus('Same-size ' + (sameCb.checked ? 'on' : 'off') + ' — click Refresh Peers');
            };
        }
    }


    async function fetchAll(force) {
        if (!apiKey) { showKeyInput(); return; }
        if (!force && Date.now() - lastFetch < CACHE_MS && companyData) {
            render(companyData);
            return;
        }

        setStatus('Checking account & director status…');
        try {
            const info = await checkDirectorStatus();

            // Even if profile detection failed, still attempt company fetch –
            // success means they are in a company (detection was wrong).
            if (!info.inCompany) {
                setStatus('Profile shows no company – probing company endpoint…');
                try {
                    const probe = await fetchCompanyData(true);
                    companyData = probe.data;
                    lastFetch = Date.now();
                    userInfo.inCompany = true;
                    userInfo.isDirector = true;
                    if (!userInfo.position || userInfo.position === 'None') userInfo.position = 'Director';
                    const c = probe.data.company || probe.data.profile || {};
                    userInfo.company_name = userInfo.company_name || c.name || null;
                    const prunedProbe = pruneTrainLog(probe.data);
                    render(probe.data);
                    if (jsonbinId && jsonbinKey) {
                        syncTrainLogBothWays().then(() => { if (companyData) render(companyData); }).catch(() => {});
                    } else if (prunedProbe.removed.length) {
                        // Local-only prune still useful; no remote to update
                    }
                    setStatus(`Updated ${new Date().toLocaleTimeString()} (recovered via company endpoint)`);
                    return;
                } catch (probeErr) {
                    showErrorBox('Not in a company', [
                        `Account: <strong>${info.name}</strong>`,
                        'Neither the user profile nor the company endpoint returned company membership.',
                        'Confirm the API key belongs to the account that is in/runs the company.',
                        'Key needs <strong>Limited Access</strong> with user + company selections.'
                    ]);
                    setStatus('Not in a company', true);
                    return;
                }
            }

            setStatus(info.isDirector
                ? `Director of ${info.company_name || 'company'} – loading full data…`
                : `Employee (${info.position}) at ${info.company_name || 'company'} – loading limited data…`);

            // Try full director selections first when unsure — falls back gracefully
            let { data, selections } = await fetchCompanyData(info.isDirector);
            companyData = data;
            lastFetch = Date.now();
            applyDirectorFromCompanyData(data);

            // If we just learned we are director but only pulled limited data, refetch full
            if (userInfo.isDirector && !info.isDirector && !selections.includes('detailed') && !selections.includes('stock')) {
                try {
                    const full = await fetchCompanyData(true);
                    data = full.data;
                    selections = full.selections;
                    companyData = data;
                    applyDirectorFromCompanyData(data);
                } catch (e) { /* keep limited */ }
            }

            const pruned = pruneTrainLog(data);
            try { recordMetricsSnapshot(data.company || data.profile || {}, data); } catch (e) { /* ignore */ }
            render(data);
            if (jsonbinId && jsonbinKey) {
                syncTrainLogBothWays().then(() => { if (companyData) render(companyData); }).catch(() => {});
            }

            const level = selections.includes('detailed') ? 'full' :
                          selections.includes('stock') ? 'good' :
                          selections.includes('employees') ? 'basic' : 'minimal';
            let statusMsg = `Updated ${new Date().toLocaleTimeString()} (${level} data) – ${userInfo.isDirector ? 'Director' : 'Employee'}`;
            if (pruned.removed.length) {
                statusMsg += ` · pruned ${pruned.removed.length} departed from train log`;
            }
            setStatus(statusMsg);
        } catch (err) {
            handleFinalError(err);
        }
    }

    function handleFinalError(err) {
        const msg = err ? err.message : 'Unknown error';
        const code = err && err.code;

        if (code === 7 || (msg && msg.includes('Incorrect ID-entity relation'))) {
            const extra = userInfo
                ? `You are currently: <strong>${userInfo.position}</strong> at ${userInfo.company_name || 'unknown'}.`
                : 'Could not determine your company role.';
            showErrorBox('Error 7 – Incorrect ID-entity relation', [
                extra,
                '',
                'Full employee stats, stock and detailed data are <strong>Director-only</strong>.',
                'If you are the Director, make sure the API key was created on the Director account with Limited Access.',
                'If you are an employee, only limited company info is available via the API.'
            ]);
            setStatus('Error 7: Director access required for full data', true);
        } else if (code === 23 || (msg && msg.includes('only available in API v2'))) {
            showErrorBox('API v2 required', [
                'A requested selection is only available on API v2.',
                'This script already prefers v2; try refreshing.',
                'If it persists, recreate a Limited Access key and ensure it includes company + user selections.'
            ]);
            setStatus('Error 23: API v2 selection issue', true);
        } else if (code === 2 || (msg && msg.includes('Incorrect Key'))) {
            showErrorBox('Incorrect API Key', [
                'The key is wrong, revoked, or mistyped.',
                'Go to Preferences → API and create a new Limited Access key on the Director account.'
            ]);
            setStatus('Incorrect API key', true);
        } else if (code === 16 || (msg && msg.includes('Access level'))) {
            showErrorBox('Access level too low', [
                'Your key does not have high enough permissions.',
                'Create a new key with <strong>Limited Access</strong> (needs both user and company selections).'
            ]);
            setStatus('Access level too low', true);
        } else if (code === 1 || (msg && msg.includes('empty'))) {
            showKeyInput();
            setStatus('No API key set', true);
        } else {
            showErrorBox('API Error', [msg || 'Unknown error', 'Try again in a few seconds.']);
            setStatus('Error: ' + (msg || 'Unknown'), true);
        }
    }

    // ---------- Smart Training ----------
    function loadTrainLog() { return loadJson(TRAIN_LOG_KEY, {}); }

    function saveTrainLog(log) {
        GM_setValue(TRAIN_LOG_KEY, JSON.stringify(log));
    }

    // ---------- Weekly metrics (efficiency / environment / effectiveness) ----------
    function loadMetricsLog() {
        const m = loadJson(METRICS_LOG_KEY, { weeks: {} });
        if (!m.weeks || typeof m.weeks !== 'object') m.weeks = {};
        return m;
    }

    function saveMetricsLog(log) {
        GM_setValue(METRICS_LOG_KEY, JSON.stringify(log || { weeks: {} }));
    }

    /** ISO week key in UTC (Torn City Time ≈ UTC), e.g. 2026-W31 */
    function isoWeekKey(date) {
        const d = date ? new Date(date) : new Date();
        const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const dayNum = utc.getUTCDay() || 7;
        utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
        return utc.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
    }

    function prevIsoWeekKey(weekKey) {
        // Approximate: take a mid-week day of current key and subtract 7 days
        const m = String(weekKey || '').match(/^(\d{4})-W(\d{1,2})$/);
        if (!m) return null;
        const year = Number(m[1]);
        const week = Number(m[2]);
        // Jan 4 is always in week 1
        const jan4 = new Date(Date.UTC(year, 0, 4));
        const day = jan4.getUTCDay() || 7;
        const week1Mon = new Date(jan4);
        week1Mon.setUTCDate(jan4.getUTCDate() - day + 1);
        const target = new Date(week1Mon);
        target.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7 + 3); // Thursday of that week
        target.setUTCDate(target.getUTCDate() - 7);
        return isoWeekKey(target);
    }

    /** Oldest → newest list of up to n recent ISO week keys ending at current */
    function recentIsoWeekKeys(n) {
        const out = [];
        let k = isoWeekKey();
        const limit = Math.max(1, n || METRICS_KEEP_WEEKS);
        for (let i = 0; i < limit && k; i++) {
            out.push(k);
            k = prevIsoWeekKey(k);
        }
        return out.reverse();
    }

    /** True when UTC/TCT date is a Sunday with day-of-month 1–7 */
    function isFirstSundayOfMonth(date) {
        const d = date ? new Date(date) : new Date();
        if (d.getUTCDay() !== 0) return false;
        return d.getUTCDate() <= 7;
    }

    function getRecentWeekSnapshots(n) {
        const log = loadMetricsLog();
        const weeks = (log && log.weeks) || {};
        return recentIsoWeekKeys(n).map(key => ({
            key: key,
            snap: weeks[key] || null
        }));
    }

    function numOrNull(v) {
        if (v == null || v === '') return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    function extractCompanyEfficiency(p) {
        return numOrNull(p.efficiency != null ? p.efficiency : p.company_efficiency);
    }

    function extractCompanyEnvironment(p) {
        return numOrNull(
            p.environment != null ? p.environment :
            p.company_environment != null ? p.company_environment :
            p.working_stats != null ? p.working_stats : null
        );
    }

    function avgEmployeeEffectiveness(empList) {
        let sum = 0, n = 0;
        const byRole = {};
        (empList || []).forEach(e => {
            const eff = empEffectiveness(e);
            if (eff == null || isNaN(eff)) return;
            sum += eff;
            n++;
            const role = (safeStr(e.position) || 'unknown').toLowerCase();
            if (!byRole[role]) byRole[role] = { sum: 0, n: 0 };
            byRole[role].sum += eff;
            byRole[role].n++;
        });
        const roles = {};
        Object.keys(byRole).forEach(r => {
            roles[r] = {
                avgEff: Math.round((byRole[r].sum / byRole[r].n) * 10) / 10,
                count: byRole[r].n
            };
        });
        return {
            avgEffectiveness: n ? Math.round((sum / n) * 10) / 10 : null,
            empSample: n,
            byRole: roles
        };
    }

    /**
     * Record / refresh this week's snapshot from live company data.
     * Retains the last METRICS_KEEP_WEEKS ISO weeks in JSONBin/local storage.
     */
    function recordMetricsSnapshot(p, employees) {
        const empList = getEmpList(
            employees != null ? employees : companyRoster(companyData)
        );
        const profile = p || (companyData && (companyData.company || companyData.profile)) || {};
        const weekKey = isoWeekKey();
        const effCompany = extractCompanyEfficiency(profile);
        const environment = extractCompanyEnvironment(profile);
        const popularity = numOrNull(profile.popularity);
        const avgEff = avgEmployeeEffectiveness(empList);

        // Need at least one meaningful metric
        if (
            effCompany == null && environment == null && popularity == null &&
            avgEff.avgEffectiveness == null
        ) {
            return loadMetricsLog();
        }

        const roleCounts = {};
        empList.forEach(e => {
            const role = (safeStr(e.position) || 'unknown').toLowerCase();
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
        const hasManager = !!(roleCounts.manager || roleCounts['store manager']);
        const hasTrainer = !!(roleCounts.trainer || roleCounts['hr officer'] || roleCounts.hr);
        const hasMarketer = !!(roleCounts.promoter || roleCounts.marketer || roleCounts['marketing manager']);

        const log = loadMetricsLog();
        log.weeks[weekKey] = {
            week: weekKey,
            updated: Date.now(),
            efficiency: effCompany,
            environment: environment,
            popularity: popularity,
            avgEffectiveness: avgEff.avgEffectiveness,
            empSample: avgEff.empSample,
            empCount: empList.length,
            byRole: avgEff.byRole,
            roleCounts: roleCounts,
            hasManager: hasManager,
            hasTrainer: hasTrainer,
            hasMarketer: hasMarketer,
            rating: numOrNull(profile.rating != null ? profile.rating : profile.stars),
            dailyIncome: numOrNull(profile.daily_income),
            adBudget: numOrNull(profile.advertising_budget),
            hired: numOrNull(profile.employees_hired),
            capacity: numOrNull(profile.employees_capacity)
        };
        log.lastSnapshotDay = getTCTParts().dateStr;
        pruneMetricsHistory(log, weekKey);
        saveMetricsLog(log);
        return log;
    }

    /** Keep the newest METRICS_KEEP_WEEKS ISO week keys (always includes current when known) */
    function pruneMetricsHistory(log, currentWeekKey) {
        if (!log || !log.weeks) return log;
        const cur = currentWeekKey || isoWeekKey();
        if (cur && !log.weeks[cur] && Object.keys(log.weeks).length) {
            // current may not be written yet; still prune around known keys
        }
        const keys = Object.keys(log.weeks).sort();
        while (keys.length > METRICS_KEEP_WEEKS) {
            delete log.weeks[keys.shift()];
        }
        return log;
    }

    function getWeekSnapshot(weekKey) {
        const log = loadMetricsLog();
        return (log.weeks && log.weeks[weekKey]) || null;
    }

    function metricDelta(cur, prev) {
        if (cur == null || prev == null) return null;
        return Math.round((Number(cur) - Number(prev)) * 10) / 10;
    }

    function formatDelta(d, suffix) {
        if (d == null) return '—';
        const s = suffix || '';
        const sign = d > 0 ? '+' : '';
        return sign + d + s;
    }

    function deltaClass(d, higherIsBetter) {
        if (d == null || d === 0) return '';
        const good = higherIsBetter ? d > 0 : d < 0;
        return good ? 'tcm-good' : 'tcm-bad';
    }

    function getWeeklyComparison() {
        const curKey = isoWeekKey();
        const prevKey = prevIsoWeekKey(curKey);
        const cur = getWeekSnapshot(curKey);
        const prev = prevKey ? getWeekSnapshot(prevKey) : null;
        return { curKey, prevKey, cur, prev };
    }

    function renderWeeklyMetricsHtml() {
        const { curKey, prevKey, cur, prev } = getWeeklyComparison();
        if (!cur) {
            return `<div class="tcm-section"><h4>Weekly Metrics</h4>
                <div class="tcm-peer-note">No snapshot yet — loads when company data includes efficiency / environment / employee effectiveness.</div></div>`;
        }
        const rows = [
            { label: 'Company efficiency', cur: cur.efficiency, prev: prev && prev.efficiency, suffix: '%' },
            { label: 'Work environment', cur: cur.environment, prev: prev && prev.environment, suffix: '' },
            { label: 'Avg employee effectiveness', cur: cur.avgEffectiveness, prev: prev && prev.avgEffectiveness, suffix: '' },
            { label: 'Popularity', cur: cur.popularity, prev: prev && prev.popularity, suffix: '%' }
        ];
        let html = `<div class="tcm-section"><h4>Weekly Metrics
            <span style="color:#888;font-weight:normal">(${curKey}${prev ? ' vs ' + prevKey : ''})</span></h4>`;
        html += `<table class="tcm-peer"><thead><tr>
            <th>Metric</th><th>This week</th><th>Last week</th><th>Δ</th>
        </tr></thead><tbody>`;
        rows.forEach(r => {
            const d = metricDelta(r.cur, r.prev);
            const cls = deltaClass(d, true);
            html += `<tr>
                <td>${r.label}</td>
                <td>${r.cur != null ? r.cur + r.suffix : '—'}</td>
                <td>${r.prev != null ? r.prev + r.suffix : '—'}</td>
                <td class="${cls}">${formatDelta(d, r.suffix)}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        html += renderFourWeekChartHtml();
        if (!prev) {
            html += `<div class="tcm-peer-note">First week of history — comparison appears after next week's snapshots.</div>`;
        } else {
            html += `<div class="tcm-peer-note">Snapshots refresh when company data loads. History kept for ${METRICS_KEEP_WEEKS} weeks (synced via Data Sync). 4-week Discord panel updates on the <strong>first Sunday of each month</strong> (daily panel channel + permanent log).</div>`;
        }
        html += `</div>`;
        return html;
    }

    function barUnit(val, min, max, width) {
        const w = width || 10;
        if (val == null || isNaN(Number(val))) return '·'.repeat(w);
        const lo = min == null ? 0 : Number(min);
        const hi = max == null ? 100 : Number(max);
        const span = hi - lo || 1;
        let t = (Number(val) - lo) / span;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        const filled = Math.round(t * w);
        return '█'.repeat(filled) + '░'.repeat(w - filled);
    }

    function seriesMinMax(series) {
        const nums = series.filter(v => v != null && !isNaN(Number(v))).map(Number);
        if (!nums.length) return { min: 0, max: 100 };
        let min = Math.min.apply(null, nums);
        let max = Math.max.apply(null, nums);
        if (min === max) {
            min = Math.max(0, min - 5);
            max = max + 5;
        } else {
            const pad = (max - min) * 0.08;
            min = min - pad;
            max = max + pad;
        }
        return { min: min, max: max };
    }

    function buildFourWeekChartLines() {
        const seriesDefs = [
            { key: 'efficiency', label: 'Efficiency', suffix: '%' },
            { key: 'environment', label: 'Environment', suffix: '' },
            { key: 'avgEffectiveness', label: 'Avg emp. eff.', suffix: '' },
            { key: 'popularity', label: 'Popularity', suffix: '%' }
        ];
        const recent = getRecentWeekSnapshots(METRICS_KEEP_WEEKS);
        const weekLabels = recent.map(r => {
            const m = String(r.key).match(/W(\d{1,2})$/);
            return m ? ('W' + m[1]) : r.key;
        });
        const lines = [];
        lines.push('Weeks: ' + weekLabels.join(' → '));
        seriesDefs.forEach(def => {
            const vals = recent.map(r => (r.snap && r.snap[def.key] != null ? Number(r.snap[def.key]) : null));
            const mm = seriesMinMax(vals);
            const parts = vals.map(v => {
                const bar = barUnit(v, mm.min, mm.max, 8);
                const num = v == null ? '—' : (Math.round(v * 10) / 10) + def.suffix;
                return bar + ' ' + num;
            });
            lines.push('**' + def.label + '**');
            // one line per week keeps Discord monospace readable
            recent.forEach((r, i) => {
                const v = vals[i];
                const bar = barUnit(v, mm.min, mm.max, 10);
                const num = v == null ? '—' : (Math.round(v * 10) / 10) + def.suffix;
                lines.push('`' + weekLabels[i] + ' ' + bar + ' ' + num + '`');
            });
        });
        return lines;
    }

    function renderFourWeekChartHtml() {
        const recent = getRecentWeekSnapshots(METRICS_KEEP_WEEKS);
        const hasAny = recent.some(r => r.snap);
        if (!hasAny) {
            return `<div class="tcm-peer-note" style="margin-top:8px">4-week chart: no history yet.</div>`;
        }
        const metrics = [
            { key: 'efficiency', label: 'Eff%', suffix: '%' },
            { key: 'environment', label: 'Env', suffix: '' },
            { key: 'avgEffectiveness', label: 'EmpEff', suffix: '' },
            { key: 'popularity', label: 'Pop%', suffix: '%' }
        ];
        let html = `<div style="margin-top:10px"><strong>4-week trend</strong>
            <span style="color:#888;font-weight:normal"> (Discord: first Sunday → daily panel + permanent log)</span></div>`;
        html += `<table class="tcm-peer"><thead><tr><th>Week</th>`;
        metrics.forEach(m => { html += `<th>${m.label}</th>`; });
        html += `</tr></thead><tbody>`;
        recent.forEach(r => {
            const short = (String(r.key).match(/W(\d{1,2})$/) || [])[1];
            html += `<tr><td>${short ? ('W' + short) : r.key}${r.key === isoWeekKey() ? ' *' : ''}</td>`;
            metrics.forEach(m => {
                const v = r.snap && r.snap[m.key];
                html += `<td>${v != null ? v + m.suffix : '—'}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        // Mini bars for efficiency
        const effVals = recent.map(r => (r.snap && r.snap.efficiency != null ? Number(r.snap.efficiency) : null));
        const mm = seriesMinMax(effVals);
        html += `<div style="margin-top:6px;font-family:monospace;font-size:11px;color:#ccc;line-height:1.5">`;
        recent.forEach((r, i) => {
            const short = (String(r.key).match(/W(\d{1,2})$/) || [])[1] || r.key;
            html += `<div>W${short} ${barUnit(effVals[i], mm.min, mm.max, 12)} ${effVals[i] != null ? effVals[i] + '%' : '—'} eff</div>`;
        });
        html += `</div>`;
        return html;
    }

    function buildFourWeekChartEmbed() {
        const lines = buildFourWeekChartLines();
        return {
            title: '4-week metrics chart',
            description: 'Monthly panel (first Sunday) · last ' + METRICS_KEEP_WEEKS + ' ISO weeks\n' +
                'Lives next to the daily data panel · also archived to permanent log\n\n' +
                lines.join('\n').slice(0, 3600),
            color: 0x9b7eed,
            timestamp: new Date().toISOString()
        };
    }

    function mergeMetricsLogs(local, remote) {
        const out = { weeks: Object.assign({}, (local && local.weeks) || {}) };
        const rWeeks = (remote && remote.weeks) || {};
        Object.keys(rWeeks).forEach(wk => {
            const r = rWeeks[wk];
            const l = out.weeks[wk];
            if (!l) out.weeks[wk] = r;
            else if ((Number(r.updated) || 0) >= (Number(l.updated) || 0)) out.weeks[wk] = r;
        });
        pruneMetricsHistory(out, isoWeekKey());
        out.lastSnapshotDay = (local && local.lastSnapshotDay) || (remote && remote.lastSnapshotDay) || null;
        return out;
    }

    /** Human-readable company changes that can affect tracked stats */
    function describeCompanyChanges(cur, prev) {
        const lines = [];
        if (!cur) return ['No current-week snapshot yet.'];
        if (!prev) return ['No previous-week snapshot — baseline recorded this week.'];

        const pushDelta = (label, a, b, suffix) => {
            const d = metricDelta(a, b);
            if (d == null || d === 0) return;
            lines.push(label + ': **' + formatDelta(d, suffix || '') + '** (' +
                (b != null ? b + (suffix || '') : '?') + ' → ' +
                (a != null ? a + (suffix || '') : '?') + ')');
        };

        pushDelta('Efficiency', cur.efficiency, prev.efficiency, '%');
        pushDelta('Work environment', cur.environment, prev.environment, '');
        pushDelta('Avg employee effectiveness', cur.avgEffectiveness, prev.avgEffectiveness, '');
        pushDelta('Popularity', cur.popularity, prev.popularity, '%');
        pushDelta('Rating', cur.rating, prev.rating, '★');
        pushDelta('Daily income', cur.dailyIncome, prev.dailyIncome, '');
        pushDelta('Ad budget', cur.adBudget, prev.adBudget, '');
        pushDelta('Headcount', cur.empCount != null ? cur.empCount : cur.hired, prev.empCount != null ? prev.empCount : prev.hired, '');

        if (!!cur.hasManager !== !!prev.hasManager) {
            lines.push(cur.hasManager ? 'Manager **staffed** (was missing).' : 'Manager **removed** / unassigned.');
        }
        if (!!cur.hasTrainer !== !!prev.hasTrainer) {
            lines.push(cur.hasTrainer ? 'Trainer / HR **staffed** (was missing).' : 'Trainer / HR **removed** / unassigned.');
        }
        if (!!cur.hasMarketer !== !!prev.hasMarketer) {
            lines.push(cur.hasMarketer ? 'Promoter / Marketer **staffed** (was missing).' : 'Promoter / Marketer **removed** / unassigned.');
        }

        const rc = cur.roleCounts || {};
        const rp = prev.roleCounts || {};
        const allRoles = Array.from(new Set(Object.keys(rc).concat(Object.keys(rp)))).sort();
        allRoles.forEach(role => {
            const a = rc[role] || 0;
            const b = rp[role] || 0;
            if (a === b) return;
            if (b === 0 && a > 0) lines.push('Role **' + role + '** added (×' + a + ').');
            else if (a === 0 && b > 0) lines.push('Role **' + role + '** cleared (was ×' + b + ').');
            else lines.push('Role **' + role + '** staffing ' + b + ' → ' + a + ' (' + formatDelta(a - b) + ').');
        });

        // Role effectiveness shifts (can drive company efficiency)
        const br = cur.byRole || {};
        const bp = prev.byRole || {};
        Object.keys(br).forEach(role => {
            if (!bp[role]) return;
            const d = metricDelta(br[role].avgEff, bp[role].avgEff);
            if (d != null && Math.abs(d) >= 3) {
                lines.push('**' + role + '** avg effectiveness ' + formatDelta(d) +
                    ' (' + bp[role].avgEff + ' → ' + br[role].avgEff + ').');
            }
        });

        if (!lines.length) lines.push('No material staffing or metric changes detected vs last week.');
        return lines.slice(0, 25);
    }

    function buildWeeklyPanelEmbeds() {
        const { curKey, prevKey, cur, prev } = getWeeklyComparison();
        const changeLines = describeCompanyChanges(cur, prev);
        const metricFields = [
            { name: 'Efficiency', value: fmtWeekPair(cur && cur.efficiency, prev && prev.efficiency, '%'), inline: true },
            { name: 'Environment', value: fmtWeekPair(cur && cur.environment, prev && prev.environment, ''), inline: true },
            { name: 'Avg emp. eff.', value: fmtWeekPair(cur && cur.avgEffectiveness, prev && prev.avgEffectiveness, ''), inline: true },
            { name: 'Popularity', value: fmtWeekPair(cur && cur.popularity, prev && prev.popularity, '%'), inline: true },
            { name: 'Rating', value: fmtWeekPair(cur && cur.rating, prev && prev.rating, '★'), inline: true },
            { name: 'Headcount', value: fmtWeekPair(
                cur && (cur.empCount != null ? cur.empCount : cur.hired),
                prev && (prev.empCount != null ? prev.empCount : prev.hired),
                ''
            ), inline: true }
        ];
        return [
            {
                title: 'Weekly company panel',
                description: 'Week **' + curKey + '**' + (prevKey ? ' vs **' + prevKey + '**' : ' (first week)') +
                    '\nMetrics use company efficiency, work environment, employee effectiveness, and related drivers.',
                color: 0x7eb8ff,
                fields: metricFields,
                timestamp: new Date().toISOString()
            },
            {
                title: 'Changes that can affect these stats',
                description: changeLines.join('\n').slice(0, 3800),
                color: 0xf0c040,
                timestamp: new Date().toISOString()
            }
        ];
    }

    function currentYearMonthTCT() {
        const d = new Date();
        return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
    }

    async function shouldPostFourWeekPanel(yearMonth, force) {
        if (force) return true;
        if (!isFirstSundayOfMonth()) return false;
        if (jsonbinId && jsonbinKey) {
            try { await pullTrainLogRemote(); } catch (e) { /* local */ }
        }
        if (discordMeta.lastFourWeekChartMonth === yearMonth) return false;
        const myId = getClientId();
        const now = Date.now();
        if (
            discordMeta.fourWeekClaimMonth === yearMonth &&
            discordMeta.fourWeekClaimId &&
            discordMeta.fourWeekClaimId !== myId &&
            (now - (Number(discordMeta.fourWeekClaimTs) || 0)) < 3 * 60 * 1000
        ) {
            return false;
        }
        discordMeta.fourWeekClaimMonth = yearMonth;
        discordMeta.fourWeekClaimId = myId;
        discordMeta.fourWeekClaimTs = now;
        saveDiscordMeta(discordMeta);
        if (jsonbinId && jsonbinKey) {
            try {
                await pushTrainLogRemote(loadTrainLog());
                await sleep(900);
                try { await pullTrainLogRemote(); } catch (e) { /* ignore */ }
                if (discordMeta.lastFourWeekChartMonth === yearMonth) return false;
                if (
                    discordMeta.fourWeekClaimMonth === yearMonth &&
                    discordMeta.fourWeekClaimId &&
                    discordMeta.fourWeekClaimId !== myId
                ) {
                    return false;
                }
            } catch (e) { /* allow local */ }
        }
        return true;
    }

    /**
     * 4-week trend panel lives on the daily data-panel webhook (edit-in-place).
     * Updated only on the first Sunday of each month; also appended to permanent log.
     */
    async function runFourWeekPanel(force) {
        const hasPanel = isValidDiscordWebhook(discordPanelWebhook);
        const hasLog = isValidDiscordWebhook(discordLogWebhook);
        if (!hasPanel && !hasLog) {
            if (force) setStatus('Set the daily data panel and/or permanent log webhook for the 4-week chart', true);
            return { ok: false, reason: 'no_webhook' };
        }
        if (!force && !isFirstSundayOfMonth()) {
            if (force) { /* unreachable */ }
            return { ok: false, reason: 'not_first_sunday' };
        }
        if (force && !isFirstSundayOfMonth()) {
            // Allow manual force any day for testing/preview
        } else if (!force && !isFirstSundayOfMonth()) {
            return { ok: false, reason: 'not_first_sunday' };
        }

        if (companyData) {
            try {
                recordMetricsSnapshot(
                    companyData.company || companyData.profile || {},
                    companyData
                );
            } catch (e) { /* ignore */ }
        }

        const ym = currentYearMonthTCT();
        const may = await shouldPostFourWeekPanel(ym, force);
        if (!may) {
            if (force) setStatus('4-week panel already posted this month (or claimed by another device)');
            else console.log('[TCM] 4-week panel skipped for', ym);
            return { ok: false, reason: 'already' };
        }

        const embeds = cleanEmbeds([buildFourWeekChartEmbed()]);
        const content = '**4-week metrics panel** · **' + ym + '**' +
            (force ? ' (manual)' : ' · first Sunday 18:00 TCT');
        const body = {
            username: 'Company Manager',
            content: content,
            embeds: embeds
        };

        const results = { panel: false, log: false };
        const errors = [];

        // Persistent panel message on the daily data-panel webhook
        if (hasPanel) {
            try {
                const existingId = discordMeta.fourWeekPanelMessageId || null;
                let posted = false;
                if (existingId) {
                    try {
                        await editWebhookMessage(discordPanelWebhook, existingId, body);
                        posted = true;
                    } catch (e) {
                        console.warn('[TCM] 4-week panel edit failed', e && e.message);
                        discordMeta.fourWeekPanelMessageId = null;
                    }
                }
                if (!posted) {
                    const res = await postToWebhook(discordPanelWebhook, body, true);
                    const msg = res && res.data;
                    const newId = msg && (msg.id || (msg.message && msg.message.id));
                    if (newId) discordMeta.fourWeekPanelMessageId = String(newId);
                }
                results.panel = true;
            } catch (e) {
                errors.push('4w panel: ' + (e.message || e));
            }
        }

        // Append-only copy on permanent log
        if (hasLog) {
            try {
                await postToWebhook(discordLogWebhook, {
                    username: 'Company Manager',
                    content: content + ' · permanent log',
                    embeds: embeds
                }, false);
                results.log = true;
            } catch (e) {
                errors.push('4w log: ' + (e.message || e));
            }
        }

        discordMeta.lastFourWeekChartMonth = ym;
        discordMeta.lastFourWeekChartTs = Date.now();
        saveDiscordMeta(discordMeta);
        try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }

        const parts = [];
        if (results.panel) parts.push('daily panel (4-week message)');
        if (results.log) parts.push('permanent log');
        if (parts.length) {
            setStatus('4-week chart: ' + parts.join(' + '));
            return { ok: true, results: results };
        }
        setStatus('4-week chart failed: ' + (errors.join('; ') || 'unknown'), true);
        return { ok: false, reason: errors.join('; ') || 'error' };
    }

    function fmtWeekPair(cur, prev, suffix) {
        const s = suffix || '';
        const d = metricDelta(cur, prev);
        const curS = cur != null ? cur + s : '—';
        const prevS = prev != null ? prev + s : '—';
        const dS = d == null ? '' : ' (' + formatDelta(d, s) + ')';
        return curS + ' · was ' + prevS + dS;
    }

    /** Stable employee id used in train log keys */
    function empId(e) {
        if (!e || typeof e !== 'object') return '';
        return String(e.user_id || e.id || e.player_id || e.UID || e.name || '');
    }

    /**
     * Drop train-log entries for people no longer on the roster.
     * Returns { log, removed: string[] }. Saves locally when anything was pruned.
     */
    function pruneTrainLog(employeesSource) {
        const log = loadTrainLog();
        const keys = Object.keys(log || {});
        if (!keys.length) return { log: log || {}, removed: [] };

        const list = getEmpList(
            employeesSource != null
                ? employeesSource
                : (companyData ? companyRoster(companyData) : {})
        );
        // Only prune when we have a real roster (avoid wiping log if API omitted employees)
        if (!list.length) return { log: log || {}, removed: [] };

        const current = new Set();
        list.forEach(e => {
            const id = empId(e);
            if (id) current.add(id);
        });
        if (!current.size) return { log: log || {}, removed: [] };

        const removed = [];
        const next = {};
        keys.forEach(k => {
            if (current.has(String(k))) next[k] = log[k];
            else removed.push(String(k));
        });
        if (removed.length) {
            saveTrainLog(next);
            console.log('[TCM] Pruned train log for departed employees:', removed.join(', '));
        }
        return { log: removed.length ? next : (log || {}), removed };
    }

    function loadDiscordOpts() {
        return Object.assign({}, DEFAULT_DISCORD_OPTS, loadJson(DISCORD_OPTS_KEY, {}));
    }

    function saveDiscordOpts(opts) {
        discordOpts = Object.assign({}, DEFAULT_DISCORD_OPTS, opts || {});
        GM_setValue(DISCORD_OPTS_KEY, JSON.stringify(discordOpts));
    }

    function loadDiscordMeta() { return loadJson(DISCORD_META_KEY, {}); }

    function saveDiscordMeta(meta) {
        discordMeta = Object.assign({}, discordMeta, meta || {});
        GM_setValue(DISCORD_META_KEY, JSON.stringify(discordMeta));
    }

    function isValidDiscordWebhook(url) {
        return !!(url && /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/i.test(url));
    }

    function hasAnyDiscordWebhook() {
        return isValidDiscordWebhook(discordLogWebhook) ||
            isValidDiscordWebhook(discordPanelWebhook) ||
            isValidDiscordWebhook(discordWeeklyWebhook);
    }

    function cleanEmbeds(list) {
        return (list || []).map(e => {
            const o = Object.assign({}, e);
            delete o._rating;
            delete o._currentIds;
            return o;
        });
    }

    /** POST to webhook; pass wait=true to receive the created message (for panel message id). */
    async function postToWebhook(url, body, wait) {
        if (!isValidDiscordWebhook(url)) throw new Error('Invalid Discord webhook URL');
        let endpoint = url;
        if (wait) endpoint += (url.includes('?') ? '&' : '?') + 'wait=true';
        return xhrJson('POST', endpoint, { 'Content-Type': 'application/json' }, body);
    }

    /** Edit a message previously posted by this webhook. */
    async function editWebhookMessage(url, messageId, body) {
        if (!isValidDiscordWebhook(url) || !messageId) throw new Error('Missing webhook or message id');
        const base = url.split('?')[0].replace(/\/$/, '');
        return xhrJson('PATCH', base + '/messages/' + encodeURIComponent(messageId), {
            'Content-Type': 'application/json'
        }, body);
    }

    // Torn City Time ≈ UTC
    function getTCTParts(date) {
        const d = date ? new Date(date) : new Date();
        return {
            y: d.getUTCFullYear(),
            m: d.getUTCMonth() + 1,
            day: d.getUTCDate(),
            h: d.getUTCHours(),
            min: d.getUTCMinutes(),
            dateStr: d.toISOString().slice(0, 10) // YYYY-MM-DD UTC
        };
    }

    function anyDiscordReportEnabled() {
        return !!(discordOpts.unusedTrains || discordOpts.dailyMetrics ||
            discordOpts.employeeAlerts || discordOpts.starChange);
    }

    function initDiscordState() {
        discordOpts = loadDiscordOpts();
        discordMeta = loadDiscordMeta();
    }
    initDiscordState();



    function mergeTrainLogs(local, remote) {
        const out = Object.assign({}, local || {});
        Object.keys(remote || {}).forEach(id => {
            const r = remote[id] || {};
            const l = out[id] || { trains: 0, lastTrain: 0 };
            // Prefer higher train count; if tie, newer lastTrain
            const rt = Number(r.trains) || 0;
            const lt = Number(l.trains) || 0;
            if (rt > lt) {
                out[id] = { trains: rt, lastTrain: r.lastTrain || l.lastTrain || 0 };
            } else if (rt === lt) {
                out[id] = {
                    trains: lt,
                    lastTrain: Math.max(Number(l.lastTrain) || 0, Number(r.lastTrain) || 0)
                };
            } else {
                out[id] = l;
            }
        });
        return out;
    }

    async function pushTrainLogRemote(log) {
        const payload = {
            version: 5,
            updated: Date.now(),
            company_id: (userInfo && userInfo.company_id) || null,
            company_name: (userInfo && userInfo.company_name) || null,
            trains: log || loadTrainLog(),
            metrics: loadMetricsLog(),
            // Full weekly 10★ peer ID lists by company type (shared so only one device hits Torn)
            peers: peerCacheForRemote(),
            discord: {
                logWebhook: discordLogWebhook || '',
                panelWebhook: discordPanelWebhook || '',
                weeklyWebhook: discordWeeklyWebhook || '',
                // legacy field for older clients
                webhook: discordLogWebhook || '',
                opts: discordOpts || loadDiscordOpts(),
                meta: discordMeta || loadDiscordMeta()
            }
        };

        // JSONBin — trains + Discord settings for web ↔ PDA
        if (jsonbinId && jsonbinKey) {
            const jbHeaders = {
                'Content-Type': 'application/json',
                'X-Master-Key': jsonbinKey,
                'X-Bin-Versioning': 'false'
            };
            const jbUrl = 'https://api.jsonbin.io/v3/b/' + encodeURIComponent(jsonbinId);
            try {
                await xhrJson('PUT', jbUrl, jbHeaders, payload);
            } catch (e) {
                // Some older PDA builds lack PUT; surface a clear error
                console.warn('[TCM] JSONBin PUT failed', e);
                if (IS_PDA && e && (e.status === 405 || /PUT|method/i.test(String(e.message || '')))) {
                    throw new Error('JSONBin needs HTTP PUT. Update Torn PDA / enable GMforPDA 2.3+ (PUT support).');
                }
                throw e;
            }
        }
    }

    function buildUnusedTrainsEmbed(p, empList) {
        const trainEst = estimateDailyTrains(p, empList);
        const log = loadTrainLog();
        const totalLogged = Object.values(log).reduce((s, x) => s + (Number(x.trains) || 0), 0);
        // Approximate unused today: we cannot know Torn's remaining trains exactly;
        // report capacity vs activity
        const tct = getTCTParts();
        const loggedToday = Object.values(log).filter(x => {
            const lt = Number(x.lastTrain) || 0;
            if (!lt) return false;
            return getTCTParts(lt).dateStr === tct.dateStr;
        }).reduce((s, x) => s + 1, 0); // count of train actions today (approx)

        const fields = [
            { name: 'Est. trains / day', value: String(trainEst.daily), inline: true },
            { name: 'Rating', value: '★' + trainEst.rating, inline: true },
            { name: 'Trainer staffed', value: trainEst.hasTrainer ? 'Yes' : 'No', inline: true },
            { name: 'Train actions logged today (TCT)', value: String(loggedToday), inline: true },
            { name: 'Lifetime logged trains', value: String(totalLogged), inline: true }
        ];
        if (loggedToday < trainEst.daily) {
            fields.push({
                name: 'Possible unused',
                value: 'Up to **' + Math.max(0, trainEst.daily - loggedToday) + '** trains may still be available today (estimate).'
            });
        } else {
            fields.push({ name: 'Status', value: 'Log suggests daily capacity was used (or exceeded).' });
        }
        return {
            title: 'Unused Trains',
            color: 0xf0c040,
            fields,
            timestamp: new Date().toISOString()
        };
    }

    function buildDailyMetricsEmbed(p, stock) {
        const fields = [];
        const add = (name, val, inline) => {
            if (val == null || val === '') return;
            fields.push({ name: name, value: String(val), inline: !!inline });
        };
        const payroll = computePayroll(companyRoster(companyData));
        const daily = numOrNull(p.daily_income);
        const profit = daily != null ? daily - payroll.total : null;
        const dayQ = classifyIncomeDay(p);

        add('Daily income', daily != null ? '$' + Number(daily).toLocaleString() : null, true);
        add('Weekly income', p.weekly_income != null ? '$' + Number(p.weekly_income).toLocaleString() : null, true);
        add('Payroll', '$' + payroll.total.toLocaleString(), true);
        if (profit != null) {
            add('Profit after wages', '$' + Math.round(profit).toLocaleString(), true);
        }
        if (dayQ) add('Day quality', dayQ.label, true);
        add('Bank', (p.company_bank != null || p.bank != null) ? '$' + Number(p.company_bank || p.bank || 0).toLocaleString() : null, true);
        add('Popularity', p.popularity != null ? p.popularity + '%' : null, true);
        add('Efficiency', p.efficiency != null ? p.efficiency + '%' : (p.company_efficiency != null ? p.company_efficiency + '%' : null), true);
        add('Work environment', p.environment != null ? p.environment : (p.working_stats != null ? p.working_stats : (p.company_environment != null ? p.company_environment : null)), true);
        add('Ad budget', p.advertising_budget != null ? '$' + Number(p.advertising_budget).toLocaleString() : null, true);
        add('Rating', p.rating != null ? '★' + p.rating : null, true);
        add('Employees', (p.employees_hired != null ? p.employees_hired : '?') + ' / ' + (p.employees_capacity != null ? p.employees_capacity : '?'), true);

        const stockRows = analyzeStock(stock);
        if (stockRows.length) {
            const lines = stockRows.slice(0, 15).map(r => {
                const d = r.days != null ? (' ~' + r.days.toFixed(1) + 'd') : '';
                const flag = r.health === 'critical' ? ' ⚠' : (r.health === 'watch' ? ' ·' : '');
                return r.name + ': **' + (r.inStock != null ? r.inStock : '?') + '**' + d + flag;
            });
            fields.push({ name: 'Item stock', value: lines.join('\n').slice(0, 1000) });
            const crit = stockRows.filter(r => r.health === 'critical');
            if (crit.length) {
                fields.push({
                    name: 'Stock critical',
                    value: crit.map(r => r.name + (r.orderQty ? (' — order ~' + r.orderQty) : '')).join('\n').slice(0, 500)
                });
            }
        }
        if (!fields.length) {
            fields.push({ name: 'Note', value: 'Limited metrics available from API for this key/role.' });
        }
        return {
            title: 'Daily Metrics',
            description: (p.name || 'Company') + ' · ' + getTCTParts().dateStr + ' TCT',
            color: 0x3a6ea5,
            fields,
            timestamp: new Date().toISOString()
        };
    }

    function buildEmployeeAlertsEmbed(p, employees, companyType) {
        const useList = getEmpList({ employees: employees, company_employees: employees });
        const alerts = [];
        const now = Date.now();
        const currentIds = [];

        useList.forEach(e => {
            const id = empId(e);
            if (id) currentIds.push(id);
            const name = e.name || e.playername || id || '?';
            const pos = safeStr(e.position);

            // Unassigned role
            if (!pos || pos.toLowerCase() === 'none' || pos.toLowerCase() === 'unassigned') {
                alerts.push('**' + name + '** — unassigned job role');
            }

            // High inactivity (last_action relative timestamp in seconds, or days_in without recent action)
            let lastAction = null;
            if (e.last_action) {
                if (typeof e.last_action === 'object') {
                    lastAction = e.last_action.timestamp ? Number(e.last_action.timestamp) * 1000 : null;
                    if (e.last_action.relative && /day|week|month/i.test(e.last_action.relative)) {
                        const rel = String(e.last_action.relative);
                        if (/[3-9]\s*day|[1-9]\d+\s*day|week|month/i.test(rel)) {
                            alerts.push('**' + name + '** — high inactivity (' + rel + ')');
                        }
                    }
                } else if (typeof e.last_action === 'number') {
                    lastAction = e.last_action > 1e12 ? e.last_action : e.last_action * 1000;
                }
            }
            if (lastAction && (now - lastAction) > 3 * 24 * 3600 * 1000) {
                const days = Math.floor((now - lastAction) / (24 * 3600 * 1000));
                if (!alerts.some(a => a.includes(name) && a.includes('inactivity'))) {
                    alerts.push('**' + name + '** — high inactivity (~' + days + 'd)');
                }
            }

            // Drug addiction
            const addiction = empEffParts(e).addiction;
            if (addiction != null && Math.abs(addiction) >= 10) {
                alerts.push('**' + name + '** — high drug addiction (' + addiction + ')');
            }

            // Extreme role inefficiency
            const st = empStats(e);
            const best = findBestPosition(st.man, st.int, st.end, companyType);
            if (best && best.eff < 40 && (st.man || st.int || st.end)) {
                alerts.push('**' + name + '** — extreme role inefficiency (WS eff ' + best.eff + ', best ' + best.name + ')');
            }
        });

        // Employee leaving (present last snapshot, missing now)
        const prevIds = (discordMeta && discordMeta.lastEmployeeIds) ? discordMeta.lastEmployeeIds : [];
        prevIds.forEach(pid => {
            if (currentIds.indexOf(String(pid)) === -1) {
                alerts.push('Employee **#' + pid + '** left the company (or was removed) since last check');
            }
        });

        // Update meta ids (saved by caller)
        discordMeta.lastEmployeeIds = currentIds;

        if (!alerts.length) {
            alerts.push('No employee alerts right now.');
        }

        return {
            title: 'Employee Alerts',
            color: 0xc04040,
            description: alerts.slice(0, 20).join('\n').slice(0, 1800),
            timestamp: new Date().toISOString(),
            _currentIds: currentIds
        };
    }

    function buildStarChangeEmbed(p) {
        const rating = Number(p.rating != null ? p.rating : p.stars);
        const prev = discordMeta.lastRating != null ? Number(discordMeta.lastRating) : null;
        let desc = 'Current rating: **★' + (isNaN(rating) ? '?' : rating) + '**';
        let color = 0x888888;
        if (prev != null && !isNaN(rating) && rating !== prev) {
            if (rating > prev) {
                desc = '⭐ **Star up!** ★' + prev + ' → ★' + rating;
                color = 0x40c060;
            } else {
                desc = '⬇️ **Star down** ★' + prev + ' → ★' + rating;
                color = 0xc04040;
            }
        } else if (prev != null) {
            desc += ' (unchanged from ★' + prev + ')';
        } else {
            desc += ' (first snapshot — will detect changes next run)';
        }
        return {
            title: 'Star Rating',
            description: desc,
            color,
            timestamp: new Date().toISOString(),
            _rating: isNaN(rating) ? prev : rating
        };
    }

    async function runDiscordReports(force) {
        const hasLog = isValidDiscordWebhook(discordLogWebhook);
        const hasPanel = isValidDiscordWebhook(discordPanelWebhook);
        if (!hasLog && !hasPanel) {
            if (force) setStatus('Set at least one Discord webhook in the Discord tab', true);
            return { ok: false, reason: 'no_webhook' };
        }
        if (!anyDiscordReportEnabled()) {
            if (force) setStatus('Enable at least one Discord report option', true);
            return { ok: false, reason: 'no_opts' };
        }
        if (!companyData) {
            if (force) setStatus('Load company data first', true);
            return { ok: false, reason: 'no_data' };
        }

        const p = companyData.company || companyData.profile || {};
        const employees = companyRoster(companyData);
        const stock = companyData.company_stock || companyData.stock || {};
        const companyType = safeStr(p.company_type || p.type || '') || safeStr(p.name) || '';
        const useList = getEmpList(employees);

        const embeds = [];
        let starEmbed = null;
        let alertEmbed = null;

        if (discordOpts.unusedTrains) embeds.push(buildUnusedTrainsEmbed(p, useList));
        if (discordOpts.dailyMetrics) embeds.push(buildDailyMetricsEmbed(p, stock));
        if (discordOpts.employeeAlerts) {
            alertEmbed = buildEmployeeAlertsEmbed(p, employees, companyType);
            embeds.push(alertEmbed);
        }
        if (discordOpts.starChange) {
            starEmbed = buildStarChangeEmbed(p);
            // Only include star embed if change or forced
            if (force || (starEmbed._rating != null && discordMeta.lastRating != null && starEmbed._rating !== discordMeta.lastRating) || discordMeta.lastRating == null) {
                embeds.push(starEmbed);
            }
        }

        if (!embeds.length) {
            if (force) setStatus('Nothing to post (no star change and no other reports)', true);
            return { ok: false, reason: 'empty' };
        }

        const clean = cleanEmbeds(embeds);
        const tct = getTCTParts();
        const results = { log: false, panel: false, logSkipped: false };
        const errors = [];

        try {
            // 1) Permanent log — append once per TCT day across devices (JSONBin claim)
            if (hasLog) {
                const mayPostLog = await shouldPostDailyLog(tct.dateStr, force);
                if (!mayPostLog) {
                    results.logSkipped = true;
                    console.log('[TCM] Permanent log skipped (already posted or claimed by another device)');
                } else {
                    try {
                        const chunks = [];
                        for (let i = 0; i < clean.length; i += 10) chunks.push(clean.slice(i, i + 10));
                        for (const chunk of chunks) {
                            await postToWebhook(discordLogWebhook, {
                                username: 'Company Manager',
                                content: force ? 'Manual company report' : 'Scheduled company report · **18:00 TCT**',
                                embeds: chunk
                            }, false);
                        }
                        results.log = true;
                        markDailyLogPosted(tct.dateStr);
                    } catch (e) {
                        errors.push('Log: ' + (e.message || e));
                    }
                }
            }

            // 2) Live data panel — edit the same message (safe from every device)
            if (hasPanel) {
                try {
                    const panelEmbeds = clean.slice(0, 10);
                    const panelBody = {
                        username: 'Company Manager',
                        content: '**Company data panel** · updated **' + tct.dateStr + '** TCT' +
                            (force ? ' (manual)' : ''),
                        embeds: panelEmbeds
                    };
                    const existingId = discordMeta.panelMessageId || null;
                    let posted = false;
                    if (existingId) {
                        try {
                            await editWebhookMessage(discordPanelWebhook, existingId, panelBody);
                            posted = true;
                        } catch (editErr) {
                            console.warn('[TCM] Panel edit failed, posting new', editErr && editErr.message);
                            discordMeta.panelMessageId = null;
                        }
                    }
                    if (!posted) {
                        const res = await postToWebhook(discordPanelWebhook, panelBody, true);
                        const msg = res && res.data;
                        const newId = msg && (msg.id || (msg.message && msg.message.id));
                        if (newId) {
                            discordMeta.panelMessageId = String(newId);
                        }
                    }
                    results.panel = true;
                } catch (e) {
                    errors.push('Panel: ' + (e.message || e));
                }
            }

            // Update meta (rating / employees / last run)
            if (starEmbed && starEmbed._rating != null) discordMeta.lastRating = starEmbed._rating;
            else if (p.rating != null) discordMeta.lastRating = Number(p.rating);
            if (alertEmbed && alertEmbed._currentIds) discordMeta.lastEmployeeIds = alertEmbed._currentIds;
            discordMeta.lastPostDateTCT = tct.dateStr;
            discordMeta.lastPostTs = Date.now();
            saveDiscordMeta(discordMeta);
            try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }

            const parts = [];
            if (results.log) parts.push('log');
            else if (results.logSkipped) parts.push('log skipped (other device)');
            if (results.panel) parts.push('panel' + (discordMeta.panelMessageId ? ' (updated)' : ''));
            if (parts.length) {
                setStatus('Discord: ' + parts.join(' + ') + ' · ' + embeds.length + ' section' + (embeds.length > 1 ? 's' : ''));
                return { ok: true, count: embeds.length, results };
            }
            setStatus('Discord failed: ' + (errors.join('; ') || 'unknown'), true);
            return { ok: false, reason: errors.join('; ') || 'error' };
        } catch (e) {
            setStatus('Discord post failed: ' + (e.message || e), true);
            return { ok: false, reason: e.message || 'error' };
        }
    }

    async function shouldPostWeeklyPanel(weekKey, force) {
        if (force) return true;
        if (jsonbinId && jsonbinKey) {
            try { await pullTrainLogRemote(); } catch (e) { /* local */ }
        }
        if (discordMeta.lastWeeklyPostWeek === weekKey) return false;
        // Claim this week
        const myId = getClientId();
        const now = Date.now();
        if (
            discordMeta.weeklyClaimWeek === weekKey &&
            discordMeta.weeklyClaimId &&
            discordMeta.weeklyClaimId !== myId &&
            (now - (Number(discordMeta.weeklyClaimTs) || 0)) < 3 * 60 * 1000
        ) {
            return false;
        }
        discordMeta.weeklyClaimWeek = weekKey;
        discordMeta.weeklyClaimId = myId;
        discordMeta.weeklyClaimTs = now;
        saveDiscordMeta(discordMeta);
        if (jsonbinId && jsonbinKey) {
            try {
                await pushTrainLogRemote(loadTrainLog());
                await sleep(900);
                try { await pullTrainLogRemote(); } catch (e) { /* ignore */ }
                if (discordMeta.lastWeeklyPostWeek === weekKey) return false;
                if (discordMeta.weeklyClaimWeek === weekKey && discordMeta.weeklyClaimId && discordMeta.weeklyClaimId !== myId) {
                    return false;
                }
            } catch (e) { /* allow local */ }
        }
        return true;
    }

    async function runWeeklyDiscordPanel(force) {
        if (!isValidDiscordWebhook(discordWeeklyWebhook)) {
            if (force) setStatus('Set the weekly panel webhook in the Discord tab', true);
            return { ok: false, reason: 'no_weekly_webhook' };
        }
        if (!force && discordOpts.weeklyPanel === false) {
            return { ok: false, reason: 'disabled' };
        }
        if (!companyData && force) {
            if (force) setStatus('Load company data first', true);
            return { ok: false, reason: 'no_data' };
        }
        if (companyData) {
            try {
                recordMetricsSnapshot(
                    companyData.company || companyData.profile || {},
                    companyData
                );
            } catch (e) { /* ignore */ }
        }
        const weekKey = isoWeekKey();
        const may = await shouldPostWeeklyPanel(weekKey, force);
        if (!may) {
            if (force) setStatus('Weekly panel already posted this ISO week (or claimed by another device)');
            else console.log('[TCM] Weekly panel skipped — already done for', weekKey);
            return { ok: false, reason: 'already' };
        }
        const embeds = cleanEmbeds(buildWeeklyPanelEmbeds());
        const body = {
            username: 'Company Manager',
            content: '**Weekly metrics panel** · **' + weekKey + '**' +
                (force ? ' (manual)' : ' · Sunday 18:00 TCT'),
            embeds: embeds
        };
        try {
            const existingId = discordMeta.weeklyPanelMessageId || null;
            let posted = false;
            if (existingId) {
                try {
                    await editWebhookMessage(discordWeeklyWebhook, existingId, body);
                    posted = true;
                } catch (e) {
                    console.warn('[TCM] Weekly panel edit failed', e && e.message);
                    discordMeta.weeklyPanelMessageId = null;
                }
            }
            if (!posted) {
                const res = await postToWebhook(discordWeeklyWebhook, body, true);
                const msg = res && res.data;
                const newId = msg && (msg.id || (msg.message && msg.message.id));
                if (newId) discordMeta.weeklyPanelMessageId = String(newId);
            }
            discordMeta.lastWeeklyPostWeek = weekKey;
            discordMeta.lastWeeklyPostTs = Date.now();
            saveDiscordMeta(discordMeta);
            try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }
            setStatus(
                'Weekly panel ' + (posted || discordMeta.weeklyPanelMessageId ? 'updated' : 'posted') +
                ' · ' + weekKey
            );
            return { ok: true };
        } catch (e) {
            setStatus('Weekly panel failed: ' + (e.message || e), true);
            return { ok: false, reason: e.message || 'error' };
        }
    }

    function scheduleDiscord18TCT() {
        // Daily 18:00 TCT reports + Sunday 18:00 TCT weekly panel
        const tick = async () => {
            try {
                const tct = getTCTParts();
                if (tct.h !== 18) return;
                if (tct.min > 10) return;

                if (jsonbinId && jsonbinKey) {
                    try { await pullTrainLogRemote(); } catch (e) { /* local only */ }
                }

                // Sunday weekly panel (UTC day 0)
                const isSunday = new Date().getUTCDay() === 0;
                if (isSunday && isValidDiscordWebhook(discordWeeklyWebhook) && discordOpts.weeklyPanel !== false) {
                    if (discordMeta.lastWeeklyPostWeek !== isoWeekKey()) {
                        if (!companyData || (Date.now() - lastFetch > 10 * 60 * 1000)) {
                            if (apiKey) {
                                try { await fetchAll(true); } catch (e) { /* stale ok */ }
                            }
                        }
                        await runWeeklyDiscordPanel(false);
                    }
                }

                // First Sunday of month: 4-week chart on daily panel webhook + permanent log
                if (isFirstSundayOfMonth()) {
                    const ym = currentYearMonthTCT();
                    if (discordMeta.lastFourWeekChartMonth !== ym) {
                        if (!companyData || (Date.now() - lastFetch > 10 * 60 * 1000)) {
                            if (apiKey) {
                                try { await fetchAll(true); } catch (e) { /* stale ok */ }
                            }
                        }
                        await runFourWeekPanel(false);
                    }
                }

                if (!discordOpts.autoPost) return;
                if (!hasAnyDiscordWebhook() || !anyDiscordReportEnabled()) return;

                // Another device (or this one) already completed today's daily auto-run
                if (
                    discordMeta.lastLogPostDateTCT === tct.dateStr ||
                    discordMeta.lastPostDateTCT === tct.dateStr
                ) {
                    return;
                }

                if (!companyData || (Date.now() - lastFetch > 10 * 60 * 1000)) {
                    if (apiKey) {
                        try { await fetchAll(true); } catch (e) { /* continue with stale */ }
                    }
                }
                await runDiscordReports(false);
            } catch (e) {
                console.warn('[TCM] Discord schedule tick failed', e);
            }
        };
        tick();
        setInterval(tick, 60 * 1000);
    }


    async function pullTrainLogRemote() {
        if (!jsonbinId || !jsonbinKey) return null;
        try {
            const res = await xhrJson(
                'GET',
                'https://api.jsonbin.io/v3/b/' + encodeURIComponent(jsonbinId) + '/latest',
                { 'X-Master-Key': jsonbinKey, 'X-Bin-Meta': 'false' }
            );
            const body = res.data && res.data.record ? res.data.record : res.data;
            if (!body || typeof body !== 'object') return null;
            if (body.discord) {
                if (body.discord.logWebhook != null) {
                    discordLogWebhook = String(body.discord.logWebhook || '');
                    GM_setValue('tcmDiscordLogWebhook', discordLogWebhook);
                } else if (body.discord.webhook) {
                    // legacy single-webhook field → permanent log
                    discordLogWebhook = String(body.discord.webhook);
                    GM_setValue('tcmDiscordLogWebhook', discordLogWebhook);
                    GM_setValue('tcmDiscordWebhook', discordLogWebhook);
                }
                if (body.discord.panelWebhook != null) {
                    discordPanelWebhook = String(body.discord.panelWebhook || '');
                    GM_setValue('tcmDiscordPanelWebhook', discordPanelWebhook);
                }
                if (body.discord.weeklyWebhook != null) {
                    discordWeeklyWebhook = String(body.discord.weeklyWebhook || '');
                    GM_setValue('tcmDiscordWeeklyWebhook', discordWeeklyWebhook);
                }
                if (body.discord.opts && typeof body.discord.opts === 'object') {
                    saveDiscordOpts(Object.assign({}, discordOpts, body.discord.opts));
                }
                if (body.discord.meta && typeof body.discord.meta === 'object') {
                    saveDiscordMeta(Object.assign({}, discordMeta, body.discord.meta));
                }
            }
            if (body.metrics && typeof body.metrics === 'object') {
                const mergedMetrics = mergeMetricsLogs(loadMetricsLog(), body.metrics);
                saveMetricsLog(mergedMetrics);
            }
            if (body.peers && typeof body.peers === 'object') {
                const mergedPeers = mergePeerCaches(loadPeerIdCache(), body.peers);
                GM_setValue(PEER_ID_KEY, JSON.stringify(mergedPeers));
            }
            if (Array.isArray(body.trainContracts)) {
                mergeTrainContractsFromRemote(body.trainContracts);
            }
            if (body.trains && typeof body.trains === 'object') return body.trains;
            const keys = Object.keys(body);
            if (keys.length && body[keys[0]] && body[keys[0]].trains != null) return body;
            return null;
        } catch (e) {
            console.warn('[TCM] JSONBin pull failed', e);
            return null;
        }
    }

    async function syncTrainLogBothWays() {
        const local = loadTrainLog();
        let remote = null;
        try {
            remote = await pullTrainLogRemote();
        } catch (e) { /* ignore */ }
        let merged = remote ? mergeTrainLogs(local, remote) : local;
        saveTrainLog(merged);
        // Remove log entries for employees who left (local + JSONBin via push below)
        const pruned = pruneTrainLog();
        merged = pruned.log;
        try {
            await pushTrainLogRemote(merged);
            if (pruned.removed.length) {
                setStatus('Data Sync: removed ' + pruned.removed.length + ' departed employee(s) from train log');
            }
        } catch (e) {
            setStatus('Data Sync push failed: ' + (e.message || e), true);
            return merged;
        }
        return merged;
    }


    // ---------- Google Sheets (optional export via Apps Script web app) ----------
    function loadTornstatsStaging() {
        try {
            const raw = GM_getValue('tcmTornstatsStaging', 'null');
            const o = JSON.parse(raw);
            if (o && Array.isArray(o.rows) && o.rows.length) return o;
        } catch (e) {}
        return null;
    }

    function clearTornstatsStaging() {
        try { GM_setValue('tcmTornstatsStaging', 'null'); } catch (e) {}
    }

    function importTornstatsStagingIntoLocal() {
        const stage = loadTornstatsStaging();
        if (!stage || !stage.rows || !stage.rows.length) return { imported: 0 };
        const hist = loadJson('tcmFinanceHistory', []);
        const byDate = {};
        hist.forEach(r => { if (r && r.date) byDate[r.date] = r; });
        stage.rows.forEach(r => {
            if (!r || !r.date) return;
            byDate[r.date] = {
                date: r.date,
                daily: Number(r.daily) || 0,
                salaries: Number(r.salaries) || 0,
                adBudget: Number(r.adBudget) || 0,
                dailyStockCost: Number(r.dailyStockCost) || 0,
                netProfit: Number(r.netProfit) || 0,
                source: 'tornstats'
            };
        });
        const merged = Object.keys(byDate).sort().map(d => byDate[d]);
        // Keep last 120 days
        const trimmed = merged.slice(-120);
        GM_setValue('tcmFinanceHistory', JSON.stringify(trimmed));
        return { imported: stage.rows.length, total: trimmed.length };
    }

    function snapshotFinanceToday() {
        if (!companyData) return;
        const p = companyData.company || companyData.profile || {};
        const payroll = computePayroll(companyRoster(companyData) || companyData.company_employees || {});
        const daily = Number(p.daily_income) || 0;
        const tct = getTCTParts();
        const hist = loadJson('tcmFinanceHistory', []);
        const entry = {
            date: tct.dateStr,
            daily,
            salaries: payroll.total || 0,
            adBudget: Number(p.advertising_budget) || 0,
            dailyStockCost: 0,
            netProfit: daily - (payroll.total || 0),
            source: 'api'
        };
        const idx = hist.findIndex(r => r && r.date === entry.date);
        if (idx >= 0) hist[idx] = Object.assign({}, hist[idx], entry);
        else hist.push(entry);
        hist.sort((a, b) => String(a.date).localeCompare(String(b.date)));
        GM_setValue('tcmFinanceHistory', JSON.stringify(hist.slice(-120)));
    }

    function buildSheetsPayload() {
        const sheets = [];
        const opts = sheetsOpts || {};
        const p = (companyData && (companyData.company || companyData.profile)) || {};
        const empList = companyData ? getEmpList(companyRoster(companyData) || companyData.company_employees || {}) : [];
        const typeName = resolveCompanyTypeName(p.company_type || p.type || '', p) || '';

        if (opts.finance !== false) {
            snapshotFinanceToday();
            const hist = loadJson('tcmFinanceHistory', []);
            const rows = [['Date', 'Daily Income', 'Salaries', 'Ad Budget', 'Stock Cost', 'Net Profit', 'Source']];
            hist.slice().reverse().forEach(r => {
                rows.push([
                    r.date, r.daily || 0, r.salaries || 0, r.adBudget || 0,
                    r.dailyStockCost || 0, r.netProfit || 0, r.source || ''
                ]);
            });
            sheets.push({ name: 'Finance', rows });
        }

        if (opts.trains !== false) {
            const log = loadTrainLog();
            const rows = [['Employee ID', 'Name', 'Trains Logged', 'Last Train (ISO)']];
            const byId = {};
            empList.forEach(e => {
                const id = String(e.id || e.user_id || e.player_id || '');
                if (id) byId[id] = safeStr(e.name || e.playername);
            });
            Object.keys(log || {}).forEach(id => {
                const e = log[id] || {};
                const ts = Number(e.lastTrain) || 0;
                rows.push([id, byId[id] || '', Number(e.trains) || 0, ts ? new Date(ts).toISOString() : '']);
            });
            sheets.push({ name: 'Trains', rows });
        }

        if (opts.metrics !== false) {
            const mlog = loadMetricsLog();
            const weeks = (mlog && mlog.weeks) || {};
            const rows = [['Week', 'Efficiency', 'Environment', 'Popularity', 'Weekly Income', 'Staffed', 'Capacity']];
            Object.keys(weeks).sort().reverse().forEach(wk => {
                const w = weeks[wk] || {};
                rows.push([
                    wk,
                    w.efficiency != null ? w.efficiency : '',
                    w.environment != null ? w.environment : '',
                    w.popularity != null ? w.popularity : '',
                    w.weeklyIncome != null ? w.weeklyIncome : (w.weekly_income != null ? w.weekly_income : ''),
                    w.hired != null ? w.hired : '',
                    w.capacity != null ? w.capacity : ''
                ]);
            });
            sheets.push({ name: 'Metrics', rows });
        }

        if (opts.peers !== false && lastPeerReport) {
            const rows = [['Company ID', 'Name', 'Rating', 'Hired', 'Capacity', 'Weekly Income', 'Role Count', 'Source']];
            (lastPeerReport.peers || []).forEach(peer => {
                rows.push([
                    peer.id, peer.name || '', peer.rating, peer.hired, peer.capacity,
                    peer.income, peer.roleCount, peer.source || ''
                ]);
            });
            if (lastPeerReport.rows && lastPeerReport.rows.length) {
                rows.push([]);
                rows.push(['Role', 'Yours', 'Peer avg', 'Gap']);
                lastPeerReport.rows.forEach(r => {
                    rows.push([r.role, r.yours, Math.round((r.peerAvg || 0) * 10) / 10, Math.round((r.gap || 0) * 10) / 10]);
                });
            }
            sheets.push({ name: 'Peers', rows });
        }

        if (opts.stock !== false && companyData) {
            const stock = companyData.company_stock || companyData.stock || {};
            const rows = [['Item', 'In Stock', 'Sold/day', 'Days left', 'On order']];
            analyzeStock(stock).forEach(r => {
                rows.push([
                    r.name,
                    r.inStock != null ? r.inStock : '',
                    r.sold != null ? r.sold : '',
                    r.days != null ? (Math.round(r.days * 10) / 10) : '',
                    r.orderQty != null ? r.orderQty : ''
                ]);
            });
            sheets.push({ name: 'Stock', rows });
        }

        if (opts.tornstats !== false) {
            const stage = loadTornstatsStaging();
            const hist = loadJson('tcmFinanceHistory', []).filter(r => r.source === 'tornstats');
            const rows = [['Date', 'Daily', 'Salaries', 'Ad Budget', 'Stock Cost', 'Net Profit']];
            const src = (stage && stage.rows && stage.rows.length) ? stage.rows : hist;
            src.forEach(r => {
                rows.push([r.date, r.daily || 0, r.salaries || 0, r.adBudget || 0, r.dailyStockCost || 0, r.netProfit || 0]);
            });
            if (rows.length > 1) sheets.push({ name: 'TornStats Import', rows });
        }

        // Company summary sheet always useful
        sheets.unshift({
            name: 'Overview',
            rows: [
                ['Field', 'Value'],
                ['Company', safeStr(p.name) || ''],
                ['Type', typeName],
                ['Rating', p.rating != null ? p.rating : ''],
                ['Weekly income', p.weekly_income != null ? p.weekly_income : ''],
                ['Daily income', p.daily_income != null ? p.daily_income : ''],
                ['Efficiency', p.efficiency != null ? p.efficiency : ''],
                ['Environment', p.environment != null ? p.environment : (p.company_environment != null ? p.company_environment : '')],
                ['Popularity', p.popularity != null ? p.popularity : ''],
                ['Exported at', new Date().toISOString()],
                ['TCM version', '3.21.1']
            ]
        });

        return { sheets };
    }

    async function pushToGoogleSheets() {
        if (!sheetsWebAppUrl) throw new Error('Google Sheets web app URL not set');
        const payload = buildSheetsPayload();
        if (!payload.sheets || !payload.sheets.length) throw new Error('Nothing to export');
        // Apps Script web apps may return empty body or a redirect chain; GM handles redirects
        try {
            await xhrJson(
                'POST',
                sheetsWebAppUrl,
                { 'Content-Type': 'application/json' },
                payload
            );
        } catch (e) {
            // Some deployments return 200 with non-JSON; xhrJson may still resolve.
            // If status is missing, rethrow.
            if (e && e.status && e.status >= 400) throw e;
            if (e && /Network error/i.test(String(e.message || e))) throw e;
            // Non-JSON success body — treat as OK when no hard failure
            if (!(e && e.status >= 200 && e.status < 400)) throw e;
        }
        return payload.sheets.map(s => s.name);
    }

    const SHEETS_APPS_SCRIPT = `function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  (data.sheets || []).forEach(function (s) {
    var sh = ss.getSheetByName(s.name) || ss.insertSheet(s.name);
    sh.clearContents();
    try { var f = sh.getFilter(); if (f) f.remove(); } catch (ex) {}
    if (s.rows && s.rows.length) {
      var nr = s.rows.length, nc = s.rows[0].length;
      sh.getRange(1, 1, nr, nc).setValues(s.rows);
      sh.getRange(1, 1, 1, nc).setFontWeight('bold');
      sh.autoResizeColumns(1, nc);
    }
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

    function showSyncSettings() {
        const content = document.getElementById('tcm-content');
        if (!content) return;
        const so = sheetsOpts || {};
        const stage = loadTornstatsStaging();
        const stageNote = stage && stage.rows
            ? (stage.rows.length + ' TornStats day(s) staged · ' + fmtTime(stage.capturedAt))
            : 'No TornStats data staged yet (visit tornstats.com company finance while TCM is installed)';
        content.innerHTML = `
            <div class="tcm-key-box">
                <strong>Data Sync</strong>
                <div class="tcm-key-note" style="margin:8px 0 12px">
                    Two optional channels — use either or both:<br>
                    • <strong>JSONBin</strong> — live Web ↔ PDA sync (trains, metrics, Discord, peers)<br>
                    • <strong>Google Sheets</strong> — one-way export for spreadsheets / bookkeeping<br>
                    <span style="color:#9cf">Torn PDA:</span> use injection time <strong>End</strong>. Install/update
                    <strong>GMforPDA</strong> so PUT/PATCH work (JSONBin + Discord panel edits).
                </div>

                <h4 style="margin:12px 0 6px;color:#9cf">JSONBin (Web ↔ PDA)</h4>
                <label>JSONBin Bin ID</label>
                <input type="text" id="tcm-jsonbin-id" placeholder="e.g. 65f0..." value="${(jsonbinId || '').replace(/"/g, '&quot;')}">
                <label>JSONBin Master Key</label>
                <input type="password" id="tcm-jsonbin-key" placeholder="X-Master-Key" value="${(jsonbinKey || '').replace(/"/g, '&quot;')}">

                <h4 style="margin:16px 0 6px;color:#9cf">Google Sheets (optional export)</h4>
                <label>Apps Script Web App URL</label>
                <input type="text" id="tcm-sheets-url" placeholder="https://script.google.com/macros/s/.../exec"
                    value="${(sheetsWebAppUrl || '').replace(/"/g, '&quot;')}">
                <div style="margin:8px 0;font-size:12px;color:#ccc;display:flex;flex-wrap:wrap;gap:10px">
                    <label><input type="checkbox" id="tcm-sh-finance"${so.finance !== false ? ' checked' : ''}> Finance</label>
                    <label><input type="checkbox" id="tcm-sh-trains"${so.trains !== false ? ' checked' : ''}> Trains</label>
                    <label><input type="checkbox" id="tcm-sh-metrics"${so.metrics !== false ? ' checked' : ''}> Metrics</label>
                    <label><input type="checkbox" id="tcm-sh-peers"${so.peers !== false ? ' checked' : ''}> Peers</label>
                    <label><input type="checkbox" id="tcm-sh-stock"${so.stock !== false ? ' checked' : ''}> Stock</label>
                    <label><input type="checkbox" id="tcm-sh-tornstats"${so.tornstats !== false ? ' checked' : ''}> TornStats import</label>
                </div>

                <h4 style="margin:16px 0 6px;color:#9cf">TornStats import</h4>
                <div class="tcm-key-note">${stageNote}</div>
                <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
                    <button class="tcm-btn" id="tcm-save-sync">Save settings</button>
                    <button class="tcm-btn" id="tcm-run-sync">JSONBin Sync Now</button>
                    <button class="tcm-btn" id="tcm-run-sheets">Export to Sheets</button>
                    <button class="tcm-btn secondary" id="tcm-import-ts">Import TornStats stage</button>
                    <button class="tcm-btn secondary" id="tcm-back-dash">Back</button>
                </div>

                <div class="tcm-key-note" style="margin-top:12px">
                    <strong>JSONBin setup</strong><br>
                    1. Account at <a href="https://jsonbin.io" target="_blank" style="color:#7eb8ff">jsonbin.io</a><br>
                    2. Create bin with starter JSON (copy below) → paste Bin ID + Master Key<br>
                    <textarea readonly id="tcm-jsonbin-starter" style="width:100%;height:90px;margin:6px 0;padding:6px;background:#111;border:1px solid #555;color:#cfc;font:11px monospace;border-radius:4px;box-sizing:border-box">{
  "version": 5,
  "updated": 0,
  "company_id": null,
  "company_name": null,
  "trains": {},
  "metrics": { "weeks": {} },
  "peers": {},
  "discord": { "logWebhook": "", "panelWebhook": "", "weeklyWebhook": "", "opts": {}, "meta": {} }
}</textarea>
                    <button type="button" class="tcm-btn secondary" id="tcm-copy-starter">Copy starter JSON</button>
                </div>
                <div class="tcm-key-note" style="margin-top:10px">
                    <strong>Google Sheets setup</strong><br>
                    1. Create a Google Sheet → Extensions → Apps Script<br>
                    2. Paste the <code>doPost</code> function (Copy Apps Script button) → Deploy → Web app<br>
                    &nbsp;&nbsp;Execute as: <em>Me</em> · Who has access: <em>Anyone</em> (or anyone with link)<br>
                    3. Paste the web app URL above → Save → Export to Sheets<br>
                    <button type="button" class="tcm-btn secondary" id="tcm-copy-appscript" style="margin-top:6px">Copy Apps Script</button>
                    <textarea readonly id="tcm-appscript-src" style="display:none"></textarea>
                </div>
                <div class="tcm-key-note" style="margin-top:10px">
                    <strong>TornStats helper</strong><br>
                    Open your company finance page on tornstats.com with this script installed.
                    TCM shows a small badge, copies rows, and stages them for import here (compliant: only the page you are viewing).
                </div>
            </div>`;

        document.getElementById('tcm-appscript-src').value = SHEETS_APPS_SCRIPT;

        document.getElementById('tcm-save-sync').onclick = () => {
            jsonbinId = (document.getElementById('tcm-jsonbin-id').value || '').trim();
            jsonbinKey = (document.getElementById('tcm-jsonbin-key').value || '').trim();
            sheetsWebAppUrl = (document.getElementById('tcm-sheets-url').value || '').trim();
            GM_setValue('tcmJsonbinId', jsonbinId);
            GM_setValue('tcmJsonbinKey', jsonbinKey);
            GM_setValue('tcmSheetsWebAppUrl', sheetsWebAppUrl);
            saveSheetsOpts({
                finance: !!(document.getElementById('tcm-sh-finance') || {}).checked,
                trains: !!(document.getElementById('tcm-sh-trains') || {}).checked,
                metrics: !!(document.getElementById('tcm-sh-metrics') || {}).checked,
                peers: !!(document.getElementById('tcm-sh-peers') || {}).checked,
                stock: !!(document.getElementById('tcm-sh-stock') || {}).checked,
                tornstats: !!(document.getElementById('tcm-sh-tornstats') || {}).checked
            });
            setStatus('Data Sync + Sheets settings saved');
        };
        document.getElementById('tcm-run-sync').onclick = async () => {
            if (!jsonbinId || !jsonbinKey) {
                setStatus('JSONBin ID + Master Key required for JSONBin sync', true);
                return;
            }
            setStatus('JSONBin Data Sync in progress…');
            try {
                await syncTrainLogBothWays();
                setStatus('JSONBin sync complete (trains + metrics + Discord + peers)');
                if (companyData) render(companyData);
            } catch (e) {
                setStatus('JSONBin sync failed: ' + (e.message || e), true);
            }
        };
        document.getElementById('tcm-run-sheets').onclick = async () => {
            sheetsWebAppUrl = (document.getElementById('tcm-sheets-url').value || '').trim() || sheetsWebAppUrl;
            if (!sheetsWebAppUrl) {
                setStatus('Set Google Sheets web app URL first', true);
                return;
            }
            GM_setValue('tcmSheetsWebAppUrl', sheetsWebAppUrl);
            setStatus('Exporting to Google Sheets…');
            try {
                if (companyData) snapshotFinanceToday();
                const names = await pushToGoogleSheets();
                setStatus('Sheets export OK: ' + names.join(', '));
            } catch (e) {
                setStatus('Sheets export failed: ' + (e.message || e), true);
            }
        };
        document.getElementById('tcm-import-ts').onclick = () => {
            const r = importTornstatsStagingIntoLocal();
            if (!r.imported) setStatus('Nothing staged — open TornStats company finance with TCM installed', true);
            else setStatus('Imported ' + r.imported + ' TornStats day(s) · history size ' + r.total);
        };
        document.getElementById('tcm-back-dash').onclick = () => {
            if (companyData) render(companyData);
            else if (apiKey) fetchAll(true);
            else showKeyInput();
        };
        const copyStarter = document.getElementById('tcm-copy-starter');
        if (copyStarter) {
            copyStarter.onclick = () => {
                const ta = document.getElementById('tcm-jsonbin-starter');
                if (!ta) return;
                ta.select();
                try {
                    navigator.clipboard.writeText(ta.value);
                    setStatus('Starter JSON copied');
                } catch (e) {
                    try { document.execCommand('copy'); setStatus('Starter JSON copied'); }
                    catch (e2) { setStatus('Select the starter JSON and copy manually', true); }
                }
            };
        }
        const copyAs = document.getElementById('tcm-copy-appscript');
        if (copyAs) {
            copyAs.onclick = () => {
                const ta = document.getElementById('tcm-appscript-src');
                try {
                    if (typeof GM_setClipboard === 'function') GM_setClipboard(SHEETS_APPS_SCRIPT, 'text');
                    else if (navigator.clipboard) navigator.clipboard.writeText(SHEETS_APPS_SCRIPT);
                    else if (ta) { ta.style.display = 'block'; ta.value = SHEETS_APPS_SCRIPT; ta.select(); document.execCommand('copy'); }
                    setStatus('Apps Script doPost copied — paste into Extensions → Apps Script');
                } catch (e) {
                    setStatus('Copy failed — expand textarea and copy manually', true);
                    if (ta) { ta.style.display = 'block'; ta.value = SHEETS_APPS_SCRIPT; }
                }
            };
        }
    }


    function markEmployeeTrained(employeeId) {
        const log = loadTrainLog();
        const id = String(employeeId);
        if (!log[id]) log[id] = { trains: 0, lastTrain: 0, byDay: {} };
        if (!log[id].byDay || typeof log[id].byDay !== 'object') log[id].byDay = {};
        log[id].trains = (log[id].trains || 0) + 1;
        log[id].lastTrain = Date.now();
        const day = tornCompanyDayKey();
        log[id].byDay[day] = (Number(log[id].byDay[day]) || 0) + 1;
        try {
            const keys = Object.keys(log[id].byDay).sort();
            while (keys.length > 21) delete log[id].byDay[keys.shift()];
        } catch (e) {}
        saveTrainLog(log);
        if (companyData) render(companyData);
        setStatus('Logged train for employee #' + id + (jsonbinId ? ' — Data Sync…' : ''));
        pushTrainLogRemote(log).then(() => {
            setStatus('Logged train for employee #' + id + (jsonbinId ? ' (synced)' : ''));
        }).catch(e => {
            setStatus('Train logged locally; Data Sync push failed: ' + (e.message || e), true);
        });
    }

    function resetTrainLog() {
        if (!confirm('Reset all logged trains (local + push empty to remote if Data Sync is configured)?')) return;
        GM_setValue(TRAIN_LOG_KEY, '{}');
        if (companyData) render(companyData);
        setStatus('Train log cleared' + (jsonbinId ? ' — Data Sync…' : ''));
        pushTrainLogRemote({}).then(() => setStatus('Train log cleared')).catch(() => setStatus('Cleared locally; Data Sync push failed', true));
    }

    function empDays(e) {
        return Number(
            e.days_in_company != null ? e.days_in_company :
            e.days_employed != null ? e.days_employed :
            e.days != null ? e.days : 0
        ) || 0;
    }

    function empEffectiveness(e) {
        // Can be number or object { working, addicted, ... }
        if (e.effectiveness == null) return null;
        if (typeof e.effectiveness === 'number') return e.effectiveness;
        if (typeof e.effectiveness === 'object') {
            if (e.effectiveness.total != null) return Number(e.effectiveness.total);
            if (e.effectiveness.working != null) return Number(e.effectiveness.working);
            // sum numeric fields if present
            let s = 0, n = 0;
            Object.keys(e.effectiveness).forEach(k => {
                const v = Number(e.effectiveness[k]);
                if (!isNaN(v)) { s += v; n++; }
            });
            return n ? s : null;
        }
        return null;
    }

    /** Breakdown of API effectiveness object (settled-in, addiction, etc.) */
    function empEffParts(e) {
        const parts = {
            total: empEffectiveness(e),
            working: null,
            settled: null,
            addiction: null,
            inactivity: null,
            merits: null,
            directorEdu: null
        };
        if (!e || e.effectiveness == null || typeof e.effectiveness !== 'object') {
            // flat fields some payloads use
            if (e && e.addiction != null) parts.addiction = Number(e.addiction);
            return parts;
        }
        const o = e.effectiveness;
        const pick = (...keys) => {
            for (let i = 0; i < keys.length; i++) {
                if (o[keys[i]] != null && o[keys[i]] !== '') {
                    const n = Number(o[keys[i]]);
                    if (!isNaN(n)) return n;
                }
            }
            return null;
        };
        parts.working = pick('working', 'working_stats', 'working_stat');
        parts.settled = pick('settled_in', 'settled', 'settledIn');
        parts.addiction = pick('addiction', 'addicted', 'drug_addiction');
        parts.inactivity = pick('inactivity', 'inactive', 'inactive_days');
        parts.merits = pick('merits', 'management', 'management_merits', 'merit');
        parts.directorEdu = pick('director_education', 'education', 'director_edu');
        if (e.addiction != null && parts.addiction == null) parts.addiction = Number(e.addiction);
        return parts;
    }

    function empDailyWage(e) {
        if (!e || typeof e !== 'object') return 0;
        const w = e.wage != null ? e.wage
            : (e.salary != null ? e.salary
                : (e.daily_wage != null ? e.daily_wage
                    : (e.pay != null ? e.pay : 0)));
        const n = Number(w);
        return isNaN(n) ? 0 : n;
    }

    function computePayroll(employees) {
        const list = getEmpList(employees);
        let total = 0;
        list.forEach(e => { total += empDailyWage(e); });
        return { total: total, count: list.length };
    }

    function renderFinanceStripHtml(p, employees) {
        const payroll = computePayroll(employees);
        const daily = numOrNull(p.daily_income);
        const weekly = numOrNull(p.weekly_income);
        const profit = daily != null ? daily - payroll.total : null;
        const margin = (daily != null && daily > 0)
            ? Math.round(((daily - payroll.total) / daily) * 1000) / 10
            : null;
        const dayQ = classifyIncomeDay(p);

        let html = `<div class="tcm-section"><h4>Finance</h4>`;
        html += `<div class="tcm-row"><span class="tcm-label">Daily payroll</span>
            <span class="tcm-value">$${payroll.total.toLocaleString()}
            <span style="color:#888;font-weight:normal">(${payroll.count} staff)</span></span></div>`;
        if (daily != null) {
            html += `<div class="tcm-row"><span class="tcm-label">Daily income</span>
                <span class="tcm-value">$${Number(daily).toLocaleString()}</span></div>`;
        }
        if (profit != null) {
            const cls = profit >= 0 ? 'tcm-good' : 'tcm-bad';
            html += `<div class="tcm-row"><span class="tcm-label">Profit after wages</span>
                <span class="tcm-value ${cls}">$${Math.round(profit).toLocaleString()}
                ${margin != null ? ` <span style="color:#888;font-weight:normal">(${margin}% margin)</span>` : ''}</span></div>`;
        }
        if (weekly != null) {
            html += `<div class="tcm-row"><span class="tcm-label">Weekly income</span>
                <span class="tcm-value">$${Number(weekly).toLocaleString()}</span></div>`;
        }
        if (dayQ) {
            const cls = dayQ.level === 'strong' ? 'tcm-good'
                : dayQ.level === 'weak' ? 'tcm-bad' : 'tcm-warn';
            html += `<div class="tcm-row"><span class="tcm-label">Today vs avg day</span>
                <span class="tcm-value ${cls}">${dayQ.label}</span></div>`;
        }
        const salWarn = salaryRatioAlert(daily, payroll.total);
        if (salWarn) {
            html += `<div class="tcm-reco tcm-warn">${salWarn.msg}</div>`;
        }
        html += `<div class="tcm-peer-note">Payroll sums employee wage/salary fields from the API. Profit = daily income − payroll. Salary-ratio warn at ≥${Math.round(SALARY_RATIO_WARN*100)}%.</div></div>`;
        return html;
    }

    /**
     * Classify today as strong / average / weak vs implied average daily from weekly income.
     * Falls back to popularity bands when daily/weekly missing.
     */
    function classifyIncomeDay(p) {
        const daily = numOrNull(p.daily_income);
        const weekly = numOrNull(p.weekly_income);
        const pop = numOrNull(p.popularity);
        if (daily != null && weekly != null && weekly > 0) {
            const avg = weekly / 7;
            if (avg <= 0) return null;
            const ratio = daily / avg;
            if (ratio >= 1.12) {
                return { level: 'strong', label: 'Strong day (' + Math.round(ratio * 100) + '% of avg day)', ratio: ratio };
            }
            if (ratio <= 0.88) {
                return { level: 'weak', label: 'Weak day (' + Math.round(ratio * 100) + '% of avg day)', ratio: ratio };
            }
            return { level: 'average', label: 'Average day (' + Math.round(ratio * 100) + '% of avg day)', ratio: ratio };
        }
        if (pop != null) {
            if (pop >= 85) return { level: 'strong', label: 'Strong popularity (' + pop + '%)', ratio: null };
            if (pop <= 40) return { level: 'weak', label: 'Weak popularity (' + pop + '%)', ratio: null };
            return { level: 'average', label: 'Mid popularity (' + pop + '%)', ratio: null };
        }
        return null;
    }

    function estimateDailyTrains(p, empList) {
        const rating = Number(p.rating || p.stars || 0) || 0;
        const tx = trainerExtraTrains(empList);
        return {
            daily: rating + tx.extra,
            rating,
            hasTrainer: tx.trainers > 0,
            trainerExtra: tx.extra,
            trainers: tx.trainers
        };
    }

    function buildSmartTraining(p, employees, companyType) {
        const list = getEmpList({ employees: employees, company_employees: employees });
        const trainEst = estimateDailyTrains(p, list);
        const log = loadTrainLog();
        const mode = trainMode === 'star' ? 'star' : 'fair';
        const exclude = loadTrainExclude();
        const settleDays = loadSettlingDays();
        const activeContracts = getActiveTrainContracts();
        const contractBuyerIds = new Set(activeContracts.map(c => String(c.buyerEmpId)));
        const reservedToday = totalDailyReservations();

        // Score each employee for training priority
        const scored = list.map(e => {
            const id = empId(e);
            const st = empStats(e);
            const man = st.man, int = st.int, end = st.end;
            const best = findBestPosition(man, int, end, companyType);
            const wsEff = best ? best.eff : 0;
            const days = empDays(e);
            const eff = empEffectiveness(e);
            const parts = empEffParts(e);
            const logged = log[String(id)] ? (log[String(id)].trains || 0) : 0;
            const loggedToday = trainsLoggedToday(id);
            const fairShare = days;
            const trainRatio = days > 0 ? logged / days : logged;
            const excluded = !!exclude[String(id)];
            const settling = days < settleDays;
            const isDirector = /director/i.test(safeStr(e.position));
            let priority = 0;

            if (excluded || isDirector) {
                priority = -1e9;
            } else if (settling) {
                priority = -1e6 + days; // still sortable but not planned
            } else if (mode === 'star') {
                if (eff != null) {
                    const nextTier = eff < 100 ? 100 : (eff < 110 ? 110 : 120);
                    const gap = Math.max(0, nextTier - eff);
                    priority += gap * 4;
                    if (eff >= 100 && eff < 105) priority += 15;
                } else {
                    priority += (90 - Math.min(wsEff, 90)) * 3;
                }
                priority += (90 - Math.min(wsEff, 90)) * 1.5;
                if (parts.addiction != null && Math.abs(parts.addiction) >= 5) priority *= 0.7;
                // Prefer fewer trains-to-tier when close
                const sim = trainsToNextEffTier(e, companyType);
                if (sim && sim.trains != null && sim.trains > 0 && sim.trains <= 15) {
                    priority += (16 - sim.trains) * 2;
                }
            } else {
                priority += (90 - Math.min(wsEff, 90)) * 2;
                if (eff != null) priority += Math.max(0, 50 - eff);
                priority += Math.max(0, 5 - trainRatio * 100);
                if (days < settleDays + 2) priority *= 0.5;
            }

            const tierInfo = trainsToNextEffTier(e, companyType);

            return {
                id, e, name: e.name || e.playername || String(id),
                position: safeStr(e.position) || '—',
                days, wsEff, eff, parts, logged, loggedToday, fairShare, priority,
                bestName: best ? best.name : null,
                man, int, end,
                excluded, settling, isDirector,
                tierTrains: tierInfo && tierInfo.trains != null ? tierInfo.trains : null,
                tierNext: tierInfo && tierInfo.next != null ? tierInfo.next : null,
                planned: 0,
                done: false,
                isNext: false
            };
        });

        const totalDays = scored.reduce((s, x) => s + (x.excluded || x.isDirector ? 0 : x.days), 0) || 1;
        const totalLogged = scored.reduce((s, x) => s + x.logged, 0);
        scored.forEach(x => {
            const expectedShare = totalLogged * (x.days / totalDays);
            x.owedDelta = expectedShare - x.logged;
        });

        // Pre-assign contract daily reservations to buyers
        const plannedMap = {};
        scored.forEach(x => { plannedMap[x.id] = 0; });
        activeContracts.forEach(c => {
            const id = String(c.buyerEmpId);
            const need = Math.min(c.dailyReservation || 0, c.remaining || 0);
            if (need > 0 && plannedMap[id] != null) {
                plannedMap[id] = (plannedMap[id] || 0) + need;
            }
        });

        // Eligible pool for remaining free budget (contract buyers still eligible for extra)
        const pool = scored.filter(x => !x.excluded && !x.isDirector && !x.settling);
        if (mode === 'fair') {
            pool.sort((a, b) => {
                if (Math.abs(b.priority - a.priority) > 8) return b.priority - a.priority;
                return b.owedDelta - a.owedDelta;
            });
        } else {
            pool.sort((a, b) => b.priority - a.priority);
        }

        // Allocate remaining daily budget (estimate − reservations − logged today)
        const loggedTodayAll = scored.reduce((s, x) => s + x.loggedToday, 0);
        // Contract daily reservations are pre-assigned to buyers (not free fair pool)
        let budget = Math.max(0, (trainEst.daily || 0) - reservedToday - loggedTodayAll);
        pool.forEach(x => { if (plannedMap[x.id] == null) plannedMap[x.id] = 0; });
        // Greedy: assign free budget one train at a time (after contract reservations)
        for (let i = 0; i < budget; i++) {
            pool.sort((a, b) => {
                const ap = a.priority - (plannedMap[a.id] || 0) * (mode === 'fair' ? 12 : 6);
                const bp = b.priority - (plannedMap[b.id] || 0) * (mode === 'fair' ? 12 : 6);
                if (mode === 'fair') {
                    const aDebt = (a.owedDelta || 0) - (plannedMap[a.id] || 0);
                    const bDebt = (b.owedDelta || 0) - (plannedMap[b.id] || 0);
                    if (Math.abs(bDebt - aDebt) > 0.25) return bDebt - aDebt;
                }
                return bp - ap;
            });
            if (!pool.length) break;
            plannedMap[pool[0].id] = (plannedMap[pool[0].id] || 0) + 1;
        }

        scored.forEach(x => {
            x.planned = plannedMap[x.id] || 0;
            x.done = x.planned > 0 && x.loggedToday >= x.planned;
            x.remaining = Math.max(0, x.planned - x.loggedToday);
        });

        // Sort display: next to train first, then remaining plan, then priority
        scored.sort((a, b) => {
            if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
            if (a.settling !== b.settling) return a.settling ? 1 : -1;
            if (b.remaining !== a.remaining) return b.remaining - a.remaining;
            return b.priority - a.priority;
        });
        let markedNext = false;
        scored.forEach(x => {
            if (!markedNext && x.remaining > 0) {
                x.isNext = true;
                markedNext = true;
            }
        });

        return {
            trainEst, scored, totalLogged, totalDays, mode,
            settleDays, budgetLeft: budget, loggedTodayAll,
            reservedToday, activeContracts
        };
    }

    function analyzeStock(stock) {
        const items = Object.values(stock || {});
        const rows = [];
        items.forEach(s => {
            const name = s.name || s.item || 'Item';
            const inStock = s.in_stock != null ? s.in_stock : (s.amount != null ? s.amount : null);
            const sold = s.sold_amount != null ? Number(s.sold_amount) :
                (s.sold != null ? Number(s.sold) :
                (s.sales != null ? Number(s.sales) : null));
            const price = s.price || s.selling_price || null;
            let days = null;
            if (inStock != null && sold != null && sold > 0) {
                days = inStock / sold;
            }
            let orderQty = null;
            if (sold != null && sold > 0 && inStock != null) {
                orderQty = Math.max(0, Math.ceil(STOCK_TARGET_DAYS * sold - inStock));
            }
            let health = 'unknown';
            if (days != null) {
                if (days < 2) health = 'critical';
                else if (days < 5) health = 'watch';
                else health = 'ok';
            } else if (inStock != null) {
                if (inStock < 10) health = 'critical';
                else if (inStock < 50) health = 'watch';
                else health = 'ok';
            }
            if (inStock == null && days == null) return;
            rows.push({
                name: name,
                inStock: inStock,
                sold: sold,
                days: days,
                orderQty: orderQty,
                price: price,
                health: health
            });
        });
        rows.sort((a, b) => {
            const rank = { critical: 0, watch: 1, unknown: 2, ok: 3 };
            return (rank[a.health] != null ? rank[a.health] : 9) - (rank[b.health] != null ? rank[b.health] : 9);
        });
        return rows;
    }

    function stockDaysHtml(stock) {
        const rows = analyzeStock(stock);
        if (!rows.length) return '';
        let html = `<div class="tcm-section"><h4>Stock · Smart Balance</h4>`;
        html += `<table class="tcm-emp"><thead><tr>
            <th>Item</th><th>In stock</th><th>Sold/day</th><th>Days left</th><th>Order for ${STOCK_TARGET_DAYS}d</th>
        </tr></thead><tbody>`;
        rows.forEach(r => {
            const cls = r.health === 'critical' ? 'tcm-bad'
                : r.health === 'watch' ? 'tcm-warn' : 'tcm-good';
            const daysStr = r.days != null ? r.days.toFixed(1) + 'd' : '—';
            const soldStr = r.sold != null ? Math.round(r.sold) : '—';
            const orderStr = r.orderQty != null
                ? (r.orderQty > 0 ? '<strong>+' + r.orderQty + '</strong>' : '0')
                : '—';
            html += `<tr>
                <td>${r.name}</td>
                <td>${r.inStock != null ? r.inStock : '—'}</td>
                <td>${soldStr}</td>
                <td class="${cls}">${daysStr}${r.health === 'critical' ? ' ⚠' : ''}</td>
                <td class="${r.orderQty > 0 ? 'tcm-warn' : ''}">${orderStr}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        const critical = rows.filter(r => r.health === 'critical');
        if (critical.length) {
            html += `<div class="tcm-warn" style="margin-top:6px">Critical (&lt;2 days): ${critical.map(r => r.name).join(', ')}</div>`;
        }
        html += `<div class="tcm-peer-note">Days ≈ stock ÷ recent daily sales. Order qty aims for ~${STOCK_TARGET_DAYS} days left after delivery (does not place the order in-game).</div></div>`;
        return html;
    }


    /** Primary = higher req stat on the role; secondary = the other non-zero. */
    function positionPrimarySecondary(pos) {
        if (!pos) return { primary: null, secondary: null };
        const pairs = [
            { key: 'man', req: Number(pos.man) || 0 },
            { key: 'int', req: Number(pos.int) || 0 },
            { key: 'end', req: Number(pos.end) || 0 }
        ].filter(x => x.req > 0).sort((a, b) => b.req - a.req);
        return {
            primary: pairs[0] || null,
            secondary: pairs[1] || null
        };
    }

    /**
     * Minimum director trains to reach target stats while trained in `pos`.
     * Each train: +50 primary, +25 secondary (wiki); tertiary unchanged.
     * trains = max(ceil(priGap/50), ceil(secGap/25)).
     */
    function calcMinDirectorTrains(current, target, pos) {
        const cur = {
            man: Math.max(0, Number(current.man) || 0),
            int: Math.max(0, Number(current.int) || 0),
            end: Math.max(0, Number(current.end) || 0)
        };
        const tgt = {
            man: Math.max(0, Number(target.man) || 0),
            int: Math.max(0, Number(target.int) || 0),
            end: Math.max(0, Number(target.end) || 0)
        };
        const ps = positionPrimarySecondary(pos);
        if (!ps.primary) {
            return { ok: false, error: 'Position has no stat requirements', trains: null };
        }
        const priKey = ps.primary.key;
        const secKey = ps.secondary ? ps.secondary.key : null;
        const allKeys = ['man', 'int', 'end'];
        const tertiaryKeys = allKeys.filter(k => k !== priKey && k !== secKey);

        const priGap = Math.max(0, tgt[priKey] - cur[priKey]);
        const secGap = secKey ? Math.max(0, tgt[secKey] - cur[secKey]) : 0;
        const priTrains = priGap > 0 ? Math.ceil(priGap / TRAIN_PRIMARY) : 0;
        const secTrains = secGap > 0 ? Math.ceil(secGap / TRAIN_SECONDARY) : 0;
        const trains = Math.max(priTrains, secTrains);

        const after = {
            man: cur.man,
            int: cur.int,
            end: cur.end
        };
        after[priKey] = cur[priKey] + trains * TRAIN_PRIMARY;
        if (secKey) after[secKey] = cur[secKey] + trains * TRAIN_SECONDARY;

        const unreachable = [];
        tertiaryKeys.forEach(k => {
            if (tgt[k] > cur[k]) {
                unreachable.push({
                    key: k,
                    need: tgt[k] - cur[k],
                    note: 'Not trained in this position (no ' + k.toUpperCase() + ' gain per train)'
                });
            }
        });

        return {
            ok: true,
            trains,
            priKey,
            secKey,
            priGap,
            secGap,
            priTrains,
            secTrains,
            after,
            unreachable,
            posName: pos.name || ''
        };
    }


    /**
     * Rank positions for reaching target stats from current via director trains.
     * Prefers roles that cover more of the needed stats, then fewer trains.
     */
    function rankTrainingRolesForTargets(current, target, companyType) {
        const positions = getPositionsForType(companyType) || [];
        const cur = {
            man: Math.max(0, Number(current.man) || 0),
            int: Math.max(0, Number(current.int) || 0),
            end: Math.max(0, Number(current.end) || 0)
        };
        const tgt = {
            man: Math.max(0, Number(target.man) || 0),
            int: Math.max(0, Number(target.int) || 0),
            end: Math.max(0, Number(target.end) || 0)
        };
        const needed = ['man', 'int', 'end'].filter(k => tgt[k] > cur[k]);
        if (!needed.length || !positions.length) return { needed, ranked: [] };

        const ranked = positions.map(pos => {
            const r = calcMinDirectorTrains(cur, tgt, pos);
            const ps = positionPrimarySecondary(pos);
            const coverKeys = [];
            if (ps.primary) coverKeys.push(ps.primary.key);
            if (ps.secondary) coverKeys.push(ps.secondary.key);
            const covered = needed.filter(k => coverKeys.includes(k));
            const missed = needed.filter(k => !coverKeys.includes(k));
            // Progress: how much of needed gaps this role can address (0–1)
            let gapTotal = 0, gapCovered = 0;
            needed.forEach(k => {
                const g = tgt[k] - cur[k];
                gapTotal += g;
                if (coverKeys.includes(k)) gapCovered += g;
            });
            const coverage = gapTotal > 0 ? gapCovered / gapTotal : 1;
            return {
                pos,
                name: pos.name,
                trains: r.ok ? r.trains : 999999,
                covered,
                missed,
                coverage,
                after: r.ok ? r.after : null,
                priKey: r.priKey,
                secKey: r.secKey,
                detail: r
            };
        }).filter(x => x.trains < 999999);

        ranked.sort((a, b) =>
            b.coverage - a.coverage ||
            b.covered.length - a.covered.length ||
            a.trains - b.trains ||
            a.name.localeCompare(b.name)
        );
        return { needed, ranked };
    }

    /** Best single role, plus best role per missing stat when one role cannot cover all. */
    function recommendTrainingPath(current, target, companyType, selectedPosName) {
        const { needed, ranked } = rankTrainingRolesForTargets(current, target, companyType);
        if (!needed.length) {
            return { needed, best: null, alts: [], note: 'No stat increases needed.' };
        }
        if (!ranked.length) {
            return { needed, best: null, alts: [], note: 'No positions available for this company type.' };
        }
        const best = ranked[0];
        const selected = selectedPosName
            ? ranked.find(r => r.name.toLowerCase() === String(selectedPosName).toLowerCase())
            : null;

        // Per-stat best when best still misses some needed stats
        const alts = [];
        if (best.missed.length) {
            best.missed.forEach(stat => {
                const forStat = ranked
                    .filter(r => r.covered.includes(stat))
                    .sort((a, b) => a.trains - b.trains || b.coverage - a.coverage)[0];
                if (forStat) {
                    alts.push({
                        stat,
                        role: forStat.name,
                        trains: forStat.trains,
                        covered: forStat.covered
                    });
                }
            });
        }

        let switchRecommended = false;
        if (selected) {
            if (selected.missed.length && best.coverage > selected.coverage + 0.01) {
                switchRecommended = true;
            } else if (selected.missed.length && best.name !== selected.name && best.coverage >= selected.coverage) {
                switchRecommended = true;
            } else if (!selected.missed.length && best.name !== selected.name && best.trains < selected.trains) {
                switchRecommended = true; // same coverage, fewer trains
            }
        } else if (best.missed.length || true) {
            switchRecommended = true; // always surface best when custom/no selection match
        }

        return {
            needed,
            best,
            selected,
            alts,
            switchRecommended,
            ranked: ranked.slice(0, 5)
        };
    }

    function renderTrainCalculatorHtml(p, employees, companyType) {
        const positions = getPositionsForType(companyType) || [];
        const empArr = getEmpList(employees || {});
        const typeLabel = resolveCompanyTypeName(companyType, p) || safeStr(companyType) || 'Company';

        let empOpts = '<option value="">— Custom / new hire —</option>';
        empArr.forEach(e => {
            if (/director/i.test(safeStr(e.position))) return;
            const id = empId(e);
            const st = empStats(e);
            const name = (e.name || e.playername || ('#' + id)).replace(/</g, '');
            const pos = safeStr(e.position).replace(/"/g, '&quot;');
            empOpts += `<option value="${id}" data-man="${st.man}" data-int="${st.int}" data-end="${st.end}" data-pos="${pos}">${name} (${pos || '—'})</option>`;
        });

        let posOpts = '';
        if (positions.length) {
            positions.forEach(pos => {
                const n = String(pos.name).replace(/"/g, '&quot;');
                posOpts += `<option value="${n}" data-man="${pos.man || 0}" data-int="${pos.int || 0}" data-end="${pos.end || 0}">${n} (${pos.man || 0}/${pos.int || 0}/${pos.end || 0})</option>`;
            });
        } else {
            posOpts = '<option value="">No positions for this company type</option>';
        }

        const inputStyle = 'width:72px;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1a1a1a;color:#eee;font-size:12px';
        return `<div class="tcm-section" id="tcm-train-calc" style="margin-top:12px">
            <h4>Train Calculator</h4>
            <div class="tcm-peer-note" style="margin-bottom:8px">
                Each <strong>director train</strong> grants <strong>+${TRAIN_PRIMARY} primary</strong> and
                <strong>+${TRAIN_SECONDARY} secondary</strong> work stats for the selected position
                (Torn wiki — independent of efficiency). Tertiary stat does not increase in that role.
            </div>
            <div class="tcm-row"><span class="tcm-label">Employee</span>
                <span class="tcm-value"><select id="tcm-tc-emp" style="max-width:100%;font-size:12px">${empOpts}</select></span></div>
            <div class="tcm-row"><span class="tcm-label">Train as role</span>
                <span class="tcm-value"><select id="tcm-tc-pos" style="max-width:100%;font-size:12px">${posOpts}</select>
                <span style="color:#888;font-size:11px"> · ${typeLabel}</span></span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0">
                <div>
                    <div style="font-size:11px;color:#9cf;margin-bottom:4px">Current stats</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                        <label style="font-size:11px">MAN <input type="number" id="tcm-tc-cman" min="0" step="1" value="0" style="${inputStyle}"></label>
                        <label style="font-size:11px">INT <input type="number" id="tcm-tc-cint" min="0" step="1" value="0" style="${inputStyle}"></label>
                        <label style="font-size:11px">END <input type="number" id="tcm-tc-cend" min="0" step="1" value="0" style="${inputStyle}"></label>
                    </div>
                </div>
                <div>
                    <div style="font-size:11px;color:#9cf;margin-bottom:4px">Target stats</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                        <label style="font-size:11px">MAN <input type="number" id="tcm-tc-tman" min="0" step="1" value="0" style="${inputStyle}"></label>
                        <label style="font-size:11px">INT <input type="number" id="tcm-tc-tint" min="0" step="1" value="0" style="${inputStyle}"></label>
                        <label style="font-size:11px">END <input type="number" id="tcm-tc-tend" min="0" step="1" value="0" style="${inputStyle}"></label>
                    </div>
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">
                <button type="button" class="tcm-btn secondary" id="tcm-tc-use-req" title="Set targets to this role's recommended stats">Use role requirements as target</button>
                <button type="button" class="tcm-btn" id="tcm-tc-calc">Calculate</button>
            </div>
            <div id="tcm-tc-result" class="tcm-peer-note" style="margin-top:8px">Enter current + target stats, pick a role, then Calculate.</div>
        </div>`;
    }

    function renderSmartTrainingHtml(p, employees, companyType) {
        const empMap = employees || {};
        const useList = getEmpList({ employees: empMap, company_employees: empMap });
        if (!useList.length) return '';

        const built = buildSmartTraining(p, empMap, companyType);
        const { trainEst, scored, totalLogged, mode, settleDays, budgetLeft, loggedTodayAll } = built;
        const modeLabel = mode === 'star' ? 'Star push' : 'Fair share';
        const txNote = trainEst.hasTrainer
            ? (' +' + (trainEst.trainerExtra || 0) + ' from ' + (trainEst.trainers || 1) + ' trainer EE')
            : '';

        let html = `<div class="tcm-section"><h4>Smart Training</h4>`;
        html += `<div class="tcm-row"><span class="tcm-label">Mode</span>
            <span class="tcm-value">
                <button type="button" class="tcm-btn${mode === 'fair' ? '' : ' secondary'}" id="tcm-mode-fair" style="padding:2px 8px;font-size:11px">Fair share</button>
                <button type="button" class="tcm-btn${mode === 'star' ? '' : ' secondary'}" id="tcm-mode-star" style="padding:2px 8px;font-size:11px;margin-left:4px">Star push</button>
            </span></div>`;
        html += `<div class="tcm-row"><span class="tcm-label">Est. trains / day</span>
            <span class="tcm-value">${trainEst.daily} <span style="color:#888;font-weight:normal">(★${trainEst.rating}${txNote})</span></span></div>`;
        html += `<div class="tcm-row"><span class="tcm-label">Today (company day)</span>
            <span class="tcm-value">Logged ${loggedTodayAll} · plan left ~${budgetLeft} · day ${tornCompanyDayKey()}</span></div>`;
        html += `<div class="tcm-row"><span class="tcm-label">Logged trains (all-time)</span>
            <span class="tcm-value">${totalLogged}</span></div>`;
        html += `<div class="tcm-row"><span class="tcm-label">Settling-in days</span>
            <span class="tcm-value">
                <input type="number" id="tcm-settle-days" min="0" max="30" value="${settleDays}"
                    style="width:52px;padding:2px 6px;border-radius:4px;border:1px solid #444;background:#1a1a1a;color:#eee;font-size:12px">
                <button type="button" class="tcm-btn secondary" id="tcm-settle-save" style="padding:2px 8px;font-size:11px;margin-left:4px">Save</button>
                <span style="color:#888;font-size:11px"> — skip staff newer than this</span>
            </span></div>`;
        html += `<div class="tcm-peer-note" style="margin:6px 0">
            <strong>${modeLabel}</strong> builds today's <strong>plan</strong> from remaining train budget.
            ${mode === 'star'
                ? 'Prioritises staff near the next EE tier and trains-to-tier.'
                : 'Prioritises tenure fairness (Fair Δ) and under-trained staff.'}
            Staff in settling-in or <strong>excluded</strong> are skipped.
            Click <strong>+Train</strong> after you train them in Torn (does not spend trains in-game).
            Trainer capacity uses EE bands (50/100→+1, 150→+2, 200→+3 per trainer).
        </div>`;

        html += `<table class="tcm-emp"><thead><tr>
            <th></th><th>Name</th><th>Pos</th><th>Days</th><th>WS</th><th>EE</th>
            <th title="Planned today / logged today">Plan</th>
            <th title="Simulated director trains to next EE tier on current role">→Tier</th>
            <th>Fair Δ</th><th></th><th title="Exclude from train plan">Excl</th>
        </tr></thead><tbody>`;

        scored.slice(0, 30).forEach(x => {
            const wsCls = x.wsEff >= 90 ? 'tcm-good' : x.wsEff >= 70 ? 'tcm-warn' : 'tcm-bad';
            const fairCls = x.owedDelta > 0.5 ? 'tcm-gap' : x.owedDelta < -0.5 ? 'tcm-ok' : '';
            const fairStr = (x.owedDelta >= 0 ? '+' : '') + (x.owedDelta || 0).toFixed(1);
            const effStr = x.eff != null ? Math.round(x.eff) : '—';
            const planStr = x.planned
                ? (x.loggedToday + '/' + x.planned + (x.done ? ' ✓' : ''))
                : (x.loggedToday ? String(x.loggedToday) : '—');
            const planCls = x.done ? 'tcm-good' : (x.remaining > 0 ? 'tcm-warn' : '');
            const tierStr = x.tierTrains != null && x.tierNext
                ? (x.tierTrains + '→' + x.tierNext)
                : '—';
            const rowStyle = x.isNext ? 'background:rgba(74,222,128,0.12);' : (x.excluded || x.settling ? 'opacity:0.55;' : '');
            const flag = x.isNext ? '<span class="tcm-good" title="Train next">▶</span>'
                : (x.settling ? '<span title="Settling-in">…</span>'
                : (x.excluded ? '<span title="Excluded">✕</span>' : ''));
            html += `<tr style="${rowStyle}">
                <td>${flag}</td>
                <td>${x.name}</td>
                <td>${x.position}</td>
                <td>${x.days}</td>
                <td class="${wsCls}">${x.wsEff || '—'}</td>
                <td>${effStr}</td>
                <td class="${planCls}">${planStr}</td>
                <td title="${x.tierNext ? ('Next EE ' + x.tierNext) : ''}">${tierStr}</td>
                <td class="${fairCls}">${fairStr}</td>
                <td><button class="tcm-btn" data-train-id="${x.id}" style="padding:2px 6px;font-size:11px">+Train</button></td>
                <td><input type="checkbox" class="tcm-train-excl" data-excl-id="${x.id}" ${x.excluded ? 'checked' : ''} title="Exclude from plan"></td>
            </tr>`;
        });
        html += `</tbody></table>
            <div style="margin-top:6px">
                <button class="tcm-btn secondary" id="tcm-reset-trains">Reset train log</button>
            </div>
            <div class="tcm-peer-note">
                <strong>Plan</strong> = logged today / planned today for this company day (rolls ~18:00 TCT).
                <strong>→Tier</strong> = simulated trains on <em>current</em> role to next EE band (50/100/150/200).
                Fair Δ = expected share of all-time logged trains by tenure − actual.
            </div>
        </div>`;
        html += renderTrainContractsHtml(p, empMap);
        html += renderTrainCalculatorHtml(p, empMap, companyType);
        return html;
    }

    function fmtCash(n) {
        const v = Number(n) || 0;
        return '$' + Math.round(v).toLocaleString();
    }

    function renderTrainContractsHtml(p, employees) {
        const empArr = getEmpList(employees || {});
        const contracts = loadTrainContracts().map(enrichContract).filter(c => !c.deleted);
        const active = contracts.filter(c => c.active);
        const closed = contracts.filter(c => !c.active);
        const reserved = totalDailyReservations();
        const stars = Number(p && (p.rating || p.stars)) || 0;

        let empOpts = '<option value="">— Select employee —</option>';
        empArr.forEach(e => {
            if (/director/i.test(safeStr(e.position))) return;
            const id = empId(e);
            const name = (e.name || e.playername || ('#' + id)).replace(/</g, '');
            empOpts += `<option value="${id}">${name} (${safeStr(e.position) || '—'})</option>`;
        });

        const inputStyle = 'width:90px;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1a1a1a;color:#eee;font-size:12px';
        let html = `<div class="tcm-section" id="tcm-train-contracts" style="margin-top:12px">
            <h4>Training Contracts</h4>
            <div class="tcm-peer-note" style="margin-bottom:8px">
                Track <strong>paid train sales</strong>: trains owed to a buyer, price per train, progress from the train log,
                and optional <strong>daily reservation</strong> (held out of the free Fair/Star plan pool).
                Progress counts <strong>+Train</strong> logs on/after the contract start date.
            </div>
            <div class="tcm-row"><span class="tcm-label">Reserved today</span>
                <span class="tcm-value">${reserved} train(s) across ${active.length} active contract(s)
                <span style="color:#888;font-weight:normal"> · company ★${stars}</span></span></div>`;

        if (active.length) {
            html += `<div style="font-size:12px;color:#9cf;margin:8px 0 4px">Active</div>`;
            active.forEach(c => {
                const name = (c.buyerName || ('#' + c.buyerEmpId)).replace(/</g, '');
                html += `<div style="border:1px solid #333;border-radius:6px;padding:8px;margin-bottom:8px;background:rgba(0,0,0,0.2)">
                    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;align-items:center">
                        <strong>${name}</strong>
                        <span style="font-size:11px;color:#aaa">since ${c.startDate || '—'}</span>
                    </div>
                    <div class="tcm-row"><span class="tcm-label">Contract</span>
                        <span class="tcm-value">${c.totalTrains} trains @ ${fmtCash(c.pricePerTrain)} · total ${fmtCash(c.totalValue)}</span></div>
                    <div class="tcm-row"><span class="tcm-label">Progress</span>
                        <span class="tcm-value tcm-good">${c.done} / ${c.totalTrains} (${c.pct}%)</span></div>
                    <div style="height:6px;background:#333;border-radius:3px;margin:4px 0 8px;overflow:hidden">
                        <div style="height:100%;width:${c.pct}%;background:#4ade80"></div>
                    </div>
                    <div class="tcm-row"><span class="tcm-label">Value used / left</span>
                        <span class="tcm-value">${fmtCash(c.cashEarned)} / ${fmtCash(c.cashRemaining)}</span></div>
                    <div class="tcm-row"><span class="tcm-label">Daily reservation</span>
                        <span class="tcm-value">${c.dailyReservation || 0}</span></div>
                    ${c.prepaidAmount ? `<div class="tcm-row"><span class="tcm-label">Prepaid</span><span class="tcm-value">${fmtCash(c.prepaidAmount)}</span></div>` : ''}
                    <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
                        <button type="button" class="tcm-btn secondary tcm-tc-archive" data-cid="${c.id}" style="padding:2px 8px;font-size:11px">Archive</button>
                        <button type="button" class="tcm-btn secondary tcm-tc-del" data-cid="${c.id}" style="padding:2px 8px;font-size:11px">Delete</button>
                    </div>
                </div>`;
            });
        } else {
            html += `<div class="tcm-peer-note">No active contracts.</div>`;
        }

        if (closed.length) {
            html += `<details style="margin-top:8px"><summary style="cursor:pointer;color:#9cf;font-size:12px">Closed / completed (${closed.length})</summary>`;
            closed.slice(0, 12).forEach(c => {
                const name = (c.buyerName || ('#' + c.buyerEmpId)).replace(/</g, '');
                html += `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid #333">
                    ${name}: ${c.done}/${c.totalTrains} · ${fmtCash(c.cashEarned)} earned
                    <button type="button" class="tcm-btn secondary tcm-tc-del" data-cid="${c.id}" style="padding:1px 6px;font-size:10px;margin-left:6px">Delete</button>
                </div>`;
            });
            html += `</details>`;
        }

        html += `<div style="margin-top:12px;padding-top:8px;border-top:1px solid #333">
            <div style="font-size:12px;color:#9cf;margin-bottom:6px">New contract</div>
            <div class="tcm-row"><span class="tcm-label">Buyer</span>
                <span class="tcm-value"><select id="tcm-tc-buyer" style="max-width:100%;font-size:12px">${empOpts}</select></span></div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;align-items:center">
                <label style="font-size:11px">Trains <input type="number" id="tcm-tc-total" min="1" value="50" style="${inputStyle}"></label>
                <label style="font-size:11px">$/train <input type="number" id="tcm-tc-price" min="0" step="1000" value="0" style="${inputStyle}"></label>
                <label style="font-size:11px">Reserve/day <input type="number" id="tcm-tc-reserve" min="0" max="20" value="0" style="${inputStyle}"></label>
                <label style="font-size:11px">Prepaid <input type="number" id="tcm-tc-prepaid" min="0" step="1000" value="0" style="${inputStyle}"></label>
            </div>
            <div class="tcm-row"><span class="tcm-label">Start date</span>
                <span class="tcm-value"><input type="date" id="tcm-tc-start" style="padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1a1a1a;color:#eee;font-size:12px"></span></div>
            <button type="button" class="tcm-btn" id="tcm-tc-add" style="margin-top:6px">Add contract</button>
        </div></div>`;
        return html;
    }

    // Recommendations from role gaps, mis-assignments, and weekly metric trends
    function buildRecommendations(p, employees, companyType) {
        const recos = [];
        const empArr = getEmpList(employees);
        if (!empArr.length) return recos;
        // Prefer resolved type name (handles numeric ids / employee job type)
        companyType = resolveCompanyTypeName(companyType, p) ||
            resolveCompanyTypeName(p && (p.company_type || p.type), p) ||
            companyType;

        const roleCount = {};
        empArr.forEach(e => {
            const pos = safeStr(e.position).toLowerCase();
            roleCount[pos] = (roleCount[pos] || 0) + 1;
        });
        const hasManager = !!(roleCount['manager'] || roleCount['store manager']);
        const hasTrainer = !!(roleCount['trainer'] || roleCount['hr officer'] || roleCount['hr']);
        const hasMarketer = !!(roleCount['promoter'] || roleCount['marketer'] || roleCount['marketing manager']);

        const { cur, prev } = getWeeklyComparison();
        const dEff = cur && prev ? metricDelta(cur.efficiency, prev.efficiency) : null;
        const dEnv = cur && prev ? metricDelta(cur.environment, prev.environment) : null;
        const dAvg = cur && prev ? metricDelta(cur.avgEffectiveness, prev.avgEffectiveness) : null;
        const dPop = cur && prev ? metricDelta(cur.popularity, prev.popularity) : null;

        // Metric-driven staffing advice
        if (dEff != null && dEff <= -2) {
            recos.push(
                `Company efficiency ${formatDelta(dEff, '%')} vs last week` +
                (hasManager
                    ? ' — review low-effectiveness staff and role fit.'
                    : ' — assign a Manager to stabilise performance.')
            );
        }
        if (dEnv != null && dEnv <= -2) {
            recos.push(
                `Work environment ${formatDelta(dEnv)} vs last week` +
                (hasManager
                    ? ' — check addiction, inactivity, and overworked roles.'
                    : ' — staff a Manager; environment often tracks management coverage.')
            );
        }
        if (dAvg != null && dAvg <= -2) {
            recos.push(
                `Avg employee effectiveness ${formatDelta(dAvg)} vs last week` +
                (hasTrainer
                    ? ' — prioritise Smart Training on the lowest-eff staff.'
                    : ' — add a Trainer / HR Officer and train under-performers.')
            );
        }
        if (dPop != null && dPop <= -3) {
            recos.push(
                `Popularity ${formatDelta(dPop, '%')} vs last week` +
                (hasMarketer
                    ? ' — consider higher ad budget or better promoter stats.'
                    : ' — assign a Promoter / Marketer to support popularity.')
            );
        }
        if (dEff != null && dEff >= 2 && dEnv != null && dEnv >= 1) {
            recos.push(`Efficiency ${formatDelta(dEff, '%')} and environment ${formatDelta(dEnv)} vs last week — current staffing is working; avoid disruptive role churn.`);
        }

        // Role avg effectiveness drops vs last week
        if (cur && prev && cur.byRole && prev.byRole) {
            Object.keys(cur.byRole).forEach(role => {
                const c = cur.byRole[role];
                const pRole = prev.byRole[role];
                if (!c || !pRole || c.count < 1 || pRole.count < 1) return;
                const d = metricDelta(c.avgEff, pRole.avgEff);
                if (d != null && d <= -5) {
                    recos.push(
                        `"${role}" role avg effectiveness ${formatDelta(d)} vs last week ` +
                        `(now ${c.avgEff}) — re-check who is assigned and their work stats.`
                    );
                }
            });
        }

        // Baseline role coverage
        if (!hasManager) {
            recos.push('No Manager assigned – usually improves motivation, environment, and efficiency.');
        }
        if (!hasTrainer) {
            recos.push('No Trainer / HR Officer – you may be missing daily extra trains.');
        }
        if (!hasMarketer) {
            recos.push('No Promoter / Marketer – advertising / popularity may lag.');
        }

        // Company-wide role plan (fit score + anti-stacking), not raw max WS
        const positions = getPositionsForType(companyType);
        if (!positions || !positions.length) {
            const label = safeStr(companyType) || 'this company type';
            recos.push('No position requirements table matched for "' + label +
                '" — role-move suggestions are unavailable. Supported types: all standard Torn companies.');
        }
        const plan = suggestCompanyAssignments(empArr, companyType);
        const moves = plan
            .filter(x => x.suggested && x.current &&
                x.suggested.toLowerCase() !== x.current.toLowerCase() &&
                x.improve >= 8)
            .sort((a, b) => b.improve - a.improve);

        // Summarise target mix so it is obvious we are not stacking one role
        if (moves.length) {
            const targetMix = {};
            plan.forEach(x => {
                const k = x.suggested || x.current;
                if (!k) return;
                targetMix[k] = (targetMix[k] || 0) + 1;
            });
            const mixStr = Object.keys(targetMix)
                .sort((a, b) => targetMix[b] - targetMix[a])
                .map(k => `${k}×${targetMix[k]}`)
                .join(', ');
            recos.push(`Suggested roster mix: ${mixStr}`);
        }

        moves.slice(0, 10).forEach(x => {
            recos.push(
                `${x.name}: ${x.current} → ${x.suggested} ` +
                `(fit ${x.currentFit} → ${x.suggestedFit}, WS ${x.suggestedEff})`
            );
        });

        // Very low live effectiveness still worth flagging (train/replace)
        empArr.forEach(e => {
            const st = empStats(e);
            const liveEff = empEffectiveness(e);
            const name = e.name || e.id || '?';
            if (liveEff != null && liveEff < 40 && (st.man || st.int || st.end)) {
                const best = findBestPosition(st.man, st.int, st.end, companyType);
                recos.push(
                    `${name} effectiveness ${Math.round(liveEff)} is very low` +
                    (best ? ` (best company fit: ${best.name})` : '') +
                    ' — train or replace.'
                );
            }
        });

        // De-dupe while preserving order
        const seen = new Set();
        return recos.filter(r => {
            if (seen.has(r)) return false;
            seen.add(r);
            return true;
        }).slice(0, 18);
    }

    function findSelfEmployee(employees) {
        const list = getEmpList(employees);
        if (!list.length || !userInfo) return null;
        const myName = safeStr(userInfo.name).toLowerCase();
        const myPos = safeStr(userInfo.position).toLowerCase();
        if (myName) {
            const byName = list.find(e => safeStr(e.name || e.playername).toLowerCase() === myName);
            if (byName) return byName;
            // Partial name match (API sometimes truncates)
            const partial = list.find(e => {
                const n = safeStr(e.name || e.playername).toLowerCase();
                return n && (n.includes(myName) || myName.includes(n));
            });
            if (partial) return partial;
        }
        // Fallback: unique position match
        if (myPos && myPos !== 'director' && myPos !== 'employee' && myPos !== 'none') {
            const samePos = list.filter(e => safeStr(e.position).toLowerCase() === myPos);
            if (samePos.length === 1) return samePos[0];
        }
        return null;
    }

    /** Try to read MAN/INT/END for a named employee from the live company page DOM. */
    function scrapeSelfWorkStatsFromDom() {
        // Intentionally disabled — Torn rules prohibit page scraping / non-API extraction
        // for data not obtained from the official API.
        return null;
    }


    function renderEmployeeBasicView(p, employees, companyType) {
        const self = findSelfEmployee(employees);
        let st = self ? empStats(self) : { man: 0, int: 0, end: 0 };
        if (!(st.man || st.int || st.end)) {
            const scraped = scrapeSelfWorkStatsFromDom((self && (self.name || self.playername)) || (userInfo && userInfo.name));
            if (scraped && (scraped.man || scraped.int || scraped.end)) st = scraped;
        }
        const days = self ? empDays(self) : null;
        const wage = self ? empDailyWage(self) : null;
        const gameEff = self ? empEffectiveness(self) : null;
        const pos = (self && safeStr(self.position)) || (userInfo && safeStr(userInfo.position)) || '—';
        let trainsLogged = null;
        if (self) {
            const entry = loadTrainLog()[String(empId(self))];
            if (entry) trainsLogged = Number(entry.trains) || 0;
        }
        const hired = companyHired(p, employees);
        const capacity = companyCapacity(p, employees);
        const staffStr = capacity != null ? (hired + ' / ' + capacity) : String(hired || '—');
        const hasStats = !!(st.man || st.int || st.end);
        const typeLabel = companyType || resolveCompanyTypeName(p && (p.company_type || p.type), p) || '—';

        const badge = userInfo && userInfo.isDirector
            ? '<span class="dir-badge">DIRECTOR</span>'
            : `<span class="emp-badge">${pos && pos !== '—' ? pos : 'EMPLOYEE'}</span>`;

        let html = `<div class="tcm-info-box">
            <strong>${(userInfo && userInfo.name) || '—'}</strong> ${badge}<br>
            ${(userInfo && userInfo.company_name) || p.name || 'Company'}
            ${p.rating != null ? ' · ★' + p.rating : ''}
            ${typeLabel && typeLabel !== '—' ? ' · ' + typeLabel : ''}
            · Staff ${staffStr}
        </div>`;

        html += `<div class="tcm-section">
            <div class="tcm-row"><span class="tcm-label">Position</span><span class="tcm-value">${pos || '—'}</span></div>
            ${days != null ? `<div class="tcm-row"><span class="tcm-label">Days employed</span><span class="tcm-value">${days}</span></div>` : ''}
            ${wage ? `<div class="tcm-row"><span class="tcm-label">Daily wage</span><span class="tcm-value">$${wage.toLocaleString()}</span></div>` : ''}
            ${gameEff != null ? `<div class="tcm-row"><span class="tcm-label">Effectiveness</span><span class="tcm-value">${Math.round(gameEff)}</span></div>` : ''}
            ${trainsLogged != null ? `<div class="tcm-row"><span class="tcm-label">Trains logged</span><span class="tcm-value">${trainsLogged}</span></div>` : ''}
            <div class="tcm-row"><span class="tcm-label">Stats (M/I/E)</span>
                <span class="tcm-value stats-mini">${hasStats
                    ? (st.man.toLocaleString() + ' / ' + st.int.toLocaleString() + ' / ' + st.end.toLocaleString())
                    : '—'}</span></div>
            ${p.popularity != null ? `<div class="tcm-row"><span class="tcm-label">Popularity</span><span class="tcm-value">${p.popularity}%</span></div>` : ''}
            ${p.efficiency != null ? `<div class="tcm-row"><span class="tcm-label">Efficiency</span><span class="tcm-value">${p.efficiency}%</span></div>` : ''}
            ${!hasStats ? `<div style="font-size:11px;color:#888;margin-top:6px">Work stats need the company employees selection (or the live company page).</div>` : ''}
        </div>`;

        if (userInfo && userInfo.isDirector) {
            html += `<div style="font-size:12px;color:#aaa;line-height:1.45;margin-top:8px">
                Simplified summary. Switch to <strong>Director View</strong> for Metrics, Training, Employees, Peers, and Discord.
            </div>`;
        } else {
            html += `<div style="font-size:12px;color:#aaa;line-height:1.45;margin-top:8px">
                Full tools need a Director API key. Use <strong>Director View</strong> only if this key can access director company data.
            </div>`;
        }
        return html;
    }

    function render(data) {
        const content = document.getElementById('tcm-content');
        if (!content) return;

        const p = data.company || data.profile || data;
        const employees = companyRoster(data);
        const stock = data.company_stock || data.stock || {};
        const companyType = safeStr(p.company_type || p.type || '') || safeStr(p.name) || '';
        try { if (userInfo && userInfo.isDirector) snapshotFinanceToday(); } catch (e) {}

        if (!p.name && Object.keys(employees).length === 0) {
            showErrorBox('No company data returned', [
                'The API returned an empty response.',
                'Confirm you are the Director and the key belongs to that account.'
            ]);
            return;
        }

        updateViewModeButton();

        // Employee View: single compact panel, no director tabs
        if (!isDirectorUi()) {
            content.innerHTML = renderEmployeeBasicView(p, employees, companyType);
            return;
        }

        let banner = '';
        if (userInfo) {
            const badge = userInfo.isDirector
                ? '<span class="dir-badge">DIRECTOR</span>'
                : `<span class="emp-badge">${userInfo.position || 'EMPLOYEE'}</span>`;
            banner = `<div class="tcm-info-box">
                Logged in as <strong>${userInfo.name}</strong> ${badge}<br>
                Company: <strong>${userInfo.company_name || p.name || '—'}</strong>
                ${userInfo.isDirector ? '' : '<br><span class="tcm-warn">Director View with employee key – working stats &amp; full stock may be limited.</span>'}
            </div>`;
        }

        // Compact overview — detailed metrics live on the Metrics tab
        let html = banner + `
            <div class="tcm-section">
                <h4>${p.name || (userInfo && userInfo.company_name) || 'Your Company'} ★${p.rating || '?'}</h4>
                <div class="tcm-row"><span class="tcm-label">Type</span><span class="tcm-value">${companyType || '—'}</span></div>
                <div class="tcm-row"><span class="tcm-label">Employees</span>
                    <span class="tcm-value">${(() => {
                        const h = companyHired(p, employees);
                        const c = companyCapacity(p, employees);
                        return c != null ? (h + ' / ' + c) : String(h || '—');
                    })()}</span></div>
                <div class="tcm-row"><span class="tcm-label">Daily Income</span>
                    <span class="tcm-value">$${(p.daily_income || 0).toLocaleString()}</span></div>
                <div class="tcm-row"><span class="tcm-label">Bank</span>
                    <span class="tcm-value">$${(p.company_bank || p.bank || 0).toLocaleString()}</span></div>
            </div>`;

        // Snapshot metrics for weekly comparison (local + later Data Sync)
        try { recordMetricsSnapshot(p, employees); } catch (e) { /* ignore */ }

        // Tabs
        const savedTab = GM_getValue('tcmActiveTab', 'training');
        const tabIds = ['metrics', 'training', 'employees', 'peers', 'discord'];
        const tabLabels = {
            metrics: 'Metrics',
            training: 'Training',
            employees: 'Employees',
            peers: 'Peers',
            discord: 'Discord'
        };
        const activeTab = tabIds.includes(savedTab) ? savedTab : 'training';

        html += `<div class="tcm-tabs">`;
        tabIds.forEach(id => {
            html += `<button type="button" class="tcm-tab${id === activeTab ? ' active' : ''}" data-tab="${id}">${tabLabels[id]}</button>`;
        });
        html += `</div>`;

        // Metrics tab — weekly comparison, finance, stock
        html += `<div class="tcm-tab-panel${activeTab === 'metrics' ? ' active' : ''}" data-tab-panel="metrics">`;
        html += renderWeeklyMetricsHtml();
        html += renderFinanceStripHtml(p, employees);
        const stockBlock = stockDaysHtml(stock);
        if (stockBlock) {
            html += stockBlock;
        } else {
            const stockItems = Object.values(stock);
            if (stockItems.length) {
                html += `<div class="tcm-section"><h4>Stock</h4>`;
                stockItems.forEach(s => {
                    const inStock = s.in_stock ?? s.amount ?? 0;
                    const cls = inStock < 10 ? 'tcm-bad' : inStock < 50 ? 'tcm-warn' : 'tcm-good';
                    html += `<div class="tcm-row"><span class="tcm-label">${s.name || s.item || 'Item'}</span>
                        <span class="tcm-value ${cls}">${inStock}</span></div>`;
                });
                html += `</div>`;
            }
        }
        // One-line live pulse still useful on Metrics
        if (p.popularity != null || p.efficiency != null || p.environment != null || p.company_environment != null || p.advertising_budget != null || p.weekly_income != null) {
            html += `<div class="tcm-section"><h4>Live snapshot</h4>`;
            if (p.popularity != null) html += `<div class="tcm-row"><span class="tcm-label">Popularity</span><span class="tcm-value">${p.popularity}%</span></div>`;
            if (p.efficiency != null) html += `<div class="tcm-row"><span class="tcm-label">Efficiency</span><span class="tcm-value">${p.efficiency}%</span></div>`;
            if (p.environment != null || p.company_environment != null) {
                html += `<div class="tcm-row"><span class="tcm-label">Work environment</span><span class="tcm-value">${p.environment != null ? p.environment : p.company_environment}</span></div>`;
            }
            if (p.advertising_budget != null) html += `<div class="tcm-row"><span class="tcm-label">Ad Budget</span><span class="tcm-value">$${Number(p.advertising_budget).toLocaleString()}</span></div>`;
            if (p.weekly_income != null) html += `<div class="tcm-row"><span class="tcm-label">Weekly Income</span><span class="tcm-value">$${Number(p.weekly_income).toLocaleString()}</span></div>`;
            html += `</div>`;
        }
        html += `</div>`;

        // Training tab
        html += `<div class="tcm-tab-panel${activeTab === 'training' ? ' active' : ''}" data-tab-panel="training">`;
        html += renderSmartTrainingHtml(p, employees, companyType);
        html += `</div>`;

        // Employees tab
        html += `<div class="tcm-tab-panel${activeTab === 'employees' ? ' active' : ''}" data-tab-panel="employees">`;
        const inactive = inactiveEmployeeAlerts(employees);
        if (inactive.length) {
            html += `<div class="tcm-section"><h4>Inactive employees</h4>`;
            inactive.forEach(a => {
                const cls = a.level === 'high' ? 'tcm-bad' : 'tcm-warn';
                html += `<div class="tcm-reco ${cls}">${a.msg}</div>`;
            });
            html += `<div class="tcm-peer-note">Warn ≥${INACTIVE_WARN_DAYS}d · replace threshold ≥${INACTIVE_REPLACE_DAYS}d (last_action from API)</div></div>`;
        }
        const eeHints = eePromotionHints(employees, resolveCompanyTypeName((companyData&&(companyData.company||companyData.profile)||{}).company_type, companyData&&(companyData.company||companyData.profile)) || "");
        if (eeHints.length) {
            html += `<div class="tcm-section"><h4>EE promotion path</h4>`;
            eeHints.forEach(h => {
                html += `<div class="tcm-reco">${h.name}: EE ${h.eff} → ${h.next}
                    (~${h.trains} primary train${h.trains===1?'':'s'} · ${h.gap} pts)</div>`;
            });
            html += `<div class="tcm-peer-note">Tiers ${EE_TIERS.join('/')} · ~${TRAIN_PRIMARY} EE per primary train (approx.)</div></div>`;
        }
        const recos = buildRecommendations(p, employees, companyType);
        if (recos.length) {
            html += `<div class="tcm-section"><h4>Recommendations</h4>`;
            recos.forEach(r => html += `<div class="tcm-reco">${r}</div>`);
            html += `</div>`;
        }
        const empList = getEmpList(employees);
        if (empList.length) {
            const plan = suggestCompanyAssignments(empList, companyType);
            const planByName = {};
            plan.forEach(x => {
                const key = safeStr(x.name).toLowerCase();
                if (key) planByName[key] = x;
            });
            html += `
                <div class="tcm-section">
                    <h4>Best Position Advisor</h4>
                    <table class="tcm-emp">
                        <thead><tr>
                            <th>Name</th><th>Current</th><th>Roles / suggest</th><th>Best WS</th><th>Days</th><th>Eff</th>
                            <th>Settled</th><th>Addict</th><th>Inact</th><th>Merits</th><th>Wage</th><th>Stats</th>
                        </tr></thead>
                        <tbody>`;
            empList.forEach(e => {
                const st = empStats(e);
                const man = st.man, int = st.int, end = st.end;
                const currentPos = safeStr(e.position) || '—';
                const empName = safeStr(e.name || e.playername || e.id);
                const planRow = planByName[empName.toLowerCase()];
                const suggested = planRow ? planRow.suggested : null;
                const ranked = rankPositionsForEmployee(man, int, end, companyType, currentPos);
                const best = ranked.length ? ranked[0] : null;
                const days = empDays(e);
                const gameEff = empEffectiveness(e);
                const parts = empEffParts(e);
                const wage = empDailyWage(e);
                const roleDd = roleEffDropdownHtml(man, int, end, companyType, currentPos, suggested);
                let effClass = '';
                if (best) {
                    effClass = best.eff >= 90 ? 'tcm-good' : best.eff >= 70 ? 'tcm-warn' : 'tcm-bad';
                }
                const addictCls = (parts.addiction != null && Math.abs(parts.addiction) >= 10) ? 'tcm-bad'
                    : (parts.addiction != null && Math.abs(parts.addiction) >= 5) ? 'tcm-warn' : '';
                const inactCls = (parts.inactivity != null && parts.inactivity >= 3) ? 'tcm-bad' : '';
                html += `<tr>
                    <td>${e.name || e.playername || e.id}</td>
                    <td>${currentPos}</td>
                    <td>${roleDd}</td>
                    <td class="${effClass}">${best ? best.eff : '—'}</td>
                    <td>${days || '—'}</td>
                    <td>${gameEff != null ? Math.round(gameEff) : '—'}</td>
                    <td>${parts.settled != null ? parts.settled : '—'}</td>
                    <td class="${addictCls}">${parts.addiction != null ? parts.addiction : '—'}</td>
                    <td class="${inactCls}">${parts.inactivity != null ? parts.inactivity : '—'}</td>
                    <td>${parts.merits != null ? parts.merits : '—'}</td>
                    <td>${wage ? ('$' + wage.toLocaleString()) : '—'}</td>
                    <td class="stats-mini">${man.toLocaleString()} / ${int.toLocaleString()} / ${end.toLocaleString()}</td>
                </tr>`;
            });
            const peerMixNote = (plan.length && plan[0].usedPeerMix)
                ? ' Plan targets use <strong>peer role-mix</strong> (Peers tab) scaled to your headcount.'
                : ' Plan uses fit + anti-stacking (refresh <strong>Peers</strong> for role-mix targets).';
            html += `</tbody></table>
                <div style="font-size:11px;color:#888;margin-top:6px">
                    Dropdown: ★ best fit, <strong>rec</strong> = company-plan suggestion, <strong>now</strong> = current.
                    Amber <strong>→ Role</strong> is the recommended move. Fit is company-aware (not raw max WS).
                    ${peerMixNote}
                </div></div>`;
        } else {
            html += `<div class="tcm-section"><h4>Employees</h4>
                <div class="tcm-warn">No employee list returned.
                ${userInfo && !userInfo.isDirector ? ' You are an employee – full list requires a Director key.' : ''}</div></div>`;
        }
        html += `</div>`;

        // Peers tab
        html += `<div class="tcm-tab-panel${activeTab === 'peers' ? ' active' : ''}" data-tab-panel="peers">`;
        html += `<div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button type="button" class="tcm-btn" id="tcm-peers">Refresh Peers</button>
            <button type="button" class="tcm-btn" id="tcm-peers-force" title="Clear peer cache and rebuild 10★ list from Torn API">Force Update</button>
        </div>`;
        html += renderPeerSectionHtml();
        html += `</div>`;

        // Discord tab
        html += `<div class="tcm-tab-panel${activeTab === 'discord' ? ' active' : ''}" data-tab-panel="discord">`;
        html += renderDiscordTabHtml();
        html += `</div>`;

        content.innerHTML = html;
        wrapWideTables(content);

        // Wire tabs (persist selection)
        content.querySelectorAll('.tcm-tab').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-tab');
                GM_setValue('tcmActiveTab', id);
                content.querySelectorAll('.tcm-tab').forEach(b => b.classList.toggle('active', b === btn));
                content.querySelectorAll('.tcm-tab-panel').forEach(panel => {
                    panel.classList.toggle('active', panel.getAttribute('data-tab-panel') === id);
                });
            };
        });

        // Wire train buttons
        content.querySelectorAll('[data-train-id]').forEach(btn => {
            btn.onclick = () => markEmployeeTrained(btn.getAttribute('data-train-id'));
        });
        const resetBtn = document.getElementById('tcm-reset-trains');
        if (resetBtn) resetBtn.onclick = () => resetTrainLog();

        const modeFair = document.getElementById('tcm-mode-fair');
        const modeStar = document.getElementById('tcm-mode-star');
        if (modeFair) {
            modeFair.onclick = () => {
                trainMode = 'fair';
                GM_setValue('tcmTrainMode', 'fair');
                if (companyData) render(companyData);
            };
        }
        if (modeStar) {
            modeStar.onclick = () => {
                trainMode = 'star';
                GM_setValue('tcmTrainMode', 'star');
                if (companyData) render(companyData);
            };
        }
        const settleSave = document.getElementById('tcm-settle-save');
        if (settleSave) {
            settleSave.onclick = () => {
                const el = document.getElementById('tcm-settle-days');
                const v = saveSettlingDays(el ? el.value : 3);
                setStatus('Settling-in days set to ' + v);
                if (companyData) render(companyData);
            };
        }
        content.querySelectorAll('.tcm-train-excl').forEach(cb => {
            cb.onchange = () => {
                const id = cb.getAttribute('data-excl-id');
                const map = loadTrainExclude();
                if (cb.checked) map[String(id)] = true;
                else delete map[String(id)];
                saveTrainExclude(map);
                if (companyData) render(companyData);
            };
        });

        wireTrainCalculator();
        wireTrainContracts();

        wirePeerButtons();

        wireDiscordTabControls();
    }

    function renderDiscordTabHtml() {
        const o = discordOpts || loadDiscordOpts();
        const logWh = (discordLogWebhook || '').replace(/"/g, '&quot;');
        const panelWh = (discordPanelWebhook || '').replace(/"/g, '&quot;');
        const weeklyWh = (discordWeeklyWebhook || '').replace(/"/g, '&quot;');
        const logOk = isValidDiscordWebhook(discordLogWebhook);
        const panelOk = isValidDiscordWebhook(discordPanelWebhook);
        const weeklyOk = isValidDiscordWebhook(discordWeeklyWebhook);
        const last = discordMeta.lastPostDateTCT
            ? ('Last daily auto-post: <strong>' + discordMeta.lastPostDateTCT + '</strong> TCT')
            : 'No daily auto-post yet';
        const lastWeekly = discordMeta.lastWeeklyPostWeek
            ? ('Last weekly panel: <strong>' + discordMeta.lastWeeklyPostWeek + '</strong>')
            : 'No weekly panel yet';
        const panelIdNote = discordMeta.panelMessageId
            ? ('Daily panel id: <code style="color:#aaa">' + String(discordMeta.panelMessageId).slice(0, 12) + '…</code>')
            : 'Daily panel: not created yet';
        const fourWeekIdNote = discordMeta.fourWeekPanelMessageId
            ? ('4-week panel id: <code style="color:#aaa">' + String(discordMeta.fourWeekPanelMessageId).slice(0, 12) + '…</code>')
            : '4-week panel: not created yet';
        const lastFourWeek = discordMeta.lastFourWeekChartMonth
            ? ('Last 4-week panel: <strong>' + discordMeta.lastFourWeekChartMonth + '</strong>')
            : 'No 4-week panel yet';
        const weeklyIdNote = discordMeta.weeklyPanelMessageId
            ? ('Weekly panel id: <code style="color:#aaa">' + String(discordMeta.weeklyPanelMessageId).slice(0, 12) + '…</code>')
            : 'Weekly panel: not created yet';
        const inputStyle = 'width:100%;padding:8px;background:#111;border:1px solid #555;color:#fff;border-radius:4px;font-size:12px;box-sizing:border-box;margin:4px 0 6px';
        return `<div class="tcm-section">
            <h4>Discord Reports</h4>
            <div class="tcm-peer-note" style="margin-bottom:8px">
                Optional webhooks. Daily auto-run at <strong>18:00 TCT</strong>; weekly panel on
                <strong>Sundays 18:00 TCT</strong>. <strong>4-week panel</strong> updates on the
                <strong>first Sunday of each month</strong> (same channel as the daily panel + permanent log).
                Metrics history in JSONBin is limited to the last <strong>4 weeks</strong>.
            </div>

            <label><strong>Permanent log webhook</strong> <span style="color:#888;font-weight:normal">(append-only history)</span></label>
            <input type="text" id="tcm-discord-log-hook" placeholder="https://discord.com/api/webhooks/..." value="${logWh}" style="${inputStyle}">
            <div class="tcm-peer-note" style="margin-bottom:10px">${logOk ? '<span class="tcm-good">Valid</span>' : '<span class="tcm-warn">Optional — daily reports + first-Sunday 4-week archive</span>'}</div>

            <label><strong>Daily data panel webhook</strong> <span style="color:#888;font-weight:normal">(live daily message + monthly 4-week message)</span></label>
            <input type="text" id="tcm-discord-panel-hook" placeholder="https://discord.com/api/webhooks/..." value="${panelWh}" style="${inputStyle}">
            <div class="tcm-peer-note" style="margin-bottom:10px">
                ${panelOk ? '<span class="tcm-good">Valid</span>' : '<span class="tcm-warn">Optional — daily message + separate 4-week message</span>'}
                · ${panelIdNote} · ${fourWeekIdNote}
            </div>

            <label><strong>Weekly panel webhook</strong> <span style="color:#888;font-weight:normal">(week-over-week metrics + company changes)</span></label>
            <input type="text" id="tcm-discord-weekly-hook" placeholder="https://discord.com/api/webhooks/..." value="${weeklyWh}" style="${inputStyle}">
            <div class="tcm-peer-note" style="margin-bottom:8px">
                ${weeklyOk ? '<span class="tcm-good">Valid</span>' : '<span class="tcm-warn">Optional — Sundays 18:00 TCT, edits one message</span>'}
                · ${weeklyIdNote}
            </div>

            <div class="tcm-peer-note" style="margin-bottom:8px">${last} · ${lastWeekly} · ${lastFourWeek}</div>

            <div style="margin:8px 0;line-height:1.8">
                <label style="display:block;cursor:pointer"><input type="checkbox" id="tcm-d-unused" ${o.unusedTrains ? 'checked' : ''}> Unused Trains</label>
                <label style="display:block;cursor:pointer"><input type="checkbox" id="tcm-d-metrics" ${o.dailyMetrics ? 'checked' : ''}> Daily Metrics <span style="color:#888">(income, environment, stock, efficiency)</span></label>
                <label style="display:block;cursor:pointer"><input type="checkbox" id="tcm-d-alerts" ${o.employeeAlerts ? 'checked' : ''}> Employee Alerts <span style="color:#888">(inactivity, unassigned, leaving, addiction, inefficiency)</span></label>
                <label style="display:block;cursor:pointer"><input type="checkbox" id="tcm-d-stars" ${o.starChange ? 'checked' : ''}> Star Up / Star Down</label>
                <label style="display:block;cursor:pointer;margin-top:6px"><input type="checkbox" id="tcm-d-auto" ${o.autoPost !== false ? 'checked' : ''}> Daily auto-post at 18:00 TCT</label>
                <label style="display:block;cursor:pointer"><input type="checkbox" id="tcm-d-weekly" ${o.weeklyPanel !== false ? 'checked' : ''}> Weekly panel Sundays 18:00 TCT</label>
            </div>
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
                <button type="button" class="tcm-btn" id="tcm-discord-save">Save Discord Settings</button>
                <button type="button" class="tcm-btn" id="tcm-discord-post">Post / Update Daily Now</button>
                <button type="button" class="tcm-btn" id="tcm-discord-weekly-post">Post / Update Weekly Now</button>
                <button type="button" class="tcm-btn" id="tcm-discord-fourweek-post">Post / Update 4-Week Now</button>
                <button type="button" class="tcm-btn secondary" id="tcm-discord-reset-panel" title="Forget daily panel message id">Reset Daily Panel</button>
                <button type="button" class="tcm-btn secondary" id="tcm-discord-reset-fourweek" title="Forget 4-week panel message id">Reset 4-Week Panel</button>
                <button type="button" class="tcm-btn secondary" id="tcm-discord-reset-weekly" title="Forget weekly panel message id">Reset Weekly Panel</button>
            </div>
            <div class="tcm-peer-note" style="margin-top:8px">
                Create webhooks in Discord: Channel → Edit → Integrations → Webhooks.
                Weekly panel lists metric deltas and staffing changes.
                On the <strong>first Sunday of each month</strong>, a separate <strong>4-week trend</strong> message is updated on the
                <strong>daily data panel</strong> webhook and also appended to the <strong>permanent log</strong> (if set).
            </div>
        </div>`;
    }

    function readDiscordOptsFromDom() {
        const chk = id => !!(document.getElementById(id) && document.getElementById(id).checked);
        return {
            unusedTrains: chk('tcm-d-unused'),
            dailyMetrics: chk('tcm-d-metrics'),
            employeeAlerts: chk('tcm-d-alerts'),
            starChange: chk('tcm-d-stars'),
            autoPost: chk('tcm-d-auto'),
            weeklyPanel: chk('tcm-d-weekly')
        };
    }

    function readDiscordWebhooksFromDom() {
        const logEl = document.getElementById('tcm-discord-log-hook');
        const panelEl = document.getElementById('tcm-discord-panel-hook');
        const weeklyEl = document.getElementById('tcm-discord-weekly-hook');
        if (logEl) {
            discordLogWebhook = (logEl.value || '').trim();
            GM_setValue('tcmDiscordLogWebhook', discordLogWebhook);
            GM_setValue('tcmDiscordWebhook', discordLogWebhook); // legacy key
        }
        if (panelEl) {
            discordPanelWebhook = (panelEl.value || '').trim();
            GM_setValue('tcmDiscordPanelWebhook', discordPanelWebhook);
        }
        if (weeklyEl) {
            discordWeeklyWebhook = (weeklyEl.value || '').trim();
            GM_setValue('tcmDiscordWeeklyWebhook', discordWeeklyWebhook);
        }
    }

    function wireDiscordTabControls() {
        const saveBtn = document.getElementById('tcm-discord-save');
        const postBtn = document.getElementById('tcm-discord-post');
        const weeklyBtn = document.getElementById('tcm-discord-weekly-post');
        const fourWeekBtn = document.getElementById('tcm-discord-fourweek-post');
        const resetPanelBtn = document.getElementById('tcm-discord-reset-panel');
        const resetFourWeekBtn = document.getElementById('tcm-discord-reset-fourweek');
        const resetWeeklyBtn = document.getElementById('tcm-discord-reset-weekly');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                readDiscordWebhooksFromDom();
                saveDiscordOpts(readDiscordOptsFromDom());
                setStatus('Discord settings saved' + (jsonbinId ? ' — Data Sync…' : ''));
                try {
                    await pushTrainLogRemote(loadTrainLog());
                    setStatus('Discord settings saved' + (jsonbinId ? ' & synced' : ''));
                } catch (e) {
                    setStatus('Saved locally; Data Sync failed (configure Data Sync)', true);
                }
                if (companyData) render(companyData);
            };
        }
        if (postBtn) {
            postBtn.onclick = async () => {
                readDiscordWebhooksFromDom();
                saveDiscordOpts(readDiscordOptsFromDom());
                setStatus('Posting / updating daily Discord…');
                await runDiscordReports(true);
            };
        }
        if (weeklyBtn) {
            weeklyBtn.onclick = async () => {
                readDiscordWebhooksFromDom();
                saveDiscordOpts(readDiscordOptsFromDom());
                setStatus('Posting / updating weekly panel…');
                await runWeeklyDiscordPanel(true);
            };
        }
        if (fourWeekBtn) {
            fourWeekBtn.onclick = async () => {
                readDiscordWebhooksFromDom();
                saveDiscordOpts(readDiscordOptsFromDom());
                setStatus('Posting / updating 4-week panel…');
                await runFourWeekPanel(true);
            };
        }
        if (resetPanelBtn) {
            resetPanelBtn.onclick = async () => {
                discordMeta.panelMessageId = null;
                saveDiscordMeta(discordMeta);
                setStatus('Daily panel message id cleared');
                try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }
                if (companyData) render(companyData);
            };
        }
        if (resetFourWeekBtn) {
            resetFourWeekBtn.onclick = async () => {
                discordMeta.fourWeekPanelMessageId = null;
                saveDiscordMeta(discordMeta);
                setStatus('4-week panel message id cleared');
                try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }
                if (companyData) render(companyData);
            };
        }
        if (resetWeeklyBtn) {
            resetWeeklyBtn.onclick = async () => {
                discordMeta.weeklyPanelMessageId = null;
                saveDiscordMeta(discordMeta);
                setStatus('Weekly panel message id cleared');
                try { await pushTrainLogRemote(loadTrainLog()); } catch (e) { /* ignore */ }
                if (companyData) render(companyData);
            };
        }
    }


    createPanel();
    scheduleDiscord18TCT();
    if (!apiKey) { showKeyInput(); setStatus('Please enter your API key'); }
    else fetchAll();
})();
