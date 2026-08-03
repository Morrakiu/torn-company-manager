// ==UserScript==
// @name         Torn Company Manager
// @namespace    https://torn.com/
// @version      3.6.0
// @description  Director dashboard: smart training (Discord/JSONBin sync), best positions, peers, API v2.
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
    let discordWebhook = GM_getValue('tcmDiscordWebhook', '');
    let jsonbinId = GM_getValue('tcmJsonbinId', '');
    let jsonbinKey = GM_getValue('tcmJsonbinKey', '');
    let lastFetch = 0;
    let companyData = null;
    let userInfo = null; // { name, position, company_id, company_name, isDirector }
    let lastPeerReport = null; // cached comparison result for UI
    try { lastPeerReport = JSON.parse(GM_getValue('tcmLastPeerReport', 'null')); } catch (e) { lastPeerReport = null; }
    const PEER_ID_KEY = 'tcmPeerIdsByType'; // { [typeName]: { ids: number[], updated: ts } }
    const PEER_SCRAPE_KEY = 'tcmPeerScrapeById'; // { [companyId]: { roles, name, rating, type, scrapedAt } }
    const TRAIN_LOG_KEY = 'tcmTrainLog'; // { [employeeId]: { trains: n, lastTrain: ts } }
    const PEER_MAX = 20; // max peer companies to fetch per refresh
    const PEER_STAR = 10;

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
    function posStr(val) { return safeStr(val); }

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
                    <button class="tcm-btn secondary" id="tcm-sync-settings" title="Train sync / Discord">Sync</button>
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

    function rawGet(url) {
        return new Promise((resolve, reject) => {
            if (!apiKey) {
                reject(Object.assign(new Error('No API key set'), { code: 1 }));
                return;
            }
            const full = url + (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(apiKey) + '&comment=CompanyManager';
            GM_xmlhttpRequest({
                method: 'GET',
                url: full,
                onload: res => {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (data.error) {
                            const err = new Error(data.error.code + ': ' + data.error.error);
                            err.code = data.error.code;
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: () => reject(new Error('Network error'))
            });
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

        let position = posStr(
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
    function loadPeerIdCache() {
        try { return JSON.parse(GM_getValue(PEER_ID_KEY, '{}')) || {}; }
        catch (e) { return {}; }
    }

    function fmtTime(ts) {
        if (!ts) return 'never';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return 'never';
        return d.toLocaleString();
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

    function loadScrapeCache() {
        try { return JSON.parse(GM_getValue(PEER_SCRAPE_KEY, '{}')) || {}; }
        catch (e) { return {}; }
    }

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

    function allKnownPositionNames() {
        const set = new Set();
        Object.values(COMPANY_POSITIONS).forEach(list => {
            list.forEach(p => set.add(p.name.toLowerCase()));
        });
        // common variants
        ['director', 'trainee', 'secretary', 'marketer', 'salesperson', 'sales assistant'].forEach(x => set.add(x));
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

        let toast = document.getElementById('tcm-joblist-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tcm-joblist-toast';
            toast.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#1a4a2a;color:#cfc;padding:8px 12px;border-radius:6px;z-index:99999;font:12px Arial;border:1px solid #3a6a4a;box-shadow:0 2px 10px rgba(0,0,0,.4)';
            document.body.appendChild(toast);
        }
        toast.textContent = 'Company Manager: scraped ' + roleCount + ' positions from ' + (name || ('#' + id)) +
            (rating != null ? ' (★' + rating + ')' : '');
        clearTimeout(toast._hide);
        toast._hide = setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);

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
        // Brief on-page toast so user knows caching worked
        let toast = document.getElementById('tcm-joblist-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tcm-joblist-toast';
            toast.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#1a4a2a;color:#cfc;padding:8px 12px;border-radius:6px;z-index:99999;font:12px Arial;border:1px solid #3a6a4a;box-shadow:0 2px 10px rgba(0,0,0,.4)';
            document.body.appendChild(toast);
        }
        toast.textContent = 'Company Manager: cached ' + ids.length + ' company IDs' + (typeName ? ' (' + typeName + ')' : '') + ' for peer compare';
        clearTimeout(toast._hide);
        toast._hide = setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
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

    function countRoles(employees) {
        const counts = {};
        const list = Array.isArray(employees) ? employees
            : (employees && typeof employees === 'object' ? Object.values(employees) : []);
        list.forEach(e => {
            if (!e || typeof e !== 'object') return;
            // position may be string, object {name}, or job/role fields
            let pos = posStr(e.position || e.job || e.role || e.job_position || e.position_name);
            if (!pos && e.position && typeof e.position === 'object') {
                pos = posStr(e.position.name || e.position.title);
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

    function rawGetUrl(url) {
        return new Promise((resolve, reject) => {
            if (!apiKey) return reject(Object.assign(new Error('No API key'), { code: 1 }));
            const full = url + (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(apiKey) + '&comment=CompanyManager';
            GM_xmlhttpRequest({
                method: 'GET',
                url: full,
                onload: res => {
                    try {
                        const data = JSON.parse(res.responseText);
                        if (data.error) {
                            const err = new Error(data.error.code + ': ' + data.error.error);
                            err.code = data.error.code;
                            reject(err);
                        } else resolve(data);
                    } catch (e) { reject(e); }
                },
                onerror: () => reject(new Error('Network error'))
            });
        });
    }

    async function fetchPeerCompany(id) {
        // Try several endpoint shapes used by community tools + v2 paths
        const urls = [
            API_BASE_V2 + '/company/' + id + '/employees',
            API_BASE_V2 + '/company/' + id + '/profile',
            API_BASE_V2 + '/company/' + id + '/?selections=profile,employees',
            API_BASE_V1 + '/company/' + id + '?selections=profile,employees',
            API_BASE_V1 + '/company/' + id + '?selections=employees,company',
            API_BASE_V1 + '/company/' + id + '?selections=employees',
            API_BASE_V1 + '/company/' + id + '?selections=profile',
            API_BASE_V1 + '/company/' + id + '?selections='
        ];
        let merged = {};
        let any = false;
        let lastErr = null;
        for (const url of urls) {
            try {
                const data = await rawGetUrl(url);
                Object.assign(merged, data);
                any = true;
                // If we already have employees, can stop early
                const emps = normalizeEmployeeList(merged);
                const meta = extractCompanyMeta(merged);
                if (emps.length && meta.rating) break;
            } catch (err) {
                lastErr = err;
                // 7 = private for this selection — try next shape
                if (err.code === 7 || err.code === 4 || err.code === 22 || err.code === 23) continue;
                if (err.code === 2 || err.code === 16) throw err;
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

                // Include if 10★, or if scrape says 10★, or rating unknown but we have scraped roles (user opened the page)
                const isTenStar = rating != null && rating >= PEER_STAR;
                if ((isTenStar || (rating == null && roleCount > 0 && scraped)) && typeOk) {
                    // If rating unknown, only keep if scraped from a page we think is 10★ later — require rating when possible
                    if (rating == null && roleCount > 0) {
                        // keep for role data but mark rating unknown — user may filter; still useful
                    }
                    if (isTenStar || (rating == null && roleCount > 0)) {
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
        // Prefer full re-render so tabs stay intact
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
                    render(probe.data);
                    if (jsonbinId && jsonbinKey) {
                        syncTrainLogBothWays().then(() => { if (companyData) render(companyData); }).catch(() => {});
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
            render(data);
            if (jsonbinId && jsonbinKey) {
                syncTrainLogBothWays().then(() => { if (companyData) render(companyData); }).catch(() => {});
            }

            const level = selections.includes('detailed') ? 'full' :
                          selections.includes('stock') ? 'good' :
                          selections.includes('employees') ? 'basic' : 'minimal';
            setStatus(`Updated ${new Date().toLocaleTimeString()} (${level} data) – ${info.isDirector ? 'Director' : 'Employee'}`);
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
    function loadTrainLog() {
        try { return JSON.parse(GM_getValue(TRAIN_LOG_KEY, '{}')) || {}; }
        catch (e) { return {}; }
    }

    function saveTrainLog(log) {
        GM_setValue(TRAIN_LOG_KEY, JSON.stringify(log));
    }

    function gmXhr(method, url, headers, body) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method,
                url,
                headers: headers || {},
                data: body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                onload: res => {
                    let data = null;
                    try { data = JSON.parse(res.responseText); } catch (e) { data = res.responseText; }
                    if (res.status >= 200 && res.status < 300) resolve({ status: res.status, data });
                    else reject(Object.assign(new Error('HTTP ' + res.status + ': ' + (res.responseText || '').slice(0, 120)), { status: res.status, data }));
                },
                onerror: () => reject(new Error('Network error'))
            });
        });
    }

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
            version: 1,
            updated: Date.now(),
            company_id: (userInfo && userInfo.company_id) || null,
            company_name: (userInfo && userInfo.company_name) || null,
            trains: log || loadTrainLog()
        };

        // JSONBin — real bi-directional store for web + PDA
        if (jsonbinId && jsonbinKey) {
            try {
                await gmXhr(
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

        // Discord webhook — write-only log / notification (cannot be read back)
        if (discordWebhook && /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//i.test(discordWebhook)) {
            try {
                const total = Object.values(payload.trains).reduce((s, x) => s + (Number(x.trains) || 0), 0);
                const lines = Object.keys(payload.trains).slice(0, 25).map(id => {
                    const t = payload.trains[id];
                    return '`' + id + '` ×' + (t.trains || 0);
                });
                await gmXhr(
                    'POST',
                    discordWebhook,
                    { 'Content-Type': 'application/json' },
                    {
                        username: 'Company Manager',
                        embeds: [{
                            title: 'Train log update',
                            description: (payload.company_name || 'Company') + ' — **' + total + '** logged trains',
                            color: 0x3a6ea5,
                            fields: [
                                {
                                    name: 'Snapshot (JSON)',
                                    value: '```json\n' + JSON.stringify(payload.trains).slice(0, 900) + '\n```'
                                }
                            ].concat(lines.length ? [{ name: 'Recent IDs', value: lines.join('\n').slice(0, 1000) }] : []),
                            timestamp: new Date().toISOString(),
                            footer: { text: 'Write-only webhook · use JSONBin for web↔PDA sync' }
                        }]
                    }
                );
            } catch (e) {
                console.warn('[TCM] Discord webhook failed', e);
                // non-fatal
            }
        }
    }

    async function pullTrainLogRemote() {
        if (!jsonbinId || !jsonbinKey) return null;
        try {
            const res = await gmXhr(
                'GET',
                'https://api.jsonbin.io/v3/b/' + encodeURIComponent(jsonbinId) + '/latest',
                {
                    'X-Master-Key': jsonbinKey,
                    'X-Bin-Meta': 'false'
                }
            );
            const body = res.data && res.data.record ? res.data.record : res.data;
            if (body && body.trains && typeof body.trains === 'object') return body.trains;
            if (body && typeof body === 'object' && !body.metadata) {
                // raw map of employeeId -> {trains}
                const keys = Object.keys(body);
                if (keys.length && body[keys[0]] && (body[keys[0]].trains != null || body[keys[0]].lastTrain != null)) {
                    return body;
                }
            }
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
        const merged = remote ? mergeTrainLogs(local, remote) : local;
        saveTrainLog(merged);
        try {
            await pushTrainLogRemote(merged);
        } catch (e) {
            setStatus('Train sync push failed: ' + (e.message || e), true);
            return merged;
        }
        return merged;
    }

    function showSyncSettings() {
        const content = document.getElementById('tcm-content');
        if (!content) return;
        content.innerHTML = `
            <div class="tcm-key-box">
                <strong>Train data sync (Web ↔ PDA)</strong>
                <div class="tcm-key-note" style="margin:8px 0 12px">
                    Discord webhooks are <strong>write-only</strong> — they cannot feed data back to PDA.<br>
                    Use <strong>JSONBin.io</strong> (free) as the shared store both clients read/write.<br>
                    Discord is optional, for a visible log in your server.
                </div>

                <label>JSONBin Bin ID</label>
                <input type="text" id="tcm-jsonbin-id" placeholder="e.g. 65f0..." value="${(jsonbinId || '').replace(/"/g, '&quot;')}">

                <label>JSONBin Master Key</label>
                <input type="password" id="tcm-jsonbin-key" placeholder="X-Master-Key" value="${(jsonbinKey || '').replace(/"/g, '&quot;')}">

                <label>Discord Webhook URL (optional)</label>
                <input type="text" id="tcm-discord-hook" placeholder="https://discord.com/api/webhooks/..." value="${(discordWebhook || '').replace(/"/g, '&quot;')}">

                <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
                    <button class="tcm-btn" id="tcm-save-sync">Save Sync Settings</button>
                    <button class="tcm-btn" id="tcm-run-sync">Sync Now</button>
                    <button class="tcm-btn secondary" id="tcm-back-dash">Back</button>
                </div>
                <div class="tcm-key-note" style="margin-top:10px">
                    <strong>Setup (once)</strong><br>
                    1. Create a free account at <a href="https://jsonbin.io" target="_blank" style="color:#7eb8ff">jsonbin.io</a><br>
                    2. Create a bin (empty JSON <code>{}</code>) and copy Bin ID + Master Key<br>
                    3. Enter the same Bin ID + Key on <strong>web and PDA</strong><br>
                    4. Optional: create a Discord channel webhook for train notifications
                </div>
            </div>`;

        document.getElementById('tcm-save-sync').onclick = () => {
            jsonbinId = (document.getElementById('tcm-jsonbin-id').value || '').trim();
            jsonbinKey = (document.getElementById('tcm-jsonbin-key').value || '').trim();
            discordWebhook = (document.getElementById('tcm-discord-hook').value || '').trim();
            GM_setValue('tcmJsonbinId', jsonbinId);
            GM_setValue('tcmJsonbinKey', jsonbinKey);
            GM_setValue('tcmDiscordWebhook', discordWebhook);
            setStatus('Sync settings saved');
        };
        document.getElementById('tcm-run-sync').onclick = async () => {
            if (!jsonbinId || !jsonbinKey) {
                setStatus('JSONBin ID + Master Key required for two-way sync', true);
                return;
            }
            setStatus('Syncing train log…');
            try {
                await syncTrainLogBothWays();
                setStatus('Train log synced');
                if (companyData) render(companyData);
            } catch (e) {
                setStatus('Sync failed: ' + (e.message || e), true);
            }
        };
        document.getElementById('tcm-back-dash').onclick = () => {
            if (companyData) render(companyData);
            else if (apiKey) fetchAll(true);
            else showKeyInput();
        };
    }

    function markEmployeeTrained(empId) {
        const log = loadTrainLog();
        const id = String(empId);
        if (!log[id]) log[id] = { trains: 0, lastTrain: 0 };
        log[id].trains = (log[id].trains || 0) + 1;
        log[id].lastTrain = Date.now();
        saveTrainLog(log);
        if (companyData) render(companyData);
        setStatus('Logged train for employee #' + id + ' — syncing…');
        pushTrainLogRemote(log).then(() => {
            setStatus('Logged train for employee #' + id + (jsonbinId ? ' (synced)' : (discordWebhook ? ' (Discord notified)' : '')));
        }).catch(e => {
            setStatus('Train logged locally; remote push failed: ' + (e.message || e), true);
        });
    }

    function resetTrainLog() {
        if (!confirm('Reset all logged trains (local + push empty to remote if configured)?')) return;
        GM_setValue(TRAIN_LOG_KEY, '{}');
        if (companyData) render(companyData);
        setStatus('Train log cleared — syncing…');
        pushTrainLogRemote({}).then(() => setStatus('Train log cleared')).catch(() => setStatus('Cleared locally; remote push failed', true));
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
            const pos = posStr(e.position).toLowerCase();
            if (pos.includes('trainer') || pos.includes('hr officer') || pos === 'hr') hasTrainer = true;
        });
        if (hasTrainer) daily += 1; // conservative; real bonus scales with trainer effectiveness
        return { daily, rating, hasTrainer };
    }

    function buildSmartTraining(p, employees, companyType) {
        const empList = normalizeEmployeeList({ employees: employees, company_employees: employees });
        // Prefer object values if map
        const list = empList.length ? empList : Object.values(employees || {});
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
                position: posStr(e.position) || '—',
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
        const list = normalizeEmployeeList({ employees: empMap, company_employees: empMap });
        const useList = list.length ? list : Object.values(empMap);
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

    // Generic recommendations based on role gaps + mis-assigned high-stat employees
    function buildRecommendations(p, employees, companyType) {
        const recos = [];
        const empArr = Object.values(employees || {});
        if (!empArr.length) return recos;

        const roleCount = {};
        empArr.forEach(e => {
            const pos = posStr(e.position).toLowerCase();
            roleCount[pos] = (roleCount[pos] || 0) + 1;
        });

        // Common useful roles across many companies
        if (!roleCount['manager'] && !roleCount['store manager']) {
            recos.push('No Manager assigned – usually improves motivation and performance.');
        }
        if (!roleCount['trainer'] && !roleCount['hr officer']) {
            recos.push('No Trainer / HR Officer – you may be missing daily extra trains.');
        }
        if (!roleCount['promoter'] && !roleCount['marketer'] && !roleCount['marketing manager']) {
            recos.push('No Promoter / Marketer – advertising effectiveness may be lower.');
        }

        // Flag high-stat employees in suboptimal roles
        empArr.forEach(e => {
            const man = e.manual_labor || e.manual || 0;
            const int = e.intelligence || 0;
            const end = e.endurance || 0;
            const best = findBestPosition(man, int, end, companyType);
            const curPos = posStr(e.position);
            if (best && best.name.toLowerCase() !== curPos.toLowerCase() && best.eff >= 90) {
                recos.push(`${e.name || e.id} under-utilised in ${curPos || '?'} → move to ${best.name} (${best.eff} WS eff).`);
            }
        });

        return recos;
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
                ${p.advertising_budget != null ? `<div class="tcm-row"><span class="tcm-label">Ad Budget</span><span class="tcm-value">$${Number(p.advertising_budget).toLocaleString()}</span></div>` : ''}
                ${p.weekly_income != null ? `<div class="tcm-row"><span class="tcm-label">Weekly Income</span><span class="tcm-value">$${Number(p.weekly_income).toLocaleString()}</span></div>` : ''}
            </div>`;

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
        const tabIds = ['training', 'employees', 'peers'];
        const tabLabels = { training: 'Training', employees: 'Employees', peers: 'Peers' };
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
        const empList = Object.values(employees);
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
                const currentPos = posStr(e.position) || '—';
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
    if (!apiKey) { showKeyInput(); setStatus('Please enter your API key'); }
    else fetchAll();
})();
