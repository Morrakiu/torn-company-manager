// ==UserScript==
// @name         Torn Company Manager
// @namespace    https://torn.com/
// @version      3.1.1
// @description  Company dashboard + best-position advisor. Native API v2 + one-click custom key link. Works for all company types.
// @author       Morrakiu
// @match        https://www.torn.com/companies.php*
// @match        https://www.torn.com/page.php?sid=companies*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      api.torn.com
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
    let lastFetch = 0;
    let companyData = null;
    let userInfo = null; // { name, position, company_id, company_name, isDirector }

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
        #tcm-panel{position:fixed;top:80px;right:12px;width:560px;max-height:88vh;background:#1a1a1a;color:#ddd;border:1px solid #444;border-radius:8px;z-index:99999;font-family:Arial,sans-serif;font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column}
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
        .tcm-btn{background:#3a6ea5;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:12px;margin:2px}
        .tcm-btn:hover{background:#4a8ec5}.tcm-btn.danger{background:#a53a3a}.tcm-btn.secondary{background:#555}
        #tcm-status{font-size:11px;color:#888;margin-top:6px}
        .tcm-reco{background:#252525;border-left:3px solid #7eb8ff;padding:6px 8px;margin:4px 0;border-radius:0 4px 4px 0}
        .best-pos{color:#7eb8ff;font-weight:bold}.stats-mini{font-size:11px;color:#999}
        .dir-badge{background:#1a4a2a;color:#8f8;padding:1px 6px;border-radius:3px;font-size:11px;margin-left:6px}
        .emp-badge{background:#4a3a1a;color:#fc8;padding:1px 6px;border-radius:3px;font-size:11px;margin-left:6px}
        .tcm-key-box{background:#222;border:1px solid #555;border-radius:6px;padding:12px;margin-bottom:12px}
        .tcm-key-box input{width:100%;padding:8px;background:#111;border:1px solid #555;color:#fff;border-radius:4px;font-size:13px;box-sizing:border-box;margin:6px 0}
        .tcm-key-box label{display:block;margin-bottom:4px;color:#ccc}
        .tcm-key-note{font-size:11px;color:#888;margin-top:6px;line-height:1.4}
        .tcm-error-box{background:#2a1515;border:1px solid #a53a3a;border-radius:6px;padding:12px;margin-bottom:12px;color:#fcc;line-height:1.5}
        .tcm-error-box strong{color:#f88}
        .tcm-info-box{background:#15202a;border:1px solid #3a6ea5;border-radius:6px;padding:10px;margin-bottom:12px;color:#cde;line-height:1.45;font-size:12px}
    `);

    function createPanel() {
        if (document.getElementById('tcm-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'tcm-panel';
        panel.innerHTML = `
            <div id="tcm-header">
                <h3>Company Manager</h3>
                <div>
                    <button class="tcm-btn" id="tcm-refresh" title="Refresh">↻</button>
                    <button class="tcm-btn secondary" id="tcm-change-key" title="Change API Key">Key</button>
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
            </div>`;

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
                    <h4>Employees – Best Position Advisor</h4>
                    <table class="tcm-emp">
                        <thead><tr><th>Name</th><th>Current</th><th>Best Position</th><th>WS Eff</th><th>Stats (M / I / E)</th></tr></thead>
                        <tbody>`;
            empList.forEach(e => {
                const man = e.manual_labor || e.manual || 0;
                const int = e.intelligence || 0;
                const end = e.endurance || 0;
                const currentPos = posStr(e.position) || '—';
                const best = findBestPosition(man, int, end, companyType);
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
                    <td class="stats-mini">${man.toLocaleString()} / ${int.toLocaleString()} / ${end.toLocaleString()}</td>
                </tr>`;
            });
            html += `</tbody></table>
                <div style="font-size:11px;color:#888;margin-top:6px">
                    WS Eff = theoretical work-stat efficiency (90 = exact requirements). Working stats only available to Directors.
                    Position data is built-in for common company types; others show current role only.
                </div></div>`;
        } else {
            html += `<div class="tcm-section"><h4>Employees</h4>
                <div class="tcm-warn">No employee list returned.
                ${userInfo && !userInfo.isDirector ? ' You are an employee – full list requires a Director key.' : ''}</div></div>`;
        }

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

        content.innerHTML = html;
    }

    createPanel();
    if (!apiKey) { showKeyInput(); setStatus('Please enter your API key'); }
    else fetchAll();
})();
