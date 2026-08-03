// ==UserScript==
// @name         Torn Company Manager
// @namespace    https://torn.com/
// @version      3.10.3
// @description  Director dashboard: weekly metrics panel, smart training, Discord webhooks, peers, JSONBin Data Sync, API v2.
// @author       Morrakiu
// @match        https://www.torn.com/companies.php*
// @match        https://www.torn.com/page.php?sid=companies*
// @match        https://www.torn.com/joblist.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      api.torn.com
// @connect      discord.com
// @connect      discordapp.com
// @connect      api.jsonbin.io
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const API_BASE_V1 = 'https://api.torn.com';
    const API_BASE_V2 = 'https://api.torn.com/v2';
    const CACHE_MS = 45 * 1000;
    // Pre-fills Torn's custom key form with only the selections this script needs
    const CUSTOM_KEY_URL = 'https://www.torn.com/preferences.php#tab=api?step=addNewKey&title=Company+Manager&user=profile,job,basic&company=profile,employees,stock,detailed';
    let apiKey = GM_getValue('tornCompanyApiKey', '');
    // Dual Discord webhooks: permanent log (append) + live data panel (edit same message)
    let discordLogWebhook = GM_getValue('tcmDiscordLogWebhook', '') || GM_getValue('tcmDiscordWebhook', '');
    let discordPanelWebhook = GM_getValue('tcmDiscordPanelWebhook', '');
    let discordWeeklyWebhook = GM_getValue('tcmDiscordWeeklyWebhook', '');
    let jsonbinId = GM_getValue('tcmJsonbinId', '');
    let jsonbinKey = GM_getValue('tcmJsonbinKey', '');
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
    const PEER_SCRAPE_KEY = 'tcmPeerScrapeById'; // { [companyId]: { roles, name, rating, type, scrapedAt } }
    const TRAIN_LOG_KEY = 'tcmTrainLog'; // { [employeeId]: { trains: n, lastTrain: ts } }
    const METRICS_LOG_KEY = 'tcmMetricsLog'; // weekly company/employee metric snapshots
    const PEER_MAX = 20; // max peer companies to fetch per refresh
    const PEER_STAR = 10;
    const DISCORD_OPTS_KEY = 'tcmDiscordOpts';
    const DISCORD_META_KEY = 'tcmDiscordMeta';
    const CLIENT_ID_KEY = 'tcmClientId';
    // Keep recent ISO weeks for comparisons (JSONBin size control)
    const METRICS_KEEP_WEEKS = 4;

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
        try { return JSON.parse(GM_getValue(key, fallback === undefined ? '{}' : JSON.stringify(fallback))) || fallback; }
        catch (e) { return fallback !== undefined ? fallback : {}; }
    }


    // Position requirements (M / I / E) – extend as needed
    const COMPANY_POSITIONS = {
        "Pub": [
            { name: "Bartender",   man: 1500,  int: 0,    end: 3000 },
            { name: "Bouncer",     man: 6000,  int: 0,    end: 3000 },
            { name: "Waiter",      man: 1500,  int: 0,    end: 3000 },
            { name: "Cleaner",     man: 1500,  int: 0,    end: 750  },
            { name: "Manager",     man: 0,     int: 3000, end: 6000 },
            { name: "Bookkeeper",  man: 0,     int: 2250, end: 4500 },
            { name: "Trainer",     man: 0,     int: 9000, end: 4500 },
            { name: "Promoter",    man: 0,     int: 6000, end: 3000 }
        ],
        "Adult Novelties": [
            { name: "Sales Assistant",   man: 2000,  int: 0,     end: 4000 },
            { name: "Sexpert",           man: 0,     int: 10000, end: 5000 },
            { name: "Cleaner",           man: 2000,  int: 0,     end: 1000 },
            { name: "Store Manager",     man: 0,     int: 4000,  end: 8000 },
            { name: "Receptionist",      man: 0,     int: 3000,  end: 6000 },
            { name: "Marketing Manager", man: 0,     int: 8000,  end: 4000 },
            { name: "HR Officer",        man: 0,     int: 12000, end: 6000 }
        ],
        "Sweet Shop": [
            { name: "Shop Assistant", man: 1500, int: 0,    end: 3000 },
            { name: "Confectionist",  man: 0,    int: 5000, end: 2500 },
            { name: "Cleaner",        man: 2000, int: 0,    end: 1000 },
            { name: "Manager",        man: 0,    int: 3000, end: 6000 },
            { name: "Receptionist",   man: 0,    int: 2500, end: 5000 },
            { name: "Marketer",       man: 0,    int: 6000, end: 3000 }
        ],
        "Restaurant": [
            { name: "Waiter",     man: 1500, int: 0,    end: 3000 },
            { name: "Chef",       man: 0,    int: 5000, end: 2500 },
            { name: "Cleaner",    man: 2000, int: 0,    end: 1000 },
            { name: "Manager",    man: 0,    int: 4000, end: 8000 },
            { name: "Head Chef",  man: 0,    int: 8000, end: 4000 }
        ],
        "Candle Shop": [
            { name: "Salesperson",       man: 0,    int: 750,  end: 1500 },
            { name: "Chandler",          man: 4500, int: 2250, end: 0 },
            { name: "Cleaner",           man: 1000, int: 0,    end: 500 },
            { name: "Manager",           man: 0,    int: 3000, end: 6000 },
            { name: "Marketer",          man: 0,    int: 5000, end: 2500 }
        ],
        "Hair Salon": [
            { name: "Hairdresser",  man: 0,    int: 3000, end: 6000 },
            { name: "Apprentice",   man: 1000, int: 0,    end: 2000 },
            { name: "Cleaner",      man: 2000, int: 0,    end: 1000 },
            { name: "Receptionist", man: 0,    int: 2500, end: 5000 },
            { name: "Manager",      man: 0,    int: 4000, end: 8000 },
            { name: "Stylist",      man: 0,    int: 5000, end: 10000 }
        ],
        "Clothing Store": [
            { name: "Sales Assistant", man: 1500, int: 0,    end: 3000 },
            { name: "Tailor",          man: 0,    int: 4000, end: 2000 },
            { name: "Cleaner",         man: 2000, int: 0,    end: 1000 },
            { name: "Manager",         man: 0,    int: 3000, end: 6000 },
            { name: "Marketer",        man: 0,    int: 6000, end: 3000 }
        ],
        "Flower Shop": [
            { name: "Florist",         man: 0,    int: 3000, end: 6000 },
            { name: "Delivery Driver", man: 3000, int: 0,    end: 1500 },
            { name: "Cleaner",         man: 2000, int: 0,    end: 1000 },
            { name: "Manager",         man: 0,    int: 3000, end: 6000 }
        ]
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

    function findBestPosition(man, int, end, companyType) {
        const typeKey = safeStr(companyType).toLowerCase();
        const key = Object.keys(COMPANY_POSITIONS).find(k =>
            k.toLowerCase() === typeKey
        );
        const positions = key ? COMPANY_POSITIONS[key] : null;
        if (!positions) return null;
        let best = null, bestEff = -1;
        for (const pos of positions) {
            const eff = calcPositionEff(man, int, end, pos);
            if (eff > bestEff) { bestEff = eff; best = { name: pos.name, eff }; }
        }
        return best;
    }

    GM_addStyle(`
        #tcm-panel{position:fixed;top:80px;right:12px;width:520px;max-height:85vh;background:#1a1a1a;color:#ddd;border:1px solid #444;border-radius:8px;z-index:99999;font-family:Arial,sans-serif;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column}
        #tcm-header{background:#2c2c2c;padding:8px 12px;cursor:move;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #444}
        #tcm-header h3{margin:0;font-size:14px;color:#fff}
        #tcm-body{padding:10px;overflow-y:auto;flex:1}
        #tcm-panel.collapsed #tcm-body{display:none}
        .tcm-section{margin-bottom:14px}
        .tcm-section h4{margin:0 0 6px;color:#7eb8ff;font-size:13px;border-bottom:1px solid #333;padding-bottom:3px}
        .tcm-row{display:flex;justify-content:space-between;margin:3px 0}
        .tcm-label{color:#aaa}.tcm-value{font-weight:bold}
        .tcm-good{color:#6f6}.tcm-warn{color:#fc6}.tcm-bad{color:#f66}
        table.tcm-emp{width:100%;border-collapse:collapse;font-size:12px}
        table.tcm-emp th,table.tcm-emp td{padding:4px 5px;text-align:left;border-bottom:1px solid #333;vertical-align:top}
        table.tcm-emp th{background:#2a2a2a;color:#ccc;position:sticky;top:0}
        table.tcm-emp td{color:#c8c8c8}
        .tcm-btn{background:#3a6ea5;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:12px;margin:2px}
        .tcm-btn:hover{background:#4a8ec5}.tcm-btn.danger{background:#a53a3a}.tcm-btn.secondary{background:#555}
        #tcm-status{font-size:11px;color:#888;margin-top:6px}
        .tcm-reco{background:#252525;border-left:3px solid #7eb8ff;padding:6px 8px;margin:4px 0;border-radius:0 4px 4px 0}
        .best-pos{color:#7eb8ff;font-weight:bold}.stats-mini{font-size:11px;color:#c8c8c8}
        .dir-badge{background:#1a4a2a;color:#8f8;padding:1px 6px;border-radius:3px;font-size:11px;margin-left:6px}
        .emp-badge{background:#4a3a1a;color:#fc8;padding:1px 6px;border-radius:3px;font-size:11px;margin-left:6px}
        .tcm-key-box{background:#222;border:1px solid #555;border-radius:6px;padding:12px;margin-bottom:12px}
        .tcm-key-box input{width:100%;padding:8px;background:#111;border:1px solid #555;color:#fff;border-radius:4px;font-size:13px;box-sizing:border-box;margin:6px 0}
        .tcm-key-box label{display:block;margin-bottom:4px;color:#ccc}
        .tcm-key-note{font-size:11px;color:#888;margin-top:6px;line-height:1.4}
        .tcm-error-box{background:#2a1515;border:1px solid #a53a3a;border-radius:6px;padding:12px;margin-bottom:12px;color:#fcc;line-height:1.5}
        .tcm-error-box strong{color:#f88}
        .tcm-info-box{background:#15202a;border:1px solid #3a6ea5;border-radius:6px;padding:10px;margin-bottom:12px;color:#cde;line-height:1.45;font-size:12px}
        table.tcm-peer{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
        table.tcm-peer th,table.tcm-peer td{padding:3px 5px;text-align:left;border-bottom:1px solid #333}
        table.tcm-peer th{background:#2a2a2a;color:#ccc}
        table.tcm-peer td{color:#c8c8c8}
        .tcm-gap{color:#fc6;font-weight:bold}
        .tcm-ok{color:#6f6}
        .tcm-peer-note{font-size:11px;color:#888;margin-top:6px;line-height:1.4}
        .tcm-tabs{display:flex;gap:4px;margin:8px 0 10px;border-bottom:1px solid #333;padding-bottom:0;flex-wrap:wrap}
        .tcm-tab{background:transparent;border:1px solid transparent;border-bottom:none;color:#aaa;padding:6px 12px;border-radius:6px 6px 0 0;cursor:pointer;font-size:12px}
        .tcm-tab:hover{color:#ddd;background:#252525}
        .tcm-tab.active{background:#2a2a2a;color:#7eb8ff;border-color:#333;font-weight:bold}
        .tcm-tab-panel{display:none}
        .tcm-tab-panel.active{display:block}
    `);

    function createPanel() {
        if (document.getElementById('tcm-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'tcm-panel';
        panel.innerHTML = `
            <div id="tcm-header">
                <h3>Company Manager</h3>
                <div>
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
        let dragging = false, ox, oy;
        header.addEventListener('mousedown', e => { dragging = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop; });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            panel.style.left = (e.clientX - ox) + 'px';
            panel.style.top = (e.clientY - oy) + 'px';
            panel.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => dragging = false);

        panel.querySelector('#tcm-refresh').onclick = () => { if (!apiKey) showKeyInput(); else fetchAll(true); };
        panel.querySelector('#tcm-change-key').onclick = () => showKeyInput();
        panel.querySelector('#tcm-sync-settings').onclick = () => showSyncSettings();
        panel.querySelector('#tcm-toggle').onclick = () => {
            panel.classList.toggle('collapsed');
            panel.querySelector('#tcm-toggle').textContent = panel.classList.contains('collapsed') ? '+' : '−';
        };
        panel.querySelector('#tcm-close').onclick = () => panel.remove();
    }

    function setStatus(msg, isError) {
        const el = document.getElementById('tcm-status');
        if (el) { el.textContent = msg; el.style.color = isError ? '#f66' : '#888'; }
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

    function xhrJson(method, url, headers, body) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method || 'GET',
                url,
                headers: headers || {},
                data: body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                onload: res => {
                    let data = null;
                    try { data = JSON.parse(res.responseText); } catch (e) { data = res.responseText; }
                    if (res.status >= 200 && res.status < 300) resolve({ status: res.status, data });
                    else {
                        const err = new Error('HTTP ' + res.status);
                        err.status = res.status;
                        err.data = data;
                        reject(err);
                    }
                },
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

    // Multi-selection helper: fetch each selection and merge
    async function apiGetMany(section, selections) {
        const list = selections.split(',').map(s => s.trim()).filter(Boolean);
        const merged = {};
        let any = false;
        let lastErr = null;
        for (const sel of list) {
            try {
                const data = await apiGet(section, sel);
                Object.assign(merged, data);
                any = true;
            } catch (err) {
                lastErr = err;
                // continue collecting what we can; hard errors still bubble if nothing works
                if (![4, 7, 22, 23].includes(err.code)) {
                    // keep trying other selections unless it's key/auth related
                    if ([1, 2, 16].includes(err.code)) throw err;
                }
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
            position: position || (inCompany ? 'Employee' : 'None'),
            company_id: companyId,
            company_name: companyName,
            isDirector,
            inCompany
        };
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

        // Fallback: probe company profile – success implies membership
        if (!userInfo.inCompany) {
            try {
                const cdata = await apiGet('company', 'profile');
                const c = cdata.company || cdata.profile || cdata;
                if (c && (c.name || c.rating != null || c.company_type || c.type)) {
                    userInfo.inCompany = true;
                    userInfo.company_name = userInfo.company_name || c.name || null;
                    if (c.employees_hired != null || c.company_bank != null || c.daily_income != null) {
                        userInfo.isDirector = true;
                        if (!userInfo.position || userInfo.position === 'None') {
                            userInfo.position = 'Director';
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        }

        return userInfo;
    }

    async function fetchCompanyData(isDirector) {
        // Fetch each resource independently via v2 path endpoints, merge results
        const wanted = isDirector
            ? ['profile', 'employees', 'stock', 'detailed']
            : ['profile', 'employees'];

        const merged = {};
        let got = 0;
        let lastError = null;

        for (const sel of wanted) {
            try {
                const data = await apiGet('company', sel);
                Object.assign(merged, data);
                got++;
            } catch (err) {
                lastError = err;
                // Director-only pieces may 7 for employees; continue
                if ([7, 6, 4, 22, 23].includes(err.code)) continue;
                if ([1, 2, 16].includes(err.code)) throw err;
            }
        }

        if (!got) throw lastError || new Error('Failed to load company data');
        return { data: merged, selections: wanted.slice(0, got).join(',') };
    }


    // ---------- Peer ID cache (from joblist) + 10★ role-mix comparison ----------
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

    function savePeerIds(typeName, ids) {
        if (!typeName || !ids || !ids.length) return;
        const cache = loadPeerIdCache();
        const key = String(typeName).toLowerCase();
        const prev = cache[key] && cache[key].ids ? cache[key].ids : [];
        const merged = Array.from(new Set(prev.concat(ids).map(Number).filter(n => n > 0)));
        cache[key] = { ids: merged.slice(-80), updated: Date.now() }; // keep last 80
        GM_setValue(PEER_ID_KEY, JSON.stringify(cache));
    }

    function getCachedPeerIds(typeName) {
        const cache = loadPeerIdCache();
        const entry = cache[String(typeName).toLowerCase()];
        return entry && entry.ids ? entry.ids : [];
    }

    function loadScrapeCache() { return loadJson(PEER_SCRAPE_KEY, {}); }

    function saveScrapeForCompany(companyId, payload) {
        if (!companyId) return;
        const cache = loadScrapeCache();
        cache[String(companyId)] = Object.assign({}, payload, { scrapedAt: Date.now() });
        // Cap cache size
        const keys = Object.keys(cache);
        if (keys.length > 120) {
            keys.sort((a, b) => (cache[a].scrapedAt || 0) - (cache[b].scrapedAt || 0));
            keys.slice(0, keys.length - 120).forEach(k => delete cache[k]);
        }
        GM_setValue(PEER_SCRAPE_KEY, JSON.stringify(cache));
    }

    function getScrapeForCompany(companyId) {
        const cache = loadScrapeCache();
        return cache[String(companyId)] || null;
    }

    let _knownPosCache = null;
    function allKnownPositionNames() {
        if (_knownPosCache) return _knownPosCache;
        const set = new Set(['director', 'trainee', 'secretary', 'marketer', 'salesperson', 'sales assistant']);
        Object.values(COMPANY_POSITIONS).forEach(list => list.forEach(p => set.add(p.name.toLowerCase())));
        _knownPosCache = set;
        return set;
    }

    function scrapePositionsFromDom(root) {
        const known = allKnownPositionNames();
        const counts = {};
        const scope = root || document;

        // 1) Table rows: look for position-like cells
        scope.querySelectorAll('tr').forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td, th'));
            if (cells.length < 2) return;
            // Prefer cells that aren't the name link column
            cells.forEach(cell => {
                const t = (cell.textContent || '').trim().toLowerCase();
                if (!t || t.length > 40) return;
                if (known.has(t)) {
                    counts[t] = (counts[t] || 0) + 1;
                }
            });
        });

        // 2) Dedicated position elements
        scope.querySelectorAll('[class*="position"], [class*="job"], .employee-position, .acc-body').forEach(el => {
            const t = (el.textContent || '').trim().toLowerCase();
            if (known.has(t)) counts[t] = (counts[t] || 0) + 1;
        });

        // 3) Fallback: scan text nodes near profile links for known role words
        if (Object.keys(counts).length === 0) {
            const text = (scope.body ? scope.body.innerText : scope.innerText) || '';
            // Split into lines and count exact known role matches
            text.split(/[\n\r]+/).forEach(line => {
                const t = line.trim().toLowerCase();
                if (known.has(t)) counts[t] = (counts[t] || 0) + 1;
            });
        }

        // Deduplicate over-count from headers: if a role appears once as header only, still ok
        return counts;
    }

    function scrapeRatingFromDom(root) {
        const scope = root || document;
        const text = (scope.body ? scope.body.innerText : scope.innerText) || '';
        // Patterns: "10*", "10 ★", "Rating: 10", stars icons often repeated
        let m = text.match(/\b([1-9]|10)\s*[★*]/);
        if (m) return Number(m[1]);
        m = text.match(/rating[^0-9]{0,12}([1-9]|10)\b/i);
        if (m) return Number(m[1]);
        // Count filled star images if present
        const stars = scope.querySelectorAll('img[src*="star"], .company-rating, .rating').length;
        if (stars >= 1 && stars <= 10) return stars;
        return null;
    }

    function scrapeCompanyNameFromDom(root) {
        const scope = root || document;
        const h = scope.querySelector('.company-name, .title, h1, h2, h3, .m-title, .content-title');
        if (h) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80) return t.replace(/\s+/g, ' ');
        }
        return null;
    }

    function getCompanyIdFromLocation() {
        const url = new URL(location.href);
        const q = url.searchParams.get('ID') || url.searchParams.get('id');
        if (q && /^\d+$/.test(q)) return Number(q);
        const hash = (location.hash || '').replace(/^#\/?/, '');
        const hp = new URLSearchParams(hash);
        const hid = hp.get('ID') || hp.get('id');
        if (hid && /^\d+$/.test(hid)) return Number(hid);
        const m = (location.hash + location.search).match(/ID=(\d+)/i);
        return m ? Number(m[1]) : null;
    }

    function isCorpInfoView() {
        const hash = (location.hash || '').toLowerCase();
        if (hash.includes('corpinfo') || hash.includes('p=corp')) return true;
        if (/companies\.php/i.test(location.pathname) && getCompanyIdFromLocation()) return true;
        return false;
    }

    function scrapeAndCacheCurrentCompanyPage() {
        if (!isCorpInfoView()) return null;
        const id = getCompanyIdFromLocation();
        if (!id) return null;

        const roles = scrapePositionsFromDom(document);
        const rating = scrapeRatingFromDom(document);
        const name = scrapeCompanyNameFromDom(document);
        const typeName = detectJoblistCompanyType();
        const roleCount = Object.values(roles).reduce((a, b) => a + b, 0);

        if (roleCount === 0 && rating == null) return null;

        const payload = {
            roles,
            roleCount,
            rating: rating,
            name: name,
            type: typeName || null,
            scrapedAt: Date.now()
        };
        saveScrapeForCompany(id, payload);
        // Also ensure ID is in peer id cache
        if (typeName) savePeerIds(typeName, [id]);
        savePeerIds('_all', [id]);

        showToast('Company Manager: scraped ' + roleCount + ' positions from ' + (name || ('#' + id)) +
            (rating != null ? ' (★' + rating + ')' : ''), 3500);
        console.log('[TCM] Scraped company', id, payload);
        return payload;
    }

    // Scrape company IDs from joblist corp listing pages
    function scrapeJoblistCompanyIds() {
        const ids = new Set();
        // Links like joblist.php#/p=corpinfo&ID=12345 or corp&ID=
        document.querySelectorAll('a[href*="ID="]').forEach(a => {
            const href = a.getAttribute('href') || '';
            const m = href.match(/ID=(\d+)/i);
            if (m) ids.add(Number(m[1]));
        });
        // data attributes / view buttons used by Torn joblist
        document.querySelectorAll('[href*="corp"]').forEach(el => {
            const href = el.getAttribute('href') || '';
            const m = href.match(/ID=(\d+)/i);
            if (m) ids.add(Number(m[1]));
        });
        // Fallback: parse visible "view" style elements (legacy Job Spot Checker approach)
        document.querySelectorAll('.view, .company-details, li.company').forEach(el => {
            const html = el.innerHTML || '';
            const m = html.match(/ID=(\d+)/i) || (el.getAttribute('href') || '').match(/ID=(\d+)/i);
            if (m) ids.add(Number(m[1]));
        });
        return Array.from(ids);
    }

    function detectJoblistCompanyType() {
        // Try page title / selected tab / heading
        const h = document.querySelector('.company-list-title, .title-black, .content-title, h4, h2');
        const text = (h && h.textContent) || document.title || '';
        // Match against known types
        const types = Object.keys(COMPANY_POSITIONS);
        for (const t of types) {
            if (text.toLowerCase().includes(t.toLowerCase())) return t;
        }
        // URL param type if present
        const um = (location.hash + location.search).match(/type[=_](\d+)/i);
        if (um) return null; // numeric type only — still store under '_' bucket
        return null;
    }

    function cachePeersFromJoblist() {
        const ids = scrapeJoblistCompanyIds();
        if (!ids.length) return;
        let typeName = detectJoblistCompanyType();
        if (typeName) {
            savePeerIds(typeName, ids);
        }
        savePeerIds('_all', ids);
        console.log('[TCM] Cached', ids.length, 'company IDs from joblist for', typeName || '_all');
        showToast('Company Manager: cached ' + ids.length + ' company IDs' + (typeName ? ' (' + typeName + ')' : '') + ' for peer compare', 4000);
    }

    function normalizeEmployeeList(data) {
        // API may return object map, array, or nested under company_*
        let raw = data.company_employees || data.employees ||
            (data.company && (data.company.employees || data.company.company_employees)) ||
            null;
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

    function countRoles(employees) {
        const counts = {};
        getEmpList(employees).forEach(e => {
            if (!e || typeof e !== 'object') return;
            let pos = safeStr(e.position || e.job || e.role || e.job_position || e.position_name);
            if (!pos && e.position && typeof e.position === 'object') {
                pos = safeStr(e.position.name || e.position.title);
            }
            pos = (pos || 'unknown').toLowerCase();
            counts[pos] = (counts[pos] || 0) + 1;
        });
        return counts;
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


    async function fetchPeerCompany(id) {
        const urls = [
            API_BASE_V1 + '/company/' + id + '?selections=profile,employees',
            API_BASE_V2 + '/company/' + id + '/?selections=profile,employees',
            API_BASE_V1 + '/company/' + id + '?selections='
        ];
        let merged = {}, any = false, lastErr = null;
        for (const url of urls) {
            try {
                const data = await rawGet(url);
                Object.assign(merged, data);
                any = true;
                if (normalizeEmployeeList(merged).length) break;
            } catch (err) {
                lastErr = err;
                if ([2, 16].includes(err.code)) throw err;
            }
        }
        if (!any) throw lastErr || new Error('Peer fetch failed for ' + id);
        return merged;
    }

    async function refreshPeers() {
        if (!apiKey) { showKeyInput(); return; }
        if (!companyData && !userInfo) {
            setStatus('Load company data first', true);
            return;
        }

        const p = (companyData && (companyData.company || companyData.profile)) || {};
        const typeName = safeStr(p.company_type || p.type || '') || '';
        // Prefer typed cache, fall back to _all
        let ids = getCachedPeerIds(typeName);
        if (!ids.length) ids = getCachedPeerIds('_all');

        // Also include any scraped company IDs
        const scrapeCache = loadScrapeCache();
        Object.keys(scrapeCache).forEach(id => {
            if (!ids.includes(Number(id))) ids.push(Number(id));
        });

        if (!ids.length) {
            showErrorBox('No peer companies imported', [
                '1. Open <a href="https://www.torn.com/joblist.php" target="_blank" style="color:#7eb8ff">Job List</a> for your company type.',
                '2. Click into individual <strong>company pages</strong> (corp info) so positions can be scraped from the page.',
                '3. Return here and click <strong>Peers</strong>.',
                'Position data comes from the public company page text — not private API fields.'
            ]);
            setStatus('Open company pages on joblist to scrape positions', true);
            return;
        }

        // Exclude own company
        const ownId = (userInfo && userInfo.company_id) || p.ID || p.id || 0;
        ids = ids.filter(id => Number(id) !== Number(ownId)).slice(0, PEER_MAX);

        setStatus('Loading peers (0/' + ids.length + ')…');
        const starPeers = [];
        let done = 0;

        for (const id of ids) {
            try {
                // Prefer public page scrape cache for roles
                const scraped = getScrapeForCompany(id);
                let roles = scraped && scraped.roles ? scraped.roles : {};
                let roleCount = scraped && scraped.roleCount != null
                    ? scraped.roleCount
                    : Object.values(roles).reduce((a, b) => a + b, 0);
                let rating = scraped && scraped.rating != null ? Number(scraped.rating) : null;
                let name = scraped && scraped.name ? scraped.name : null;
                let cType = scraped && scraped.type ? scraped.type : '';
                let fetchedAt = scraped && scraped.scrapedAt ? scraped.scrapedAt : null;
                let source = scraped && roleCount > 0 ? 'page' : null;

                // Public API profile for rating/name when scrape missing stars
                if (rating == null || !name) {
                    try {
                        const data = await fetchPeerCompany(id);
                        const meta = extractCompanyMeta(data);
                        if (rating == null && meta.rating) rating = meta.rating;
                        if (!name && meta.name) name = meta.name;
                        if (!cType && meta.cType) cType = meta.cType;
                        // API employees only as last resort (usually empty for others)
                        if (roleCount === 0) {
                            const empList = normalizeEmployeeList(data);
                            const apiRoles = countRoles(empList);
                            const apiCount = Object.values(apiRoles).reduce((a, b) => a + b, 0);
                            if (apiCount > 0) {
                                roles = apiRoles;
                                roleCount = apiCount;
                                source = 'api';
                            }
                        }
                    } catch (e) {
                        console.warn('[TCM] peer profile fetch failed', id, e && e.message);
                    }
                }

                const typeOk = !typeName || !cType ||
                    cType.toLowerCase() === typeName.toLowerCase() ||
                    typeName.toLowerCase().includes(cType.toLowerCase()) ||
                    cType.toLowerCase().includes(typeName.toLowerCase());

                // Include 10★ peers, or scraped pages with roles when rating unknown
                const isTenStar = rating != null && rating >= PEER_STAR;
                if (typeOk && (isTenStar || (rating == null && roleCount > 0))) {
                    starPeers.push({
                        id,
                        name: name || ('Company #' + id),
                        rating: rating != null ? rating : '?',
                        type: cType,
                        roles,
                        roleCount,
                        hired: roleCount,
                        capacity: 0,
                        fetchedAt: fetchedAt || Date.now(),
                        source: source || (roleCount > 0 ? 'page' : 'none')
                    });
                }
            } catch (e) {
                console.warn('[TCM] peer failed', id, e && e.message);
            }
            done++;
            setStatus('Loading peers (' + done + '/' + ids.length + ')… ' + starPeers.length + ' candidates');
            await new Promise(r => setTimeout(r, 80));
        }

        // Prefer true 10★ with role data; if none, fall back to any scraped with roles
        let ranked = starPeers.filter(p => p.rating === PEER_STAR || p.rating === 10);
        if (!ranked.some(p => p.roleCount > 0)) {
            ranked = starPeers.filter(p => p.roleCount > 0);
        }
        // Replace starPeers with ranked for rest of pipeline
        starPeers.length = 0;
        ranked.forEach(p => starPeers.push(p));

        // Own role counts
        const ownEmpList = normalizeEmployeeList(companyData || {});
        const ownRoles = countRoles(ownEmpList);

        // Only peers that returned at least one positioned employee contribute to averages
        const peersWithRoles = starPeers.filter(p => p.roleCount > 0);
        const roleTotals = {};
        peersWithRoles.forEach(peer => {
            Object.keys(peer.roles).forEach(role => {
                roleTotals[role] = (roleTotals[role] || 0) + peer.roles[role];
            });
        });
        // Ensure own roles appear in the table
        Object.keys(ownRoles).forEach(role => {
            if (roleTotals[role] == null) roleTotals[role] = 0;
        });

        const denom = peersWithRoles.length || 0;
        const rows = Object.keys(roleTotals).sort().map(role => {
            const peerAvg = denom ? (roleTotals[role] / denom) : 0;
            const yours = ownRoles[role] || 0;
            const gap = peerAvg - yours;
            return { role, yours, peerAvg, gap };
        });

        const cacheInfo = peerCacheInfo(typeName);
        lastPeerReport = {
            typeName: typeName || 'Unknown',
            peerCount: starPeers.length,
            peersWithRoles: peersWithRoles.length,
            scanned: ids.length,
            peers: starPeers,
            rows,
            updated: Date.now(),
            idsCachedAt: cacheInfo.updated,
            idsCount: cacheInfo.ids.length,
            noRoleData: starPeers.length > 0 && peersWithRoles.length === 0
        };
        try { GM_setValue('tcmLastPeerReport', JSON.stringify(lastPeerReport)); } catch (e) { /* ignore */ }

        // Re-render company view with peer section
        if (companyData) render(companyData);
        else renderPeerOnly();

        if (!starPeers.length) {
            setStatus('No ' + PEER_STAR + '★ peers found in ' + ids.length + ' cached IDs — browse more joblist pages', true);
        } else if (!peersWithRoles.length) {
            setStatus(starPeers.length + ' × ' + PEER_STAR + '★ peers found, but employee positions not public via API', true);
        } else {
            setStatus('Peer comparison: ' + peersWithRoles.length + '/' + starPeers.length + ' × ' + PEER_STAR + '★ with role data');
        }
    }

    function renderPeerSectionHtml() {
        // Live cache status (even before first Peers click)
        const p = (companyData && (companyData.company || companyData.profile)) || {};
        const typeGuess = safeStr(p.company_type || p.type || '') ||
            (lastPeerReport && lastPeerReport.typeName) || '';
        const cacheInfo = peerCacheInfo(typeGuess);
        const hasImportedIds = cacheInfo.ids.length > 0;

        let html = `<div class="tcm-section"><h4>10★ Peer Role Mix</h4>`;

        // Error: no imported peer IDs at all
        if (!hasImportedIds) {
            html += `<div class="tcm-error-box">
                <strong>No peer companies imported</strong><br><br>
                • Open <a href="https://www.torn.com/joblist.php" target="_blank" style="color:#7eb8ff">Job List</a>
                  for your company type.<br>
                • Click into individual <strong>company pages</strong> (corp info) — positions are scraped from the public page text.<br>
                • Return here and click <strong>Peers</strong>.<br>
                <span style="color:#aaa">Last ID import: never</span>
            </div></div>`;
            return html;
        }

        // IDs exist but comparison not run yet (or last run found zero 10★)
        if (!lastPeerReport) {
            html += `<div class="tcm-warn">
                ${cacheInfo.ids.length} company ID(s) imported
                (last import: ${fmtTime(cacheInfo.updated)}).
                Click <strong>Peers</strong> to fetch 10★ role-mix data.
            </div></div>`;
            return html;
        }

        const r = lastPeerReport;
        html = `<div class="tcm-section">
            <h4>10★ Peer Role Mix
                <span style="color:#888;font-weight:normal">(${r.peerCount} peers · ${r.typeName || typeGuess || '?'})</span>
            </h4>`;

        html += `<div class="tcm-peer-note" style="margin-bottom:6px">
            IDs imported: <strong>${r.idsCount != null ? r.idsCount : cacheInfo.ids.length}</strong>
            · Last ID import: <strong>${fmtTime(r.idsCachedAt || cacheInfo.updated)}</strong><br>
            Last peer data refresh: <strong>${fmtTime(r.updated)}</strong>
        </div>`;

        if (!r.peerCount) {
            html += `<div class="tcm-error-box">
                <strong>No 10★ peers found</strong><br><br>
                Scanned ${r.scanned || 0} cached company ID(s); none were ${PEER_STAR}★
                (or type did not match).<br>
                Browse more Job List pages for this type, then click <strong>Peers</strong> again.
            </div></div>`;
            return html;
        }

        if (r.noRoleData || !(r.peersWithRoles > 0)) {
            html += `<div class="tcm-error-box">
                <strong>Peers found, but no scraped positions</strong><br><br>
                Found <strong>${r.peerCount}</strong> peer companies, but no employee position lists were scraped yet.<br>
                Open each company's <strong>corp info</strong> page on the Job List so positions can be read from the page, then click <strong>Peers</strong> again.<br>
                <span style="color:#aaa">Peers: ${(r.peers || []).map(p => p.name).join(', ') || '—'}</span>
            </div></div>`;
            return html;
        }

        html += `<table class="tcm-peer">
            <thead><tr><th>Position</th><th>You</th><th>10★ avg</th><th>Gap</th></tr></thead><tbody>`;
        (r.rows || []).forEach(row => {
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

        // Per-peer last updated list
        if (r.peers && r.peers.length) {
            html += `<div class="tcm-peer-note" style="margin-top:8px"><strong>Peers used</strong><br>`;
            r.peers.forEach(peer => {
                const roleInfo = peer.roleCount > 0
                    ? (peer.roleCount + ' staffed via ' + (peer.source || 'page'))
                    : 'no position data';
                html += `★${peer.rating} ${peer.name || ('#' + peer.id)}
                    — ${roleInfo} — ${fmtTime(peer.fetchedAt || r.updated)}<br>`;
            });
            html += `</div>`;
        }

        html += `<div class="tcm-peer-note">
            Gap = peer average − you. Positive gap (yellow) = peers staff this role more than you.
            Position titles only — other companies' work stats are not public.
        </div></div>`;
        return html;
    }

    function renderPeerOnly() {
        const content = document.getElementById('tcm-content');
        if (!content) return;
        if (companyData) { render(companyData); return; }
        content.innerHTML = `<div style="margin-bottom:8px">
            <button type="button" class="tcm-btn" id="tcm-peers">Refresh Peers</button>
        </div>` + renderPeerSectionHtml();
        const peersBtn = document.getElementById('tcm-peers');
        if (peersBtn) peersBtn.onclick = () => { if (!apiKey) showKeyInput(); else refreshPeers(); };
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

            const { data, selections } = await fetchCompanyData(info.isDirector);
            companyData = data;
            lastFetch = Date.now();
            const pruned = pruneTrainLog(data);
            try { recordMetricsSnapshot(data.company || data.profile || {}, data); } catch (e) { /* ignore */ }
            render(data);
            if (jsonbinId && jsonbinKey) {
                syncTrainLogBothWays().then(() => { if (companyData) render(companyData); }).catch(() => {});
            } else if (pruned.removed.length) {
                // No JSONBin — local log already cleaned by pruneTrainLog
            }

            const level = selections.includes('detailed') ? 'full' :
                          selections.includes('stock') ? 'good' :
                          selections.includes('employees') ? 'basic' : 'minimal';
            let statusMsg = `Updated ${new Date().toLocaleTimeString()} (${level} data) – ${info.isDirector ? 'Director' : 'Employee'}`;
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
            employees != null
                ? employees
                : {
                    employees: (companyData && (companyData.company_employees || companyData.employees)) || {},
                    company_employees: (companyData && (companyData.company_employees || companyData.employees)) || {}
                }
        );
        const profile = p || (companyData && (companyData.company || companyData.profile)) || {};
        const weekKey = isoWeekKey();
        const effCompany = extractCompanyEfficiency(profile);
        const environment = extractCompanyEnvironment(profile);
        const popularity = numOrNull(profile.popularity);
        const empStats = avgEmployeeEffectiveness(empList);

        // Need at least one meaningful metric
        if (
            effCompany == null && environment == null && popularity == null &&
            empStats.avgEffectiveness == null
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
            avgEffectiveness: empStats.avgEffectiveness,
            empSample: empStats.empSample,
            empCount: empList.length,
            byRole: empStats.byRole,
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
                : (companyData
                    ? {
                        employees: companyData.company_employees || companyData.employees || {},
                        company_employees: companyData.company_employees || companyData.employees || {}
                    }
                    : {})
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
            version: 3,
            updated: Date.now(),
            company_id: (userInfo && userInfo.company_id) || null,
            company_name: (userInfo && userInfo.company_name) || null,
            trains: log || loadTrainLog(),
            metrics: loadMetricsLog(),
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
            try {
                await xhrJson(
                    'PUT',
                    'https://api.jsonbin.io/v3/b/' + encodeURIComponent(jsonbinId),
                    {
                        'Content-Type': 'application/json',
                        'X-Master-Key': jsonbinKey,
                        'X-Bin-Versioning': 'false'
                    },
                    payload
                );
            } catch (e) {
                console.warn('[TCM] JSONBin push failed', e);
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
        add('Daily income', p.daily_income != null ? '$' + Number(p.daily_income).toLocaleString() : null, true);
        add('Weekly income', p.weekly_income != null ? '$' + Number(p.weekly_income).toLocaleString() : null, true);
        add('Bank', (p.company_bank != null || p.bank != null) ? '$' + Number(p.company_bank || p.bank || 0).toLocaleString() : null, true);
        add('Popularity', p.popularity != null ? p.popularity + '%' : null, true);
        add('Efficiency', p.efficiency != null ? p.efficiency + '%' : (p.company_efficiency != null ? p.company_efficiency + '%' : null), true);
        add('Work environment', p.environment != null ? p.environment : (p.working_stats != null ? p.working_stats : (p.company_environment != null ? p.company_environment : null)), true);
        add('Ad budget', p.advertising_budget != null ? '$' + Number(p.advertising_budget).toLocaleString() : null, true);
        add('Rating', p.rating != null ? '★' + p.rating : null, true);
        add('Employees', (p.employees_hired != null ? p.employees_hired : '?') + ' / ' + (p.employees_capacity != null ? p.employees_capacity : '?'), true);

        const stockItems = Object.values(stock || {});
        if (stockItems.length) {
            const lines = stockItems.slice(0, 15).map(s => {
                const name = s.name || s.item || 'Item';
                const inStock = s.in_stock != null ? s.in_stock : (s.amount != null ? s.amount : '?');
                return name + ': **' + inStock + '**';
            });
            fields.push({ name: 'Item stock', value: lines.join('\n').slice(0, 1000) });
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
            const id = String(e.user_id || e.id || e.player_id || e.UID || e.name || '');
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
            let addiction = null;
            if (e.effectiveness && typeof e.effectiveness === 'object' && e.effectiveness.addiction != null) {
                addiction = Number(e.effectiveness.addiction);
            } else if (e.addiction != null) {
                addiction = Number(e.addiction);
            }
            if (addiction != null && Math.abs(addiction) >= 10) {
                alerts.push('**' + name + '** — high drug addiction (' + addiction + ')');
            }

            // Extreme role inefficiency
            const man = e.manual_labor || e.manual || 0;
            const int = e.intelligence || 0;
            const end = e.endurance || 0;
            const best = findBestPosition(man, int, end, companyType);
            if (best && best.eff < 40 && (man || int || end)) {
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
        const employees = companyData.company_employees || companyData.employees || {};
        const stock = companyData.company_stock || companyData.stock || {};
        const companyType = safeStr(p.company_type || p.type || '') || safeStr(p.name) || '';
        const useList = getEmpList({ employees: employees, company_employees: employees });

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

    function showSyncSettings() {
        const content = document.getElementById('tcm-content');
        if (!content) return;
        content.innerHTML = `
            <div class="tcm-key-box">
                <strong>Data Sync (Web ↔ PDA)</strong>
                <div class="tcm-key-note" style="margin:8px 0 12px">
                    Use <strong>JSONBin.io</strong> as the shared store for train logs, Discord webhooks/options,
                    and panel message state so web and PDA stay aligned.
                </div>

                <label>JSONBin Bin ID</label>
                <input type="text" id="tcm-jsonbin-id" placeholder="e.g. 65f0..." value="${(jsonbinId || '').replace(/"/g, '&quot;')}">

                <label>JSONBin Master Key</label>
                <input type="password" id="tcm-jsonbin-key" placeholder="X-Master-Key" value="${(jsonbinKey || '').replace(/"/g, '&quot;')}">

                <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
                    <button class="tcm-btn" id="tcm-save-sync">Save Data Sync</button>
                    <button class="tcm-btn" id="tcm-run-sync">Sync Now</button>
                    <button class="tcm-btn secondary" id="tcm-back-dash">Back</button>
                </div>
                <div class="tcm-key-note" style="margin-top:10px">
                    <strong>Setup (once)</strong><br>
                    1. Create a free account at <a href="https://jsonbin.io" target="_blank" style="color:#7eb8ff">jsonbin.io</a><br>
                    2. <strong>Create Bin</strong> — JSONBin rejects a blank body. Paste this starter JSON:<br>
                    <textarea readonly id="tcm-jsonbin-starter" style="width:100%;height:120px;margin:6px 0;padding:6px;background:#111;border:1px solid #555;color:#cfc;font:11px monospace;border-radius:4px;box-sizing:border-box">{
  "version": 3,
  "updated": 0,
  "company_id": null,
  "company_name": null,
  "trains": {},
  "metrics": { "weeks": {} },
  "discord": {
    "logWebhook": "",
    "panelWebhook": "",
    "weeklyWebhook": "",
    "webhook": "",
    "opts": {
      "unusedTrains": false,
      "dailyMetrics": false,
      "employeeAlerts": false,
      "starChange": false,
      "autoPost": true,
      "weeklyPanel": true
    },
    "meta": {}
  }
}</textarea>
                    <button type="button" class="tcm-btn secondary" id="tcm-copy-starter" style="margin-bottom:6px">Copy starter JSON</button><br>
                    3. Name the bin (e.g. <code>CompanyManagerData</code>) and create it<br>
                    4. Copy <strong>Bin ID</strong> + <strong>Master Key</strong> into the fields above<br>
                    5. Same Bin ID + Key on web and PDA → Save Data Sync → Sync Now<br>
                    Discord webhooks &amp; report options are configured on the <strong>Discord</strong> tab (also stored here).
                </div>
            </div>`;

        document.getElementById('tcm-save-sync').onclick = () => {
            jsonbinId = (document.getElementById('tcm-jsonbin-id').value || '').trim();
            jsonbinKey = (document.getElementById('tcm-jsonbin-key').value || '').trim();
            GM_setValue('tcmJsonbinId', jsonbinId);
            GM_setValue('tcmJsonbinKey', jsonbinKey);
            setStatus('Data Sync settings saved');
        };
        document.getElementById('tcm-run-sync').onclick = async () => {
            if (!jsonbinId || !jsonbinKey) {
                setStatus('JSONBin ID + Master Key required for Data Sync', true);
                return;
            }
            setStatus('Data Sync in progress…');
            try {
                await syncTrainLogBothWays();
                setStatus('Data Sync complete (trains + metrics + Discord)');
                if (companyData) render(companyData);
            } catch (e) {
                setStatus('Data Sync failed: ' + (e.message || e), true);
            }
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
    }

    function markEmployeeTrained(employeeId) {
        const log = loadTrainLog();
        const id = String(employeeId);
        if (!log[id]) log[id] = { trains: 0, lastTrain: 0 };
        log[id].trains = (log[id].trains || 0) + 1;
        log[id].lastTrain = Date.now();
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

    function estimateDailyTrains(p, empList) {
        const rating = Number(p.rating || p.stars || 0) || 0;
        // Base trains/day ≈ star rating; Trainer/HR adds more (approximate +1 if any effective trainer present)
        let daily = rating;
        let hasTrainer = false;
        empList.forEach(e => {
            const pos = safeStr(e.position).toLowerCase();
            if (pos.includes('trainer') || pos.includes('hr officer') || pos === 'hr') hasTrainer = true;
        });
        if (hasTrainer) daily += 1; // conservative; real bonus scales with trainer effectiveness
        return { daily, rating, hasTrainer };
    }

    function buildSmartTraining(p, employees, companyType) {
        const list = getEmpList({ employees: employees, company_employees: employees });
        const trainEst = estimateDailyTrains(p, list);
        const log = loadTrainLog();

        // Score each employee for training priority
        const scored = list.map(e => {
            const id = e.user_id || e.id || e.player_id || e.UID || e.name;
            const man = e.manual_labor || e.manual || 0;
            const int = e.intelligence || 0;
            const end = e.endurance || 0;
            const best = findBestPosition(man, int, end, companyType);
            const wsEff = best ? best.eff : 0;
            const days = empDays(e);
            const eff = empEffectiveness(e);
            const logged = log[String(id)] ? (log[String(id)].trains || 0) : 0;
            // Fair share: trains proportional to days employed (normalized later)
            const fairShare = days; // relative weight
            // Priority: low WS eff, low effectiveness, fewer logged trains relative to days
            const trainRatio = days > 0 ? logged / days : logged;
            let priority = 0;
            priority += (90 - Math.min(wsEff, 90)) * 2; // need training on stats
            if (eff != null) priority += Math.max(0, 50 - eff);
            priority += Math.max(0, 5 - trainRatio * 100); // under-trained vs days
            if (days < 3) priority *= 0.5; // brand new: lower urgency

            return {
                id, e, name: e.name || e.playername || String(id),
                position: safeStr(e.position) || '—',
                days, wsEff, eff, logged, fairShare, priority,
                bestName: best ? best.name : null,
                man, int, end
            };
        });

        scored.sort((a, b) => b.priority - a.priority);

        // Fair-share trains owed (relative): total weight = sum of days; if we had T trains total historically unknown
        // Show relative under-training: expected share of logged trains vs actual
        const totalDays = scored.reduce((s, x) => s + x.days, 0) || 1;
        const totalLogged = scored.reduce((s, x) => s + x.logged, 0);
        scored.forEach(x => {
            const expectedShare = totalLogged * (x.days / totalDays);
            x.owedDelta = expectedShare - x.logged; // positive = owed more trains for fairness
        });

        return { trainEst, scored, totalLogged, totalDays };
    }

    function stockDaysHtml(stock) {
        const items = Object.values(stock || {});
        if (!items.length) return '';
        let html = `<div class="tcm-section"><h4>Stock Days</h4>`;
        let any = false;
        items.forEach(s => {
            const name = s.name || s.item || 'Item';
            const inStock = s.in_stock != null ? s.in_stock : (s.amount != null ? s.amount : null);
            // sold amounts if present
            const sold = s.sold_amount != null ? s.sold_amount :
                (s.sold != null ? s.sold :
                (s.sales != null ? s.sales : null));
            const price = s.price || s.selling_price || null;
            let days = null;
            if (inStock != null && sold != null && Number(sold) > 0) {
                days = inStock / Number(sold);
            }
            if (inStock == null && days == null) return;
            any = true;
            let daysStr = days != null ? days.toFixed(1) + 'd' : '—';
            let cls = 'tcm-good';
            if (days != null) {
                if (days < 2) cls = 'tcm-bad';
                else if (days < 5) cls = 'tcm-warn';
            } else if (inStock != null && inStock < 10) cls = 'tcm-bad';
            else if (inStock != null && inStock < 50) cls = 'tcm-warn';
            html += `<div class="tcm-row"><span class="tcm-label">${name}</span>
                <span class="tcm-value ${cls}">${inStock != null ? inStock : '—'} stock` +
                (days != null ? ` · ~${daysStr}` : '') + `</span></div>`;
        });
        if (!any) return '';
        html += `<div class="tcm-peer-note">Days ≈ stock ÷ recent daily sales when sales data is present.</div></div>`;
        return html;
    }

    function renderSmartTrainingHtml(p, employees, companyType) {
        const empMap = employees || {};
        const useList = getEmpList({ employees: empMap, company_employees: empMap });
        if (!useList.length) return '';

        const { trainEst, scored, totalLogged } = buildSmartTraining(p, empMap, companyType);

        let html = `<div class="tcm-section"><h4>Smart Training</h4>`;
        html += `<div class="tcm-row"><span class="tcm-label">Est. trains / day</span>
            <span class="tcm-value">${trainEst.daily} <span style="color:#888;font-weight:normal">(★${trainEst.rating}${trainEst.hasTrainer ? ' + trainer' : ''})</span></span></div>`;
        html += `<div class="tcm-row"><span class="tcm-label">Logged trains (total)</span>
            <span class="tcm-value">${totalLogged}</span></div>`;
        html += `<div class="tcm-peer-note" style="margin:6px 0">
            Priority ranks who needs trains most (low WS efficiency / effectiveness, fewer logged trains vs tenure).
            Click <strong>+Train</strong> after you train them in Torn to keep the log fair. This does not spend trains in-game.
        </div>`;

        html += `<table class="tcm-emp"><thead><tr>
            <th>Name</th><th>Pos</th><th>Days</th><th>WS Eff</th><th>Eff%</th><th>Logged</th><th>Fair Δ</th><th></th>
        </tr></thead><tbody>`;

        scored.slice(0, 25).forEach(x => {
            const wsCls = x.wsEff >= 90 ? 'tcm-good' : x.wsEff >= 70 ? 'tcm-warn' : 'tcm-bad';
            const fairCls = x.owedDelta > 0.5 ? 'tcm-gap' : x.owedDelta < -0.5 ? 'tcm-ok' : '';
            const fairStr = (x.owedDelta >= 0 ? '+' : '') + x.owedDelta.toFixed(1);
            const effStr = x.eff != null ? Math.round(x.eff) : '—';
            html += `<tr>
                <td>${x.name}</td>
                <td>${x.position}</td>
                <td>${x.days}</td>
                <td class="${wsCls}">${x.wsEff || '—'}</td>
                <td>${effStr}</td>
                <td>${x.logged}</td>
                <td class="${fairCls}">${fairStr}</td>
                <td><button class="tcm-btn" data-train-id="${x.id}" style="padding:2px 6px;font-size:11px">+Train</button></td>
            </tr>`;
        });
        html += `</tbody></table>
            <div style="margin-top:6px">
                <button class="tcm-btn secondary" id="tcm-reset-trains">Reset train log</button>
            </div>
            <div class="tcm-peer-note">
                Fair Δ = expected share of logged trains by tenure minus actual. Positive = relatively under-trained.
                Top of list = train first.
            </div>
        </div>`;
        return html;
    }

    // Recommendations from role gaps, mis-assignments, and weekly metric trends
    function buildRecommendations(p, employees, companyType) {
        const recos = [];
        const empArr = getEmpList(employees);
        if (!empArr.length) return recos;

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

        // Live low effectiveness in current role → suggest best position
        empArr.forEach(e => {
            const man = e.manual_labor || e.manual || 0;
            const int = e.intelligence || 0;
            const end = e.endurance || 0;
            const best = findBestPosition(man, int, end, companyType);
            const curPos = safeStr(e.position);
            const liveEff = empEffectiveness(e);
            const name = e.name || e.id || '?';

            if (best && best.name.toLowerCase() !== curPos.toLowerCase() && best.eff >= 90) {
                recos.push(`${name} under-utilised in ${curPos || '?'} → move to ${best.name} (${best.eff} WS eff).`);
            } else if (
                best && liveEff != null && liveEff < 50 && best.eff >= 70 &&
                best.name.toLowerCase() !== curPos.toLowerCase()
            ) {
                // Low game effectiveness + better theoretical fit
                recos.push(
                    `${name} effectiveness ${Math.round(liveEff)} in ${curPos || '?'} — try ${best.name} ` +
                    `(WS eff ${best.eff}); company metrics may improve if role fit is the issue.`
                );
            } else if (liveEff != null && liveEff < 40 && (man || int || end)) {
                recos.push(
                    `${name} effectiveness ${Math.round(liveEff)} is very low` +
                    (best ? ` (best theoretical role: ${best.name})` : '') +
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

    function render(data) {
        const content = document.getElementById('tcm-content');
        if (!content) return;

        const p = data.company || data.profile || {};
        const employees = data.company_employees || data.employees || {};
        const stock = data.company_stock || data.stock || {};
        const companyType = safeStr(p.company_type || p.type || p.company || '') || safeStr(p.name) || '';

        if (!p.name && Object.keys(employees).length === 0) {
            showErrorBox('No company data returned', [
                'The API returned an empty response.',
                'Confirm you are the Director and the key belongs to that account.'
            ]);
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
                ${userInfo.isDirector ? '' : '<br><span class="tcm-warn">Employee view – working stats & full stock data require Director key.</span>'}
            </div>`;
        }

        let html = banner + `
            <div class="tcm-section">
                <h4>${p.name || (userInfo && userInfo.company_name) || 'Your Company'} ★${p.rating || '?'}</h4>
                <div class="tcm-row"><span class="tcm-label">Type</span><span class="tcm-value">${companyType || '—'}</span></div>
                <div class="tcm-row"><span class="tcm-label">Employees</span>
                    <span class="tcm-value">${p.employees_hired || Object.keys(employees).length} / ${p.employees_capacity || '?'}</span></div>
                <div class="tcm-row"><span class="tcm-label">Daily Income</span>
                    <span class="tcm-value">$${(p.daily_income || 0).toLocaleString()}</span></div>
                <div class="tcm-row"><span class="tcm-label">Bank</span>
                    <span class="tcm-value">$${(p.company_bank || p.bank || 0).toLocaleString()}</span></div>
                ${p.popularity != null ? `<div class="tcm-row"><span class="tcm-label">Popularity</span><span class="tcm-value">${p.popularity}%</span></div>` : ''}
                ${p.efficiency != null ? `<div class="tcm-row"><span class="tcm-label">Efficiency</span><span class="tcm-value">${p.efficiency}%</span></div>` : ''}
                ${(p.environment != null || p.company_environment != null) ? `<div class="tcm-row"><span class="tcm-label">Work environment</span><span class="tcm-value">${p.environment != null ? p.environment : p.company_environment}</span></div>` : ''}
                ${p.advertising_budget != null ? `<div class="tcm-row"><span class="tcm-label">Ad Budget</span><span class="tcm-value">$${Number(p.advertising_budget).toLocaleString()}</span></div>` : ''}
                ${p.weekly_income != null ? `<div class="tcm-row"><span class="tcm-label">Weekly Income</span><span class="tcm-value">$${Number(p.weekly_income).toLocaleString()}</span></div>` : ''}
            </div>`;

        // Snapshot metrics for weekly comparison (local + later Data Sync)
        try { recordMetricsSnapshot(p, employees); } catch (e) { /* ignore */ }
        html += renderWeeklyMetricsHtml();

        // Compact stock on overview
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

        // Tabs
        const savedTab = GM_getValue('tcmActiveTab', 'training');
        const tabIds = ['training', 'employees', 'peers', 'discord'];
        const tabLabels = { training: 'Training', employees: 'Employees', peers: 'Peers', discord: 'Discord' };
        const activeTab = tabIds.includes(savedTab) ? savedTab : 'training';

        html += `<div class="tcm-tabs">`;
        tabIds.forEach(id => {
            html += `<button type="button" class="tcm-tab${id === activeTab ? ' active' : ''}" data-tab="${id}">${tabLabels[id]}</button>`;
        });
        html += `</div>`;

        // Training tab
        html += `<div class="tcm-tab-panel${activeTab === 'training' ? ' active' : ''}" data-tab-panel="training">`;
        html += renderSmartTrainingHtml(p, employees, companyType);
        html += `</div>`;

        // Employees tab
        html += `<div class="tcm-tab-panel${activeTab === 'employees' ? ' active' : ''}" data-tab-panel="employees">`;
        const recos = buildRecommendations(p, employees, companyType);
        if (recos.length) {
            html += `<div class="tcm-section"><h4>Recommendations</h4>`;
            recos.forEach(r => html += `<div class="tcm-reco">${r}</div>`);
            html += `</div>`;
        }
        const empList = getEmpList(employees);
        if (empList.length) {
            html += `
                <div class="tcm-section">
                    <h4>Best Position Advisor</h4>
                    <table class="tcm-emp">
                        <thead><tr><th>Name</th><th>Current</th><th>Best Position</th><th>WS Eff</th><th>Days</th><th>Eff%</th><th>Stats (M / I / E)</th></tr></thead>
                        <tbody>`;
            empList.forEach(e => {
                const man = e.manual_labor || e.manual || 0;
                const int = e.intelligence || 0;
                const end = e.endurance || 0;
                const currentPos = safeStr(e.position) || '—';
                const best = findBestPosition(man, int, end, companyType);
                const days = empDays(e);
                const gameEff = empEffectiveness(e);
                let bestHtml = '—', effClass = '';
                if (best) {
                    const same = best.name.toLowerCase() === currentPos.toLowerCase();
                    bestHtml = `<span class="best-pos">${best.name}</span>`;
                    if (!same) bestHtml += ` <span class="tcm-warn">(move!)</span>`;
                    effClass = best.eff >= 90 ? 'tcm-good' : best.eff >= 70 ? 'tcm-warn' : 'tcm-bad';
                } else if (man || int || end) {
                    bestHtml = `<span class="tcm-warn">No position data for this type</span>`;
                }
                html += `<tr>
                    <td>${e.name || e.playername || e.id}</td>
                    <td>${currentPos}</td>
                    <td>${bestHtml}</td>
                    <td class="${effClass}">${best ? best.eff : '—'}</td>
                    <td>${days || '—'}</td>
                    <td>${gameEff != null ? Math.round(gameEff) : '—'}</td>
                    <td class="stats-mini">${man.toLocaleString()} / ${int.toLocaleString()} / ${end.toLocaleString()}</td>
                </tr>`;
            });
            html += `</tbody></table>
                <div style="font-size:11px;color:#888;margin-top:6px">
                    WS Eff = theoretical work-stat efficiency (90 = exact requirements). Working stats only available to Directors.
                </div></div>`;
        } else {
            html += `<div class="tcm-section"><h4>Employees</h4>
                <div class="tcm-warn">No employee list returned.
                ${userInfo && !userInfo.isDirector ? ' You are an employee – full list requires a Director key.' : ''}</div></div>`;
        }
        html += `</div>`;

        // Peers tab
        html += `<div class="tcm-tab-panel${activeTab === 'peers' ? ' active' : ''}" data-tab-panel="peers">`;
        html += `<div style="margin-bottom:8px">
            <button type="button" class="tcm-btn" id="tcm-peers">Refresh Peers</button>
        </div>`;
        html += renderPeerSectionHtml();
        html += `</div>`;

        // Discord tab
        html += `<div class="tcm-tab-panel${activeTab === 'discord' ? ' active' : ''}" data-tab-panel="discord">`;
        html += renderDiscordTabHtml();
        html += `</div>`;

        content.innerHTML = html;

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

        const peersBtn = document.getElementById('tcm-peers');
        if (peersBtn) peersBtn.onclick = () => { if (!apiKey) showKeyInput(); else refreshPeers(); };

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


    // Joblist / corpinfo: cache IDs + scrape public employee positions from the page
    const onJoblist = /joblist\.php/i.test(location.pathname);
    if (onJoblist) {
        const runCache = () => {
            try { cachePeersFromJoblist(); } catch (e) { /* ignore */ }
            try { scrapeAndCacheCurrentCompanyPage(); } catch (e) { /* ignore */ }
        };
        runCache();
        window.addEventListener('hashchange', () => setTimeout(runCache, 1000));
        // Torn injects corpinfo content asynchronously
        setTimeout(runCache, 1200);
        setTimeout(runCache, 2500);
        setTimeout(runCache, 4500);
        // Observe DOM mutations on corpinfo for late-loaded employee lists
        try {
            const obs = new MutationObserver(() => {
                if (isCorpInfoView()) {
                    clearTimeout(obs._t);
                    obs._t = setTimeout(() => {
                        try { scrapeAndCacheCurrentCompanyPage(); } catch (e) { /* ignore */ }
                    }, 600);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        } catch (e) { /* ignore */ }
        return;
    }

    createPanel();
    scheduleDiscord18TCT();
    if (!apiKey) { showKeyInput(); setStatus('Please enter your API key'); }
    else fetchAll();
})();
