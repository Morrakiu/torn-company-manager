// ==UserScript==
// @name         TCM ALPHA
// @namespace    TCM
// @version      10.10.3-alpha
// @charset      utf-8
// @description  Decision-support dashboard for Torn City company directors. Financial tracking, employee effectiveness, smart training rotation, promotion projections, and recommendations. No automation - all actions are user-triggered.
// @author       Morrakiu
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @match        https://tornstats.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @connect      api.torn.com
// @connect      discord.com
// @connect      discordapp.com
// @connect      api.jsonbin.io
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-idle
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Alpha/Torn_Company_Manager.user.js
// @updateURL    https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Alpha/Torn_Company_Manager.user.js
// ==/UserScript==

  (function () {
      'use strict';

      const TCM = {
          VERSION: '10.10.3-alpha',
          NS: 'TCM_v2_',
          API_BASE: 'https://api.torn.com',
          API_RATE_LIMIT_MS: 1000,
          ICON_REGISTRY_KEY: 'tcm_icon_registry',
          ICON_SIZE: 38,
          ICON_GAP: 6,

          POSITION_ALIASES: {

              'HR Officer':             'Human Resources',
              'H.R. Officer':           'Human Resources',
              'Marketing Mgr':          'Marketing Manager',
              'Store Mgr':              'Store Manager',
              'Line Mgr':               'Line Manager',
              'Quality Ctrl':           'Quality Control',
              'P.I.':                   'Private Investigator',
              'Chief Inv.':             'Chief Investigator',
              'Disk Jockey':            'Disk-jockey',
              'DJ':                     'Disk-jockey',
              'Personal Asst':          'Personal Assistant',
              'Supply Chain Mgr':       'Supply Chain Manager',
              'Warehouse Mgr':          'Warehouse Manager',
              'Procurement Mgr':        'Procurement Manager',
              'Mktg. Manager':          'Marketing Manager',
              'Advertising Mgr':        'Advertising Manager',
              'Farm Mgr':               'Farm Manager',
              'Site Mgr':               'Site Manager',
              'Team Mgr':               'Team Manager',
          },

          EE_TIER_1: 50,
          EE_TIER_2: 100,
          EE_TIER_3: 150,
          EE_TIER_4: 200,

          TRAIN_PRIMARY: 50,
          TRAIN_SECONDARY: 25,


          TRAINER_TRAINS: { 50: 1, 100: 1, 150: 2, 200: 3 },

          INACTIVE_WARN_DAYS: 3,
          INACTIVE_REPLACE_DAYS: 7,

          ROI_SHORT: 10,
          ROI_LONG: 30,

          SALARY_RATIO_WARN: 0.60,
          EFF_WARN: 80,
          LEARNING_MAX: 100,

          OPT_MIN_FIT: 0.35,
          OPT_EE_CAP: 100,
          SALARY_POOL_PCT: 0.70,

          DATA_VERSION: '4.0.0',
          DATA_VERIFIED: '2025-03-24',
          STOCK_PRICES: {
              'Hair Salon':         {},
              'Flower Shop':        { 'Card':9, 'Vase':25, 'Bouquet':26, 'Box of Chocolates':28, 'Luxury Bouquet':47, 'Hamper':50 },
              'Candle Shop':        { 'Tealight':2, 'Dinner Candle':4, 'Holder':10, 'Pillar Candle':12, 'Scented Candle':19 },
              'Clothing Store':     { 'Sandals':15, 'Sweat Pants':15, 'Underwear':15, 'T-Shirt':20, 'Shorts':25, 'Body Warmer':33, 'Jeans':46, 'Boots':72, 'Polo Shirt':86, 'Chinos':99, 'Jacket':140, 'Leather Shoes':200, 'Tuxedo':697 },
              'Furniture Store':    { 'Dining Chair':50, 'Bedside Table':100, 'Coffee Table':200, 'Entertainment Unit':250, 'Dining Table':400, 'Display Cabinet':450, 'Bed':450, 'Sofa':600 },
              'Gas Station':        { 'Gasoline (Gallon)':2, 'Diesel (Gallon)':3 },
              'Music Store':        { 'Ukulele':121, 'Synthesizer':280, 'Violin':389, 'Flute':499, 'Guitar':691, 'Drum Kit':923, 'Saxophone':1000, 'Trumpet':1311, 'Clarinet':1692, 'Piano':5400 },
              'Nightclub':          {},
              'Pub':                {},
              'Restaurant':         { 'Beverage':1, 'Bottle of Wine':40 },
              'Sweet Shop':         { 'Marshmallow Selection':3, 'Boiled Sweet Selection':4, 'Jelly Selection':5, 'Caramel Selection':5, 'Chocolate Selection':8, 'Liquorice Selection':11, 'Fudge Selection':14 },
              'Toy Shop':           { 'Jigsaw':6, 'Plushie Toy':12, 'Craft Set':16, 'Action Figure':17, 'Board Game':18, 'Water Pistol':22, 'Model Kit':23, 'Doll':31, 'RC Car':40, 'RC Helicopter':50, 'Scooter':90, 'Bicycle':112, 'Trampoline':462, 'Game Console':545, 'Playhouse':625 },
              'Adult Novelties':    { 'Blow Up Doll':4, 'Magazine':4, 'Lubricant':6, 'Condoms':6, 'Whip':7, 'Handcuffs':10, 'Kama Sutra Book':12, 'Vibrator':19 },
              'Cyber Cafe':         {},
              'Grocery Store':      { 'Fruit':1, 'Bread':1, 'Dairy':1, 'Vegetables':2, 'Fish':3, 'Meat':4 },
              'Game Shop':          { 'Handheld Game':28, 'PC Game':46, 'Controller':55, 'Console Game':58, 'Handheld':350, 'Console':545 },
              'Amusement Park':     {},
              'Fitness Center':     {},
              'Zoo':                { 'Animal Feed':1, 'Souvenir':2 },
              'Cruise Line':        {},
              'Theater':            {},
              'Logistics Management': {},
              'Law Firm':           {},
              'Mechanic Shop':      { 'Tyre':30 },
              'Car Dealership':     { 'Compact':5000, 'Hatchback':6500, 'Sedan':9750, 'Coupe':10500, 'SUV':12500, 'Sports Car':29000, 'Luxury Car':82500 },
              'Firework Stand':     {},
              'Gun Shop':           { 'Pistol':250, 'Hunting Rifle':330, 'Shotgun':375, 'Submachine Gun':510, 'Assault Rifle':745 },
              'Meat Warehouse':     {},
              'Detective Agency':   {},
              'Farm':               {},
              'Lingerie Store':     { 'Knickers':4, 'Stockings':8, 'Thong':10, 'Bra':21, 'Suspenders':30, 'Corset':40 },
              'Gents Strip Club':   {},
              'Ladies Strip Club':  {},
              'Property Broker':    {},
              'Software Corporation': {},
              'Private Security Firm': {},
              'Mining Corporation': {},
              'Television Network': {},
              'Oil Rig':            {}
          },

          TYPE_MAP: {
              1:'Hair Salon', 2:'Law Firm', 3:'Flower Shop', 4:'Car Dealership',
              5:'Clothing Store', 6:'Gun Shop', 7:'Game Shop', 8:'Candle Shop',
              9:'Toy Shop', 10:'Adult Novelties', 11:'Cyber Cafe', 12:'Grocery Store',
              13:'Theater', 14:'Sweet Shop', 15:'Cruise Line', 16:'Television Network',
              18:'Zoo', 19:'Firework Stand', 20:'Property Broker', 21:'Furniture Store',
              22:'Gas Station', 23:'Music Store', 24:'Nightclub', 25:'Pub',
              26:'Gents Strip Club', 27:'Restaurant', 28:'Oil Rig', 29:'Fitness Center',
              30:'Mechanic Shop', 31:'Amusement Park', 32:'Lingerie Store', 33:'Meat Warehouse',
              34:'Farm', 35:'Software Corporation', 36:'Ladies Strip Club', 37:'Private Security Firm',
              38:'Mining Corporation', 39:'Detective Agency', 40:'Logistics Management'
          },
      };



      const STOCK_PERF_COMPANIES = new Set([2, 15, 16, 19, 22, 28, 29, 31, 33, 38]);

      const STOCK_PERF_POS_ABBR = {
          'Amusement Park':     { 'Inspector':'IN','Manager':'MG','Marketer':'MK','Security Guard':'SG','Mechanic':'MC','Accountant':'AC','Ride Attendant':'RA','Entertainer':'EN','Ticket Agent':'TA','Janitor':'JN' },
          'Cruise Line':        { 'Captain':'CA','First Officer':'FO','Doctor':'DR','Specialist':'SP','Bosun':'BO','Marketer':'MK','Chef':'CH','Engineer':'EN','Receptionist':'RC','Steward':'ST','Bartender':'BT','Deckhand':'DK','Ticket Agent':'TA' },
          'Firework Stand':     { 'Trainer':'TR','Pyrotechnician':'PT','Manager':'MG','Advertising Manager':'AM','Bookkeeper':'BK','Salesperson':'SP','Picker Packer':'PP' },
          'Fitness Center':     { 'Manager':'MG','Marketer':'MK','Nutritionist':'NU','Swimming Instructor':'SW','Human Resources':'HR','Fitness Instructor':'FI','Lifeguard':'LG','Personal Trainer':'PT','Cleaner':'CL','Receptionist':'RC' },
          'Gas Station':        { 'Trainer':'TR','Manager':'MG','Marketer':'MK','Attendant':'AT','Cleaner':'CL' },
          'Law Firm':           { 'Consultant':'CO','Marketer':'MK','Secretary':'SE','Attorney':'AT','Cleaner':'CL','Assistant':'AS' },
          'Meat Warehouse':     { 'Supervisor':'SU','Quality Controller':'QC','Manager':'MG','Assistant':'AS','Retailer':'RT','Butcher':'BU','Packer':'PK','Cleaner':'CL','Apprentice Butcher':'AB' },
          'Mining Corporation': { 'Secretary':'SE','Site Manager':'SM','Safety Inspector':'SI','Mine Engineer':'ME','Sales Executive':'SX','Electrician':'EL','Production Foreman':'PF','Mill Operator':'MO' },
          'Oil Rig':            { 'Inspector':'IN','Driller':'DR','Sales Executive':'SX','Motor Hand':'MH','Secretary':'SE','Derrick Hand':'DH','Roughneck':'RN' },
          'Television Network': { 'Anchor':'AN','Attorney':'AT','Marketer':'MK','Writer':'WR','Secretary':'SE','Producer':'PR','Reporter':'RP','Camera Operator':'CO','Sales Executive':'SX','Stagehand':'ST','Cleaner':'CL','Programmer':'PG' }
      };

  let _tcmLic = true;
  let _tcmInit = 0;
      const License = {
          // Access always granted
          _sessionVerified: true,
          _readCache() {
              return {
                  status: 'active',
                  cacheExp: Date.now() + 86400000 * 365,
                  dayKey: new Date().toISOString().slice(0, 10),
                  requestsToday: 1,
                  updatedAt: null,
                  dayToken: '0'.repeat(32),
                  tornId: ''
              };
          },
          _writeCache() {},
          _isFresh() { return true; },
          _dailyLimitReached() { return false; },
          _sameIdentity() { return true; },
          _adminChangedSince() { return false; },
          _acquireLock() { return true; },
          _releaseLock() {},
          resetLicenseCache() {},
          forceVerify(tornId, cb) {
              if (typeof cb === 'function') cb('active');
              return Promise.resolve('active');
          },
          verify(tornId) {
              this._sessionVerified = true;
              return Promise.resolve('active');
          },
          startAutoRecheck() {},
          stopAutoRecheck() {}
      };

      const Storage = {
          get(key, fallback = null) {
              try {
                  const raw = GM_getValue(TCM.NS + key, null);
                  if (raw === null) return fallback;
                  return JSON.parse(raw);
              } catch (e) { return fallback; }
          },
         set(key, value) {
      try {
          const json = JSON.stringify(value);
          GM_setValue(TCM.NS + key, json);
      } catch (e) {
          console.error(`[TCM Storage.set] FAILED key="${key}" size≈${Math.round((JSON.stringify(value||'').length)/1024)}KB — ${e.message || e}`);
      }
  },
          getApiKey() {
              const raw = GM_getValue(TCM.NS + 'apiKey', '');
              if (!raw) return '';
              try {
                  const decoded = atob(raw);
                  return decoded;
              } catch (e) {

                  GM_setValue(TCM.NS + 'apiKey', btoa(raw));
                  return raw;
              }
          },
setApiKey(k) {
              GM_setValue(TCM.NS + 'apiKey', btoa(k));

              GM_setValue(TCM.NS + 'my_torn_id', '');
              GM_setValue(TCM.NS + 'companyKey', '');
          },

          getCompanyKey() {
              const raw = GM_getValue(TCM.NS + 'companyKey', '');
              if (!raw) return '';
              try { return atob(raw); } catch (e) { return ''; }
          },
setCompanyKey(k) { GM_setValue(TCM.NS + 'companyKey', k ? btoa(k) : ''); },
          fullReset() {
              try {
                  (GM_listValues() || []).forEach(k => {
                      if (k.startsWith(TCM.NS) || k === 'TCM_last_api_ts') GM_deleteValue(k);
                  });
              } catch (e) { console.warn('[TCM] Full reset failed:', e); }
              location.reload();
          },

          getSettings() {
              const _isMobile = /Android|iPhone|iPad|iPod|TornPDA/i.test(navigator.userAgent)
                  || window.innerWidth <= 520;
              return this.get('settings', {
                  benchSameSize: false,
                  panels: {
                      health: true, financial: true, recommendations: true,
                      optimizer: true, special: true, rotation: true,
                      training: true, projections: true, monthly: true,
                      accuracy: false
                  },
                  rotationMode: 'priority',
                  syncSheets: { finance: true, trains: true, contracts: true, tax: true, stock: true },
                  pageRestriction: 'everywhere',
                  weights: { Wg: 0.25, Wv: 0.25, Wa: 0.25, Wp: 0.25 },
                  uiX: 20, uiY: 80,
                  uiW: 400, uiH: null,
                  pinned: false,
                  minimized: _isMobile,
                  theme: 'dark'
              });
          },
          saveSettings(s) { this.set('settings', s); },
          getRankingCache() { return this.get('ranking_cache', null); },
          saveRankingCache(data) { this.set('ranking_cache', data); },
          getWageMultipliers() { return this.get('wageMultipliers', {}); },
          saveWageMultipliers(m) { this.set('wageMultipliers', m); },
          getWageExcluded() { return this.get('wageExcluded', []); },
          saveWageExcluded(arr) { this.set('wageExcluded', arr); },

getRotation() {
              return this.get('rotation', {
                  queue:      [],
                  pointer:    0,
                  excluded:   [],
                  startDate:  '',
                  joinDates:  {},
                  resetDates: {}
              });
          },
          saveRotation(r) { this.set('rotation', r); },

          resetRotation(activeIds) {
              const rot = this.getRotation();
              rot.queue   = [...(activeIds || [])];
              rot.pointer = 0;
              const log = this.getTrainedLog();
              let earliest = new Date().toISOString().slice(0, 10);
              for (const entries of Object.values(log)) {
                  for (const e of entries) {
                      if (e.date && e.date < earliest) earliest = e.date;
                  }
              }
              rot.startDate = earliest;
              this.saveRotation(rot);
          },


          daysSinceStart(startDate) {
              if (!startDate) return 1;
              const start  = new Date(startDate + 'T00:00:00Z');
              const now    = new Date();
              const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
              return Math.max(1, Math.floor((utcNow - start) / 86400000) + 1);
          },



          getTrainCountsSince(startDate, activeIds) {
      const log    = this.getTrainedLog();
      const counts = {};
      for (const id of (activeIds || [])) counts[id] = 0;
      for (const [empId, entries] of Object.entries(log)) {
          const allFiltered = startDate
              ? entries.filter(e => e.date >= startDate && e.ts)
              : entries.filter(e => e.ts);

        const seenKeys = new Set();
        const filtered = allFiltered.filter(e => {
            if (!e.ts) return true;
            const key = e._logId || e.ts;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
        });
          counts[empId] = (counts[empId] || 0) + filtered.length;
      }
      return counts;
  },



          getEarliestLogDate() {
              const log = this.getTrainedLog();
              let earliest = null;
              for (const entries of Object.values(log)) {
                  for (const e of entries) {
                      if (!earliest || e.date < earliest) earliest = e.date;
                  }
              }
              return earliest;
          },














getTrainQueue(employees, trainBudget, mode, directorId, todayNews, typeName) {
              const rot             = this.getRotation();
              const today           = new Date().toISOString().slice(0, 10);
              const _tornDayStartMs = this.tornDayStart();
              const todayLog = this.getTrainedLog();
              const getLogged = (id) => {
                  const seenKeys = new Set();
                  return (todayLog[id] || []).filter(e => {
                      if (!e.ts || e.ts < _tornDayStartMs) return false;
                      const key = e._logId || e.ts;
                      if (seenKeys.has(key)) return false;
                      seenKeys.add(key);
                      return true;
                  }).length;
              };





              const _crBuyerIds = new Set(Storage.getTrainSales()
                .filter(c => c.active !== false)
                .map(c => c.buyerEmpId));
              const active = Object.entries(employees || {})
                  .filter(([id, e]) => e.position !== 'Director'
                      && String(id) !== String(directorId || '')
                      && !rot.excluded.includes(id)
                      && !_crBuyerIds.has(id)
&& (e.days_in_company == null || e.days_in_company >= (Storage.getSettings().settlingInDays ?? 3)))
                  .map(([id, e]) => ({
                      id, name: e.name,
                      wsEff:    e.effectiveness?.working_stats || 0,
                      totalEff: e.effectiveness?.total || e.effectiveness?.working_stats || 0,
                      emp: e
                  }));

              if (!active.length || !trainBudget) {
                  return { today: [], queue: rot, active, stats: { fairnessScore: 100, maxDebt: 0, minDebt: 0, cycleDays: 0 } };
              }


              const activeIds = new Set(active.map(e => e.id));
              rot.queue = rot.queue.filter(id => activeIds.has(id));
              if (!rot.joinDates) rot.joinDates = {};

              for (const id of Object.keys(rot.joinDates)) {
                  if (!activeIds.has(id)) delete rot.joinDates[id];
              }
              for (const { id, emp } of active) {
                  if (!rot.queue.includes(id)) {
                      rot.queue.push(id);
                      if (!rot.joinDates[id]) {
                          const _dic = emp?.days_in_company;
                          const _empActualJoin = (_dic != null && _dic >= 0 && _dic < 3650)
                              ? new Date(Date.now() - _dic * 86400000).toISOString().slice(0, 10)
                              : today;
                          rot.joinDates[id] = (_empActualJoin > (rot.startDate || today))
                              ? _empActualJoin
                              : (rot.startDate || today);
                      }
                  }
              }

              if (!rot.startDate) {
                  const log = this.getTrainedLog();
                  let earliest = today;
                  for (const entries of Object.values(log)) {
                      for (const e of entries) {
                          if (e.date < earliest) earliest = e.date;
                      }
                  }
                  rot.startDate = earliest;
              }
              this.saveRotation(rot);

              const N          = active.length;
              let planRows     = [];
              let stats        = { fairnessScore: 100, maxDebt: 0, minDebt: 0, cycleDays: 0 };


              if (mode === 'priority') {

                  const sorted = [...active].sort((ae, be) => {
                      const getTierDist = (entry) => {
    const empObj   = entry.emp;
    const wsEff    = entry.wsEff;
    const totalEff = entry.totalEff;
    const _pos = typeName ? CompanyData.positions(typeName) : null;
    if (_pos) {
        const _res = PosNorm.resolve(empObj.position, _pos);
        if (_res) {
            const _pd = _res.data;
            const _sk = { man: 'manual_labor', int: 'intelligence', end: 'endurance' };
            const _ti = Calc.trainsToNextTier(
                wsEff, empObj[_sk[_pd.primary]] || 0, _pd.priReq,
                empObj[_sk[_pd.secondary]] || 0, _pd.secReq,
                totalEff, _pd.priGain, _pd.secGain
            );
            if (_ti !== null) return _ti.trains;
                    return 999;
                }
            }

            const tiers    = [50, 100, 150, 200];
            const nextTier = tiers.find(t => t > totalEff);
            if (!nextTier) return 999;
            return Math.ceil((nextTier - totalEff) / 37);
};
                      const ad = getTierDist(ae), bd = getTierDist(be);
                      if (ad !== bd) return ad - bd;
                      return ae.wsEff - be.wsEff;
                  });



                  const _usedTodayByAll  = active.reduce((sum, e) => sum + getLogged(e.id), 0);
                  const _remainingBudget = Math.max(0, trainBudget - _usedTodayByAll);

                const _maxPriPeople = _remainingBudget > 0 ? (_remainingBudget < 5 ? 1 : 2) : 0;
                const _priPeople = Math.min(_maxPriPeople, sorted.length);
                const _priBase   = _priPeople > 0 ? Math.floor(_remainingBudget / _priPeople) : 0;
                const _priExtra  = _priPeople > 0 ? _remainingBudget % _priPeople : 0;

                planRows = sorted.map((e, i) => {
                    const logged    = getLogged(e.id);
                    const share     = i < _priPeople ? (_priBase + (i < _priExtra ? 1 : 0)) : 0;
                    const planned   = share + logged;
                    const scheduled = planned > 0;
                    const done      = scheduled && logged >= planned;
                    return {
                        empId: e.id, name: e.name, planned, logged, done, scheduled,
                        wsEff: e.wsEff, totalEff: e.totalEff,
                        debt: 0, expected: planned, actualTotal: logged, isNext: false
                    };
                });
              }


else {


                const _resetDates = rot.resetDates || {};
                const allTimeCounts = {};
                for (const _aid of active.map(e => e.id)) {
                    allTimeCounts[_aid] = this.getEmpAllTimeCount(_aid, _resetDates[_aid] || rot.startDate || null);
                }






                const _contractTotals = {};
                for (const _cs of Storage.getTrainSales().filter(c => c.buyerEmpId && c.active === false && !c.deleted)) {
    const _csLog = this.getTrainedLog()[_cs.buyerEmpId] || [];
                    const _csSeen = new Set();
                    let _csCount = 0;
                    for (const _e of _csLog) {
                        if (!_e.date) continue;
                        if (_cs.startDate && _e.date < _cs.startDate) continue;
                        const _eKey = _e._logId || (_e.ts ? String(_e.ts) : null);
                        if (!_eKey) continue;
                        if (_csSeen.has(_eKey)) continue;
                        _csSeen.add(_eKey);
                        _csCount++;
                    }
                    _contractTotals[_cs.buyerEmpId] = (_contractTotals[_cs.buyerEmpId] || 0) + Math.min(_csCount, _cs.totalTrains || _csCount);
                }

const _settlingDays = Storage.getSettings().settlingInDays ?? 3;
                const enriched = active.map(e => {
                    const _rawJoinDate = (rot.joinDates && rot.joinDates[e.id]) || rot.startDate || today;
                    const rawEmpDays = this.daysSinceStart(_rawJoinDate);
                    const inSettling = rawEmpDays <= _settlingDays;
                    const rawActual = allTimeCounts[e.id] || 0;




                    const _settlingExitDate = new Date(new Date(_rawJoinDate + 'T00:00:00Z').getTime() + _settlingDays * 86400000).toISOString().slice(0, 10);
                    let _fairnessStartDate = _rawJoinDate > _settlingExitDate ? _rawJoinDate : _settlingExitDate;
                    const _empResetDate = _resetDates[e.id];
                    if (_empResetDate && _empResetDate > _fairnessStartDate) _fairnessStartDate = _empResetDate;
                    const fairnessDays = this.daysSinceStart(_fairnessStartDate);

                    const contractDone = _resetDates[e.id] ? 0 : (_contractTotals[e.id] || 0);
                    const actual = Math.max(0, rawActual - contractDone);
return { ...e, actual, rawActual, inSettling, _joinDays: fairnessDays };
                });

                let _settlingAutoApplied = false;
                enriched.forEach(e => {
                    if (!e.inSettling && !_resetDates[e.id] && !(rot.settlingHandled || {})[e.id]) {
                        if (!rot.resetDates) rot.resetDates = {};
                        if (!rot.settlingHandled) rot.settlingHandled = {};
                        rot.resetDates[e.id] = today;
                        rot.settlingHandled[e.id] = true;
                        e.actual = 0;
                        _settlingAutoApplied = true;
                    }
                });
                if (_settlingAutoApplied) this.saveRotation(rot);

                const activeForAlloc = enriched.filter(e => !e.inSettling);
                const avgTrains = activeForAlloc.length > 0
                    ? activeForAlloc.reduce((s, e) => s + e.actual, 0) / activeForAlloc.length
                    : 0;



                const _tenureTotalDays   = activeForAlloc.reduce((s, e) => s + Math.max(1, e._joinDays), 0);
                const _tenureTotalTrains = activeForAlloc.reduce((s, e) => s + e.actual, 0);
                const avgDailyRate = _tenureTotalDays > 0 ? _tenureTotalTrains / _tenureTotalDays : 0;
                enriched.forEach(e => {
                    e.expected = avgDailyRate * Math.max(1, e._joinDays);
                });


                const plannedMap = {};
                for (const e of enriched) plannedMap[e.id] = 0;

                for (let i = 0; i < trainBudget; i++) {
                    activeForAlloc.sort((a, b) => {
                        const aEff = (a.actual + plannedMap[a.id]) - a.expected;
                        const bEff = (b.actual + plannedMap[b.id]) - b.expected;
                        if (aEff !== bEff) return aEff - bEff;
                        return a.totalEff - b.totalEff;
                    });
                    if (activeForAlloc.length > 0) plannedMap[activeForAlloc[0].id] += 1;
                }


                planRows = enriched.map(e => {
                    const planned   = plannedMap[e.id] || 0;
                    const logged    = getLogged(e.id);
                    const scheduled = planned > 0;
                    const done      = scheduled && logged >= planned;
                    const deficit   = e.expected - e.actual;
                    return {
                        empId: e.id, name: e.name, planned, logged, done, scheduled,
                        wsEff: e.wsEff, totalEff: e.totalEff,
                        debt: deficit, expected: e.expected, actualTotal: e.actual,
                        isNext: false, inSettling: e.inSettling || false
                    };
                }).sort((a, b) => b.planned - a.planned || b.debt - a.debt);


                const _allCounts = enriched.filter(e => !e.inSettling).map(e => e.actual);
                const _maxC = _allCounts.length ? Math.max(..._allCounts) : 0;
                const _minC = _allCounts.length ? Math.min(..._allCounts) : 0;
                const countSpread = Math.max(0, _maxC - _minC);
                const fairnessScore = Math.max(0, Math.min(100, Math.round(100 - (countSpread * 2))));

                stats = {
                    fairnessScore,
                    maxDebt: Number((_maxC - avgTrains).toFixed(2)),
                    minDebt: Number((_minC - avgTrains).toFixed(2)),
                    cycleDays: 0,
                    startDate: null
                };
            }




              const _schedCfg = Storage.getScheduleConfig();
              if (_schedCfg.enabled && planRows.length > 1) {
                  const _schedOvr   = Storage.getScheduleOverrides();
                  const _cycleDays  = _schedCfg.cycleDays || 7;
                  const _cycleStart = _schedCfg.cycleStartDate || rot.startDate || today;
                  const _defaultTarget = N > 0 ? (trainBudget / N) * _cycleDays : 0;

                  planRows = planRows.map(row => {
                      const _ov = _schedOvr[row.empId] || {};
                      if (_ov.locked) return { ...row, _schedDev: 0 };
                      const _target = _ov.trainsPerCycle ?? _defaultTarget;
                      const _dev = Storage.getScheduleDeviation(row.empId, _target, _cycleStart, _cycleDays);
                      return { ...row, _schedDev: _dev.deviation, _schedExpected: _dev.expected, _schedActual: _dev.actual };
                  });

                  if (_schedCfg.mode === 'strict') {

                      const _schedActive2 = planRows.filter(r => !(_schedOvr[r.empId]?.locked));
                      const _plannedNew   = {};
                      _schedActive2.forEach(e => { _plannedNew[e.empId] = 0; });

                      for (let _t = 0; _t < trainBudget; _t++) {
                          _schedActive2.sort((a, b) => {
                              const ad = (a._schedDev || 0) - _plannedNew[a.empId];
                              const bd = (b._schedDev || 0) - _plannedNew[b.empId];
                              if (Math.abs(bd - ad) > 0.001) return bd - ad;
                              return (a._schedActual || 0) - (b._schedActual || 0);
                          });
                          if (_schedActive2.length > 0) _plannedNew[_schedActive2[0].empId] += 1;
                      }

                      planRows = planRows.map(row => {
                          if (_schedOvr[row.empId]?.locked) {
                              return { ...row, planned: 0, scheduled: false, done: false };
                          }
                          const _np     = _plannedNew[row.empId] ?? 0;
                          const _logged = getLogged(row.empId);
                          return {
                              ...row,
                              planned:   _np,
                              logged:    _logged,
                              done:      _np > 0 && _logged >= _np,
                              scheduled: _np > 0
                          };
                      }).sort((a, b) => b.planned - a.planned || (b._schedDev || 0) - (a._schedDev || 0));
                  } else {

                      planRows = planRows.sort((a, b) => {
                          if (b.planned !== a.planned) return b.planned - a.planned;
                          const devDiff = (b._schedDev || 0) - (a._schedDev || 0);
                          if (Math.abs(devDiff) > 0.1) return devDiff;
                          return (b.debt || 0) - (a.debt || 0);
                      });
                  }
              }

              let foundNext = false;
              planRows.forEach(e => {
                  if (!foundNext && e.scheduled && !e.done) { e.isNext = true; foundNext = true; }
                  else e.isNext = false;
              });

              return { today: planRows, queue: rot, active, stats };
          },

          getSnapshots() {
              const gmSnaps = this.get('snapshots', null);
              if (gmSnaps !== null) return gmSnaps;

              try {
                  const lsRaw = localStorage.getItem('TCM_snapshots_mirror');
                  if (lsRaw) {
                      const parsed = JSON.parse(lsRaw);
                      if (Array.isArray(parsed) && parsed.length) {
                          console.log(`[TCM] Restored ${parsed.length} snapshots from localStorage mirror.`);
                          this.set('snapshots', parsed);
                          return parsed;
                      }
                  }
              } catch (e) {}
              return [];
          },
          saveSnapshot(snap) {
              const snaps = this.getSnapshots();
              const idx = snaps.findIndex(s => s.date === snap.date);
              if (idx >= 0) {



                  const now = new Date();
                  const tcTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

                  const utcHour = now.getUTCHours();
                  const postReset = utcHour >= 18;
                  if (!postReset) return;
                  snaps[idx] = snap;
              } else {
                  snaps.push(snap);
              }
              if (snaps.length > 365) snaps.splice(0, snaps.length - 365);
              this.set('snapshots', snaps);

              try { localStorage.setItem('TCM_snapshots_mirror', JSON.stringify(snaps)); } catch (e) {}
          },

          getTrainedLog() { return this.get('trained_log', {}); },



          getProcessedLogIds() { return this.get('processed_log_ids', []); },
  saveProcessedLogIds(ids) { this.set('processed_log_ids', ids); },


          trimStorage() {
              try {
                  const TRAIN_CUTOFF_MS  = 180 * 24 * 60 * 60 * 1000;
                  const BENCH_STALE_MS   =  30 * 24 * 60 * 60 * 1000;
                  const PARTIAL_STALE_MS =       24 * 60 * 60 * 1000;
                  const now = Date.now();


                  const log = this.get('trained_log', {});
                  let logChanged = false;
                  for (const empId of Object.keys(log)) {
                      const before = log[empId].length;
                      log[empId] = log[empId].filter(e => {
                          if (!e.date) return true;
                          return (now - new Date(e.date + 'T00:00:00Z').getTime()) < TRAIN_CUTOFF_MS;
                      });
                      if (log[empId].length !== before) logChanged = true;
                      if (!log[empId].length) { delete log[empId]; logChanged = true; }
                  }
                  if (logChanged) this.set('trained_log', log);


                  const snaps = this.get('snapshots', null);
                  if (Array.isArray(snaps)) {
                      const cutoffDate = new Date(now - TRAIN_CUTOFF_MS).toISOString().slice(0, 10);
                      const trimmed = snaps.filter(s => (s.date || '') >= cutoffDate);
                      if (trimmed.length !== snaps.length) {
                          this.set('snapshots', trimmed);
                          try { localStorage.setItem('TCM_snapshots_mirror', JSON.stringify(trimmed)); } catch(_e) {}
                      }
                  }



                  const benchAll = this.get('benchmark_cache_v2', {});
                  const _benchKeys = ['same_0','same_1','above_0','above_1','top_0','top_1'];
                  let benchChanged = false;

                  let _newestKey = null, _newestTs = 0;
                  for (const _bk of _benchKeys) {
                      if (benchAll[_bk] && (benchAll[_bk].ts || 0) > _newestTs) {
                          _newestTs = benchAll[_bk].ts || 0;
                          _newestKey = _bk;
                      }
                  }
                  for (const _bk of _benchKeys) {
                      const _isStale = benchAll[_bk] && (now - (benchAll[_bk].ts || 0)) > BENCH_STALE_MS;
                      const _isOld   = benchAll[_bk] && _bk !== _newestKey && (now - (benchAll[_bk].ts || 0)) > 3600000;
                      if (_isStale || _isOld) {
                          delete benchAll[_bk];
                          this.set('bench_rosters_' + _bk, null);
                          benchChanged = true;
                      }
                  }
                  if (benchChanged) this.set('benchmark_cache_v2', benchAll);


                  const partial = this.get('benchmark_partial', null);
                  if (partial && (now - (partial.ts || 0)) > PARTIAL_STALE_MS) {
                      this.set('benchmark_partial', null);
                      this.set('bench_partial_rosters', null);
                  }


                  const ids = this.get('processed_log_ids', []);
                  if (ids.length > 1000) this.set('processed_log_ids', ids.slice(-1000));

                  console.log('[TCM] Storage trim complete.');
              } catch(e) {
                  console.warn('[TCM] Storage trim error:', e);
              }
          },
getLastCompanyId() { return this.get('last_company_id', null); },
  setLastCompanyId(id) { this.set('last_company_id', String(id || '')); },


getKnownEmployeeNames() { return this.get('known_employee_names', {}); },
  rememberEmployeeNames(nameMap) {
      const known = this.getKnownEmployeeNames();
      let changed = false;
      for (const [id, name] of Object.entries(nameMap || {})) {
          if (name && known[id] !== name) { known[id] = name; changed = true; }
      }
      if (changed) this.set('known_employee_names', known);
  },
  getLastLogSyncTs() { return this.get('last_log_sync_ts', 0); },
  setLastLogSyncTs(ts) { this.set('last_log_sync_ts', ts || Date.now()); },




importUserTrainingLog(logData, knownEmployeeIds, employeeNameMap, companyId) {




              let logEntries = [];
              if (!logData?.log) return 0;
              if (Array.isArray(logData.log)) {
                  logEntries = logData.log;
              } else if (typeof logData.log === 'object') {
                  logEntries = Object.values(logData.log);
              }
              if (!logEntries.length) return 0;

const processedIds = this.getProcessedLogIds();
              const processed    = new Set(processedIds);
              const currentLog   = this.getTrainedLog();
              const knownNames   = this.getKnownEmployeeNames();
              const compId       = companyId ? String(companyId) : null;
              let count = 0;

              for (const entry of logEntries) {
                  const logId      = String(entry.id || '');
                  const receiverId = String(entry.data?.receiver || '');
                  if (!receiverId) continue;
                  if (logId && processed.has(logId)) continue;
                  if (compId && String(entry.data?.company || '') !== compId) continue;

                  const existingEntry = (currentLog[receiverId] || []).find(e => e.name);
                  const empName = (employeeNameMap && employeeNameMap[receiverId])
                      || entry.data?.receiver_name
                      || existingEntry?.name
                      || knownNames[receiverId]
                      || `Employee #${receiverId}`;
                  const ts      = entry.timestamp;


                  let statsGained = null;
                  const raw = entry.data?.working_stats_received || '';
                  if (raw) {
                      const parts = raw.split(',');
                      statsGained = {
                          man: parseInt(parts[0]) || 0,
                          int: parseInt(parts[1]) || 0,
                          end: parseInt(parts[2]) || 0
                      };
                  }

                  const statsWithId = statsGained ? { ...statsGained, _logId: logId } : (logId ? { _logId: logId } : null);
                  this.logTrained(receiverId, empName, ts, statsWithId);
                  if (logId) { processed.add(logId); count++; }
              }

              this.saveProcessedLogIds([...processed].slice(-500));
              return count;
          },




          logTrained(empId, empName, ts, statsGained) {
              const log  = this.getTrainedLog();
              const date = ts
                  ? new Date(ts * 1000).toISOString().slice(0, 10)
                  : new Date().toISOString().slice(0, 10);
              if (!log[empId]) log[empId] = [];
              if (ts) {
                      const tsMs = ts * 1000;
                      const logId = statsGained?._logId || null;


                      const isDup = logId
    ? (log[empId].find(e => e._logId === logId) ||
       log[empId]
               .filter(e => !e._logId && !e.stats && e.date === date && Math.abs(e.ts - tsMs) <= 30000)
           .sort((a, b) => Math.abs(a.ts - tsMs) - Math.abs(b.ts - tsMs))[0])
    : log[empId].find(e => e.date === date && e.ts === tsMs);
                      if (!isDup) {
                          const entry = { date, ts: tsMs, name: empName };
                          if (statsGained) { entry.stats = statsGained; if (logId) entry._logId = logId; }
                          log[empId].push(entry);
                      } else if (logId && !isDup._logId) {

                          isDup._logId = logId;
                          if (statsGained && !isDup.stats) isDup.stats = statsGained;
                      }
              } else {

                  log[empId].push({ date, name: empName || '' });
              }

              if (log[empId].length > 365) log[empId].splice(0, log[empId].length - 365);
              this.set('trained_log', log);
          },

getEmpTrainLog(empId) {
              return (this.getTrainedLog()[empId] || []);
          },




          removeTrainedEntry(empId, date, count) {
              const log = this.getTrainedLog();
              if (!log[empId]) return 0;
              const seenKeys = new Set();
              const uniqueIdx = [];
              log[empId].forEach((e, idx) => {
                  if (e.date !== date || !e.ts) return;
                  const key = e._logId || e.ts;
                  if (seenKeys.has(key)) return;
                  seenKeys.add(key);
                  uniqueIdx.push(idx);
              });
              uniqueIdx.sort((a, b) => (log[empId][b].ts || 0) - (log[empId][a].ts || 0));
              const toRemove = uniqueIdx.slice(0, Math.max(1, count || 1));
              const toRemoveSet = new Set(toRemove);
              log[empId] = log[empId].filter((e, idx) => !toRemoveSet.has(idx));
              if (!log[empId].length) delete log[empId];
              this.set('trained_log', log);
              return toRemove.length;
          },






          tornDayStart() {
              const now = new Date();
              const d   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0));
              if (now.getUTCHours() < 18) d.setUTCDate(d.getUTCDate() - 1);
              return d.getTime();
          },
          getTrainedOnDate(date) {
              const log = this.getTrainedLog();
              const result = [];
              for (const [empId, entries] of Object.entries(log)) {
                  const seenKeys = new Set();
              for (const e of entries) {
                  if (e.date !== date || !e.ts) continue;
                  const key = e._logId || e.ts;
                  if (seenKeys.has(key)) continue;
                  seenKeys.add(key);
                  result.push({ empId, ...e });
              }
              }
              return result;
          },
getTodayTrained() {
              return this.getTrainedOnDate(new Date().toISOString().slice(0, 10));
          },

          getTrainSummary(sinceDate) {
              const log = this.getTrainedLog();
              const summary = {};
              for (const [empId, entries] of Object.entries(log)) {
                  const allFiltered = sinceDate ? entries.filter(e => e.date >= sinceDate) : entries;

          const seenKeys = new Set();
          const filtered = allFiltered.filter(e => {
              if (!e.ts) return true;
              const key = e._logId || e.ts;
              if (seenKeys.has(key)) return false;
              seenKeys.add(key);
              return true;
          });
          if (filtered.length > 0) {
              const lastEntry = filtered.reduce((max, e) => e.date > max.date ? e : max, filtered[0]);
              summary[empId] = {
                  name: lastEntry.name,
                  count: filtered.length,
                  lastTrained: lastEntry.date,
                  entries: filtered
              };
          }
             }
              return summary;
          },




          getEmpAllTimeCount(empId, sinceDate) {
              const entries = (this.getTrainedLog()[empId] || [])
                  .filter(e => e.ts && (!sinceDate || e.date >= sinceDate));
              const seen = new Set();
              return entries.filter(e => {
                  const key = e._logId || e.ts;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
              }).length;
          },

          getTrainSales() { return this.get('train_sales', []); },
          saveTrainSales(sales) { this._simSchedCache = null; this.set('train_sales', sales); },
          /**
           * One-time upgrade path: ensure every contract has a durable payments array
           * (migrates legacy prepaidAmount) so history survives the new sync logic.
           * Does not stamp updatedAt — migration must not make one device "win".
           */
          migrateContractPayments() {
              try {
                  if (this.get('payments_migrated_v', '') === '10.10.3') return;
                  const sales = this.getTrainSales();
                  if (!Array.isArray(sales) || !sales.length) {
                      this.set('payments_migrated_v', '10.10.3');
                      return;
                  }
                  let changed = false;
                  for (const c of sales) {
                      if (!c || !c.id) continue;
                      const pays = this.getContractPayments(c);
                      const hadArray = Array.isArray(c.payments) && c.payments.length > 0;
                      if (!hadArray && pays.length) {
                          c.payments = pays;
                          c.prepaidAmount = pays.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                          changed = true;
                      } else if (hadArray) {
                          // Normalize missing ids so future unions are stable
                          const normalized = pays;
                          const needs = normalized.some((p, i) => !c.payments[i] || String(c.payments[i].id) !== String(p.id));
                          if (needs) {
                              c.payments = normalized;
                              c.prepaidAmount = normalized.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                              changed = true;
                          }
                      }
                  }
                  if (changed) this.saveTrainSales(sales);
                  this.set('payments_migrated_v', '10.10.3');
              } catch (e) {
                  console.warn('[TCM] migrateContractPayments failed', e);
              }
          },
          getPaidContracts() { return this.get('paid_contracts', []); },
          savePaidContract(c) {
              const all = this.getPaidContracts();
              all.push(c);
              this.set('paid_contracts', all);
          },
          /** Normalize payments on a contract (migrates legacy prepaidAmount). */
          getContractPayments(c) {
              if (!c) return [];
              if (Array.isArray(c.payments) && c.payments.length) {
                  return c.payments.map(p => ({
                      id: p.id || ('p_' + (p.ts || p.date || Math.random())),
                      amount: Number(p.amount) || 0,
                      date: p.date || c.startDate || '',
                      note: p.note || '',
                      ts: p.ts || 0
                  })).filter(p => p.amount > 0);
              }
              if (Number(c.prepaidAmount) > 0) {
                  return [{
                      id: 'prepaid',
                      amount: Number(c.prepaidAmount) || 0,
                      date: c.startDate || '',
                      note: 'Prepaid at start',
                      ts: 0
                  }];
              }
              return [];
          },
          contractAmountPaid(c) {
              return this.getContractPayments(c).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          },
          isOpenEndedContract(c) {
              if (!c) return false;
              if (c.openEnded === true) return true;
              if (c.openEnded === false) return false;
              const t = Number(c.totalTrains);
              return !(t > 0);
          },
          /** Complimentary trains — tracked for delivery, $0 on balance / finance. */
          isFreeContract(c) {
              if (!c) return false;
              if (c.isFree === true || c.free === true) return true;
              if (c.isFree === false) return false;
              return false;
          },
          /** Complimentary train allowance (first N delivered trains are $0). Infinity if fully free. */
          getFreeAllowance(c) {
              if (!c) return 0;
              if (this.isFreeContract(c)) return Infinity;
              const n = Math.floor(Number(c.freeTrains) || 0);
              return n > 0 ? n : 0;
          },
          /** Delivered trains that bill at pricePerTrain (after free allowance). */
          billableTrainsDone(c, done) {
              const free = this.getFreeAllowance(c);
              if (!isFinite(free)) return 0;
              return Math.max(0, (Number(done) || 0) - free);
          },
          /** Free trains already consumed from the allowance. */
          freeTrainsUsed(c, done) {
              const free = this.getFreeAllowance(c);
              if (!isFinite(free)) return Number(done) || 0;
              if (free <= 0) return 0;
              return Math.min(free, Number(done) || 0);
          },
          /** YYYY-MM-DD day difference (b - a), UTC. */
          daysBetweenIso(a, b) {
              if (!a || !b) return 0;
              const pa = String(a).slice(0, 10).split('-').map(Number);
              const pb = String(b).slice(0, 10).split('-').map(Number);
              const da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
              const db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
              return Math.round((db - da) / 86400000);
          },
          addDaysIso(iso, days) {
              const p = String(iso).slice(0, 10).split('-').map(Number);
              const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
              d.setUTCDate(d.getUTCDate() + (Number(days) || 0));
              return d.toISOString().slice(0, 10);
          },
          countContractTrainsDone(c, log) {
              if (!c || !c.buyerEmpId) return 0;
              const start = c.startDate || '';
              const raw = (log && log[c.buyerEmpId]) || [];
              const seen = new Set();
              let n = 0;
              for (const e of raw) {
                  if (!e || !e.ts) continue;
                  if (start && e.date < start) continue;
                  const k = e._logId || e.ts;
                  if (seen.has(k)) continue;
                  seen.add(k);
                  n++;
              }
              return n;
          },
          /**
           * How many trains this contract reserves on dateStr (0 if inactive that day).
           * Fixed contracts stop reserving once their total is projected complete.
           */
          contractReservationOnDate(c, dateStr, log) {
              const day = String(dateStr || '').slice(0, 10);
              if (!c || !day) return 0;
              if (c.active === false || c.deleted) return 0;

              // Prefer shared schedule simulator (handles open-ended, partial last day, one-shot)
              const today = new Date().toISOString().slice(0, 10);
              if (day >= today) {
                  try {
                      const state = (typeof UI !== 'undefined' && UI.state) ? UI.state : {};
                      const horizon = Math.max(1, this.daysBetweenIso(today, day) + 1);
                      const sim = this.simulateBuyerSchedule(state, {
                          horizon,
                          fromDate: today,
                          log: log || this.getTrainedLog()
                      });
                      const row = sim.days.find(r => r.date === day);
                      if (!row) return 0;
                      const hit = (row.allocs || []).find(a => String(a.id) === String(c.id));
                      return hit ? (hit.trains || 0) : 0;
                  } catch (e) {
                      console.warn('[TCM] contractReservationOnDate sim failed', e);
                  }
              }

              // Historical fallback
              const start = (c.startDate || '').slice(0, 10);
              if (start && day < start) return 0;
              let res = Number(c.dailyReservation) || 0;
              const openEnded = this.isOpenEndedContract(c);
              if (openEnded) return res > 0 ? res : 0;
              const total = Number(c.totalTrains) || 0;
              if (total <= 0) return 0;
              if (res <= 0) res = total;
              const idx = start ? this.daysBetweenIso(start, day) : 0;
              if (idx < 0) return 0;
              const before = idx * res;
              if (before >= total) return 0;
              return Math.min(res, total - before);
          },
          /**
           * Day-by-day buyer allocations from today (UTC/TCT date).
           * Same rules as the Train Sales 7-day schedule table.
           * opts.excludeId — omit a contract (when editing its reservation)
           * opts.horizon — number of days (default 14)
           * opts.fromDate — start simulation on this YYYY-MM-DD (default today UTC)
           */
          simulateBuyerSchedule(state, opts) {
              opts = opts || {};
              const log = opts.log || this.getTrainedLog();
              const excludeId = opts.excludeId;
              const horizon = Math.max(1, Math.min(60, Number(opts.horizon) || 14));
              const fromDate = (opts.fromDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
              // Short TTL cache — freeTrainsOnDate / 7-day UI often re-sim the same window
              const _ck = [fromDate, horizon, excludeId || '', (this.getTrainSales() || []).length].join('|');
              const _now = Date.now();
              if (this._simSchedCache && this._simSchedCache.key === _ck && (_now - this._simSchedCache.ts) < 2500) {
                  return this._simSchedCache.value;
              }
              const { base } = this.dailyTrainBudget(state);

              // Include any active contract with remaining work OR a daily reservation.
              // (Previously required dailyReservation > 0, so fixed deals with only total trains never appeared.)
              const sales = (this.getTrainSales() || []).filter(c => {
                  if (!c || c.active === false || c.deleted) return false;
                  if (excludeId && String(c.id) === String(excludeId)) return false;
                  const res = Number(c.dailyReservation) || 0;
                  if (res > 0) return true;
                  if (this.isOpenEndedContract(c)) return false; // open-ended needs a daily rate
                  const total = Number(c.totalTrains) || 0;
                  if (total <= 0) return false;
                  const done = this.countContractTrainsDone(c, log);
                  return (total - done) > 0;
              });

              const simLeft = {};
              const simDaily = {};
              for (const c of sales) {
                  const res = Number(c.dailyReservation) || 0;
                  if (this.isOpenEndedContract(c)) {
                      simLeft[c.id] = Infinity;
                      simDaily[c.id] = res; // must be > 0 to be in sales
                  } else {
                      const total = Number(c.totalTrains) || 0;
                      const done = this.countContractTrainsDone(c, log);
                      const left = Math.max(0, total - done);
                      simLeft[c.id] = left;
                      // No daily rate set → deliver remaining on the start day (one-shot)
                      simDaily[c.id] = res > 0 ? res : left;
                  }
              }

              const days = [];
              for (let i = 0; i < horizon; i++) {
                  const dayIso = this.addDaysIso(fromDate, i);
                  const allocs = [];
                  for (const c of sales) {
                      const st = (c.startDate || '').slice(0, 10);
                      if (st && dayIso < st) continue;
                      const left = simLeft[c.id];
                      if (!(left > 0)) continue;
                      const res = Number(simDaily[c.id]) || 0;
                      if (res <= 0) continue;
                      const trains = left === Infinity ? res : Math.min(res, left);
                      if (trains <= 0) continue;
                      allocs.push({
                          id: c.id,
                          name: c.buyerName || c.buyerEmpId,
                          trains,
                          openEnded: this.isOpenEndedContract(c)
                      });
                      if (simLeft[c.id] !== Infinity) {
                          simLeft[c.id] = Math.max(0, simLeft[c.id] - trains);
                      }
                  }
                  const usedByBuyers = allocs.reduce((s, a) => s + a.trains, 0);
                  days.push({
                      date: dayIso,
                      usedByBuyers,
                      rotationTrains: Math.max(0, base - usedByBuyers),
                      free: Math.max(0, base - usedByBuyers),
                      reserved: usedByBuyers,
                      allocs
                  });
              }
              const _out = { base, fromDate, days };
              this._simSchedCache = { key: _ck, ts: Date.now(), value: _out };
              return _out;
          },
          reservedTrainsOnDate(dateStr, opts) {
              opts = opts || {};
              const day = String(dateStr || '').slice(0, 10);
              if (!day) return 0;
              const today = new Date().toISOString().slice(0, 10);
              // Simulate from today through the target date (or from target if in the past — still from today with remaining)
              if (day < today) {
                  // Past: walk each contract individually
                  const log = opts.log || this.getTrainedLog();
                  const excludeId = opts.excludeId;
                  let sum = 0;
                  for (const c of (this.getTrainSales() || [])) {
                      if (excludeId && String(c.id) === String(excludeId)) continue;
                      sum += this.contractReservationOnDate(c, day, log);
                  }
                  return sum;
              }
              const state = opts.state || (typeof UI !== 'undefined' ? UI.state : null) || {};
              const horizon = Math.max(1, this.daysBetweenIso(today, day) + 1);
              const sim = this.simulateBuyerSchedule(state, {
                  excludeId: opts.excludeId,
                  horizon,
                  fromDate: today,
                  log: opts.log
              });
              const row = sim.days.find(d => d.date === day);
              return row ? row.usedByBuyers : 0;
          },
          freeTrainsOnDate(dateStr, state, opts) {
              opts = opts || {};
              const day = String(dateStr || '').slice(0, 10);
              const { base, stars, trainerBonus } = this.dailyTrainBudget(state);
              const today = new Date().toISOString().slice(0, 10);
              if (day && day >= today) {
                  const horizon = Math.max(1, this.daysBetweenIso(today, day) + 1);
                  const sim = this.simulateBuyerSchedule(state, {
                      excludeId: opts.excludeId,
                      horizon,
                      fromDate: today,
                      log: opts.log
                  });
                  const row = sim.days.find(d => d.date === day);
                  const reserved = row ? row.usedByBuyers : 0;
                  return {
                      base,
                      stars,
                      trainerBonus,
                      reserved,
                      free: Math.max(0, base - reserved),
                      allocs: row ? row.allocs : []
                  };
              }
              const reserved = this.reservedTrainsOnDate(day, Object.assign({}, opts, { state }));
              return {
                  base,
                  stars,
                  trainerBonus,
                  reserved,
                  free: Math.max(0, base - reserved),
                  allocs: []
              };
          },
          dailyTrainBudget(state) {
              const stars = parseInt(state?.profile?.rating || 0, 10) || 0;
              const positions = (typeof CompanyData !== 'undefined' && CompanyData.positions)
                  ? (CompanyData.positions(state?.typeName) || {})
                  : {};
              let trainerBonus = 0;
              for (const emp of Object.values(state?.employees || {})) {
                  const res = (typeof PosNorm !== 'undefined' && PosNorm.resolve)
                      ? PosNorm.resolve(emp.position, positions)
                      : null;
                  if (res?.data?.special === 'trainer') {
                      const eff = emp.effectiveness?.working_stats || 0;
                      if (typeof TCM !== 'undefined') {
                          if (eff >= TCM.EE_TIER_4) trainerBonus += 3;
                          else if (eff >= TCM.EE_TIER_3) trainerBonus += 2;
                          else if (eff >= TCM.EE_TIER_2) trainerBonus += 1;
                      }
                  }
              }
              const base = Math.min(20, Math.max(0, stars)) + trainerBonus;
              return { base, stars, trainerBonus };
          },
          freeTrainsOnDate(dateStr, state, opts) {
              const { base, stars, trainerBonus } = this.dailyTrainBudget(state);
              const reserved = this.reservedTrainsOnDate(dateStr, opts);
              return {
                  base,
                  stars,
                  trainerBonus,
                  reserved,
                  free: Math.max(0, base - reserved)
              };
          },

  getOverrides() { return this.get('overrides', {}); },


          getBenchmarkCache(category, sameSize) {
      const all = this.get('benchmark_cache_v2', {});
      if (category !== undefined) {
          const key = category + '_' + (sameSize ? '1' : '0');
          const altKey = category + '_' + (sameSize ? '0' : '1');
          let cache = all[key] || all[category] || null;
          // Fallback: other sameSize variant for this category (still useful for Employee Stats)
          if (!cache && all[altKey]) cache = all[altKey];
          if (!cache) return null;

          const tryRoster = (k) => {
              const r = this.get('bench_rosters_' + k, {});
              return r && typeof r === 'object' && Object.keys(r).length ? r : null;
          };
          if (!cache.companyData || !Object.keys(cache.companyData).length) {
              cache.companyData = tryRoster(key) || tryRoster(altKey) || tryRoster(category) || {};
          }
          // Ensure companies map uses string keys for roster lookups
          if (cache.companies && typeof cache.companies === 'object') {
              const norm = {};
              for (const [cid, meta] of Object.entries(cache.companies)) {
                  norm[String(cid)] = meta;
              }
              cache.companies = norm;
          }
          console.log(`[TCM] getBenchmarkCache: key="${key}" companies=${Object.keys(cache.companies||{}).length} rosters=${Object.keys(cache.companyData||{}).length} age=${Math.round((Date.now()-(cache.ts||0))/60000)}m`);
          return cache;
      }

      const entries = Object.entries(all);
      if (!entries.length) return null;
      return entries.sort(([, a], [, b]) => (b.ts || 0) - (a.ts || 0))[0][1];
  },
          saveBenchmarkCache(data) {
      const all = this.get('benchmark_cache_v2', {});
      const key = data.filter + '_' + (data.sameSize ? '1' : '0');
      const { companyData, ...slimData } = data;
      all[key] = slimData;
      this.set('benchmark_cache_v2', all);
      this.set('bench_rosters_' + key, companyData || {});
      console.log(`[TCM] saveBenchmarkCache: key="${key}" companies=${Object.keys(slimData.companies||{}).length} rosters=${Object.keys(companyData||{}).length} totalCos=${slimData.totalCos}`);
  },
          getBenchmarkPartial() {
      const partial = this.get('benchmark_partial', null);
      if (!partial) return null;
      if (!partial.companyData || !Object.keys(partial.companyData).length) {
          partial.companyData = this.get('bench_partial_rosters', {});
      }
      console.log(`[TCM] getBenchmarkPartial: done=${partial.done}/${partial.total} rosters=${Object.keys(partial.companyData||{}).length}`);
      return partial;
  },
  saveBenchmarkPartial(data) {
      const { companyData, ...slim } = data;
      this.set('benchmark_partial', slim);
      this.set('bench_partial_rosters', companyData || {});
  },
  clearBenchmarkPartial() {
      this.set('benchmark_partial', null);
      this.set('bench_partial_rosters', null);
  },
          deleteBenchmarkCache(category, sameSize) {
      const all = this.get('benchmark_cache_v2', {});
      const key = category + '_' + (sameSize ? '1' : '0');
      delete all[key];
      delete all[category];
      this.set('benchmark_cache_v2', all);
      this.set('bench_rosters_' + key, null);
      this.set('bench_rosters_' + category, null);
  },


          getRolePlannerConfig() { return this.get('role_planner_cfg', { roles: [], mode: 'priority' }); },
          saveRolePlannerConfig(c) { this.set('role_planner_cfg', c); },
          getStockPerf() { return this.get('stock_perf', []); },
          saveStockPerfEntry(entry) {
              let arr = this.getStockPerf();

              const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
              arr = arr.filter(e => e.date >= cutoff);
              const idx = arr.findIndex(e => e.date === entry.date);
              if (idx >= 0) arr[idx] = entry; else arr.push(entry);
              arr.sort((a, b) => a.date.localeCompare(b.date));
              this.set('stock_perf', arr);
          },


          getPricingExperiments() { return this.get('pricing_experiments', []); },
          savePricingExperiment(exp) {
              const all = this.getPricingExperiments();
              const idx = all.findIndex(e => e.id === exp.id);
              if (idx >= 0) all[idx] = exp; else all.push(exp);
              this.set('pricing_experiments', all);
          },
          deletePricingExperiment(id) {
              this.set('pricing_experiments', this.getPricingExperiments().filter(e => e.id !== id));
          },
          getActiveExperiment() {
              return this.getPricingExperiments().find(e => e.status === 'active') || null;
          },
          calcExperimentMetrics(exp) {
              const snaps = this.getSnapshots().filter(s =>
                  s.date >= exp.startDate && (!exp.endDate || s.date <= exp.endDate)
              );
              if (!snaps.length) return { days: 0, totalRevenue: 0, totalProfit: 0, avgRevenue: 0, avgProfit: 0, avgPopularity: 0, avgEfficiency: 0 };
              const days = snaps.length;
              const totalRevenue  = snaps.reduce((s, n) => s + (n.daily      || 0), 0);
              const totalProfit   = snaps.reduce((s, n) => s + (n.netProfit  || 0), 0);
              const avgPopularity = Math.round(snaps.reduce((s, n) => s + (n.popularity  || 0), 0) / days);
              const avgEfficiency = Math.round(snaps.reduce((s, n) => s + (n.efficiency  || 0), 0) / days);
              return {
                  days, totalRevenue, totalProfit,
                  avgRevenue:    Math.round(totalRevenue / days),
                  avgProfit:     Math.round(totalProfit  / days),
                  avgPopularity, avgEfficiency
              };
          },

          getPriceHistory() { return this.get('price_history', []); },
savePriceHistoryEntry(entry) {
    let arr = this.getPriceHistory();
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    arr = arr.filter(e => !(e.typeId === entry.typeId && e.date < cutoff));
    const idx = arr.findIndex(e => e.date === entry.date && e.typeId === entry.typeId);
    if (idx >= 0) {
        const existing = arr[idx];
        const mergedItems = {};
        Object.entries(entry.items || {}).forEach(([name, newItem]) => {
            const oldItem = existing.items?.[name];
            if (oldItem && oldItem.price > 0) {
                const price  = oldItem.price;
                const rrpPct = oldItem.rrpPct;
                const cost   = newItem.cost || oldItem.cost;
                const sold   = newItem.sold || 0;
                mergedItems[name] = {
                    ...newItem,
                    price, rrpPct, cost,
                    profit:  (price - cost) * sold,
                    revenue: price * sold,
                    _currentPrice: newItem.price !== price ? newItem.price : undefined
                };
            } else {
                mergedItems[name] = newItem;
            }
        });
        arr[idx] = { ...entry, items: mergedItems };
    } else {
        arr.push(entry);
    }
    arr.sort((a, b) => a.date.localeCompare(b.date));
    this.set('price_history', arr);
},
          getActivePriceExperiment() { return this.get('active_price_experiment', null); },
          saveActivePriceExperiment(exp) { this.set('active_price_experiment', exp); },
          clearActivePriceExperiment() { this.set('active_price_experiment', null); },
          getPriceExperimentHistory() { return this.get('price_experiment_history', []); },
          savePriceExperimentToHistory(exp) {
              const arr = this.getPriceExperimentHistory();
              const idx = arr.findIndex(e => e.id === exp.id);
              if (idx >= 0) arr[idx] = exp; else arr.unshift(exp);
              if (arr.length > 20) arr.splice(20);
              this.set('price_experiment_history', arr);
          },
          analyzeBestRrp(typeId) {
              const history = this.getPriceHistory().filter(e => e.typeId === typeId);
              if (!history.length) return {};
              const byItem = {};
              history.forEach(entry => {
                  Object.entries(entry.items || {}).forEach(([item, data]) => {
                      if (!byItem[item]) byItem[item] = {};
const rawPrice = Math.round(data.price || 0);
                          if (!rawPrice || rawPrice <= 0) return;
                          const bucket = rawPrice;
                          if (!byItem[item][bucket]) byItem[item][bucket] = { days: 0, totalSold: 0, totalProfit: 0, totalRevenue: 0, rrpPct: data.rrpPct || null };
                      byItem[item][bucket].days++;
                      byItem[item][bucket].totalSold   += data.sold    || 0;
                      byItem[item][bucket].totalProfit  += data.profit  || 0;
                      byItem[item][bucket].totalRevenue += data.revenue || 0;
                  });
              });
              const result = {};
              Object.entries(byItem).forEach(([item, buckets]) => {
                  let bestProfitPct = null, bestProfitVal = -Infinity;
                  let bestRevenuePct = null, bestRevenueVal = -Infinity;
                  let bestSoldPct = null, bestSoldVal = -Infinity;
const ranked = Object.entries(buckets)
                      .filter(([, s]) => s.days >= 1)
                      .map(([price, s]) => ({
                          pct: Number(price), rrpPct: s.rrpPct, days: s.days,
                          avgSold:    s.totalSold    / s.days,
                          avgProfit:  s.totalProfit  / s.days,
                          avgRevenue: s.totalRevenue / s.days
                      }))
                      .sort((a, b) => a.pct - b.pct);
                  ranked.forEach(r => {
                      if (r.avgProfit  > bestProfitVal)  { bestProfitVal  = r.avgProfit;  bestProfitPct  = r.pct; }
                      if (r.avgRevenue > bestRevenueVal) { bestRevenueVal = r.avgRevenue; bestRevenuePct = r.pct; }
                      if (r.avgSold    > bestSoldVal)    { bestSoldVal    = r.avgSold;    bestSoldPct    = r.pct; }
                  });
                  result[item] = { ranked, bestProfitPct, bestRevenuePct, bestSoldPct };
              });
              return result;
          },

          getWeeklyTemplate() { return this.get('weekly_template', {}); },
          saveWeeklyTemplate(t) { this.set('weekly_template', t); },






          getWeeklyTargets() { return this.get('weekly_targets', {}); },
          saveWeeklyTargets(t) { this.set('weekly_targets', t); },













          computeTodayPlan(employees, directorId, budget) {
              const targets  = this.getWeeklyTargets();
              const rot      = this.getRotation();
              const excluded = new Set(rot.excluded || []);
              const dow      = new Date().getDay();
              const mondayOffset = dow === 0 ? -6 : -(dow - 1);
              const mondayStr    = new Date(Date.now() + mondayOffset * 86400000).toISOString().slice(0, 10);
              const daysElapsed  = dow === 0 ? 7 : dow;

              const allActive = Object.keys(employees || {}).filter(id =>
                  employees[id].position !== 'Director'
                  && String(id) !== String(directorId || '')
                  && !excluded.has(id)
&& (employees[id].days_in_company == null || employees[id].days_in_company >= (Storage.getSettings().settlingInDays ?? 3))
              );
              const fixedIds = allActive.filter(id => (targets[id] || 0) > 0);
              const poolIds  = allActive.filter(id => (targets[id] || 0) === 0);

              const planned = {};
              allActive.forEach(id => { planned[id] = 0; });
              let remaining = Math.max(0, budget || 0);


              const owed = {};
              fixedIds.forEach(id => {
                  const dailyRate     = targets[id] / 7;
                  const expectedSoFar = Math.floor(dailyRate * daysElapsed);
                  const actualSoFar   = this.getEmpAllTimeCount(id, mondayStr);
                  owed[id] = Math.max(0, expectedSoFar - actualSoFar);
              });
              while (remaining > 0 && fixedIds.some(id => owed[id] > 0)) {
                  const next = fixedIds
                      .filter(id => owed[id] > 0)
                      .sort((a, b) => owed[b] - owed[a])[0];
                  if (!next) break;
                  planned[next]++; owed[next]--; remaining--;
              }


              if (remaining > 0 && poolIds.length) {
                  const resets = rot.resetDates || {};
                  const sim = {};
                  poolIds.forEach(id => { sim[id] = this.getEmpAllTimeCount(id, resets[id] || rot.startDate || null); });
                  while (remaining > 0) {
                      const next = [...poolIds].sort((a, b) => {
                          if (sim[a] !== sim[b]) return sim[a] - sim[b];
                          const ea = employees[a]?.effectiveness?.total || 0;
                          const eb = employees[b]?.effectiveness?.total || 0;
                          return ea - eb;
                      })[0];
                      if (!next) break;
                      planned[next] = (planned[next] || 0) + 1;
                      sim[next]++; remaining--;
                  }
              }

              return { planned, fixedIds, poolIds, targets, weekStart: mondayStr, daysElapsed };
          },

getManualScheduleQueue() { return this.get('manual_schedule_queue', { queue: [], pointer: 0 }); },
          saveManualScheduleQueue(q) { this.set('manual_schedule_queue', q); },





          getManualScheduleLog() { return this.get('manual_schedule_log', {}); },
          saveManualScheduleDay(dateStr, dayPlan) {
              const log = this.getManualScheduleLog();
              log[dateStr] = { ...dayPlan };
              const dates = Object.keys(log).sort();
              if (dates.length > 120) dates.slice(0, dates.length - 120).forEach(d => delete log[d]);
              this.set('manual_schedule_log', log);
          },
          deleteManualScheduleDay(dateStr) {
              const log = this.getManualScheduleLog();
              delete log[dateStr];
              this.set('manual_schedule_log', log);
          },
          getDayPriorityPlan() { return this.get('day_priority_plan', {}); },
          saveDayPriorityPlan(p) { this.set('day_priority_plan', p); },
          getScheduleConfig() {
              return this.get('schedule_config', {
                  enabled: false,
                  mode: 'soft',
                  cycleDays: 7,
                  cycleStartDate: null
              });
          },
          saveScheduleConfig(c) { this.set('schedule_config', c); },
          getScheduleOverrides() { return this.get('schedule_overrides', {}); },

          saveScheduleOverrides(o) { this.set('schedule_overrides', o); },

          getScheduleDeviation(empId, trainsPerCycle, cycleStartDate, cycleDays) {
              const log     = this.getTrainedLog();
              const start   = cycleStartDate || new Date().toISOString().slice(0, 10);
              const entries = (log[empId] || []).filter(e => e.ts && e.date >= start);
              const actual  = entries.length;
              const daysSince = this.daysSinceStart(start);
              const progressPct = Math.min(1, daysSince / Math.max(1, cycleDays));
              const expected = trainsPerCycle * progressPct;
return {
                  actual,
                  expected:  Number(expected.toFixed(2)),
                  deviation: Number((expected - actual).toFixed(2))
              };
          },


          getProxyKeys()            { return this.get('proxy_keys', []); },
          saveProxyKeys(keys)       { this.set('proxy_keys', keys); },
getProxyLastFetch()       { return this.get('proxy_last_fetch', {}); },
          saveProxyLastFetch(map)   { this.set('proxy_last_fetch', map); },
      };

        // =========================================================================
      // MODULE: TORNSTATS FINANCE SCRAPER (only runs on the Tornstats company page)
        // =========================================================================
if (location.hostname === 'tornstats.com') {
          (function () {
              const HEADERS = {
                  date:           /date/i,
                  daily:          /income/i,
                  salaries:       /wage/i,
                  adBudget:       /ad\s*budget/i,
                  dailyStockCost: /stock/i,
                  netProfit:      /profit/i
              };

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

              function parseAmount(text) {
                  const cleaned = (text || '').replace(/[^0-9.\-]/g, '');
                  const n = parseFloat(cleaned);
                  return isNaN(n) ? 0 : Math.round(n);
              }

              function formatRowsForClipboard(rows) {
                  // Same shape the manual "paste Tornstats data" box already parses:
                  // DD/MM/YY  $daily  $salaries  $adBudget  $dailyStockCost  $netProfit
                  return rows.map(r => {
                      const [yyyy, mm, dd] = r.date.split('-');
                      const yy = yyyy.slice(2);
                      return `${dd}/${mm}/${yy}  $${r.daily}  $${r.salaries}  $${r.adBudget}  $${r.dailyStockCost}  $${r.netProfit}`;
                  }).join('\n');
              }

              function copyToClipboard(text) {
                  let ok = false;
                  try { GM_setClipboard(text, 'text'); ok = true; } catch (e) {}
                  try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(text);
                          ok = true;
                      }
                  } catch (e) {}
                  return ok;
              }

              function scrapeTable(found) {
                  const colIndex = {};
                  Object.keys(HEADERS).forEach(key => {
                      const idx = found.headerCells.findIndex(t => HEADERS[key].test(t));
                      if (idx !== -1) colIndex[key] = idx;
                  });
                  if (colIndex.date === undefined) return [];

                  let bodyRows = Array.from(found.table.querySelectorAll('tbody tr'));
                  if (!bodyRows.length) bodyRows = Array.from(found.table.querySelectorAll('tr')).slice(1);

                  const imported = [];
                  for (const row of bodyRows) {
                      const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent.trim());
                      if (!cells.length) continue;
                      const rawDate = cells[colIndex.date] || '';
                      if (/weekly|total/i.test(rawDate)) continue;
                      const dm = rawDate.match(/(\d{2})\/(\d{2})\/(\d{2})/);
                      if (!dm) continue;
                      const [, dd, mm, yy] = dm;
                      const isoDate = `20${yy}-${mm}-${dd}`;
                      imported.push({
                          date: isoDate,
                          daily:          colIndex.daily          !== undefined ? parseAmount(cells[colIndex.daily])          : 0,
                          salaries:       colIndex.salaries       !== undefined ? parseAmount(cells[colIndex.salaries])       : 0,
                          adBudget:       colIndex.adBudget       !== undefined ? parseAmount(cells[colIndex.adBudget])       : 0,
                          dailyStockCost: colIndex.dailyStockCost !== undefined ? parseAmount(cells[colIndex.dailyStockCost]) : 0,
                          netProfit:      colIndex.netProfit      !== undefined ? parseAmount(cells[colIndex.netProfit])      : 0,
                          popularity: 0, efficiency: 0, environment: 0,
                          ts: new Date(isoDate + 'T12:00:00Z').getTime()
                      });
                  }
                  return imported;
              }

              function injectButton() {
                  if (document.getElementById('tcm-ts-capture-btn')) return;
                  const btn = document.createElement('button');
                  btn.id = 'tcm-ts-capture-btn';
                  btn.textContent = '↑ Send Finance Data to TCM';
                  btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;padding:10px 14px;'
                      + 'background:#2c2c2c;color:#7eb8ff;border:1px solid #444;border-radius:8px;'
                      + 'font-family:sans-serif;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
function runCapture() {
                      const found = findFinanceTable();
                      const rows  = found ? scrapeTable(found) : [];
                      if (!rows.length) {
                          btn.textContent = '✕ No finance table found on this page';
                          btn.style.color = '#f59e0b';
                          setTimeout(() => { btn.textContent = '↑ Send Finance Data to TCM'; btn.style.color = '#7eb8ff'; }, 3000);
                          return;
                      }
                      Storage.set('tornstats_staging', { rows, capturedAt: Date.now() });
                      const _copied = copyToClipboard(formatRowsForClipboard(rows));
                      btn.textContent = _copied
                          ? `✓ Captured ${rows.length} rows — copied to clipboard, open TCM on Torn to import`
                          : `✓ Captured ${rows.length} rows — open TCM on Torn to import (clipboard copy failed, use paste box)`;
                      setTimeout(() => { btn.textContent = '↑ Send Finance Data to TCM'; btn.style.color = '#7eb8ff'; }, 4000);
                  }
                  btn.addEventListener('click', () => {
                      const lengthSelect = document.querySelector('select[aria-controls="history-table"]');
                      if (lengthSelect && lengthSelect.value !== '-1') {
                          btn.textContent = '↻ Loading full history...';
                          lengthSelect.value = '-1';
                          lengthSelect.dispatchEvent(new Event('change', { bubbles: true }));
                          setTimeout(runCapture, 500);
                      } else {
                          runCapture();
                      }
                  });
                  document.body.appendChild(btn);
              }

              if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', injectButton);
              } else {
                  injectButton();
              }
          })();
          return;
      }

    // =========================================================================
    // MODULE: GOOGLE SHEETS SYNC
    // =========================================================================





      // ---------- JSONBin Data Sync (Web ↔ PDA / multi-device) ----------

      // ---------- Discord panels (log + live panel webhooks) ----------
      const Discord = {
          DEFAULT_OPTS: {
              unusedTrains: false,
              dailyMetrics: true,
              employeeAlerts: true,
              starChange: true,
              stockAlert: false,
              stockAlertDays: 3,
              autoPost: true,
              weeklyPanel: false
          },

          getCfg() {
              return Storage.get('discord_cfg', {
                  logWebhook: '',
                  panelWebhook: '',
                  weeklyWebhook: '',
                  opts: null,
                  meta: {}
              });
          },
          saveCfg(c) { Storage.set('discord_cfg', c); },

          getOpts() {
              const c = this.getCfg();
              return Object.assign({}, this.DEFAULT_OPTS, c.opts || {});
          },
          saveOpts(opts) {
              const c = this.getCfg();
              c.opts = Object.assign({}, this.DEFAULT_OPTS, opts || {});
              this.saveCfg(c);
          },
          getMeta() {
              return Object.assign({}, this.getCfg().meta || {});
          },
          saveMeta(meta) {
              const c = this.getCfg();
              c.meta = Object.assign({}, c.meta || {}, meta || {});
              this.saveCfg(c);
          },

          /** Stable per-browser install id for multi-device Discord log dedupe */
          getClientId() {
              let id = Storage.get('discord_client_id', '');
              if (!id || typeof id !== 'string' || id.length < 8) {
                  id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
                  Storage.set('discord_client_id', id);
              }
              return id;
          },

          _jsonBinReady() {
              try {
                  const cfg = typeof JsonBinSync !== 'undefined' ? JsonBinSync.getCfg() : null;
                  return !!(cfg && cfg.enabled && cfg.binId && cfg.masterKey);
              } catch (_e) { return false; }
          },

          async _pullDiscordMetaFromBin() {
              if (!this._jsonBinReady()) return;
              try {
                  const body = await JsonBinSync.pull();
                  if (body && body.discord_cfg && typeof body.discord_cfg === 'object') {
                      const dLocal = Storage.get('discord_cfg', {}) || {};
                      const remoteMeta = body.discord_cfg.meta || {};
                      // Remote meta wins for claim / last-post coordination
                      Storage.set('discord_cfg', {
                          ...dLocal,
                          ...body.discord_cfg,
                          opts: { ...(dLocal.opts || {}), ...((body.discord_cfg.opts) || {}) },
                          meta: { ...(dLocal.meta || {}), ...remoteMeta }
                      });
                  }
              } catch (e) {
                  console.warn('[TCM] Discord meta pull failed', e);
              }
          },

          async _pushDiscordMetaToBin() {
              if (!this._jsonBinReady()) return;
              try {
                  await JsonBinSync.push(JsonBinSync.buildPayload());
              } catch (e) {
                  console.warn('[TCM] Discord meta push failed', e);
              }
          },

          /**
           * Coordinate permanent-log posts across devices via JSONBin (Morrakiu TCM logic).
           * Returns true if this client should post the daily log message.
           * force=true bypasses (manual post always allowed).
           */
          async shouldPostDailyLog(dateStr, force) {
              if (force) return true;
              const myId = this.getClientId();
              const now = Date.now();
              const CLAIM_MS = 3 * 60 * 1000;

              await this._pullDiscordMetaFromBin();

              let meta = this.getMeta();
              // Already completed today
              if (meta.lastLogPostDateTCT === dateStr) return false;
              // Back-compat: older builds only set lastPostDateTCT
              if (meta.lastLogPostDateTCT == null && meta.lastPostDateTCT === dateStr) return false;

              // Another device holds an active claim
              if (
                  meta.logClaimDate === dateStr &&
                  meta.logClaimId &&
                  meta.logClaimId !== myId &&
                  (now - (Number(meta.logClaimTs) || 0)) < CLAIM_MS
              ) {
                  return false;
              }

              // Claim the slot
              this.saveMeta({
                  logClaimDate: dateStr,
                  logClaimId: myId,
                  logClaimTs: now
              });

              if (this._jsonBinReady()) {
                  try {
                      await this._pushDiscordMetaToBin();
                      await new Promise(r => setTimeout(r, 900));
                      await this._pullDiscordMetaFromBin();
                      meta = this.getMeta();
                      if (meta.lastLogPostDateTCT === dateStr) return false;
                      if (meta.logClaimDate === dateStr && meta.logClaimId && meta.logClaimId !== myId) {
                          return false;
                      }
                  } catch (e) {
                      console.warn('[TCM] log claim coordinate failed', e);
                  }
              }
              return true;
          },

          markDailyLogPosted(dateStr) {
              this.saveMeta({
                  lastLogPostDateTCT: dateStr,
                  lastPostDateTCT: dateStr,
                  lastPostTs: Date.now(),
                  logClaimDate: dateStr,
                  logClaimId: this.getClientId(),
                  logClaimTs: Date.now()
              });
          },

          isValidWebhook(url) {
              return !!(url && /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/i.test(String(url).trim()));
          },
          hasAnyWebhook() {
              const c = this.getCfg();
              return this.isValidWebhook(c.logWebhook) || this.isValidWebhook(c.panelWebhook) || this.isValidWebhook(c.weeklyWebhook);
          },
          anyReportEnabled() {
              const o = this.getOpts();
              return !!(o.unusedTrains || o.dailyMetrics || o.employeeAlerts || o.starChange || o.stockAlert);
          },

          getTCTParts(ts) {
              const d = ts ? new Date(ts) : new Date();
              // Torn City Time ≈ UTC
              return {
                  hour: d.getUTCHours(),
                  min: d.getUTCMinutes(),
                  dateStr: d.toISOString().slice(0, 10)
              };
          },

          _xhr(method, url, body) {
              return new Promise((resolve, reject) => {
                  if (typeof GM_xmlhttpRequest !== 'function') {
                      reject(new Error('GM_xmlhttpRequest unavailable'));
                      return;
                  }
                  GM_xmlhttpRequest({
                      method,
                      url,
                      headers: { 'Content-Type': 'application/json' },
                      data: body != null ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                      timeout: 20000,
                      onload(res) {
                          let data = null;
                          try { data = JSON.parse(res.responseText); } catch (_e) { data = res.responseText; }
                          if (res.status >= 200 && res.status < 300) resolve({ status: res.status, data });
                          else {
                              const err = new Error('HTTP ' + res.status);
                              err.status = res.status;
                              err.data = data;
                              reject(err);
                          }
                      },
                      onerror() { reject(new Error('Network error')); },
                      ontimeout() { reject(new Error('Timeout')); }
                  });
              });
          },

          async postToWebhook(url, body, wait) {
              const u = String(url).trim() + (wait ? (url.includes('?') ? '&' : '?') + 'wait=true' : '');
              return this._xhr('POST', u, body);
          },
          async editWebhookMessage(url, messageId, body) {
              const base = String(url).trim().replace(/\/$/, '');
              const u = base + '/messages/' + encodeURIComponent(messageId);
              return this._xhr('PATCH', u, body);
          },

          cleanEmbeds(embeds) {
              return (embeds || []).filter(Boolean).map(e => {
                  const out = Object.assign({}, e);
                  delete out._rating;
                  delete out._stockAlertEmpty;
                  if (Array.isArray(out.fields)) {
                      out.fields = out.fields.filter(f => f && f.name && f.value != null)
                          .map(f => ({ name: String(f.name).slice(0, 256), value: String(f.value).slice(0, 1024), inline: !!f.inline }));
                  }
                  if (out.title) out.title = String(out.title).slice(0, 256);
                  if (out.description) out.description = String(out.description).slice(0, 4096);
                  return out;
              }).slice(0, 10);
          },

          _estimateDailyTrains(profile, employees, typeName) {
              // Same formula as Training tab / Storage.dailyTrainBudget: min(20, stars) + trainer EE bonuses
              const stateLike = {
                  profile: profile || {},
                  employees: employees || {},
                  typeName: typeName || (typeof UI !== 'undefined' && UI.state ? UI.state.typeName : '')
              };
              if (typeof Storage !== 'undefined' && typeof Storage.dailyTrainBudget === 'function') {
                  try {
                      const b = Storage.dailyTrainBudget(stateLike);
                      return {
                          daily: b.base,
                          rating: b.stars,
                          hasTrainer: b.trainerBonus > 0,
                          trainerBonus: b.trainerBonus
                      };
                  } catch (_e) { /* fall through */ }
              }
              const rating = parseInt(profile?.rating || 0, 10) || 0;
              const stars = Math.max(0, Math.min(10, rating));
              let daily = Math.min(20, stars);
              let hasTrainer = false;
              let trainerBonus = 0;
              const positions = (typeof CompanyData !== 'undefined' && CompanyData.positions)
                  ? (CompanyData.positions(stateLike.typeName || '') || {})
                  : {};
              for (const emp of Object.values(employees || {})) {
                  if (!emp) continue;
                  let isTrainer = false;
                  if (typeof PosNorm !== 'undefined' && PosNorm.resolve) {
                      const res = PosNorm.resolve(emp.position, positions);
                      if (res?.data?.special === 'trainer') isTrainer = true;
                  }
                  if (!isTrainer) {
                      const pos = String(emp.position || '');
                      if (/trainer/i.test(pos)) isTrainer = true;
                  }
                  if (!isTrainer) continue;
                  hasTrainer = true;
                  const eff = emp.effectiveness?.working_stats || 0;
                  if (eff >= TCM.EE_TIER_4) trainerBonus += 3;
                  else if (eff >= TCM.EE_TIER_3) trainerBonus += 2;
                  else if (eff >= TCM.EE_TIER_2) trainerBonus += 1;
              }
              daily += trainerBonus;
              return { daily, rating: stars, hasTrainer, trainerBonus };
          },

          _trainedTodayCount() {
              const log = Storage.getTrainedLog() || {};
              const today = this.getTCTParts().dateStr;
              let n = 0;
              for (const entries of Object.values(log)) {
                  if (!Array.isArray(entries)) continue;
                  for (const e of entries) {
                      if (e && e.date === today) n++;
                  }
              }
              return n;
          },

          buildUnusedTrainsEmbed(profile, employees, typeName) {
              const trainEst = this._estimateDailyTrains(profile, employees, typeName);
              const loggedToday = this._trainedTodayCount();
              const log = Storage.getTrainedLog() || {};
              let totalLogged = 0;
              for (const entries of Object.values(log)) {
                  if (Array.isArray(entries)) totalLogged += entries.length;
              }
              const fields = [
                  { name: 'Company trains / day', value: String(trainEst.daily) + (trainEst.trainerBonus ? ` (${trainEst.rating}★ +${trainEst.trainerBonus} trainer)` : ` (${trainEst.rating}★)`), inline: true },
                  { name: 'Rating', value: '★' + trainEst.rating, inline: true },
                  { name: 'Trainer staffed', value: trainEst.hasTrainer ? ('Yes' + (trainEst.trainerBonus ? ` (+${trainEst.trainerBonus})` : '')) : 'No', inline: true },
                  { name: 'Train actions logged today (TCT)', value: String(loggedToday), inline: true },
                  { name: 'Lifetime logged trains', value: String(totalLogged), inline: true }
              ];
              if (loggedToday < trainEst.daily) {
                  fields.push({
                      name: 'Possible unused',
                      value: 'Up to **' + Math.max(0, trainEst.daily - loggedToday) + '** trains may still be available today.'
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
          },

          buildDailyMetricsEmbed(profile, stock) {
              const p = profile || {};
              const fields = [];
              const add = (name, val, inline) => {
                  if (val == null || val === '') return;
                  fields.push({ name, value: String(val), inline: !!inline });
              };
              const money = (n) => (n == null || n === '') ? null : ('$' + Number(n).toLocaleString('en-US'));
              add('Daily income', money(p.daily_income), true);
              add('Weekly income', money(p.weekly_income), true);
              add('Bank', money(p.company_bank != null ? p.company_bank : p.bank), true);
              add('Popularity', p.popularity != null ? p.popularity + '%' : null, true);
              add('Efficiency', p.efficiency != null ? p.efficiency + '%' : (p.company_efficiency != null ? p.company_efficiency + '%' : null), true);
              add('Environment', p.environment != null ? p.environment : (p.company_environment != null ? p.company_environment : null), true);
              add('Rating', p.rating != null ? '★' + p.rating : null, true);
              add('Employees',
                  (p.employees_hired != null ? p.employees_hired : '?') + ' / ' +
                  (p.employees_capacity != null ? p.employees_capacity : '?'), true);

              const opts = this.getOpts();
              if (!opts.stockAlert && stock && typeof stock === 'object') {
                  const lines = [];
                  for (const [name, s] of Object.entries(stock)) {
                      if (!s || typeof s !== 'object') continue;
                      const inStock = s.in_stock != null ? s.in_stock : (s.stock != null ? s.stock : null);
                      if (inStock == null) continue;
                      lines.push(name + ': **' + inStock + '**');
                      if (lines.length >= 12) break;
                  }
                  if (lines.length) fields.push({ name: 'Item stock', value: lines.join('\n').slice(0, 1000) });
              }
              if (!fields.length) {
                  fields.push({ name: 'Note', value: 'Limited metrics available from API for this key/role.' });
              }
              return {
                  title: 'Daily Metrics',
                  description: (p.name || 'Company') + ' · ' + this.getTCTParts().dateStr + ' TCT',
                  color: 0x3a6ea5,
                  fields,
                  timestamp: new Date().toISOString()
              };
          },

          buildEmployeeAlertsEmbed(profile, employees) {
              const p = profile || {};
              const alerts = [];
              const now = Date.now();
              const inactiveDays = Storage.getSettings().inactiveThreshold ?? 3;
              const addictionThreshold = -(Math.abs(Storage.getSettings().addictionThreshold ?? 5));
              for (const [id, emp] of Object.entries(employees || {})) {
                  if (!emp) continue;
                  const name = emp.name || ('#' + id);
                  const pos = emp.position || '?';
                  // Addiction + inactivity only (no hospital / jail)
                  const addiction = emp.effectiveness?.addiction || 0;
                  if (addiction < addictionThreshold) {
                      alerts.push('**' + name + '** (' + pos + ') — addiction ' + addiction + ' EE');
                  }
                  const last = emp.last_action?.timestamp
                      ? emp.last_action.timestamp * (emp.last_action.timestamp < 1e12 ? 1000 : 1)
                      : null;
                  if (last) {
                      const days = (now - last) / 86400000;
                      if (days >= inactiveDays) {
                          alerts.push('**' + name + '** (' + pos + ') — inactive ~' + days.toFixed(1) + 'd');
                      }
                  } else if (emp.last_action?.relative && /day|week|month/i.test(emp.last_action.relative)) {
                      const m = String(emp.last_action.relative).match(/(\d+)\s*day/i);
                      if (m && parseInt(m[1], 10) >= inactiveDays) {
                          alerts.push('**' + name + '** (' + pos + ') — inactive ' + emp.last_action.relative);
                      }
                  }
              }
              if (!alerts.length) {
                  return {
                      title: 'Employee Alerts',
                      description: (p.name || 'Company') + ' · ' + this.getTCTParts().dateStr + ' TCT',
                      color: 0x57f287,
                      fields: [{ name: 'Status', value: 'No addiction or inactivity alerts.' }],
                      timestamp: new Date().toISOString()
                  };
              }
              return {
                  title: 'Employee Alerts',
                  description: (p.name || 'Company') + ' · ' + alerts.length + ' alert(s)',
                  color: 0xed4245,
                  fields: [{ name: 'Alerts', value: alerts.slice(0, 20).join('\n').slice(0, 1000) }],
                  timestamp: new Date().toISOString()
              };
          },

          buildStarChangeEmbed(profile) {
              const p = profile || {};
              const rating = parseInt(p.rating || 0, 10) || 0;
              const meta = this.getMeta();
              const prev = meta.lastRating != null ? meta.lastRating : null;
              let desc = (p.name || 'Company') + ' is **★' + rating + '**';
              if (prev != null && prev !== rating) {
                  desc += prev < rating ? (' (up from ★' + prev + ')') : (' (down from ★' + prev + ')');
              }
              return {
                  title: 'Star Rating',
                  description: desc,
                  color: 0xfee75c,
                  fields: [],
                  timestamp: new Date().toISOString(),
                  _rating: rating
              };
          },

          _stockDaysLeft(s) {
              // crude estimate: in_stock / sold_amount if sold available
              const inStock = Number(s.in_stock != null ? s.in_stock : s.stock) || 0;
              const sold = Number(s.sold_amount != null ? s.sold_amount : s.sold) || 0;
              if (sold > 0) return inStock / sold;
              return null;
          },

          buildStockAlertEmbed(profile, stock, opts) {
              const threshold = Math.min(30, Math.max(0.5, Number(this.getOpts().stockAlertDays) || 3));
              const low = [];
              const lowAbs = [];
              for (const [name, s] of Object.entries(stock || {})) {
                  if (!s || typeof s !== 'object') continue;
                  const days = this._stockDaysLeft(s);
                  const inStock = Number(s.in_stock != null ? s.in_stock : s.stock);
                  if (days != null && days <= threshold) low.push({ name, days, inStock });
                  else if ((days == null || !isFinite(days)) && inStock != null && inStock < 10) lowAbs.push({ name, inStock });
              }
              low.sort((a, b) => (a.days || 0) - (b.days || 0));
              const forceInclude = opts && opts.forceIncludeEmpty;
              if (!low.length && !lowAbs.length) {
                  if (!forceInclude) return null;
                  return {
                      title: 'Stock Alert',
                      description: (profile?.name || 'Company') + ' · ' + this.getTCTParts().dateStr + ' TCT',
                      color: 0x57f287,
                      fields: [{ name: 'Status', value: 'No items at or below **' + threshold + '** estimated day(s) of stock.' }],
                      timestamp: new Date().toISOString(),
                      _stockAlertEmpty: true
                  };
              }
              const lines = low.map(r => {
                  const d = r.days != null ? r.days.toFixed(1) + 'd' : '?';
                  return '**' + r.name + '** — ' + d + ' left' + (r.inStock != null ? (' (' + r.inStock + ' in stock)') : '');
              });
              lowAbs.forEach(r => lines.push('**' + r.name + '** — low stock (' + r.inStock + ') · no sales rate'));
              return {
                  title: 'Stock Alert · ≤' + threshold + ' day(s)',
                  description: (profile?.name || 'Company') + ' · ' + (low.length + lowAbs.length) + ' item(s)',
                  color: 0xe67e22,
                  fields: [{ name: 'Low stock', value: lines.join('\n').slice(0, 1000) }],
                  timestamp: new Date().toISOString()
              };
          },

          async runReports(state, force) {
              const cfg = this.getCfg();
              const opts = this.getOpts();
              const hasLog = this.isValidWebhook(cfg.logWebhook);
              const hasPanel = this.isValidWebhook(cfg.panelWebhook);
              if (!hasLog && !hasPanel) {
                  if (force) throw new Error('Set at least one Discord webhook in Settings');
                  return { ok: false, reason: 'no_webhook' };
              }
              if (!this.anyReportEnabled()) {
                  if (force) throw new Error('Enable at least one Discord report option');
                  return { ok: false, reason: 'no_opts' };
              }
              if (!state || !state.profile) {
                  if (force) throw new Error('Load company data first');
                  return { ok: false, reason: 'no_data' };
              }

              const p = state.profile;
              const employees = state.employees || {};
              const stock = state.stock || {};
              const embeds = [];
              let starEmbed = null;

              if (opts.unusedTrains) embeds.push(this.buildUnusedTrainsEmbed(p, employees, state.typeName));
              if (opts.dailyMetrics) embeds.push(this.buildDailyMetricsEmbed(p, stock));
              if (opts.employeeAlerts) embeds.push(this.buildEmployeeAlertsEmbed(p, employees));
              if (opts.starChange) {
                  starEmbed = this.buildStarChangeEmbed(p);
                  const meta = this.getMeta();
                  if (force || meta.lastRating == null || (starEmbed._rating != null && starEmbed._rating !== meta.lastRating)) {
                      embeds.push(starEmbed);
                  }
              }
              if (opts.stockAlert) {
                  const se = this.buildStockAlertEmbed(p, stock, { forceIncludeEmpty: !!force });
                  if (se) embeds.push(se);
              }

              if (!embeds.length) {
                  if (force) throw new Error('Nothing to post for current options');
                  return { ok: false, reason: 'empty' };
              }

              const clean = this.cleanEmbeds(embeds);
              const tct = this.getTCTParts();
              const body = {
                  username: 'TCM ALPHA',
                  content: '**Company reports** · **' + tct.dateStr + '** TCT' + (force ? ' (manual)' : ''),
                  embeds: clean
              };

              const results = { log: false, panel: false, logSkipped: false };
              const errors = [];
              let meta = this.getMeta();

              // Permanent log — once per TCT day across devices (JSONBin claim)
              if (hasLog) {
                  const mayPostLog = await this.shouldPostDailyLog(tct.dateStr, force);
                  if (!mayPostLog) {
                      results.logSkipped = true;
                      console.log('[TCM] Permanent Discord log skipped (already posted or claimed by another device)');
                  } else {
                      try {
                          await this.postToWebhook(cfg.logWebhook, body, false);
                          results.log = true;
                          this.markDailyLogPosted(tct.dateStr);
                          // Share completion so other devices skip
                          try { await this._pushDiscordMetaToBin(); } catch (_pe) { /* local mark still set */ }
                      } catch (e) {
                          errors.push('log: ' + (e.message || e));
                      }
                  }
              }

              // Live panel — edit in place when message id known
              if (hasPanel) {
                  try {
                      const existingId = meta.panelMessageId;
                      if (existingId) {
                          try {
                              await this.editWebhookMessage(cfg.panelWebhook, existingId, body);
                              results.panel = true;
                          } catch (e) {
                              // Message may have been deleted — post new
                              const res = await this.postToWebhook(cfg.panelWebhook, body, true);
                              const newId = res?.data?.id;
                              if (newId) {
                                  meta.panelMessageId = String(newId);
                                  results.panel = true;
                              }
                          }
                      } else {
                          const res = await this.postToWebhook(cfg.panelWebhook, body, true);
                          const newId = res?.data?.id;
                          if (newId) {
                              meta.panelMessageId = String(newId);
                              results.panel = true;
                          }
                      }
                  } catch (e) {
                      errors.push('panel: ' + (e.message || e));
                  }
              }

              if (starEmbed && starEmbed._rating != null) meta.lastRating = starEmbed._rating;
              meta.lastPostDateTCT = tct.dateStr;
              meta.lastPostTs = Date.now();
              this.saveMeta(meta);

              if (errors.length && !results.log && !results.panel) {
                  throw new Error(errors.join('; '));
              }
              return { ok: true, results, errors };
          },

          /** Auto-post once per TCT day at/after 18:15 if enabled */
          maybeAutoPost(state) {
              try {
                  const opts = this.getOpts();
                  if (!opts.autoPost || !this.hasAnyWebhook() || !this.anyReportEnabled()) return;
                  const tct = this.getTCTParts();
                  // 18:15 TCT gate
                  if (tct.hour < 18 || (tct.hour === 18 && tct.min < 15)) return;
                  const meta = this.getMeta();
                  // Skip if this device already posted (or another did and meta was synced)
                  if (meta.lastLogPostDateTCT === tct.dateStr || meta.lastPostDateTCT === tct.dateStr) return;
                  this.runReports(state, false).catch(e => console.warn('[TCM] Discord auto-post failed:', e));
              } catch (e) {
                  console.warn('[TCM] Discord auto-post error:', e);
              }
          }
      };

      const JsonBinSync = {
          getCfg() {
              return Storage.get('jsonbin_sync_cfg', {
                  binId: '',
                  masterKey: '',
                  enabled: false,
                  lastSync: null,
                  lastSyncOk: null,
                  lastError: null
              });
          },
          saveCfg(c) { Storage.set('jsonbin_sync_cfg', c); },

          _headers(key) {
              return {
                  'Content-Type': 'application/json',
                  'X-Master-Key': key,
                  'X-Bin-Meta': 'false'
              };
          },

          _xhr(method, url, headers, body) {
              return new Promise((resolve, reject) => {
                  const opts = {
                      method,
                      url,
                      headers: headers || {},
                      timeout: 20000,
                      onload(res) {
                          let data = null;
                          try { data = JSON.parse(res.responseText); } catch (_e) { data = res.responseText; }
                          if (res.status >= 200 && res.status < 300) resolve({ status: res.status, data });
                          else {
                              const err = new Error('HTTP ' + res.status + (typeof data === 'object' && data && data.message ? (': ' + data.message) : ''));
                              err.status = res.status;
                              err.data = data;
                              reject(err);
                          }
                      },
                      onerror() { reject(new Error('Network error')); },
                      ontimeout() { reject(new Error('Timeout')); }
                  };
                  if (body != null) opts.data = typeof body === 'string' ? body : JSON.stringify(body);
                  if (typeof GM_xmlhttpRequest === 'function') GM_xmlhttpRequest(opts);
                  else reject(new Error('GM_xmlhttpRequest unavailable'));
              });
          },

          /** Merge ALPHA trained_log: { empId: [{date,ts,_logId,...}, ...] } */
          mergeTrainedLogs(local, remote) {
              const out = {};
              const ids = new Set([
                  ...Object.keys(local || {}),
                  ...Object.keys(remote || {})
              ]);
              for (const id of ids) {
                  const a = Array.isArray(local?.[id]) ? local[id] : [];
                  const b = Array.isArray(remote?.[id]) ? remote[id] : [];
                  const seen = new Set();
                  const merged = [];
                  for (const e of [...a, ...b]) {
                      if (!e || typeof e !== 'object') continue;
                      const key = e._logId || e.ts || (e.date + '|' + (e.note || '') + '|' + (e.amount || ''));
                      if (seen.has(String(key))) continue;
                      seen.add(String(key));
                      merged.push(e);
                  }
                  merged.sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')) || ((x.ts || 0) - (y.ts || 0)));
                  if (merged.length) out[id] = merged;
              }
              return out;
          },

          /** Normalize a contract's payments, including legacy prepaidAmount-only records. */
          _normalizeContractPayments(c) {
              if (!c) return [];
              if (Array.isArray(c.payments) && c.payments.length) {
                  return c.payments
                      .filter(p => p && Number(p.amount) > 0)
                      .map(p => ({
                          id: String(p.id || ('p_' + (p.ts || p.date || Math.random()))),
                          amount: Number(p.amount) || 0,
                          date: p.date || c.startDate || '',
                          note: p.note || '',
                          ts: Number(p.ts) || 0
                      }));
              }
              if (Number(c.prepaidAmount) > 0) {
                  return [{
                      id: 'prepaid',
                      amount: Number(c.prepaidAmount) || 0,
                      date: c.startDate || '',
                      note: 'Prepaid at start',
                      ts: 0
                  }];
              }
              return [];
          },

          /** Union payment histories by id. Never drop a payment that exists on either side. */
          _unionPayments(a, b) {
              const payMap = new Map();
              for (const p of [...(a || []), ...(b || [])]) {
                  if (!p || !p.id) continue;
                  const key = String(p.id);
                  const old = payMap.get(key);
                  if (!old || (Number(p.ts) || 0) >= (Number(old.ts) || 0)) payMap.set(key, p);
              }
              return Array.from(payMap.values());
          },

          mergeTrainSales(local, remote) {
              const map = new Map();
              for (const c of [...(remote || []), ...(local || [])]) {
                  if (!c || !c.id) continue;
                  const prev = map.get(c.id);
                  if (!prev) {
                      const copy = { ...c };
                      copy.payments = this._normalizeContractPayments(c);
                      copy.prepaidAmount = copy.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                      map.set(c.id, copy);
                      continue;
                  }
                  const pt = prev.updatedAt || prev.ts || 0;
                  const ct = c.updatedAt || c.ts || 0;
                  // Prefer newer contract for non-payment fields, but ALWAYS union payments
                  // so an upgrade / cross-device sync never drops payment history.
                  const base = ct >= pt ? { ...prev, ...c } : { ...c, ...prev };
                  const prevPays = this._normalizeContractPayments(prev);
                  const curPays = this._normalizeContractPayments(c);
                  // If either side already has a real payments array, do not also invent a
                  // duplicate "prepaid" entry from the other side's prepaidAmount sum.
                  const hasReal = prevPays.some(p => p.id !== 'prepaid') || curPays.some(p => p.id !== 'prepaid');
                  const prevFiltered = hasReal ? prevPays.filter(p => p.id !== 'prepaid') : prevPays;
                  const curFiltered = hasReal ? curPays.filter(p => p.id !== 'prepaid') : curPays;
                  base.payments = this._unionPayments(prevFiltered, curFiltered);
                  base.prepaidAmount = base.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  map.set(c.id, base);
              }
              return Array.from(map.values());
          },

          mergeSnapshots(local, remote) {
              const byDate = {};
              for (const s of [...(remote || []), ...(local || [])]) {
                  if (!s || !s.date) continue;
                  const prev = byDate[s.date];
                  if (!prev) { byDate[s.date] = s; continue; }
                  // Prefer record with more fields / later source
                  byDate[s.date] = { ...prev, ...s };
              }
              return Object.keys(byDate).sort().map(d => byDate[d]);
          },

          buildPayload() {
              return {
                  version: 1,
                  script: 'TCM-ALPHA',
                  scriptVersion: TCM.VERSION,
                  updated: Date.now(),
                  trained_log: Storage.getTrainedLog(),
                  train_sales: Storage.getTrainSales(),
                  paid_contracts: Storage.getPaidContracts(),
                  rotation: Storage.getRotation(),
                  snapshots: Storage.getSnapshots(),
                  schedule_config: (typeof Storage.getScheduleConfig === 'function' ? Storage.getScheduleConfig() : Storage.get('schedule_config', null)),
                  schedule_overrides: (typeof Storage.getScheduleOverrides === 'function' ? Storage.getScheduleOverrides() : Storage.get('schedule_overrides', null)),
                  google_sync_cfg: Storage.get('google_sync_cfg', null),
                  discord_cfg: Storage.get('discord_cfg', null),
                  overrides: (typeof Storage.getOverrides === 'function' ? Storage.getOverrides() : Storage.get('overrides', {})),
                  settings: (() => {
                      // Full settings sync — strip secrets only
                      const s = Storage.getSettings() || {};
                      const out = JSON.parse(JSON.stringify(s));
                      const SECRET_KEYS = new Set([
                          'apiKey', 'api_key', 'companyKey', 'company_key',
                          'password', 'token', 'secret', 'masterKey', 'master_key'
                      ]);
                      for (const k of Object.keys(out)) {
                          if (SECRET_KEYS.has(k)) {
                              delete out[k];
                              continue;
                          }
                          // Drop long secret-like string fields
                          if (/key|secret|token|password/i.test(k) && typeof out[k] === 'string' && out[k].length > 20) {
                              delete out[k];
                          }
                      }
                      return out;
                  })()
              };
          },

          applyRemote(body) {
              if (!body || typeof body !== 'object') return { applied: false };

              if (body.trained_log && typeof body.trained_log === 'object') {
                  const merged = this.mergeTrainedLogs(Storage.getTrainedLog(), body.trained_log);
                  Storage.set('trained_log', merged);
              }
              if (Array.isArray(body.train_sales)) {
                  Storage.saveTrainSales(this.mergeTrainSales(Storage.getTrainSales(), body.train_sales));
              }
              if (Array.isArray(body.paid_contracts)) {
                  const local = Storage.getPaidContracts();
                  const map = new Map();
                  for (const c of [...body.paid_contracts, ...local]) {
                      const key = c.id || (c.paidAt + '|' + (c.totalEarned || 0) + '|' + (c.buyerEmpId || ''));
                      if (!map.has(key)) map.set(key, c);
                  }
                  Storage.set('paid_contracts', Array.from(map.values()));
              }
              if (body.rotation && typeof body.rotation === 'object') {
                  const local = Storage.getRotation();
                  // Prefer remote queue if remote updated more recently via payload.updated — still merge conservatively
                  const mergedRot = {
                      ...local,
                      ...body.rotation,
                      excluded: Array.from(new Set([...(local.excluded || []), ...(body.rotation.excluded || [])])),
                      joinDates: { ...(body.rotation.joinDates || {}), ...(local.joinDates || {}) },
                      resetDates: { ...(body.rotation.resetDates || {}), ...(local.resetDates || {}) }
                  };
                  Storage.saveRotation(mergedRot);
              }
              if (Array.isArray(body.snapshots)) {
                  const merged = this.mergeSnapshots(Storage.getSnapshots(), body.snapshots);
                  Storage.set('snapshots', merged);
                  try { localStorage.setItem('TCM_snapshots_mirror', JSON.stringify(merged)); } catch (_e) {}
              }
              if (body.schedule_config && typeof body.schedule_config === 'object') {
                  if (typeof Storage.saveScheduleConfig === 'function') Storage.saveScheduleConfig(body.schedule_config);
                  else Storage.set('schedule_config', body.schedule_config);
              }
              if (body.schedule_overrides && typeof body.schedule_overrides === 'object') {
                  if (typeof Storage.saveScheduleOverrides === 'function') Storage.saveScheduleOverrides(body.schedule_overrides);
                  else Storage.set('schedule_overrides', body.schedule_overrides);
              }
              if (body.discord_cfg && typeof body.discord_cfg === 'object') {
                  const dLocal = Storage.get('discord_cfg', {}) || {};
                  // merge but never clobber local webhooks with empty remote strings lightly
                  Storage.set('discord_cfg', { ...dLocal, ...body.discord_cfg, opts: { ...(dLocal.opts||{}), ...((body.discord_cfg.opts)||{}) }, meta: { ...(dLocal.meta||{}), ...((body.discord_cfg.meta)||{}) } });
              }
              if (body.google_sync_cfg && typeof body.google_sync_cfg === 'object') {
                  const gLocal = Storage.get('google_sync_cfg', {}) || {};
                  Storage.set('google_sync_cfg', { ...gLocal, ...body.google_sync_cfg });
              }
              if (body.overrides && typeof body.overrides === 'object') {
                  const oLocal = (typeof Storage.getOverrides === 'function' ? Storage.getOverrides() : Storage.get('overrides', {})) || {};
                  Storage.set('overrides', { ...oLocal, ...body.overrides });
              }
              if (body.settings && typeof body.settings === 'object') {
                  const s = Storage.getSettings() || {};
                  const remote = body.settings;
                  const SECRET_KEYS = new Set([
                      'apiKey', 'api_key', 'companyKey', 'company_key',
                      'password', 'token', 'secret', 'masterKey', 'master_key'
                  ]);
                  function deepMerge(target, source) {
                      if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
                      const out = (target && typeof target === 'object' && !Array.isArray(target)) ? { ...target } : {};
                      for (const [k, v] of Object.entries(source)) {
                          if (SECRET_KEYS.has(k)) continue;
                          if (v && typeof v === 'object' && !Array.isArray(v)) {
                              out[k] = deepMerge(out[k], v);
                          } else if (v !== undefined) {
                              out[k] = v;
                          }
                      }
                      return out;
                  }
                  Storage.saveSettings(deepMerge(s, remote));
              }
              return { applied: true };
          },

          async pull() {
              const cfg = this.getCfg();
              if (!cfg.binId || !cfg.masterKey) throw new Error('JSONBin Bin ID and Master Key required');
              const url = 'https://api.jsonbin.io/v3/b/' + encodeURIComponent(cfg.binId) + '/latest';
              const res = await this._xhr('GET', url, this._headers(cfg.masterKey));
              const body = res.data && res.data.record != null ? res.data.record : res.data;
              return body;
          },

          async push(payload) {
              const cfg = this.getCfg();
              if (!cfg.binId || !cfg.masterKey) throw new Error('JSONBin Bin ID and Master Key required');
              const url = 'https://api.jsonbin.io/v3/b/' + encodeURIComponent(cfg.binId);
              const headers = {
                  'Content-Type': 'application/json',
                  'X-Master-Key': cfg.masterKey,
                  'X-Bin-Versioning': 'false'
              };
              await this._xhr('PUT', url, headers, payload || this.buildPayload());
          },

          async syncBothWays() {
              const cfg = this.getCfg();
              if (!cfg.binId || !cfg.masterKey) throw new Error('JSONBin not configured');
              let remote = null;
              try {
                  remote = await this.pull();
              } catch (e) {
                  // Empty / new bin may 404 — still push local
                  if (!(e && (e.status === 404 || e.status === 422))) throw e;
              }
              if (remote) this.applyRemote(remote);
              const payload = this.buildPayload();
              await this.push(payload);
              const cfg2 = this.getCfg();
              cfg2.lastSync = new Date().toISOString();
              cfg2.lastSyncOk = true;
              cfg2.lastError = null;
              this.saveCfg(cfg2);
              return payload;
          }
      };

      const GoogleSync = {
          getCfg() {
              return Storage.get('google_sync_cfg', {
                  webAppUrl: '',
                  sheetUrl: '',
                  enabled: false,
                  lastSync: null,
                  lastSyncOk: null
              });
          },
          saveCfg(c) { Storage.set('google_sync_cfg', c); },

          async syncAll(state) {
              const cfg = this.getCfg();
              if (!cfg.webAppUrl) return null;


              const fmtN = n => (n == null ? 0 : Number(n)).toLocaleString('en-US');

              const sheets = [];
              const _syncCfg = Storage.getSettings().syncSheets || { finance:true, trains:true, contracts:true, tax:true, stock:true, eeranking:true };
              const snaps = Storage.getSnapshots();
              if (snaps.length) {

                 const sorted = [...snaps].sort((a, b) => b.date.localeCompare(a.date));
                  const _finContractsInNet = Storage.getSettings().contractsInNet !== false;
                  const _paidContracts = Storage.getPaidContracts();
                  const _contractByDate = {};
                  if (_finContractsInNet) {
                      _paidContracts.forEach(c => {
                          if (c.paidAt) _contractByDate[c.paidAt] = (_contractByDate[c.paidAt] || 0) + (c.totalEarned || 0);
                      });
                  }
                  const _finHeader = _finContractsInNet
                      ? ['Date','Gross Revenue','Salaries','Ad Spend','Net Profit','Contracts Revenue','Adj. Net Profit','Popularity','Efficiency','Environment']
                      : ['Date','Gross Revenue','Salaries','Ad Spend','Net Profit','Popularity','Efficiency','Environment'];
                  const _finRows = [
                      _finHeader,
                      ...sorted.map(s => {
                          if (_finContractsInNet) {
                              const _cr = _contractByDate[s.date] || 0;
                              return [s.date, fmtN(s.daily), fmtN(s.salaries), fmtN(s.adBudget),
                                  fmtN(s.netProfit), fmtN(_cr), fmtN((s.netProfit || 0) + _cr),
                                  fmtN(s.popularity), fmtN(s.efficiency), fmtN(s.environment)];
                          }
                          return [s.date, fmtN(s.daily), fmtN(s.salaries), fmtN(s.adBudget),
                              fmtN(s.netProfit), fmtN(s.popularity), fmtN(s.efficiency), fmtN(s.environment)];
                      })
                  ];
                  const _gsFinSettings = Storage.getSettings();
              const _finGoodColor   = _gsFinSettings.finGoodColor       || '#b6d7a8';
              const _finBadColor    = _gsFinSettings.finBadColor        || '#ea9999';
              const _finHeaderColor = _gsFinSettings.finHeaderColor     || '#6495ED';
              const _finColors = (() => {
                  const _fc = [_finHeaderColor];
                  let _lfc = null;
                  for (let _i = 0; _i < sorted.length; _i++) {
                      const _p = sorted[_i + 1];
                      if (!_p) { _fc.push(_lfc); }
                      else if ((sorted[_i].netProfit||0) > (_p.netProfit||0)) { _lfc = _finGoodColor; _fc.push(_finGoodColor); }
                      else if ((sorted[_i].netProfit||0) < (_p.netProfit||0)) { _lfc = _finBadColor;  _fc.push(_finBadColor);  }
                      else { _fc.push(_lfc); }
                  }
                  return _fc;
              })();
              const _finTextColors = ['#ffffff', ...sorted.map(() => null)];
                  if (_syncCfg.finance !== false) sheets.push({ name: 'Finance', rows: _finRows, rowColors: _finColors, rowTextColors: _finTextColors });
              }

              const log = Storage.getTrainedLog();
              const emps = state?.employees || {};

              const _trainFlat = [];
              for (const [id, entries] of Object.entries(log)) {
                  const name = emps[id]?.name || id;
                  const perDay = {};
                  const seenKeys = new Set();
                  for (const e of entries) {
                      if (!e.ts) continue;
                      const key = e._logId || e.ts;
                      if (seenKeys.has(key)) continue;
                      seenKeys.add(key);
                      perDay[e.date] = (perDay[e.date]||0)+1;
                  }
                  Object.entries(perDay).forEach(([date,count])=>_trainFlat.push({ name, date, count }));
              }
              const trainSortMode = Storage.get('train_sheet_sort', 'latest');
              if (trainSortMode === 'user') {
                  _trainFlat.sort((a, b) => a.name.localeCompare(b.name) || b.date.localeCompare(a.date));
              } else {

                  _trainFlat.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
              }
              const trainRows = [['Employee','Date','Trains']];
              _trainFlat.forEach(({ name, date, count }) => trainRows.push([name, date, fmtN(count)]));
              if (_syncCfg.trains !== false && trainRows.length > 1) sheets.push({
                  name: 'Trains', rows: trainRows,
                  rowColors:    [Storage.getSettings().trainsHeaderColor    || '#6495ED', ...trainRows.slice(1).map(() => null)],
                  rowTextColors:['#ffffff',                                               ...trainRows.slice(1).map(() => null)]
              });

              const sales = Storage.getTrainSales();
              if (sales.length) {
                  const sortedSales = [...sales].filter(c => !c.deleted).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

                  const rows = [['Buyer','Date','Trains','Price/Train','Cumulative Earned','Contract Start','Contract End','Total Required','Total Done','Progress']];
                  const rowColors = [Storage.getSettings().contractsHeaderColor || '#000000'];
                  const rowTextColors = ['#ffffff'];
                  sortedSales.forEach((c, cIdx) => {
                      const _allEntries = (log[c.buyerEmpId] || []).filter(e => e.ts && e.date && e.date >= c.startDate);
                      const _seen2 = new Set();
                      const _entries = _allEntries.filter(e => {
                          const _k2 = e._logId || e.ts;
                          if (_seen2.has(_k2)) return false;
                          _seen2.add(_k2); return true;
                      }).sort((a, b) => (a.ts || 0) - (b.ts || 0));
                      const _done = _entries.length;
                      const _remaining = Storage.isOpenEndedContract(c) ? null : Math.max(0, (c.totalTrains || 0) - _done);
                      const _endDate = (_remaining === 0 || c.active === false) && _entries.length > 0 ? _entries[_entries.length - 1].date : '—';

                      let _rowColor;
                      if (_done >= c.totalTrains) {
                          _rowColor = '#d9ead3';
                      } else if (c.active === false) {
                          _rowColor = '#EAD1DC';
                      } else {
                          _rowColor = '#CFE2F3';
                      }

                      if (_entries.length === 0) {
                          rows.push([c.buyerName, '—', '×0', fmtN(c.pricePerTrain), 0, '—', c.startDate, fmtN(c.totalTrains), 0, `0/${c.totalTrains}`]);
                          rowColors.push(_rowColor);
                          rowTextColors.push(null);
                      } else {

                          const _byDate = {};
                          _entries.forEach(e => { const d = e.date || ''; _byDate[d] = (_byDate[d] || 0) + 1; });
                          const _dateGroups = Object.entries(_byDate).sort(([a],[b]) => a.localeCompare(b));
                          let _cumTrains = 0;
                          _dateGroups.forEach(([date, count], gi) => {
                              _cumTrains += count;
                              const _isFirst = gi === 0;
                              rows.push([
                                  c.buyerName,
                                  date,
                                  count > 1 ? `×${count}` : '×1',
                                  _isFirst ? fmtN(c.pricePerTrain) : '',
                                  fmtN(_cumTrains * c.pricePerTrain),
                                  _isFirst ? _endDate : '',
                                  _isFirst ? c.startDate : '',
                                  _isFirst ? fmtN(c.totalTrains) : '',
                                  _isFirst ? fmtN(_done) : '',
                                  _isFirst ? `${_done}/${c.totalTrains}` : ''
                              ]);
                              rowColors.push(_rowColor);
                              rowTextColors.push(null);
                          });
                      }

                      if (cIdx < sortedSales.length - 1) {
                          rows.push(['', '', '', '', '', '', '', '', '', '']);
                          rowColors.push(null);
                          rowTextColors.push(null);
                      }
                  });
                  if (_syncCfg.contracts !== false) sheets.push({ name: 'Contracts', rows, rowColors, rowTextColors });

              }


              const _isLingerieForSync = (state?.typeId === 32 || state?.typeName === 'Lingerie Store');
              try {
                  const taxCfg = TaxCollection.loadCfg();
                  const taxEmps = state?.employees || {};
                  if (_isLingerieForSync && Object.keys(taxCfg.employees || {}).length) {


                      const _isManualOnlySync = taxCfg.manualOnly || false;
                      let _taxDataForSync = _isManualOnlySync ? null : UI._taxData;
                      if (!_taxDataForSync && !_isManualOnlySync) {
                          const _syncApiKey = Storage.getApiKey();
                          if (_syncApiKey) {
                              try { _taxDataForSync = await TaxCollection.fetchLogs(_syncApiKey); } catch(_fe) {}
                          }
                      }
                      if (_isManualOnlySync || _taxDataForSync) {
                      const payments = TaxCollection.mergeManualPayments(
                          (!_isManualOnlySync && _taxDataForSync)
                              ? TaxCollection.processPayments(_taxDataForSync, taxEmps, taxCfg)
                              : {},
                          taxCfg
                      );
                      const periodsToShow = taxCfg.settings?.periodsToShow || 2;
                      const taxRows = [['Employee','Torn ID','Tax Type','Period Type','Required / Period','This Period Paid','Total Paid','Status','Last Payment','Paid Until','Periods Left']];
                          const _taxColors = ['#6495ED'];
                          const _taxTextColors = ['#ffffff'];
                          const _taxUnsorted = [];
                          Object.keys(taxEmps).sort().forEach(id => {
                              const emp = taxEmps[id];
                              const ec = taxCfg.employees[id] || {};
                              if (ec.exempt) return;
                              const periodType = ec.period || 'weekly';
                              const reqType = ec.type || 'money';
                              const req = ec.amount || 0;
                              const reqStr = reqType === 'money' ? fmtN(req) : `${req} Xanax`;
                              const _puData = TaxCollection.calcPaidUntil(id, taxEmps, payments, taxCfg);
                          const _curPKey = TaxCollection.currentPeriod(periodType, taxCfg);
                          const _curBkt = (payments[id] || {})[_curPKey] || { money: 0, items: 0 };
                          const _curAmt = reqType === 'item' ? _curBkt.items : _curBkt.money;
                          const _curStr = reqType === 'item' ? `${_curAmt} Xanax` : fmtN(_curAmt);
                          const _totAmt = _puData ? _puData.totalPaid : 0;
                          const _totStr = reqType === 'item' ? `${_totAmt} Xanax` : `$${(_totAmt/1e6).toFixed(2)}M`;
                          const isCovered = _puData && !_puData.expired;
                          const periodsLeft = _puData ? parseFloat(_puData.periodsLeft) : 0;
                          const isAboutToExpire = isCovered && periodsLeft < 2;
                          const statusStr = isCovered ? 'PAID' : 'UNPAID';
                          let rowColor = '#ea9999';
                          if (isCovered && !isAboutToExpire) rowColor = '#90EE90';
                          else if (isAboutToExpire) rowColor = '#FF00FF';
                          _taxUnsorted.push({
                              row: [
                                  emp?.name || id, id, reqType, periodType, reqStr,
                                  _curStr,
                                  _totStr,
                                  statusStr,
                                  _puData ? _puData.paidFromStr : '',
                                  _puData ? _puData.paidUntilStr : '',
                                  _puData ? _puData.periodsLeft.toFixed(1) : '0'
                              ],
                                  isCovered, isAboutToExpire, rowColor
                              });
                          });
                          _taxUnsorted.sort((a, b) => {
                              if (a.isCovered && !a.isAboutToExpire && !(b.isCovered && !b.isAboutToExpire)) return -1;
                              if (!(a.isCovered && !a.isAboutToExpire) && b.isCovered && !b.isAboutToExpire) return 1;
                              if (a.isAboutToExpire && !b.isAboutToExpire) return -1;
                              if (!a.isAboutToExpire && b.isAboutToExpire) return 1;
                              return 0;
                          });
                          _taxUnsorted.forEach(({ row, rowColor }) => {
                              taxRows.push(row);
                              _taxColors.push(rowColor);
                              _taxTextColors.push(null);
                          });
                          if (_syncCfg.tax !== false && taxRows.length > 1) {
                              sheets.push({ name: 'Tax Collections', rows: taxRows, rowColors: _taxColors, rowTextColors: _taxTextColors });
                          }
                      }
                  }
              } catch(e) { console.warn('[TCM] Tax sync skipped:', e); }


              const _spTypeId = state?.typeInt ? Number(state.typeInt) : 0;
              if (_spTypeId > 0 && state?.typeName && state?.stock && Object.keys(state.stock || {}).length) {
                  const _spData = Storage.getStockPerf().filter(e => e.typeId === _spTypeId);
                  if (_spData.length) {
                      const _spRows = [['Date','Product','Cost','RRP','Price','Sold','Created','Stock','On Order','Worth','Profit','Net Flow','Employees','Positions']];
                      const _spSorted = [..._spData].sort((a, b) => b.date.localeCompare(a.date));
                      _spSorted.forEach((entry, idx) => {
                          const _prevEntry = _spSorted[idx + 1];
                          const posStr = Object.entries(entry.positions || {}).map(([k,v])=>`${k}:${v}`).join(' ');
                          Object.entries(entry.products || {}).forEach(([pName, prod]) => {
                              const sold   = prod.sold_amount || 0;
                              const price  = prod.price       || 0;
                              const cost   = prod.cost        || 0;
                              const stock  = prod.in_stock    || 0;
                              const profit = (price - cost) * sold;
                              const prevProd = _prevEntry?.products?.[pName];
                              const created  = prevProd != null ? stock - (prevProd.in_stock||0) + sold : '';
                              const netFlow  = prevProd != null ? (created !== '' ? created - sold : '') : '';
                              _spRows.push([
                                  entry.date, pName,
                                  fmtN(cost), fmtN(prod.rrp||0), fmtN(price),
                                  fmtN(sold), created !== '' ? fmtN(created) : '—',
                                  fmtN(stock), fmtN(prod.on_order||0),
                                  fmtN(prod.sold_worth||0), fmtN(profit),
                                  netFlow !== '' ? fmtN(netFlow) : '—',
                                  entry.employeeCount, posStr
                              ]);
                          });
                      });
                      if (_syncCfg.stock !== false) sheets.push({
                          name: `Stock Performance ${state.typeName}`,
                          rows: _spRows,
                          rowColors:     ['#1a1a2e', ...Array(_spRows.length - 1).fill(null)],
                          rowTextColors: ['#7eb8ff', ...Array(_spRows.length - 1).fill(null)],
                          appendMode: true
                      });
                  }
              }


              if (_syncCfg.eeranking !== false && state?.employees) {
                  const _eeDirId = String(state.directorId || '');
                  const _eeRows = [['Employee','Position','WS EE','Merits','Settled-In','Management','Total (ex-Addiction)','Addiction','Total (incl-Addiction)']];
                  Object.entries(state.employees)
                      .filter(([id, e]) => e.position !== 'Director' && String(id) !== _eeDirId)
                      .map(([id, emp]) => {
                          const wsEE = emp.effectiveness?.working_stats || 0;
                          const merits = emp.effectiveness?.merits || 0;
                          const settled = emp.effectiveness?.settled_in || 0;
                          const mgmt = emp.effectiveness?.management || 0;
                          const addiction = emp.effectiveness?.addiction || 0;
                          const totalEx = wsEE + merits + settled + mgmt;
                          return { name: emp.name, position: emp.position, wsEE, merits, settled, mgmt, totalEx, addiction, totalIncl: emp.effectiveness?.total || 0 };
                      })
                      .sort((a, b) => b.totalEx - a.totalEx)
                      .forEach(r => _eeRows.push([r.name, r.position, fmtN(r.wsEE), fmtN(r.merits), fmtN(r.settled), fmtN(r.mgmt), fmtN(r.totalEx), fmtN(r.addiction), fmtN(r.totalIncl)]));
                  if (_eeRows.length > 1) sheets.push({
                      name: 'EE Ranking',
                      rows: _eeRows,
                      rowColors:     ['#1a1a2e', ...Array(_eeRows.length - 1).fill(null)],
                      rowTextColors: ['#7eb8ff', ...Array(_eeRows.length - 1).fill(null)]
                  });
              }

              const _managedSheets = ['Finance','Trains','Contracts','Tax Collections','EE Ranking'];
  if (state?.typeName) _managedSheets.push(`Stock Performance ${state.typeName}`);
  const _activeSheetNames = new Set(sheets.map(s => s.name));
  const deleteSheets = _managedSheets.filter(n => !_activeSheetNames.has(n));
  const _syncBody = JSON.stringify({ sheets, deleteSheets });
              const _isMobileSync = /TornPDA|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth <= 520;
              if (_isMobileSync) {
                  try {
                      const _fr = await fetch(cfg.webAppUrl, {
                          method: 'POST',
                          body: _syncBody,
                          headers: { 'Content-Type': 'text/plain' }
                      });
                      if (_fr.ok) {
                          const _c2 = GoogleSync.getCfg();
                          _c2.lastSync = new Date().toISOString();
                          _c2.lastSyncOk = true;
                          GoogleSync.saveCfg(_c2);
                          return { allOk: true };
                      }
                      console.warn('[TCM] Mobile fetch returned status', _fr.status, '— falling through to GM_xmlhttpRequest');
                  } catch(_fErr) {
                      console.warn('[TCM] Mobile fetch threw:', _fErr.message, '— falling through to GM_xmlhttpRequest');
                  }

              }
              return new Promise(resolve => {
                  GM_xmlhttpRequest({
                      method: 'POST',
                      url: cfg.webAppUrl,
                      data: _syncBody,
                      headers: { 'Content-Type': 'text/plain' },
                      timeout: 30000,
                      onload(res) {
                          if (res.status === 200) {
                              const cfg2 = GoogleSync.getCfg();
                              cfg2.lastSync = new Date().toISOString();
                              cfg2.lastSyncOk = true;
                              GoogleSync.saveCfg(cfg2);
                              resolve({ allOk: true });
                          } else {
                              const cfg2 = GoogleSync.getCfg();
                              cfg2.lastSync = new Date().toISOString();
                              cfg2.lastSyncOk = false;
                              GoogleSync.saveCfg(cfg2);
                              resolve({ allOk: false });
                          }
                      },
                      onerror(_err) {
                          console.warn('[TCM] Google Sheets sync error:', _err);
                          const c2 = GoogleSync.getCfg();
                          c2.lastSync = new Date().toISOString();
                          c2.lastSyncOk = false;
                          GoogleSync.saveCfg(c2);
                          resolve({ allOk: false });
                      },
                      ontimeout() {
                          console.warn('[TCM] Google Sheets sync timeout');
                          resolve({ allOk: false });
                      }
                  });
              });
          }
      };





      const API = {
          _lastCall: 0, _queue: [], _busy: false, _ts: Date.now(),

_request(url, resolve, reject, attempt = 1) {
              const _bustedUrl = url + (url.includes('?') ? '&' : '?') + '_ts=' + Date.now();
              GM_xmlhttpRequest({
                  method: 'GET', url: _bustedUrl, timeout: 15000,
                  anticache: true,
                  headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' },
                  onload(res) {
                      try {
                          const data = JSON.parse(res.responseText);
                          if (data.error) reject({ code: data.error.code, msg: API._errorMsg(data.error.code, data.error.error) });
                          else resolve(data);
                      } catch (e) {
                          if (attempt < 3) {
                              setTimeout(() => API._request(url, resolve, reject, attempt + 1), 2000 * attempt);
                          } else {
                              reject({ code: -1, msg: 'Could not parse API response after 3 attempts.' });
                          }
                      }
                  },
                  onerror() {
                      if (attempt < 3) setTimeout(() => API._request(url, resolve, reject, attempt + 1), 2000 * attempt);
                      else reject({ code: -2, msg: 'Network error — check your connection.' });
                  },
                  ontimeout() { reject({ code: -3, msg: 'Request timed out. Try again.' }); }
              });
          },
          _process() {
              if (this._busy || !this._queue.length) return;
              this._busy = true;
const _rateMs = Math.round(60000 / Math.max(10, Math.min(100, parseInt(Storage.getSettings().apiRateLimit) || 60)));
              const wait = Math.max(0, _rateMs - (Date.now() - this._lastCall));
              setTimeout(() => {
                  const { url, resolve, reject } = this._queue.shift();
                  this._lastCall = Date.now();
                  this._request(url, resolve, reject);
                  this._busy = false;
                  this._process();
              }, wait);
          },

  call(url) {
              return new Promise((resolve, reject) => {
                  this._queue.push({ url, resolve, reject });
                  this._process();
              });
          },

getCompanyData() {
              const key = Storage.getCompanyKey() || Storage.getApiKey();
              if (!key) return Promise.reject({ code: 0, msg: 'No API key set.' });
              // Progressive selections — directors usually get full data; employees often only public slices.
              const attempts = [
                  { selections: 'profile,employees,detailed,stock,news', level: 'full' },
                  { selections: 'profile,employees,news', level: 'member' },
                  { selections: 'profile,employees', level: 'member' },
                  { selections: 'profile', level: 'profile' }
              ];
              const accessCodes = new Set([15, 16]);
              const self = this;
              return (async () => {
                  let lastErr = null;
                  for (const att of attempts) {
                      try {
                          const data = await self.call(
                              `${TCM.API_BASE}/company/?selections=${att.selections}&key=${key}`
                          );
                          if (data && data.error) {
                              const code = data.error.code;
                              lastErr = { code, msg: (API._errorMsg && API._errorMsg(code, data.error.error)) || data.error.error };
                              if (accessCodes.has(code)) continue;
                              throw lastErr;
                          }
                          const hasDetailed = !!(data.company_detailed && Object.keys(data.company_detailed).length);
                          const stockObj = data.company_stock || data.stock || {};
                          const hasStock = !!(stockObj && Object.keys(stockObj).length);
                          const hasEmployees = !!(data.company_employees && Object.keys(data.company_employees).length);
                          let accessLevel = att.level;
                          if (accessLevel === 'full' && (!hasDetailed || !hasStock)) {
                              accessLevel = hasEmployees ? 'member' : 'profile';
                          }
                          data._tcmAccess = {
                              level: accessLevel,
                              selections: att.selections,
                              hasDetailed,
                              hasStock,
                              hasEmployees,
                              hasNews: !!(data.news || data.company_news)
                          };
                          return data;
                      } catch (e) {
                          lastErr = e;
                          const code = e && e.code;
                          if (accessCodes.has(code)) continue;
                          const msg = String((e && (e.msg || e.message)) || e || '').toLowerCase();
                          if (/access|permission|selection|privileg|insufficient/i.test(msg)) continue;
                          throw e;
                      }
                  }
                  throw lastErr || { code: 16, msg: 'Access level too low for company data.' };
              })();
          },

getMyTornId() {
              const key = Storage.getApiKey();
              if (!key) return Promise.reject({ code: 0, msg: 'No API key set.' });

              return this.call(`${TCM.API_BASE}/user/?key=${key}`);
          },
getUserTrainingLog(daysBack, maxPages) {
              const key = Storage.getApiKey();
              if (!key) return Promise.reject({ code: 0, msg: 'No API key set.' });

              const _fromTs    = Math.floor((Date.now() - (daysBack || 84) * 86400000) / 1000);
              const _maxPages  = maxPages || 100;
              const _PAGE_SIZE = 100;
              const _allLog    = {};
              const _self      = this;

              function _fetchPage(toTs, pageNum, resolve, reject) {
                  const url = `${TCM.API_BASE}/v2/user/log?log=6263&limit=${_PAGE_SIZE}&from=${_fromTs}&to=${toTs}&key=${key}`;
                  _self._request(url, (data) => {
                      const raw = data?.log;
                      const entries = raw ? (Array.isArray(raw) ? raw : Object.values(raw)) : [];
                      let oldestTs = null;
                      entries.forEach(e => {
                          const eid = e.id || `${e.timestamp}_${JSON.stringify(e.data || {})}`;
                          _allLog[eid] = e;
                          if (e.timestamp && (oldestTs === null || e.timestamp < oldestTs)) oldestTs = e.timestamp;
                      });
                      const exhausted = entries.length < _PAGE_SIZE || oldestTs === null || oldestTs <= _fromTs || pageNum >= _maxPages;
                      if (exhausted) { resolve({ log: _allLog }); return; }
                      setTimeout(() => _fetchPage(oldestTs - 1, pageNum + 1, resolve, reject), 1000);
                  }, reject);
              }

              return new Promise((resolve, reject) => {
                  _fetchPage(Math.floor(Date.now() / 1000), 1, resolve, reject);
              });
          },


          getCompanyTypeList(typeId, offset = 0) {
            const key = Storage.getApiKey();
            if (!key) return Promise.reject({ code: 0, msg: 'No API key set.' });
            return this.call(`${TCM.API_BASE}/v2/company/${typeId}/companies?limit=100&offset=${offset}&key=${key}`);
        },


getCompanyEmployees(companyId) {
              const key = Storage.getApiKey();
              if (!key) return Promise.reject({ code: 0, msg: 'No API key set.' });
              return this.call(`${TCM.API_BASE}/company/${companyId}?selections=employees&key=${key}`);
          },
getUserHof(userId) {
              const key = Storage.getApiKey();
              if (!key) return Promise.reject({ code: 0, msg: 'No API key set.' });
              return this.call(`${TCM.API_BASE}/v2/user/${userId}/hof?key=${key}`);
          },
        getCompanyDataForKey(apiKey) {
              if (!apiKey) return Promise.reject({ code: 0, msg: 'No API key.' });
              return new Promise((resolve, reject) => {
                  this._request(
                      `${TCM.API_BASE}/company/?selections=profile,employees,detailed,stock&key=${apiKey}`,
                      resolve, reject
                  );
              });
          },
_errorMsg(code, raw) {
              const msgs = {
                  0:'Unknown error.', 1:'API key is empty.',
                  2:'Incorrect API key.', 3:'Wrong request type for this key.',
                  4:'Wrong API fields requested.',
                  5:'Rate limited.', 6:'Malformed ID in request — try again or reload.',
                  7:"Your account isn't currently in a company, so Torn can't return company data — join/rejoin a company, or switch to a key for an account that's in one.",
                  8:'IP temporarily blocked.', 9:'Torn API temporarily disabled — try again shortly.',
                  10:'Key owner is in federal jail.',
                  11:'API key was changed or removed — re-add it in settings.',
                  12:'Key lacks read access.', 13:'Daily API limit reached.',
                  14:'Torn API backend error — try again shortly.',
                  15:'API key access level too low — Full key required.',
                  16:'Access level too low for this selection.',
                  17:'Torn API backend error — try again shortly.',
                  18:'API key was paused by its owner.',
                  20:'API key was revoked.',
                  22:'Key owner needs to complete 2FA on Torn.'
              };
              return msgs[code] || (raw ? `${raw} (code ${code})` : `Unknown API error (code ${code}).`);
          }
      };





      const Calc = {
          statEff(current, required) {
              if (!required || required <= 0 || !current || current <= 0) return 0;
              const linear = Math.min(45, (45 / required) * current);
              const log    = Math.max(0, 5 * Math.log2(current / required));
              return Math.floor(linear + log);
          },

          totalEff(priCurrent, priRequired, secCurrent, secRequired) {
              return this.statEff(priCurrent, priRequired) +
                     this.statEff(secCurrent, secRequired);
          },


          cappedEff(priCurrent, priRequired, secCurrent, secRequired) {
              return Math.min(TCM.OPT_EE_CAP, this.totalEff(priCurrent, priRequired, secCurrent, secRequired));
          },

          trainsNeeded(current, target, isPrimary) {
              if (current >= target) return 0;
              const gain = isPrimary ? TCM.TRAIN_PRIMARY : TCM.TRAIN_SECONDARY;
              return Math.ceil((target - current) / gain);
          },

          simStat(current, trains, isPrimary) {
              return current + trains * (isPrimary ? TCM.TRAIN_PRIMARY : TCM.TRAIN_SECONDARY);
          },

          roiScore(gStat, vRole, aUser, pRecent, w) {
              const weights = w || { Wg: 0.25, Wv: 0.25, Wa: 0.25, Wp: 0.25 };
              return (gStat * weights.Wg) + (vRole * weights.Wv) +
                     (aUser * weights.Wa) - (pRecent * weights.Wp);
          },

          roiClass(trainsNeeded) {
              if (trainsNeeded <= TCM.ROI_SHORT) return 'short-term';
              if (trainsNeeded <= TCM.ROI_LONG)  return 'long-term';
              return 'not-worth-it';
          },

          eeTier(eff) {
              if (eff >= TCM.EE_TIER_4) return 4;
              if (eff >= TCM.EE_TIER_3) return 3;
              if (eff >= TCM.EE_TIER_2) return 2;
              if (eff >= TCM.EE_TIER_1) return 1;
              return 0;
          },







          trainsToNextTier(wsEff, priCurrent, priReq, secCurrent, secReq, totalEff, priGain, secGain) {
              priGain = priGain || TCM.TRAIN_PRIMARY;
              secGain = secGain || TCM.TRAIN_SECONDARY;
              const tiers = [TCM.EE_TIER_1, TCM.EE_TIER_2, TCM.EE_TIER_3, TCM.EE_TIER_4];

              const baseForTier = (totalEff !== undefined) ? totalEff : wsEff;
              const nextTierThreshold = tiers.find(t => t > baseForTier);
              if (!nextTierThreshold) return null;

              const bonuses = baseForTier - wsEff;





          const formulaBaseline = this.totalEff(priCurrent, priReq, secCurrent, secReq);
          let trains = 0;
          let pri = priCurrent, sec = secCurrent;
          while (trains < 500) {
              trains++;
              pri += priGain;
              sec += secGain;
              const formulaWsEff = this.totalEff(pri, priReq, sec, secReq);
              const wsEffDelta = formulaWsEff - formulaBaseline;
              const newTotal = wsEff + wsEffDelta + bonuses;
              if (newTotal >= nextTierThreshold) {
                  return { trains, targetTier: this.eeTier(newTotal), threshold: nextTierThreshold };
              }
          }
          return null;
      },

          crossesTier(currentEff, projectedEff) {
              return this.eeTier(projectedEff) > this.eeTier(currentEff);
          },

          daysSince(unixTs) {
              if (!unixTs) return Infinity;
              return (Date.now() / 1000 - unixTs) / 86400;
          },

          totalSalaries(employees) {
              return Object.values(employees || {})
                  .reduce((sum, emp) => sum + (emp.wage || 0), 0);
          },

          fmtNum(n) {
              if (!n && n !== 0) return '?';
              if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
              if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
              if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
              return Math.round(n).toString();
          },

          fmtCash(n) {
              if (n == null || isNaN(n)) return '$?';
              const abs = Math.abs(Math.round(n));
              const sign = n < 0 ? '-' : '';
              if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
              return sign + '$' + abs.toLocaleString('en-US');
          }
      };





      const PosNorm = {
          normalize(apiName) {
              if (!apiName) return apiName;
              return TCM.POSITION_ALIASES[apiName] || apiName;
          },
          resolve(apiName, positions) {
              if (!positions || !apiName) return null;
              if (positions[apiName]) return { key: apiName, data: positions[apiName] };
              const normalized = this.normalize(apiName);
              if (positions[normalized]) return { key: normalized, data: positions[normalized] };

          const lower = apiName.toLowerCase();
          for (const [key, data] of Object.entries(positions)) {
              if (key.toLowerCase() === lower) return { key, data };
          }


          for (const [key, data] of Object.entries(positions)) {
              const kl = key.toLowerCase();
              if ((lower.startsWith(kl) || kl.startsWith(lower)) && Math.abs(key.length - apiName.length) <= 5) {
                  return { key, data };
              }
          }
          return null;
      }
      };

      function _tcmValid() {
          return true;
      }




      const CompanyData = {
          version: TCM.DATA_VERSION,
          lastVerified: TCM.DATA_VERIFIED,

          typeName(typeInt) { return TCM.TYPE_MAP[typeInt] || null; },

          positions(companyTypeName) {
              const base = this._db[companyTypeName];
              if (!base) return null;
              const overrides = Storage.getOverrides()[companyTypeName] || {};
              if (!Object.keys(overrides).length) return base;
              const merged = {};
              for (const [role, data] of Object.entries(base)) {
                  merged[role] = { ...data, ...(overrides[role] || {}) };
              }
              return merged;
          },

          allTypes() { return Object.keys(this._db); },

          _db: {
              'Adult Novelties': {
                  'Human Resources': { primary:'int', secondary:'end', priReq:12000, secReq:6000,  priGain:50, secGain:25, special:'trainer'  },
                  'Sexpert':         { primary:'int', secondary:'end', priReq:10000, secReq:5000,  priGain:49, secGain:25, special:null        },
                  'Store Manager':   { primary:'end', secondary:'int', priReq:8000,  secReq:4000,  priGain:47, secGain:24, special:'manager'   },
                  'Marketing Manager':{ primary:'int',secondary:'end', priReq:8000,  secReq:4000,  priGain:47, secGain:24, special:'marketer'  },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:6000,  secReq:3000,  priGain:45, secGain:23, special:'secretary' },
                  'Sales Assistant': { primary:'end', secondary:'man', priReq:4000,  secReq:2000,  priGain:41, secGain:21, special:null        },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:2000,  secReq:1000,  priGain:36, secGain:18, special:'cleaner'   }
              },
              'Amusement Park': {
                  'Inspector':       { primary:'int', secondary:'end', priReq:135000, secReq:67500, priGain:70, secGain:35, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:90000,  secReq:45000, priGain:66, secGain:33, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:90000,  secReq:45000, priGain:66, secGain:33, special:'marketer' },
                  'Security Guard':  { primary:'man', secondary:'end', priReq:79000,  secReq:39500, priGain:65, secGain:33, special:null       },
                  'Mechanic':        { primary:'man', secondary:'int', priReq:67500,  secReq:33750, priGain:64, secGain:32, special:null       },
                  'Accountant':      { primary:'end', secondary:'int', priReq:67500,  secReq:33750, priGain:64, secGain:32, special:'secretary'},
                  'Ride Attendant':  { primary:'end', secondary:'int', priReq:45000,  secReq:22500, priGain:61, secGain:31, special:null       },
                  'Entertainer':     { primary:'man', secondary:'end', priReq:34000,  secReq:17000, priGain:58, secGain:29, special:null       },
                  'Ticket Agent':    { primary:'end', secondary:'int', priReq:22500,  secReq:11250, priGain:55, secGain:28, special:null       },
                  'Janitor':         { primary:'man', secondary:'end', priReq:22500,  secReq:11250, priGain:55, secGain:28, special:'cleaner'  }
              },
              'Candle Shop': {
                  'Chandler':        { primary:'man', secondary:'int', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:null        },
                  'Trainer':         { primary:'int', secondary:'end', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:'trainer'   },
                  'Quality Control': { primary:'end', secondary:'int', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:'manager'   },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:2500,  secReq:1250, priGain:38, secGain:19, special:'secretary' },
                  'Salesperson':     { primary:'end', secondary:'int', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null        },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:'cleaner'   }
              },
              'Car Dealership': {
                  'Training Adviser':{ primary:'int', secondary:'end', priReq:63000, secReq:31500, priGain:63, secGain:32, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:42000, secReq:21000, priGain:60, secGain:30, special:'manager'  },
                  'Webmaster':       { primary:'int', secondary:'end', priReq:42000, secReq:21000, priGain:60, secGain:30, special:'marketer' },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:31500, secReq:15750, priGain:58, secGain:29, special:'secretary'},
                  'Mechanic':        { primary:'man', secondary:'end', priReq:26500, secReq:13250, priGain:56, secGain:28, special:null       },
                  'Sales Executive': { primary:'int', secondary:'end', priReq:21000, secReq:10500, priGain:55, secGain:28, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:10500, secReq:5250,  priGain:49, secGain:25, special:'cleaner'  },
                  'Sales Apprentice':{ primary:'int', secondary:'end', priReq:5500,  secReq:2750,  priGain:44, secGain:22, special:null       }
              },
              'Clothing Store': {
                  'Line Manager':    { primary:'int', secondary:'end', priReq:6000,  secReq:3000, priGain:45, secGain:23, special:'trainer'   },
                  'Store Manager':   { primary:'end', secondary:'int', priReq:4000,  secReq:2000, priGain:41, secGain:21, special:'manager'   },
                  'Marketing Manager':{ primary:'int',secondary:'end', priReq:4000,  secReq:2000, priGain:41, secGain:21, special:'marketer'  },
                  'Accountant':      { primary:'end', secondary:'int', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:'secretary' },
                  'Security Guard':  { primary:'man', secondary:'end', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:null        },
                  'Salesperson':     { primary:'int', secondary:'end', priReq:2000,  secReq:1000, priGain:36, secGain:18, special:null        },
                  'Cashier':         { primary:'end', secondary:'man', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null        },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:'cleaner'   },
                  'Sales Trainee':   { primary:'int', secondary:'end', priReq:500,   secReq:250,  priGain:25, secGain:13, special:null        }
              },
              'Cruise Line': {
                  'Captain':         { primary:'int', secondary:'end', priReq:154500, secReq:77250, priGain:71, secGain:36, special:null       },
                  'First Officer':   { primary:'int', secondary:'end', priReq:105000, secReq:52500, priGain:67, secGain:34, special:null       },
                  'Doctor':          { primary:'int', secondary:'end', priReq:103000, secReq:51500, priGain:67, secGain:34, special:null       },
                  'Specialist':      { primary:'int', secondary:'end', priReq:90000,  secReq:45000, priGain:66, secGain:33, special:'trainer'  },
                  'Bosun':           { primary:'end', secondary:'int', priReq:74000,  secReq:37000, priGain:65, secGain:33, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:72000,  secReq:36000, priGain:64, secGain:32, special:'marketer' },
                  'Chef':            { primary:'int', secondary:'end', priReq:64500,  secReq:32250, priGain:64, secGain:32, special:null       },
                  'Engineer':        { primary:'man', secondary:'int', priReq:54500,  secReq:27250, priGain:62, secGain:31, special:null       },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:42000,  secReq:21000, priGain:60, secGain:30, special:'secretary'},
                  'Steward':         { primary:'end', secondary:'int', priReq:41500,  secReq:20750, priGain:60, secGain:30, special:null       },
                  'Bartender':       { primary:'end', secondary:'man', priReq:38500,  secReq:19250, priGain:59, secGain:30, special:null       },
                  'Deckhand':        { primary:'man', secondary:'end', priReq:26000,  secReq:13000, priGain:56, secGain:28, special:'cleaner'  },
                  'Ticket Agent':    { primary:'end', secondary:'int', priReq:26000,  secReq:13000, priGain:56, secGain:28, special:null       }
              },
              'Cyber Cafe': {
                  'Teacher':         { primary:'int', secondary:'end', priReq:30000, secReq:15000, priGain:57, secGain:29, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:20000, secReq:10000, priGain:54, secGain:27, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:20000, secReq:10000, priGain:54, secGain:27, special:'marketer' },
                  'Administrator':   { primary:'int', secondary:'end', priReq:20000, secReq:10000, priGain:54, secGain:27, special:null       },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:15000, secReq:7500,  priGain:52, secGain:26, special:'secretary'},
                  'Technician':      { primary:'int', secondary:'man', priReq:17500, secReq:8750,  priGain:53, secGain:27, special:null       },
                  'Cashier':         { primary:'end', secondary:'int', priReq:10000, secReq:5000,  priGain:49, secGain:25, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:5000,  secReq:2500,  priGain:43, secGain:22, special:'cleaner'  }
              },
              'Detective Agency': {
                  'Chief Investigator':   { primary:'int', secondary:'man', priReq:80000, secReq:40000, priGain:65, secGain:33, special:null       },
                  'Client Liaison':       { primary:'int', secondary:'end', priReq:62000, secReq:31000, priGain:63, secGain:32, special:null       },
                  'Intelligence Analyst': { primary:'int', secondary:'end', priReq:58000, secReq:29000, priGain:63, secGain:32, special:null       },
                  'Surveillance':         { primary:'int', secondary:'man', priReq:52000, secReq:26000, priGain:62, secGain:31, special:null       },
                  'Private Investigator': { primary:'int', secondary:'man', priReq:45500, secReq:22500, priGain:61, secGain:31, special:null       },
                  'Trainee Investigator': { primary:'int', secondary:'man', priReq:28000, secReq:14000, priGain:57, secGain:29, special:null       },
                  'Secretary':            { primary:'end', secondary:'man', priReq:25000, secReq:12500, priGain:56, secGain:28, special:'secretary' }
              },
              'Farm': {
                  'Consultant':      { primary:'int', secondary:'end', priReq:55500, secReq:27750, priGain:62, secGain:31, special:'trainer'  },
                  'Farm Manager':    { primary:'end', secondary:'int', priReq:37000, secReq:18500, priGain:59, secGain:30, special:'manager'  },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:28000, secReq:14000, priGain:57, secGain:29, special:'secretary'},
                  'Delivery Driver': { primary:'man', secondary:'end', priReq:23000, secReq:11500, priGain:55, secGain:28, special:null       },
                  'Dairy Farmer':    { primary:'man', secondary:'end', priReq:23000, secReq:11500, priGain:55, secGain:28, special:null       },
                  'Herdsperson':     { primary:'man', secondary:'end', priReq:18500, secReq:9250,  priGain:54, secGain:27, special:null       },
                  'Poultry Farmer':  { primary:'man', secondary:'end', priReq:18500, secReq:9250,  priGain:54, secGain:27, special:null       },
                  'Retailer':        { primary:'int', secondary:'end', priReq:18500, secReq:9250,  priGain:54, secGain:27, special:null       },
                  'Harvester':       { primary:'man', secondary:'end', priReq:14000, secReq:7000,  priGain:51, secGain:26, special:null       }
              },
              'Firework Stand': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:'trainer'  },
                  'Pyrotechnician':  { primary:'man', secondary:'int', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:null       },
                  'Manager':         { primary:'end', secondary:'int', priReq:2000,  secReq:1000, priGain:36, secGain:18, special:'manager'  },
                  'Advertising Manager':{ primary:'int',secondary:'end',priReq:2000, secReq:1000, priGain:36, secGain:18, special:'marketer' },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:'secretary'},
                  'Salesperson':     { primary:'end', secondary:'int', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:null       },
                  'Picker Packer':   { primary:'man', secondary:'end', priReq:500,   secReq:250,  priGain:25, secGain:13, special:null       }
              },
              'Fitness Center': {
                  'Manager':         { primary:'end', secondary:'int', priReq:62000, secReq:31000, priGain:63, secGain:32, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:62000, secReq:31000, priGain:63, secGain:32, special:'marketer' },
                  'Nutritionist':    { primary:'int', secondary:'man', priReq:54500, secReq:27250, priGain:62, secGain:31, special:null       },
                  'Swimming Instructor':{ primary:'end',secondary:'man',priReq:46500,secReq:23250, priGain:61, secGain:31, special:null       },
                  'Human Resources': { primary:'end', secondary:'int', priReq:46500, secReq:23250, priGain:61, secGain:31, special:'secretary'},
                  'Fitness Instructor':{ primary:'man',secondary:'end', priReq:46500,secReq:23250, priGain:61, secGain:31, special:null       },
                  'Lifeguard':       { primary:'end', secondary:'man', priReq:39000, secReq:19500, priGain:60, secGain:30, special:null       },
                  'Personal Trainer':{ primary:'man', secondary:'end', priReq:31000, secReq:15500, priGain:58, secGain:29, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:15500, secReq:7750,  priGain:52, secGain:26, special:'cleaner'  },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:10000, secReq:5000,  priGain:49, secGain:25, special:null       }
              },
              'Flower Shop': {
                  'Manager':         { primary:'end', secondary:'int', priReq:2000,  secReq:1000, priGain:36, secGain:18, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:2000,  secReq:1000, priGain:36, secGain:18, special:'marketer' },
                  'Accountant':      { primary:'end', secondary:'int', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:'secretary'},
                  'Florist':         { primary:'end', secondary:'man', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:null       },
                  'Arranger':        { primary:'int', secondary:'man', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:500,   secReq:250,  priGain:25, secGain:13, special:'cleaner'  },
                  'Apprentice':      { primary:'end', secondary:'man', priReq:500,   secReq:250,  priGain:25, secGain:13, special:null       }
              },
              'Furniture Store': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:19500, secReq:9750,  priGain:54, secGain:27, special:'trainer'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:13000, secReq:6500,  priGain:51, secGain:26, special:'marketer' },
                  'Manager':         { primary:'end', secondary:'int', priReq:13000, secReq:6500,  priGain:51, secGain:26, special:'manager'  },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:10000, secReq:5000,  priGain:49, secGain:25, special:'secretary'},
                  'Delivery Driver': { primary:'man', secondary:'end', priReq:8000,  secReq:4000,  priGain:47, secGain:24, special:null       },
                  'Sales Clerk':     { primary:'end', secondary:'int', priReq:6500,  secReq:3250,  priGain:45, secGain:23, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:3500,  secReq:1750,  priGain:40, secGain:20, special:'cleaner'  },
                  'Apprentice':      { primary:'end', secondary:'int', priReq:1500,  secReq:750,   priGain:34, secGain:17, special:null       }
              },
              'Game Shop': {
                  'Store Manager':   { primary:'end', secondary:'int', priReq:6000,  secReq:3000, priGain:45, secGain:23, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:6000,  secReq:3000, priGain:45, secGain:23, special:'marketer' },
                  'Game Advisor':    { primary:'int', secondary:'end', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:null       },
                  'Accountant':      { primary:'end', secondary:'int', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:'secretary'},
                  'Clerk':           { primary:'end', secondary:'man', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:'cleaner'  }
              },
              'Gas Station': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:70500, secReq:35250, priGain:64, secGain:32, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:60000, secReq:30000, priGain:63, secGain:32, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:40000, secReq:20000, priGain:60, secGain:30, special:'marketer' },
                  'Attendant':       { primary:'end', secondary:'int', priReq:26000, secReq:13000, priGain:56, secGain:28, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:17500, secReq:8750,  priGain:53, secGain:27, special:'cleaner'  }
              },
              'Gents Strip Club': {
                  'Photographer':    { primary:'int', secondary:'end', priReq:29000, secReq:14500, priGain:57, secGain:29, special:'marketer' },
                  'Security':        { primary:'man', secondary:'end', priReq:29000, secReq:14500, priGain:57, secGain:29, special:null       },
                  'Manager':         { primary:'end', secondary:'int', priReq:29000, secReq:14500, priGain:57, secGain:29, special:'manager'  },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:22000, secReq:11000, priGain:55, secGain:28, special:'secretary'},
                  'Stripper':        { primary:'end', secondary:'man', priReq:14500, secReq:7250,  priGain:52, secGain:26, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:7500,  secReq:3750,  priGain:46, secGain:23, special:'cleaner'  }
              },
              'Grocery Store': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:18000, secReq:9000,  priGain:53, secGain:27, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:12000, secReq:6000,  priGain:50, secGain:25, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:12000, secReq:6000,  priGain:50, secGain:25, special:'marketer' },
                  'Accountant':      { primary:'end', secondary:'int', priReq:9000,  secReq:4500,  priGain:48, secGain:24, special:'secretary'},
                  'Delivery Driver': { primary:'man', secondary:'end', priReq:7500,  secReq:3750,  priGain:46, secGain:23, special:null       },
                  'Cashier':         { primary:'end', secondary:'man', priReq:6000,  secReq:3000,  priGain:45, secGain:23, special:null       },
                  'Stock Clerk':     { primary:'man', secondary:'end', priReq:4500,  secReq:2250,  priGain:42, secGain:21, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:3000,  secReq:1500,  priGain:39, secGain:20, special:'cleaner'  },
                  'Cart Attendant':  { primary:'man', secondary:'end', priReq:3000,  secReq:1500,  priGain:39, secGain:20, special:null       }
              },
              'Gun Shop': {
                  'Instructor':      { primary:'int', secondary:'end', priReq:22500, secReq:11250, priGain:55, secGain:28, special:'trainer'  },
                  'Gunsmith':        { primary:'man', secondary:'int', priReq:15000, secReq:7500,  priGain:52, secGain:26, special:null       },
                  'Manager':         { primary:'end', secondary:'int', priReq:15000, secReq:7500,  priGain:52, secGain:26, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:15000, secReq:7500,  priGain:52, secGain:26, special:'marketer' },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:11500, secReq:5750,  priGain:50, secGain:25, special:'secretary'},
                  'Clerk':           { primary:'end', secondary:'man', priReq:7500,  secReq:3750,  priGain:46, secGain:23, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:4000,  secReq:2000,  priGain:41, secGain:21, special:'cleaner'  }
              },
              'Hair Salon': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:'trainer'  },
                  'Aesthetician':    { primary:'int', secondary:'end', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:null       },
                  'Senior Stylist':  { primary:'man', secondary:'end', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:'manager'  },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:2500,  secReq:1250, priGain:38, secGain:19, special:'secretary'},
                  'Colorist':        { primary:'man', secondary:'end', priReq:2000,  secReq:1000, priGain:36, secGain:18, special:null       },
                  'Stylist':         { primary:'man', secondary:'end', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null       },
                  'Nail Technician': { primary:'end', secondary:'man', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null       },
                  'Shampooist':      { primary:'man', secondary:'end', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:'cleaner'  },
                  'Apprentice':      { primary:'man', secondary:'end', priReq:500,   secReq:250,  priGain:25, secGain:13, special:null       }
              },
              'Ladies Strip Club': {
                  'Photographer':    { primary:'int', secondary:'end', priReq:33000, secReq:16500, priGain:58, secGain:29, special:'marketer' },
                  'Manager':         { primary:'end', secondary:'int', priReq:33000, secReq:16500, priGain:58, secGain:29, special:'manager'  },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:25000, secReq:12500, priGain:56, secGain:28, special:'secretary'},
                  'Security':        { primary:'man', secondary:'end', priReq:29000, secReq:14500, priGain:57, secGain:29, special:null       },
                  'Male Stripper':   { primary:'end', secondary:'man', priReq:14500, secReq:7250,  priGain:52, secGain:26, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:8500,  secReq:4250,  priGain:47, secGain:24, special:'cleaner'  }
              },
              'Law Firm': {
                  'Consultant':      { primary:'int', secondary:'end', priReq:33000, secReq:16500, priGain:58, secGain:29, special:'trainer'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:22000, secReq:11000, priGain:55, secGain:28, special:'marketer' },
                  'Secretary':       { primary:'end', secondary:'int', priReq:16500, secReq:8250,  priGain:53, secGain:27, special:'secretary'},
                  'Attorney':        { primary:'int', secondary:'end', priReq:11000, secReq:5500,  priGain:49, secGain:25, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:5500,  secReq:2750,  priGain:44, secGain:22, special:'cleaner'  },
                  'Assistant':       { primary:'end', secondary:'int', priReq:5500,  secReq:2750,  priGain:44, secGain:22, special:null       }
              },
              'Lingerie Store': {
                  'Human Resources': { primary:'int', secondary:'end', priReq:13500, secReq:6750, priGain:51, secGain:26, special:'trainer'  },
                  'Store Manager':   { primary:'end', secondary:'int', priReq:9000,  secReq:4500, priGain:48, secGain:24, special:'manager'  },
                  'Lingerie Model':  { primary:'int', secondary:'end', priReq:9000,  secReq:4500, priGain:48, secGain:24, special:'marketer' },
                  'Salesperson':     { primary:'end', secondary:'int', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:2500,  secReq:1250, priGain:38, secGain:19, special:'cleaner'  },
                  'Trainee':         { primary:'end', secondary:'int', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:null       }
              },
              'Logistics Management': {
                  'Procurement Manager':   { primary:'int', secondary:'end', priReq:140000, secReq:70000,  priGain:70, secGain:35, special:'marketer'  },
                  'Supply Chain Manager':  { primary:'int', secondary:'end', priReq:125000, secReq:62500,  priGain:69, secGain:35, special:'manager'   },
                  'Warehouse Manager':     { primary:'int', secondary:'end', priReq:115000, secReq:57500,  priGain:68, secGain:34, special:'cleaner'   },
                  'Transport Coordinator': { primary:'int', secondary:'end', priReq:85000,  secReq:42500,  priGain:66, secGain:33, special:null        },
                  'Shift Manager':         { primary:'int', secondary:'end', priReq:90000,  secReq:45000,  priGain:66, secGain:33, special:'secretary' },
                  'Forklift Operator':     { primary:'end', secondary:'man', priReq:60000,  secReq:30000,  priGain:63, secGain:32, special:null        },
                  'Driver':                { primary:'end', secondary:'man', priReq:57500,  secReq:28750,  priGain:63, secGain:32, special:null        },
                  'Lumper':                { primary:'man', secondary:'end', priReq:45000,  secReq:22500,  priGain:61, secGain:31, special:null        }
              },
              'Meat Warehouse': {
                  'Supervisor':      { primary:'int', secondary:'end', priReq:37500, secReq:18750, priGain:59, secGain:30, special:'trainer'  },
                  'Quality Controller':{ primary:'int',secondary:'man', priReq:25000, secReq:12500, priGain:56, secGain:28, special:null       },
                  'Manager':         { primary:'end', secondary:'int', priReq:25000, secReq:12500, priGain:56, secGain:28, special:'manager'  },
                  'Assistant':       { primary:'end', secondary:'int', priReq:19000, secReq:9500,  priGain:54, secGain:27, special:'secretary'},
                  'Retailer':        { primary:'int', secondary:'end', priReq:12500, secReq:6250,  priGain:50, secGain:25, special:null       },
                  'Butcher':         { primary:'man', secondary:'end', priReq:12500, secReq:6250,  priGain:50, secGain:25, special:null       },
                  'Packer':          { primary:'man', secondary:'end', priReq:9500,  secReq:4750,  priGain:48, secGain:24, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:6500,  secReq:3250,  priGain:45, secGain:23, special:'cleaner'  },
                  'Apprentice Butcher':{ primary:'man',secondary:'end', priReq:3000,  secReq:1500,  priGain:39, secGain:20, special:null       }
              },
              'Mechanic Shop': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:25500, secReq:12750, priGain:56, secGain:28, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:17000, secReq:8500,  priGain:53, secGain:27, special:'manager'  },
                  'Receptionist':    { primary:'end', secondary:'int', priReq:13000, secReq:6500,  priGain:51, secGain:26, special:'secretary'},
                  'Technician':      { primary:'man', secondary:'end', priReq:8500,  secReq:4250,  priGain:47, secGain:24, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:4500,  secReq:2250,  priGain:42, secGain:21, special:'cleaner'  },
                  'Apprentice Technician':{ primary:'man',secondary:'end',priReq:2000,secReq:1000, priGain:36, secGain:18, special:null       }
              },
              'Mining Corporation': {
                  'Secretary':       { primary:'end', secondary:'int', priReq:78000, secReq:39000, priGain:50, secGain:25, special:'secretary'},
                  'Site Manager':    { primary:'int', secondary:'end', priReq:97000, secReq:48750, priGain:67, secGain:34, special:'manager'  },
                  'Safety Inspector':{ primary:'int', secondary:'man', priReq:95000, secReq:47500, priGain:67, secGain:34, special:'cleaner'  },
                  'Mine Engineer':   { primary:'int', secondary:'end', priReq:81000, secReq:40500, priGain:65, secGain:33, special:null       },
                  'Sales Executive': { primary:'int', secondary:'end', priReq:83000, secReq:41500, priGain:66, secGain:33, special:null       },
                  'Electrician':     { primary:'end', secondary:'man', priReq:78000, secReq:39000, priGain:65, secGain:33, special:null       },
                  'Production Foreman':{ primary:'end',secondary:'man', priReq:79000, secReq:39500, priGain:65, secGain:33, special:null      },
                  'Mill Operator':   { primary:'man', secondary:'end', priReq:75000, secReq:37500, priGain:65, secGain:33, special:null       }
              },
              'Music Store': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:10500, secReq:5250,  priGain:49, secGain:25, special:'trainer'  },
                  'Musician':        { primary:'int', secondary:'man', priReq:9000,  secReq:4500,  priGain:48, secGain:24, special:null       },
                  'Supervisor':      { primary:'end', secondary:'int', priReq:7000,  secReq:3500,  priGain:46, secGain:23, special:'manager'  },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:5500,  secReq:2750,  priGain:44, secGain:22, special:'secretary'},
                  'Sales Assistant': { primary:'end', secondary:'int', priReq:3500,  secReq:1750,  priGain:40, secGain:20, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:2000,  secReq:1000,  priGain:36, secGain:18, special:'cleaner'  },
                  'Sales Apprentice':{ primary:'end', secondary:'int', priReq:1000,  secReq:500,   priGain:30, secGain:15, special:null       }
              },
              'Nightclub': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:81000, secReq:40500, priGain:65, secGain:33, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:54000, secReq:27000, priGain:62, secGain:31, special:'manager'  },
                  'Promoter':        { primary:'int', secondary:'end', priReq:54000, secReq:27000, priGain:62, secGain:31, special:'marketer' },
                  'Disk-jockey':     { primary:'int', secondary:'end', priReq:40500, secReq:20250, priGain:60, secGain:30, special:null       },
                  'Personal Assistant':{ primary:'end',secondary:'int', priReq:40500, secReq:20250, priGain:60, secGain:30, special:'secretary'},
                  'Bouncer':         { primary:'man', secondary:'end', priReq:48000, secReq:24000, priGain:61, secGain:31, special:null       },
                  'Bartender':       { primary:'end', secondary:'man', priReq:27000, secReq:13500, priGain:57, secGain:29, special:null       },
                  'Barback':         { primary:'end', secondary:'man', priReq:20500, secReq:10250, priGain:54, secGain:27, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:13500, secReq:6750,  priGain:51, secGain:26, special:'cleaner'  }
              },
              'Oil Rig': {
                  'Inspector':       { primary:'int', secondary:'end', priReq:225000, secReq:112500, priGain:74, secGain:37, special:'trainer'  },
                  'Driller':         { primary:'man', secondary:'int', priReq:150000, secReq:75000,  priGain:70, secGain:35, special:null       },
                  'Sales Executive': { primary:'int', secondary:'end', priReq:131500, secReq:65750,  priGain:69, secGain:35, special:null       },
                  'Motor Hand':      { primary:'man', secondary:'int', priReq:112500, secReq:56250,  priGain:68, secGain:34, special:null       },
                  'Secretary':       { primary:'end', secondary:'int', priReq:112500, secReq:56250,  priGain:68, secGain:34, special:'secretary'},
                  'Derrick Hand':    { primary:'man', secondary:'end', priReq:94000,  secReq:47000,  priGain:67, secGain:34, special:null       },
                  'Roughneck':       { primary:'man', secondary:'end', priReq:75000,  secReq:37500,  priGain:65, secGain:33, special:'cleaner'  }
              },
              'Private Security Firm': {
                  'Chief Strategist':    { primary:'int', secondary:'end', priReq:165000, secReq:82500, priGain:71, secGain:35, special:null       },
                  'Defense Consultant':  { primary:'int', secondary:'end', priReq:135000, secReq:67500, priGain:70, secGain:35, special:'trainer'  },
                  'Team Leader':         { primary:'man', secondary:'end', priReq:110000, secReq:55000, priGain:68, secGain:35, special:'manager'  },
                  'Medic':               { primary:'int', secondary:'end', priReq:90000,  secReq:45000, priGain:66, secGain:33, special:'cleaner'  },
                  'Disposal Engineer':   { primary:'int', secondary:'end', priReq:85000,  secReq:42500, priGain:66, secGain:33, special:null       },
                  'Comms Engineer':      { primary:'int', secondary:'end', priReq:85000,  secReq:42500, priGain:66, secGain:33, special:null       },
                  'Armorer':             { primary:'end', secondary:'man', priReq:80000,  secReq:40000, priGain:65, secGain:33, special:null       },
                  'Spokesperson':        { primary:'int', secondary:'end', priReq:80000,  secReq:40000, priGain:65, secGain:33, special:'marketer' },
                  'Reconnaissance':      { primary:'man', secondary:'int', priReq:80000,  secReq:40000, priGain:65, secGain:33, special:null       },
                  'Security Contractor': { primary:'man', secondary:'end', priReq:70000,  secReq:35000, priGain:64, secGain:32, special:null       },
                  'Company Liaison':     { primary:'int', secondary:'end', priReq:57500, secReq:115000, priGain:34, secGain:68, special:'secretary' }
              },
              'Property Broker': {
                  'Broker Support':      { primary:'int', secondary:'end', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:'trainer'  },
                  'Valuation Specialist':{ primary:'int', secondary:'end', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:null       },
                  'Team Manager':        { primary:'end', secondary:'int', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:'manager'  },
                  'Graphic Designer':    { primary:'int', secondary:'end', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:'marketer' },
                  'Receptionist':        { primary:'end', secondary:'int', priReq:2500,  secReq:1250, priGain:38, secGain:19, special:'secretary'},
                  'Property Broker':     { primary:'end', secondary:'int', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null       },
                  'Cleaner':             { primary:'man', secondary:'end', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:'cleaner'  },
                  'Associate Broker':    { primary:'end', secondary:'int', priReq:500,   secReq:250,  priGain:25, secGain:13, special:null       }
              },
              'Pub': {
                  'Trainer':         { primary:'int', secondary:'end', priReq:9000,  secReq:4500, priGain:48, secGain:24, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:6000,  secReq:3000, priGain:45, secGain:23, special:'manager'  },
                  'Bouncer':         { primary:'man', secondary:'end', priReq:6000,  secReq:3000, priGain:45, secGain:23, special:null       },
                  'Promoter':        { primary:'int', secondary:'end', priReq:6000,  secReq:3000, priGain:45, secGain:23, special:'marketer' },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:4500,  secReq:2250, priGain:42, secGain:21, special:'secretary'},
                  'Bartender':       { primary:'end', secondary:'man', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:null       },
                  'Waiter':          { primary:'end', secondary:'man', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:'cleaner'  }
              },
              'Restaurant': {
                  'Head Chef':       { primary:'end', secondary:'int', priReq:5000,  secReq:2500, priGain:43, secGain:22, special:'manager'  },
                  'Sous Chef':       { primary:'int', secondary:'end', priReq:4000,  secReq:2000, priGain:41, secGain:21, special:'trainer'  },
                  'Head Waiter':     { primary:'end', secondary:'int', priReq:4000,  secReq:2000, priGain:41, secGain:21, special:'secretary'},
                  'Chef':            { primary:'int', secondary:'man', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:null       },
                  'Line Cook':       { primary:'int', secondary:'man', priReq:2500,  secReq:1250, priGain:38, secGain:19, special:null       },
                  'Waiter':          { primary:'end', secondary:'man', priReq:2500,  secReq:1250, priGain:38, secGain:19, special:null       },
                  'Kitchen Assistant':{ primary:'man',secondary:'end', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:'cleaner'  },
                  'Dishwasher':      { primary:'man', secondary:'end', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null       },
                  'Apprentice Chef': { primary:'int', secondary:'man', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null       }
              },
              'Software Corporation': {
                  'Consultant':      { primary:'int', secondary:'end', priReq:72000, secReq:36000, priGain:64, secGain:32, special:'trainer'  },
                  'Lead Developer':  { primary:'end', secondary:'int', priReq:48000, secReq:24000, priGain:61, secGain:31, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:48000, secReq:24000, priGain:61, secGain:31, special:'marketer' },
                  'Analyst':         { primary:'end', secondary:'int', priReq:36000, secReq:18000, priGain:59, secGain:30, special:'secretary'},
                  'Developer':       { primary:'int', secondary:'end', priReq:24000, secReq:12000, priGain:56, secGain:28, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:12000, secReq:6000,  priGain:50, secGain:25, special:'cleaner'  },
                  'Graphic Designer':{ primary:'int', secondary:'end', priReq:18000, secReq:9000,  priGain:53, secGain:27, special:null       },
                  'Tester':          { primary:'int', secondary:'end', priReq:12000, secReq:6000,  priGain:50, secGain:25, special:null       },
                  'Apprentice':      { primary:'int', secondary:'end', priReq:6000,  secReq:3000,  priGain:45, secGain:23, special:null       }
              },
              'Sweet Shop': {
                  'Manager':         { primary:'end', secondary:'int', priReq:4000,  secReq:2000, priGain:41, secGain:21, special:'manager'  },
                  'Marketer':        { primary:'int', secondary:'end', priReq:4000,  secReq:2000, priGain:41, secGain:21, special:'marketer' },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:3000,  secReq:1500, priGain:39, secGain:20, special:'secretary'},
                  'Confectionist':   { primary:'int', secondary:'end', priReq:2500,  secReq:1250, priGain:38, secGain:19, special:null       },
                  'Clerk':           { primary:'end', secondary:'man', priReq:2000,  secReq:1000, priGain:36, secGain:18, special:null       },
                  'Packager':        { primary:'end', secondary:'man', priReq:1500,  secReq:750,  priGain:34, secGain:17, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:1000,  secReq:500,  priGain:30, secGain:15, special:'cleaner'  }
              },
              'Television Network': {
                  'Anchor':          { primary:'int', secondary:'end', priReq:132000, secReq:66000, priGain:69, secGain:35, special:null       },
                  'Attorney':        { primary:'int', secondary:'end', priReq:132000, secReq:66000, priGain:69, secGain:35, special:null       },
                  'Marketer':        { primary:'int', secondary:'end', priReq:132000, secReq:66000, priGain:69, secGain:35, special:'marketer' },
                  'Writer':          { primary:'int', secondary:'end', priReq:115500, secReq:57750, priGain:68, secGain:34, special:null       },
                  'Secretary':       { primary:'end', secondary:'int', priReq:99000,  secReq:49500, priGain:67, secGain:34, special:'secretary'},
                  'Producer':        { primary:'int', secondary:'end', priReq:99000,  secReq:49500, priGain:67, secGain:34, special:null       },
                  'Reporter':        { primary:'int', secondary:'end', priReq:82500,  secReq:41250, priGain:66, secGain:33, special:null       },
                  'Camera Operator': { primary:'int', secondary:'man', priReq:49500,  secReq:24750, priGain:61, secGain:31, special:null       },
                  'Sales Executive': { primary:'end', secondary:'int', priReq:49500,  secReq:24750, priGain:61, secGain:31, special:null       },
                  'Stagehand':       { primary:'man', secondary:'end', priReq:33000,  secReq:16500, priGain:58, secGain:29, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:33000,  secReq:16500, priGain:58, secGain:29, special:'cleaner'  },
                  'Programmer':      { primary:'int', secondary:'end', priReq:66000,  secReq:33000, priGain:64, secGain:32, special:null       }
              },
              'Theater': {
                  'Manager':         { primary:'end', secondary:'int', priReq:80000, secReq:40000, priGain:65, secGain:33, special:'manager'  },
                  'Marketing Manager':{ primary:'int',secondary:'end', priReq:80000, secReq:40000, priGain:65, secGain:33, special:'marketer' },
                  'Technician':      { primary:'man', secondary:'int', priReq:60000, secReq:30000, priGain:63, secGain:32, special:null       },
                  'Accountant':      { primary:'end', secondary:'int', priReq:60000, secReq:30000, priGain:63, secGain:32, special:'secretary'},
                  'Programmer':      { primary:'int', secondary:'end', priReq:50000, secReq:25000, priGain:62, secGain:31, special:null       },
                  'Ticketing Agent': { primary:'end', secondary:'int', priReq:20000, secReq:10000, priGain:54, secGain:27, special:null       },
                  'Usher':           { primary:'end', secondary:'man', priReq:20000, secReq:10000, priGain:54, secGain:27, special:null       },
                  'Janitor':         { primary:'man', secondary:'end', priReq:20000, secReq:10000, priGain:54, secGain:27, special:'cleaner'  }
              },
              'Toy Shop': {
                  'Training Advisor':{ primary:'int', secondary:'end', priReq:15000, secReq:7500,  priGain:52, secGain:26, special:'trainer'  },
                  'Store Manager':   { primary:'end', secondary:'int', priReq:10000, secReq:5000,  priGain:49, secGain:25, special:'manager'  },
                  'Marketing Executive':{ primary:'int',secondary:'end',priReq:10000,secReq:5000,  priGain:49, secGain:25, special:'marketer' },
                  'Office Clerk':    { primary:'end', secondary:'int', priReq:7500,  secReq:3750,  priGain:46, secGain:23, special:'secretary'},
                  'Sales Assistant': { primary:'end', secondary:'man', priReq:5000,  secReq:2500,  priGain:43, secGain:22, special:null       },
                  'Stock Clerk':     { primary:'man', secondary:'end', priReq:4000,  secReq:2000,  priGain:41, secGain:21, special:null       },
                  'Cleaner':         { primary:'man', secondary:'end', priReq:2500,  secReq:1250,  priGain:38, secGain:19, special:'cleaner'  }
              },
              'Zoo': {
                  'Consultant':      { primary:'int', secondary:'end', priReq:174000, secReq:87000, priGain:72, secGain:36, special:'trainer'  },
                  'Manager':         { primary:'end', secondary:'int', priReq:116000, secReq:58000, priGain:68, secGain:34, special:'manager'  },
                  'Photographer':    { primary:'int', secondary:'end', priReq:116000, secReq:58000, priGain:68, secGain:34, special:'marketer' },
                  'Veterinarian':    { primary:'int', secondary:'man', priReq:116000, secReq:58000, priGain:68, secGain:34, special:null       },
                  'Bookkeeper':      { primary:'end', secondary:'int', priReq:87000,  secReq:43500, priGain:66, secGain:33, special:'secretary'},
                  'Animal Trainer':  { primary:'int', secondary:'man', priReq:72500,  secReq:36250, priGain:65, secGain:33, special:null       },
                  'Zoo Keeper':      { primary:'man', secondary:'end', priReq:58000,  secReq:29000, priGain:63, secGain:32, special:'cleaner'  },
                  'Aquarist':        { primary:'end', secondary:'int', priReq:58000,  secReq:29000, priGain:63, secGain:32, special:null       },
                  'Cashier':         { primary:'end', secondary:'int', priReq:29000,  secReq:14500, priGain:57, secGain:29, special:null       },
                  'Intern':          { primary:'man', secondary:'end', priReq:14500,  secReq:7250,  priGain:52, secGain:26, special:null       }
              }
          }
      };





      const RolePlanner = {

          _calcEE(emp, posData) {
      const sk = { man: 'manual_labor', int: 'intelligence', end: 'endurance' };
      const pri = emp[sk[posData.primary]]  || 0;
      const sec = emp[sk[posData.secondary]] || 0;
      return Calc.totalEff(pri, posData.priReq, sec, posData.secReq);
  },

          assignPriority(employees, positions, roles, directorId) {
              const pool = Object.entries(employees)
                  .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId))
                  .map(([id, emp]) => ({ id, name: emp.name, emp }));

              const results = [];
              for (const role of roles) {
                  const posData = positions[role.posName];
                  if (!posData) {
                      results.push({ roleName: role.posName, count: role.count, assignments: [], unfilledSlots: role.count });
                      continue;
                  }
                  const scored = pool
                      .map(e => ({ ...e, ee: this._calcEE(e.emp, posData) }))
                      .sort((a, b) => b.ee - a.ee);
                  const assigned = scored.slice(0, role.count);
                  const assignedIds = new Set(assigned.map(a => a.id));

                  for (let i = pool.length - 1; i >= 0; i--) {
                      if (assignedIds.has(pool[i].id)) pool.splice(i, 1);
                  }
                  results.push({
                      roleName: role.posName,
                      count: role.count,
                      assignments: assigned.map(a => ({ id: a.id, name: a.name, ee: a.ee })),
                      unfilledSlots: Math.max(0, role.count - assigned.length)
                  });
              }
              return { results, unassigned: pool };
          },




  assignMaxEE(employees, positions, roles, directorId) {
      const empList = Object.entries(employees)
          .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId))
          .map(([id, emp]) => ({ id, name: emp.name, emp }));


      const wsMatrix = empList.map(e =>
          roles.map(role => {
              const posData = positions[role.posName];
              return posData ? this._calcEE(e.emp, posData) : 0;
          })
      );





      const slots = [];
      roles.forEach((role, roleIdx) => {
          for (let slot = 0; slot < role.count; slot++) {
              const bestWS = empList.reduce((max, _, empIdx) => Math.max(max, wsMatrix[empIdx][roleIdx]), 0);
              slots.push({ roleIdx, slot, bestWS });
          }
      });
      slots.sort((a, b) => b.bestWS - a.bestWS);

      const assignedEmps = new Set();

      const filledSlots = roles.map(() => []);

      for (const { roleIdx } of slots) {

          let bestEmpIdx = -1, bestWS = -1;
          empList.forEach((e, empIdx) => {
              if (assignedEmps.has(e.id)) return;
              const ws = wsMatrix[empIdx][roleIdx];
              if (ws > bestWS) { bestWS = ws; bestEmpIdx = empIdx; }
          });
          if (bestEmpIdx === -1) continue;
          const e = empList[bestEmpIdx];
          assignedEmps.add(e.id);
          filledSlots[roleIdx].push({ id: e.id, name: e.name, ee: bestWS });
      }

      const results = roles.map((role, roleIdx) => ({
          roleName: role.posName,
          count: role.count,
          assignments: [...filledSlots[roleIdx]].sort((a, b) => b.ee - a.ee),
          unfilledSlots: Math.max(0, role.count - filledSlots[roleIdx].length)
      }));

      const unassigned = empList.filter(e => !assignedEmps.has(e.id));
      return { results, unassigned };
  }
      };














      const Optimizer = {
          _stat(emp, key) {
              return { man: emp.manual_labor, int: emp.intelligence, end: emp.endurance }[key] || 0;
          },



          meetsFloor(emp, posData) {
              const priStat = this._stat(emp, posData.primary);
              return (priStat / posData.priReq) >= TCM.OPT_MIN_FIT;
          },



          calcEEInPosition(emp, posData) {
              return Calc.totalEff(
                  this._stat(emp, posData.primary), posData.priReq,
                  this._stat(emp, posData.secondary), posData.secReq
              );
          },




          actualCurrentEE(emp) {
              return emp.effectiveness?.total || emp.effectiveness?.working_stats || 0;
          },





          scoringEEInPosition(emp, posData) {
              const rawEE    = this.calcEEInPosition(emp, posData);
              const cappedEE = Math.min(TCM.OPT_EE_CAP, rawEE);
              const merits   = emp.effectiveness?.merits    || 0;
              const settled  = emp.effectiveness?.settled_in || 0;
              const adjusted = Math.min(TCM.OPT_EE_CAP, cappedEE + merits + settled);


              return adjusted + (posData.priGain + posData.secGain) * 0.0001;
          },

          optimize(employees, typeName, directorId) {
              const positions = CompanyData.positions(typeName);
              if (!positions) return null;

              const posNames = Object.keys(positions);
              const emps = Object.entries(employees)

                  .filter(([id, emp]) => emp.position !== 'Director' && String(id) !== String(directorId))
                  .map(([id, emp]) => ({ id, emp }));


              let totalBefore = 0;
              const currentAssignment = {};
              for (const { id, emp } of emps) {
                  const res = PosNorm.resolve(emp.position, positions);
                  if (res) {
                      const ee = this.actualCurrentEE(emp);
                      totalBefore += ee;
                      currentAssignment[id] = { position: res.key, ee };
                  }
              }






              const SPECIAL_TYPES = new Set(['cleaner','manager','trainer','marketer','secretary']);
              const currentRevenueCount = emps.filter(({ emp }) => {
                  const res = PosNorm.resolve(emp.position, positions);
                  return res && !SPECIAL_TYPES.has(res.data.special);
              }).length;

              const minRevenueSlots = Math.max(1, currentRevenueCount);

              const revenuePositions = new Set(
                  posNames.filter(p => !SPECIAL_TYPES.has(positions[p].special))
              );


              const pairs = [];
              for (let i = 0; i < emps.length; i++) {
                  for (let j = 0; j < posNames.length; j++) {
                      const posData = positions[posNames[j]];
                      if (!this.meetsFloor(emps[i].emp, posData)) continue;
                      pairs.push({
                          i, j,
                          score: this.scoringEEInPosition(emps[i].emp, posData),
                          projectedEE: Math.min(200,
                              this.calcEEInPosition(emps[i].emp, posData)
                              + (emps[i].emp.effectiveness?.merits || 0)
                              + (emps[i].emp.effectiveness?.settled_in || 0)
                          )
                      });
                  }
              }
              pairs.sort((a, b) => b.score - a.score);



              const assignedEmps = new Set(), assignedPos = new Set(), assignment = {};
              let revenueSlotsFilled = 0;
              const filledSpecials = new Set();

              for (const { i, j, projectedEE } of pairs) {
                  const empId = emps[i].id, posName = posNames[j];
                  if (assignedEmps.has(empId) || assignedPos.has(posName)) continue;

                  const posData = positions[posName];
                  const isRevenue = revenuePositions.has(posName);
                  const isSpecial = SPECIAL_TYPES.has(posData.special);
                  const specialType = posData.special;


                  if (specialType && filledSpecials.has(specialType)) continue;


                  if (isSpecial) {
                      const remainingEmps = emps.length - assignedEmps.size;
                      const remainingRevenueSlots = revenuePositions.size - revenueSlotsFilled;
                      if (remainingEmps - 1 < minRevenueSlots - revenueSlotsFilled) continue;
                  }

                  assignment[empId] = { position: posName, ee: projectedEE };
                  assignedEmps.add(empId);
                  assignedPos.add(posName);
                  if (isRevenue) revenueSlotsFilled++;
                  if (specialType) filledSpecials.add(specialType);
                  if (assignedEmps.size === emps.length) break;
              }


              const filteredAssignment = {};
              for (const { id } of emps) {
                  const cur  = currentAssignment[id];
                  const prop = assignment[id];
                  if (!prop) { if (cur) filteredAssignment[id] = cur; continue; }
                  if (!cur)  { filteredAssignment[id] = prop; continue; }
                  filteredAssignment[id] = prop.ee > cur.ee ? prop : cur;
              }

              const totalAfter = Object.values(filteredAssignment).reduce((s, a) => s + a.ee, 0);

              const changes = [];
              for (const { id, emp } of emps) {
                  const cur = currentAssignment[id];
                  const fin = filteredAssignment[id];
                  if (!fin || !cur) continue;
                  const normalizedCurrent = PosNorm.normalize(emp.position);

                  const finPosData  = positions[fin.position];
                  const curPosData  = PosNorm.resolve(emp.position, positions)?.data;
                  if (finPosData && curPosData && finPosData.priReq < curPosData.priReq) continue;
                  if (fin.position !== normalizedCurrent && fin.position !== cur.position && fin.ee > cur.ee) {
                      changes.push({
                          empId: id, empName: emp.name,
                          from: emp.position, to: fin.position,
                          eeBefore: cur.ee, eeAfter: fin.ee,
                          gain: fin.ee - cur.ee
                      });
                  }
              }
              changes.sort((a, b) => b.gain - a.gain);

              return { assignment: filteredAssignment, currentAssignment, totalBefore, totalAfter,
                  gain: totalAfter - totalBefore, changes, employeeCount: emps.length };
          }
      };





      const NewsParser = {



          TRAIN_RE:  /XID=(\d+)[^>]*>([^<]+)<\/a>\s+has been trained by the director/i,
          REPORT_RE: /(\w+ report): We had a total of ([\d,]+) customers and made a gross income of \$([\d,]+)/i,

          parse(newsObj) {
              if (!newsObj) return { trains: [], reports: [] };
              const trains = [], reports = [];
              for (const [id, entry] of Object.entries(newsObj)) {
                  const text = entry.news || '', ts = entry.timestamp;
                  const trainMatch = text.match(this.TRAIN_RE);
                  if (trainMatch) {
                      trains.push({ id, empId: trainMatch[1], empName: trainMatch[2].trim(), ts });
                      continue;
                  }
                  const reportMatch = text.match(this.REPORT_RE);
                  if (reportMatch) reports.push({
                      id, day: reportMatch[1],
                      customers: parseInt(reportMatch[2].replace(/,/g, ''), 10),
                      income:    parseInt(reportMatch[3].replace(/,/g, ''), 10),
                      ts, date: new Date(ts * 1000).toISOString().slice(0, 10)
                  });
              }
              trains.sort((a, b) => b.ts - a.ts);
              reports.sort((a, b) => b.ts - a.ts);
              return { trains, reports };
          },

          getTodayTrainedFromNews(trains) {
              const today = new Date().toISOString().slice(0, 10);
              return trains.filter(t => new Date(t.ts * 1000).toISOString().slice(0, 10) === today);
          }
      };





      const Finance = {
          buildSnapshot(profile, employees, detailed, stock, typeName) {
              const daily    = profile?.daily_income    || 0;
              const weekly   = profile?.weekly_income   || 0;
              const salaries = Calc.totalSalaries(employees);
              const adBudget = detailed?.advertising_budget || 0;



              let dailyStockCost = 0;
              const prices = TCM.STOCK_PRICES[typeName] || {};
              if (stock) {
                  for (const [name, s] of Object.entries(stock)) {
                      const soldAmt = s.sold_amount || s.sold_daily || 0;
                      const costPer = prices[name] || 0;
                      if (soldAmt > 0 && costPer > 0) dailyStockCost += soldAmt * costPer;
                  }
              }

              const totalExpenses = salaries + adBudget + dailyStockCost;
            return {
                  date:         new Date().toISOString().slice(0, 10),
                  daily, weekly, salaries, adBudget, dailyStockCost,
                  netProfit:    daily - totalExpenses,
                  popularity:   detailed?.popularity    || 0,
                  efficiency:   detailed?.efficiency    || 0,
                  environment:  detailed?.environment   || 0,
                  trainsAvail:  detailed?.trains_available ?? 0,
                  companyValue: detailed?.value         || 0,
                  ts: Date.now()
              };
          },

          getMonthlyReport(year, month) {
              const prefix = `${year}-${String(month).padStart(2, '0')}`;
              const snaps  = Storage.getSnapshots().filter(s => s.date.startsWith(prefix));
              if (!snaps.length) return null;
              const sum = k => snaps.reduce((s, n) => s + (n[k] || 0), 0);


              return {
                  year, month, days: snaps.length,
                  totalRevenue:   sum('daily'),
                  totalSalaries:  sum('salaries'),
                  totalAdSpend:   sum('adBudget'),
                  totalNetProfit: sum('netProfit'),
                  avgNetProfit:   sum('netProfit') / snaps.length
              };
          },

          getTrend() {
              const snaps = Storage.getSnapshots();
              if (snaps.length < 8) return null;
              const recent = snaps.slice(-7), prev = snaps.slice(-14, -7);
              if (!prev.length) return null;
              const ra  = recent.reduce((s, n) => s + n.daily, 0) / recent.length;
              const pa  = prev.reduce((s, n) => s + n.daily, 0) / prev.length;
              const _d  = ra - pa;
              return { delta: _d, pct: (_d / pa * 100).toFixed(1) };
          },
              getRecentSnapshots(days) {
              const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
              return Storage.getSnapshots()
                  .filter(s => s.date >= cutoff)
                  .sort((a, b) => a.date.localeCompare(b.date));
          },

          rollingAvg(snaps, i, n) {
              const slice = snaps.slice(Math.max(0, i - n + 1), i + 1);
              if (!slice.length) return 0;
              return slice.reduce((s, x) => s + x.netProfit, 0) / slice.length;
          }
      };











      const Engine = {
          generate(state) {
              const recs = [];
              if (!state) return recs;
              const { employees, typeName, snapshot, profile, directorId } = state;


              const tierRecEmps = new Set();
              const positions = CompanyData.positions(typeName);
              const daily = snapshot?.daily || profile?.daily_income || 0;

              const isDir = (id) => String(id) === String(directorId || '');


              if (positions) {


                  const occupiedSpecials = new Set();
                  for (const [id, emp] of Object.entries(employees || {})) {
                      if (emp.position === 'Director' || isDir(id)) continue;
                      if ((emp.days_in_company ?? 4) < 4) continue;
                      const currentRes = PosNorm.resolve(emp.position, positions);
                if (currentRes?.data?.special) occupiedSpecials.add(currentRes.data.special);
                  }

                  const suggestedSpecials = new Set();

                  for (const [id, emp] of Object.entries(employees || {})) {
                      if (emp.position === 'Director' || isDir(id)) continue;
                      const currentRes = PosNorm.resolve(emp.position, positions);
                      if (!currentRes) continue;
                      const currentGain  = currentRes.data.priGain + currentRes.data.secGain;

                      const currentTotal = emp.effectiveness?.total || emp.effectiveness?.working_stats || 0;

                      const statKey = { man:'manual_labor', int:'intelligence', end:'endurance' };
                      const currentWsEE = Calc.totalEff(
                          emp[statKey[currentRes.data.primary]] || 0, currentRes.data.priReq,
                          emp[statKey[currentRes.data.secondary]] || 0, currentRes.data.secReq
                      );

                      let bestUpgrade = null, bestUpgradeEE = currentWsEE;
          for (const [posName, posData] of Object.entries(positions)) {
              if (posName === currentRes.key) continue;
              if (posData.special && occupiedSpecials.has(posData.special)
                  && currentRes.data.special !== posData.special) continue;
              const priStat = emp[statKey[posData.primary]] || 0;
              const secStat = emp[statKey[posData.secondary]] || 0;
              if (priStat < posData.priReq * 0.80) continue;



              if (posData.priReq <= currentRes.data.priReq) continue;
              const projWsEE = Calc.totalEff(priStat, posData.priReq, secStat, posData.secReq);
              if (projWsEE > bestUpgradeEE) {
                  bestUpgradeEE = projWsEE;
                  bestUpgrade = { posName, projWsEE };
              }
          }
          if (bestUpgrade) {
              const targetSpecial = positions[bestUpgrade.posName]?.special;
              if (!targetSpecial || !suggestedSpecials.has(targetSpecial)) {
                  if (targetSpecial) suggestedSpecials.add(targetSpecial);
                  const gain = bestUpgrade.projWsEE - currentWsEE;
                  recs.push({ level: 'medium', empId: id, empName: emp.name,
                      title: `${emp.name} can move to ${bestUpgrade.posName} now (+${gain} WS EE)`,
                      reason: `Current role: ${emp.position} (${currentWsEE} WS EE). Moving to ${bestUpgrade.posName} gives ${bestUpgrade.projWsEE} WS EE immediately with their current stats.`,
                      confidence: 'medium', confReason: 'Based on raw stat formula; merits/settled not included in WS EE comparison.' });
              }
          }
      }
  }




              for (const [id, emp] of Object.entries(employees || {})) {
                  if (emp.position === 'Director' || isDir(id)) continue;
                  if ((emp.days_in_company ?? 4) < 4) continue;
                  emp._id = id;
                  const proj = Projections.analyse(emp, typeName, null);
                  if (!proj) continue;
                  const { tierInfo, currentEff, wsEff } = proj;
                  if (tierInfo && tierInfo.trains <= 8) {
                      recs.push({ level: 'high', empId: id, empName: emp.name,
                          title: `${emp.name} — ${tierInfo.trains} train${tierInfo.trains===1?'':'s'} to Tier ${tierInfo.targetTier}`,
                          reason: `Currently ${currentEff} EE (WS: ${wsEff}), needs ${tierInfo.threshold} total for T${tierInfo.targetTier}. Prioritise this train — tier upgrades unlock higher passive stat gains.`,
                          confidence: 'high', confReason: 'Calculated via Projections logic — matches Projections tab exactly.' });
                      tierRecEmps.add(id);
                  } else if (tierInfo && tierInfo.trains <= 20) {
                      recs.push({ level: 'medium', empId: id, empName: emp.name,
                          title: `${emp.name} — ${tierInfo.trains} trains to Tier ${tierInfo.targetTier}`,
                          reason: `Currently ${currentEff} EE. Worth queuing in training rotation for tier progression.`,
                          confidence: 'high', confReason: 'Calculated via Projections logic — matches Projections tab exactly.' });
                      tierRecEmps.add(id);
                  }
              }


              const addictionThreshold = -(Math.abs(Storage.getSettings().addictionThreshold ?? 5));
              for (const [id, emp] of Object.entries(employees || {})) {
                  if (emp.position === 'Director' || isDir(id)) continue;
                  if ((emp.days_in_company ?? 4) < 4) continue;
                  const addiction = emp.effectiveness?.addiction || 0;
                  if (addiction < addictionThreshold) {
                      recs.push({ level: 'medium', empId: id, empName: emp.name,
                          title: `${emp.name} — addiction penalty ${addiction} EE`,
                          reason: `Drug addiction is reducing their effectiveness and lowering your Environment score, which costs customers every day.`,
                          confidence: 'high', confReason: 'API-reported value.' });
                  }
              }


              const _iWarnDays = Storage.getSettings().inactiveThreshold ?? TCM.INACTIVE_WARN_DAYS;
              const _iReplDays = Storage.getSettings().inactiveReplaceThreshold ?? TCM.INACTIVE_REPLACE_DAYS;
              for (const [id, emp] of Object.entries(employees || {})) {
                  if (emp.position === 'Director' || isDir(id)) continue;
                  if ((emp.days_in_company ?? 4) < 4) continue;
                  const daysSince = Calc.daysSince(emp.last_action?.timestamp);
                  if (daysSince >= _iReplDays) {
                      recs.push({ level: 'high', empId: id, empName: emp.name,
                          title: `Replace ${emp.name} — ${Math.floor(daysSince)}d inactive`,
                          reason: `Inactive employees drag down Environment score. Replace with an active employee to recover customer revenue.`,
                          confidence: 'high', confReason: 'API-reported last_action timestamp.' });
                  } else if (daysSince >= _iWarnDays) {
                      recs.push({ level: 'medium', empId: id, empName: emp.name,
                          title: `Watch ${emp.name} — ${Math.floor(daysSince)}d inactive`,
                          reason: `Approaching ${_iReplDays}-day replacement threshold. Monitor activity.`,
                          confidence: 'medium', confReason: 'Based on last_action timestamp.' });
                  }
              }


              if (snapshot && daily > 0) {
                  const { salaries, adBudget } = snapshot;
                  const settings = Storage.getSettings();
                  const holdsTGP = settings.stocks?.TGP || false;



                  const pool = Math.floor(daily * TCM.SALARY_POOL_PCT);
                  if (salaries > daily * 0.85) {
                      recs.push({ level: 'high',
                          title: `Salaries consuming ${((salaries/daily)*100).toFixed(0)}% of revenue`,
                          reason: `Daily salaries (${Calc.fmtCash(salaries)}) are eating most of your income. Consider whether all employees are earning their wage through EE contribution.`,
                          confidence: 'high', confReason: 'Calculated from API wage fields.' });
                  }



                  if (adBudget > 0 && !holdsTGP && adBudget > daily * 0.50) {
                      recs.push({ level: 'medium',
                          title: `High ad spend without TGP stock`,
                          reason: `Ad budget (${Calc.fmtCash(adBudget)}) is ${((adBudget/daily)*100).toFixed(0)}% of daily income. Without TGP stock, advertising effectiveness has a 40% cap. Consider whether this spend is returning proportional revenue. If you hold TGP stock, update this in Settings.`,
                          confidence: 'low', confReason: 'Cannot assess ad ROI without knowing competitor budgets and TGP holding.' });
                  } else if (adBudget > 0 && holdsTGP) {

                  }
              }


              if (positions) {
                  for (const [id, emp] of Object.entries(employees || {})) {
                      if (emp.position === 'Director' || isDir(id)) continue;
                      if ((emp.days_in_company ?? 4) < 4) continue;
                      const res = PosNorm.resolve(emp.position, positions);
                      if (res?.data?.special === 'trainer') {
                          const totalEff = emp.effectiveness?.total || emp.effectiveness?.working_stats || 0;
                          if (Calc.eeTier(totalEff) < 2 && !tierRecEmps.has(id)) {
                              emp._id = id;
                              const proj = Projections.analyse(emp, typeName, null);
                              const tierInfo = proj?.tierInfo;
                              recs.push({ level: 'high', empId: id, empName: emp.name,
                                  title: `Trainer ${emp.name} needs Tier 2 (${tierInfo ? tierInfo.trains + ' trains' : 'unknown'})`,
                                  reason: `At ${totalEff} EE (WS: ${emp.effectiveness?.working_stats || 0}). Reaching T2 unlocks mentor slots, increasing your total daily trains.`,
                                  confidence: 'high', confReason: 'Trainer mechanic confirmed from Torn Wiki.' });
                          }
                      }
                  }
              }


              if (positions) {
                  const SPECIAL_INFO = {
                      trainer:   { label: 'Trainer',    impact: 'unlocks extra daily trains — critical for companies with 6★+' },
                      marketer:  { label: 'Marketer',   impact: 'boosts popularity and customer count daily' },
                      manager:   { label: 'Manager',    impact: 'provides a management EE bonus to all employees' },
                      secretary: { label: 'Secretary',  impact: 'provides the secretary bonus to company operations' },
                      cleaner:   { label: 'Cleaner',    impact: 'boosts environment score, reducing customer loss' }
                  };
                  const filledSpecials = new Set();
                  for (const [id, emp] of Object.entries(employees || {})) {
                      if (emp.position === 'Director' || isDir(id)) continue;
                      const res = PosNorm.resolve(emp.position, positions);
                      if (res?.data?.special) filledSpecials.add(res.data.special);
                  }
                  const environment = state.detailed?.environment || 0;
                  for (const [specialType, info] of Object.entries(SPECIAL_INFO)) {
                      if (filledSpecials.has(specialType)) continue;
                      if (specialType === 'cleaner' && environment >= 90) continue;
                      const posName = Object.entries(positions).find(([, p]) => p.special === specialType)?.[0];
                      if (!posName) continue;
                      const _posD = positions[posName];
                      let _statsHint = '';
                      if (_posD) {
                          const _priL = _posD.primary.toUpperCase();
                          const _secL = _posD.secondary.toUpperCase();


                          _statsHint = ` Hire target: ${_priL} ≥ ${Calc.fmtNum(_posD.priReq)} (90 WS EE) or ${Calc.fmtNum(_posD.priReq * 2)} (100 WS EE) · ${_secL} ≥ ${Calc.fmtNum(_posD.secReq)}.`;
                      }
                      recs.push({
                          level: specialType === 'trainer' ? 'high' : 'medium',
                          title: `No ${info.label} in roster — hire a ${posName}`,
                          reason: `You currently have no one in a ${info.label} role. ${info.impact}.${_statsHint}`,
                          confidence: 'high',
                          confReason: 'Based on current roster composition.'
                      });
                  }
                  const hired = state.profile?.employees_hired || 0;
                  const capacity = state.profile?.employees_capacity || 0;
                  if (capacity > 0 && hired < capacity) {
                      const open = capacity - hired;
                      recs.push({
                          level: 'medium',
                          title: `${open} open slot${open !== 1 ? 's' : ''} — not at full capacity`,
                          reason: `You have ${hired}/${capacity} employees. A full roster maximises revenue and gives you more training flexibility.`,
                          confidence: 'high',
                          confReason: 'Based on employees_hired vs employees_capacity from API.'
                      });
                  }
              }

              const order = { high: 0, medium: 1, low: 2 };
              return recs.sort((a, b) => order[a.level] - order[b.level]);
          },

      };









      const Rotation = {
          sync(employeeIds) {
              const rot = Storage.getRotation();
              rot.queue = rot.queue.filter(id => employeeIds.includes(id));
              for (const id of employeeIds) {
                  if (!rot.queue.includes(id) && !rot.excluded.includes(id)) rot.queue.push(id);
              }
              if (rot.pointer >= rot.queue.length) rot.pointer = 0;
              Storage.saveRotation(rot);
              return rot;
          },

          current() {
              const rot = Storage.getRotation();
              return rot.queue[rot.pointer] || null;
          },

          advance(n = 1) {
              const rot = Storage.getRotation();
              if (!rot.queue.length) return;
              rot.pointer = (rot.pointer + n) % rot.queue.length;
              Storage.saveRotation(rot);
          },

          exclude(empId) {
              const rot = Storage.getRotation();
              rot.queue = rot.queue.filter(id => id !== empId);
              if (!rot.excluded.includes(empId)) rot.excluded.push(empId);
              if (rot.pointer >= rot.queue.length) rot.pointer = 0;
              Storage.saveRotation(rot);
          },

          include(empId, employeeIds) {
              const rot = Storage.getRotation();
              rot.excluded = rot.excluded.filter(id => id !== empId);
              if (!rot.queue.includes(empId) && employeeIds.includes(empId)) rot.queue.push(empId);
              Storage.saveRotation(rot);
          },


          getPriorityOrder(employees, typeName, trainedToday, directorId) {
              const positions = CompanyData.positions(typeName);
              const today = new Date().toISOString().slice(0, 10);

              return Object.entries(employees || {})
                  .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                  .map(([id, emp]) => {
                      const totalEff  = emp.effectiveness?.total || emp.effectiveness?.working_stats || 0;
                      const wsEff     = emp.effectiveness?.working_stats || 0;

                      const log       = Storage.getTrainedLog();
                      const todayCount = (log[id] || []).filter(e => e.date === today).length;
                      let trainsToTier = 999;
                      if (positions) {
                          const res = PosNorm.resolve(emp.position, positions);
                          if (res) {
                              const pos = res.data;
                              const priStat = emp[{ man:'manual_labor', int:'intelligence', end:'endurance' }[pos.primary]] || 0;
                              const secStat = emp[{ man:'manual_labor', int:'intelligence', end:'endurance' }[pos.secondary]] || 0;

                              const tierInfo = Calc.trainsToNextTier(wsEff, priStat, pos.priReq, secStat, pos.secReq, totalEff, pos.priGain, pos.secGain);
                              if (tierInfo) trainsToTier = tierInfo.trains;
                          }
                      }
                      const daysSince = Calc.daysSince(emp.last_action?.timestamp);
                      return {
                          id, name: emp.name, wsEff, totalEff,
                          trainsToTier, todayCount,
                          alreadyTrained: todayCount > 0,
                          inactive: daysSince >= TCM.INACTIVE_WARN_DAYS
                      };
                  })


                  .sort((a, b) => {
                      if (a.inactive !== b.inactive) return a.inactive ? 1 : -1;
                      if (a.trainsToTier !== b.trainsToTier) return a.trainsToTier - b.trainsToTier;
                      return a.wsEff - b.wsEff;
                  });
          },




          getBalancedSchedule(employees, trainBudget, todayNews) {
              const emps = Object.entries(employees || {})
                  .filter(([, e]) => e.position !== 'Director')
                  .map(([id, e]) => ({ id, name: e.name, wsEff: e.effectiveness?.working_stats || 0 }));
              const N = emps.length;
              const T = trainBudget || 1;
              if (!N) return { schedule: [], base: 0, extra: 0, extraBlock: 0 };

              const base = Math.floor(T / N);
              const extra = T % N;


              const today = new Date().toISOString().slice(0, 10);
              const dayNum = Math.floor(Date.now() / 86400000);
              const blockStart = extra > 0 ? (dayNum * extra) % N : 0;

              const trainedIds = new Set((todayNews || []).map(t => t.empId));

              const schedule = emps.map((e, i) => {
                  const inExtraBlock = extra > 0 && (
                      (blockStart + extra <= N)
                          ? (i >= blockStart && i < blockStart + extra)
                          : (i >= blockStart || i < (blockStart + extra) % N)
                  );
                  const trains = base + (inExtraBlock ? 1 : 0);
                  return { ...e, trains, inExtraBlock, trainedToday: trainedIds.has(e.id) };
              });

              return { schedule, base, extra, blockStart };
          },

          get() { return Storage.getRotation(); }
      };








      const Projections = {
          _stat(emp, key) {
              return { man: emp.manual_labor, int: emp.intelligence, end: emp.endurance }[key] || 0;
          },

          analyse(emp, typeName, weights) {
              const positions = CompanyData.positions(typeName);
              if (!positions) return null;
              const resolved = PosNorm.resolve(emp.position, positions);
              if (!resolved) return null;
              const pos = resolved.data;
              const priCurrent = this._stat(emp, pos.primary);
              const secCurrent = this._stat(emp, pos.secondary);


              const apiWsEff   = emp.effectiveness?.working_stats || Calc.totalEff(priCurrent, pos.priReq, secCurrent, pos.secReq);
              const merits     = emp.effectiveness?.merits        || 0;
              const settledIn  = emp.effectiveness?.settled_in    || 0;
              const management = emp.effectiveness?.management    || 0;
              const addiction  = emp.effectiveness?.addiction     || 0;
              const apiTotal   = emp.effectiveness?.total         || 0;

              const currentEff = apiTotal || (apiWsEff + merits + settledIn + management + addiction);

              const priTrains   = Calc.trainsNeeded(priCurrent, pos.priReq, true);
              const secTrains   = Calc.trainsNeeded(secCurrent, pos.secReq, false);
              const totalTrains = Math.max(priTrains, secTrains);

              const score = Calc.roiScore((TCM.TRAIN_PRIMARY + TCM.TRAIN_SECONDARY) / 2, currentEff / 100, 1, 0, weights);


              const sim10Pri    = Calc.simStat(priCurrent, 10, true);
              const sim10Sec    = Calc.simStat(secCurrent, 10, false);
              const sim10WsEff  = Calc.totalEff(sim10Pri, pos.priReq, sim10Sec, pos.secReq);
              const wsEEGain    = sim10WsEff - apiWsEff;
              const sim10Total  = currentEff + wsEEGain;

              const currentTier = Calc.eeTier(currentEff);
              const sim10Tier   = Calc.eeTier(sim10Total);

              const tierInfo    = Calc.trainsToNextTier(apiWsEff, priCurrent, pos.priReq, secCurrent, pos.secReq, currentEff, pos.priGain, pos.secGain);

              return {
                  empId: emp._id, empName: emp.name,
                  position: resolved.key, primary: pos.primary, secondary: pos.secondary,
                  priCurrent, priRequired: pos.priReq, secCurrent, secRequired: pos.secReq,
                  wsEff: apiWsEff, merits, settledIn, management, addiction,
                  currentEff, currentTier,
                  sim10Eff: sim10Total, sim10Tier,
                  sim10PriStat: sim10Pri, sim10SecStat: sim10Sec, wsEEGain,
                  crossesTierAt10: sim10Tier > currentTier,
                  priTrains, secTrains, totalTrains,
                  roiScore: score, roiClass: Calc.roiClass(totalTrains),
                  tierInfo
              };
          },

          simulate(emp, typeName, trains) {
              const positions = CompanyData.positions(typeName);
              if (!positions) return null;
              const resolved = PosNorm.resolve(emp.position, positions);
              if (!resolved) return null;
              const pos = resolved.data;
              const priLabel   = pos.primary.toUpperCase();
              const secLabel   = pos.secondary.toUpperCase();
              const priCurrent = this._stat(emp, pos.primary);
              const secCurrent = this._stat(emp, pos.secondary);
              const priAfter   = priCurrent + trains * pos.priGain;
              const secAfter   = secCurrent + trains * pos.secGain;
              const wsEffBefore = emp.effectiveness?.working_stats || Calc.totalEff(priCurrent, pos.priReq, secCurrent, pos.secReq);
              const wsEffAfter  = Calc.totalEff(priAfter, pos.priReq, secAfter, pos.secReq);
              const wsEEGain    = wsEffAfter - wsEffBefore;
              const totalBefore = emp.effectiveness?.total || wsEffBefore;
              const totalAfter  = totalBefore + wsEEGain;
              return {
                  trains, before: totalBefore, after: totalAfter, gain: wsEEGain,
                  crossesTier: Calc.crossesTier(totalBefore, totalAfter),
                  priLabel, secLabel,
                  priCurrent, priAfter, priGain: priAfter - priCurrent,
                  secCurrent, secAfter, secGain: secAfter - secCurrent,
                  tierBefore: Calc.eeTier(totalBefore), tierAfter: Calc.eeTier(totalAfter)
              };
          }
      };







      const UI = {
          container: null,
          state: null,
          _resizing: false,

          injectStyles() {

              GM_addStyle(`
/* Muted palette inspired by Morrakiu TCM — flat dark, soft blue accent */

                  #tcm-wrap {
                      position: fixed;
                      top: 80px;
                      left: 20px;
                      width: 440px;
                      min-width: 340px;
                      min-height: 200px;
                      max-height: 90vh;
                      background: #1a1a1a;
                      border: 1px solid #444;
                      border-radius: 8px;
                      font-family: Arial, sans-serif;
                      font-size: 13px;
                      line-height: 1.5;
                      z-index: 2147483640;
                      box-shadow: 0 4px 20px rgba(0,0,0,.6);
                      display: flex;
                      flex-direction: column;
                      overflow: hidden;
                      resize: both;
                      color: #c8c8c8;
                  }
                  #tcm-wrap.pinned {
                      resize: none;
                  }
                  #tcm-titlebar {
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      background: #2c2c2c;
                      padding: 0 12px;
                      height: 44px;
                      border-bottom: 1px solid #2a2a2a;
                      cursor: grab;
                      flex-shrink: 0;
                      position: relative;
                      user-select: none;
                  }
                  #tcm-titlebar::after {
                      content: '';
                      position: absolute;
                      bottom: 0; left: 0; right: 0;
                      height: 1px;
                      background: #444;
                      
                  }
                  #tcm-titlebar:active { cursor: grabbing; }
                  #tcm-title {
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      font-family: Arial, sans-serif;
                      font-weight: 700;
                      font-size: 13px;
                      color: #7eb8ff;
                      letter-spacing: 0.05em;
                      text-transform: uppercase;
                      
                  }
                  #tcm-title span.tcm-version {
                      font-size: 10px;
                      color: #555;
                      font-weight: 400;
                      letter-spacing: 0;
                      text-transform: none;
                      
                  }
                  #tcm-controls {
                      display: flex;
                      gap: 4px;
                      align-items: center;
                  }
                  .tcm-ctrl-btn {
                      background: rgba(255,255,255,0.02);
                      border: 1px solid #444;
                      border-radius: 4px;
                      color: #777;
                      cursor: pointer;
                      padding: 4px 8px;
                      font-size: 12px;
                      font-family: Consolas, monospace;
                      transition: all 0.15s ease;
                      line-height: 1.4;
                  }
                  .tcm-ctrl-btn:hover { border-color: #7eb8ff; color: #7eb8ff; background: rgba(126, 184, 255, 0.07);   }
                  .tcm-ctrl-btn.active { border-color: #7eb8ff; color: #7eb8ff; background: rgba(126, 184, 255, 0.1);  }
                  .tcm-ctrl-btn.danger:hover { border-color: #f66; color: #f66; background: rgba(239,68,68,0.08);  }
#tcm-tabs {
                      display: flex;
                      flex-direction: column;
                      background: #1a1a1a;
                      flex-shrink: 0;
                      user-select: none;
                  }
                  #tcm-sub-tabs {
                      display: flex;
                      flex-wrap: wrap;
                      border-bottom: 1px solid #1a2332;
                      padding: 2px 4px 0;
                      gap: 1px;
                  }
                  .tcm-tab {
                      padding: 6px 11px;
                      font-size: 11px;
                      font-weight: 600;
                      color: #777;
                      cursor: pointer;
                      white-space: nowrap;
                      border-bottom: 2px solid transparent;
                      border-radius: 4px 4px 0 0;
                      transition: all 0.15s ease;
                      text-transform: uppercase;
                      letter-spacing: 0.06em;
                      font-family: Arial, sans-serif;
                  }
                  .tcm-tab:hover { color: #aaa; background: rgba(255,255,255,0.03); }
                 .tcm-tab.active { color: #7eb8ff; border-bottom-color: #7eb8ff; background: #2a2a2a; }
                  #tcm-body {
                      flex: 1;
                      overflow-y: auto;
                      padding: 12px;
                      scrollbar-width: thin;
                      scrollbar-color: #2a2a2a transparent;
                  }
                  #tcm-body::-webkit-scrollbar { width: 5px; }
                  #tcm-body::-webkit-scrollbar-track { background: transparent; }
                  #tcm-body::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
                  #tcm-body::-webkit-scrollbar-thumb:hover { background: #555; }
                  /* STATUS BAR */
                  #tcm-statusbar {
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      user-select: none;
                      background: #1a1a1a;
                      padding: 4px 12px;
                      border-top: 1px solid #141c28;
                      font-size: 10px;
                      color: #555;
                      flex-shrink: 0;
                      font-family: Consolas, monospace;
                  }
                  #tcm-statusbar span.ok { color: #34d472; }
                  #tcm-statusbar span.warn { color: #fc6; }
                  #tcm-statusbar span.err { color: #f66; }
                  /* CARDS */
                  .tcm-card {
                      background: #1a1a1a;
                      border: 1px solid #2a2a2a;
                      border-radius: 6px;
                      margin-bottom: 8px;
                      overflow: hidden;
                      transition: all 0.25s ease;
                  }
                  .tcm-card:hover { border-color: #2d3d52; box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(126, 184, 255, 0.08);  }
                  .tcm-card-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      padding: 8px 12px;
                      background: rgba(0,0,0,0.2);
                      border-bottom: 1px solid #1a2535;
                      cursor: pointer;
                      font-weight: 700;
                      font-size: 11px;
                      color: #4b6080;
                      text-transform: uppercase;
                      letter-spacing: 0.08em;
                      transition: color 0.15s;
                  }
                  .tcm-card-header:hover { color: #aaa; }
                  .tcm-card-body { padding: 10px 12px; }
                  /* ROW */
                  .tcm-row {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      padding: 5px 0;
                      border-bottom: 1px solid rgba(255,255,255,0.03);
                      font-size: 13px;
                      line-height: 1.4;
                  }
                  .tcm-row:last-child { border-bottom: none; }
                  .tcm-row .lbl { color: #8b95a5; font-size: 13px; font-weight: 500; }
                  .tcm-row .val { font-weight: 600; color: #ddd; font-family: Consolas, monospace; font-size: 13px; }
                  .tcm-row .val.green { color: #7eb8ff;  }
                  .tcm-row .val.red { color: #f88; }
                  .tcm-row .val.amber { color: #fc8; }
                  .tcm-row .val.blue { color: #7eb8ff; }
                  /* BADGE */
                  .tcm-badge {
                      display: inline-flex;
                      align-items: center;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-size: 10px;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.04em;
                      font-family: Arial, sans-serif;
                      vertical-align: middle;
                  }
                  .tcm-badge.high   { background: rgba(239,68,68,0.18);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.4);   }
                  .tcm-badge.medium { background: rgba(245,158,11,0.18); color: #fd8; border: 1px solid rgba(245,158,11,0.4); }
                  .tcm-badge.low    { background: rgba(96,165,250,0.18); color: #9cc8ff; border: 1px solid rgba(96,165,250,0.4); }
                  .tcm-badge.green  { background: rgba(126, 184, 255, 0.18); color: #8f8; border: 1px solid rgba(126, 184, 255, 0.4);  }
                  .tcm-badge.tier-0 { background: rgba(239,68,68,0.12);  color: #f88; border: 1px solid rgba(239,68,68,0.25); }
                  .tcm-badge.tier-1 { background: rgba(245,158,11,0.12); color: #fc8; border: 1px solid rgba(245,158,11,0.3); }
                  .tcm-badge.tier-2 { background: rgba(102, 170, 102, 0.12); color: #6f6; border: 1px solid rgba(102, 170, 102, 0.3);  }
                  .tcm-badge.tier-3 { background: rgba(96,165,250,0.12); color: #9cc8ff; border: 1px solid rgba(96,165,250,0.3);  }
                  .tcm-badge.tier-4 { background: rgba(167,139,250,0.18); color: #b8a8e8; border: 1px solid rgba(167,139,250,0.4);  }
                  /* REC CARDS */
                  .tcm-rec {
                      padding: 10px 12px;
                      margin-bottom: 7px;
                      border-radius: 6px;
                      border-left: 3px solid #2a2a2a;
                      background: #1e1e1e;
                      position: relative;
                      overflow: hidden;
                      transition: all 0.2s ease;
                      
                  }
                  .tcm-rec:hover {   }
                  .tcm-rec::before {
                      content: '';
                      position: absolute;
                      top: 0; left: 0; right: 0;
                      height: 1px;
                      opacity: 0.15;
                      background: transparent;
                  }
                 .tcm-rec.high   { border-left-color: #f66; background: #1e1e1e;  }
                  .tcm-rec.medium { border-left-color: #fc6; background: #1e1e1e; }
                  .tcm-rec.low    { border-left-color: #7eb8ff; background: #1e1e1e; }
                  .tcm-rec .rec-title { font-weight: 700; font-size: 13px; color: #ddd; margin-bottom: 4px; line-height: 1.3; }
                  .tcm-rec .rec-body  { font-size: 12px; color: #aaa; line-height: 1.6; }
                  .tcm-rec .rec-meta  { display: flex; gap: 5px; margin-top: 6px; flex-wrap: wrap; }
                  /* EMP LIST */
                  .tcm-emp {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      padding: 7px 4px;
                      border-bottom: 1px solid rgba(255,255,255,0.04);
                      font-size: 13px;
                      line-height: 1.4;
                      border-radius: 3px;
                      transition: background 0.1s;
                  }
                  .tcm-emp:hover { background: rgba(255,255,255,0.02); }
                  .tcm-emp:last-child { border-bottom: none; }
                  .tcm-emp .emp-name { color: #ddd; font-weight: 600; font-size: 13px; }
                  .tcm-emp .emp-sub  { font-size: 11px; color: #8b95a5; margin-top: 2px; font-family: Arial, sans-serif; }
                  .tcm-emp .emp-right { text-align: right; flex-shrink: 0; margin-left: 8px; }
                  /* BAR */
                  .tcm-bar {
                      width: 60px; height: 4px;
                      background: #1a2535;
                      border-radius: 2px;
                      overflow: hidden;
                      display: inline-block;
                      vertical-align: middle;
                      margin-left: 4px;
                  }
                  .tcm-bar-fill {
                      height: 100%;
                      border-radius: 2px;
                      background: #1e1e1e;
                      transition: width 0.4s ease;
                      box-shadow: 0 0 6px rgba(126, 184, 255, 0.4);
                  }
                  .tcm-bar-fill.red { background: #1e1e1e; box-shadow: 0 0 6px rgba(239,68,68,0.3); }
                  .tcm-bar-fill.amber { background: #1e1e1e; box-shadow: 0 0 6px rgba(245,158,11,0.3); }
                  /* BUTTONS */
                  .tcm-btn {
                      background: #1a1a1a;
                      border: 1px solid #444;
                      border-radius: 5px;
                      color: #aaa;
                      padding: 5px 11px;
                      cursor: pointer;
                      font-size: 12px;
                      font-family: Arial, sans-serif;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 0.04em;
                      transition: all 0.15s ease;
                      line-height: 1.4;
                  }
                  .tcm-btn:hover { background: #1a1a1a; border-color: #3d4f68; color: #ddd;  box-shadow: 0 3px 10px rgba(0,0,0,0.3); }
                  .tcm-btn:active { transform: translateY(0); box-shadow: none; }
                  .tcm-btn.green  { background: rgba(126, 184, 255, 0.1); border-color: rgba(126, 184, 255, 0.35); color: #7eb8ff; }
                  .tcm-btn.green:hover { background: rgba(126, 184, 255, 0.18); border-color: rgba(126, 184, 255, 0.55); box-shadow: 0 3px 12px rgba(126, 184, 255, 0.2); }
                  .tcm-btn.red    { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.35); color: #f88; }
                  .tcm-btn.red:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.5); box-shadow: 0 3px 10px rgba(239,68,68,0.15); }
                  .tcm-btn.amber  { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.35); color: #fc8; }
                  .tcm-btn.amber:hover { background: rgba(245,158,11,0.18); box-shadow: 0 3px 10px rgba(245,158,11,0.15); }
                  /* INPUT */
                  .tcm-input {
                      background: #1a1a1a;
                      border: 1px solid #1a2535;
                      border-radius: 5px;
                      color: #ddd;
                      padding: 6px 9px;
                      font-size: 13px;
                      font-family: Arial, sans-serif;
                      outline: none;
                      transition: border-color 0.15s, box-shadow 0.15s;
                      line-height: 1.4;
                  }
                  .tcm-input:focus { border-color: #7eb8ff; box-shadow: 0 0 0 2px rgba(126, 184, 255, 0.1); }
                  /* FILTER BAR */
                  .tcm-filter-bar {
                      display: flex;
                      gap: 4px;
                      flex-wrap: wrap;
                      margin-bottom: 10px;
                  }
                  .tcm-filter-btn {
                      padding: 3px 10px;
                      border-radius: 999px;
                      background: #111c2b;
                      border: 1px solid #2a2a2a;
                      color: #4b6080;
                      cursor: pointer;
                      font-size: 11px;
                      font-family: Arial, sans-serif;
                      font-weight: 600;
                      transition: all 0.15s ease;
                      text-transform: uppercase;
                      letter-spacing: 0.04em;
                  }
                  .tcm-filter-btn:hover { border-color: rgba(126, 184, 255, 0.5); color: #7eb8ff; background: rgba(126, 184, 255, 0.05); }
                  .tcm-filter-btn.active { background: rgba(126, 184, 255, 0.12); border-color: rgba(126, 184, 255, 0.5); color: #7eb8ff;  }
                  /* ROTATION QUEUE */
                  .tcm-queue-item {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      padding: 7px 10px;
                      margin-bottom: 4px;
                      border-radius: 6px;
                      background: #1e1e1e;
                      border: 1px solid #1a2535;
                      font-size: 13px;
                      font-family: Arial, sans-serif;
                      line-height: 1.4;
                      transition: border-color 0.15s;
                  }
                  .tcm-queue-item:hover { border-color: #2d3d52; }
                  .tcm-queue-item.current {
                      background: #1e1e1e;
                      border-color: rgba(126, 184, 255, 0.4);
                      box-shadow: 0 0 12px rgba(126, 184, 255, 0.06), inset 0 0 20px rgba(126, 184, 255, 0.03);
                      color: #7eb8ff;
                  }
                  .tcm-queue-item.trained-today { opacity: 0.6; }
                  .tcm-queue-item .q-name { font-weight: 600; color: #d8dde6; }
                  .tcm-queue-item .q-meta { font-size: 11px; color: #4b6080; margin-top: 2px; font-family: Arial, sans-serif; }
                  /* TRAIN LOG TABLE */
                  .tcm-train-log { width: 100%; border-collapse: collapse; font-size: 12px; }
                  .tcm-train-log th { color: #aaa; font-weight: 600; padding: 4px 8px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #2a2a2a; font-family: Arial, sans-serif; }
                  .tcm-train-log td { padding: 5px 8px; border-bottom: 1px solid #1a1a1a; color: #c8c8c8; font-family: Arial, sans-serif; }
                  .tcm-train-log td:first-child { color: #ddd; font-weight: 600; }
                  .tcm-train-log .count-high { color: #7eb8ff; font-weight: 700; font-family: Consolas, monospace; }
                  .tcm-train-log .count-mid { color: #fc6; font-weight: 700; font-family: Consolas, monospace; }
                  .tcm-train-log .count-low { color: #f66; font-weight: 700; font-family: Consolas, monospace; }
                  /* SECTION LABEL */
                  .tcm-section-label {
                      font-size: 11px;
                      font-weight: 700;
                      color: #888;
                      text-transform: uppercase;
                      letter-spacing: 0.12em;
                      font-family: Arial, sans-serif;
                      padding: 8px 0 5px;
                      border-bottom: 1px solid #2a2a2a;
                      margin-bottom: 10px;
                  }
                  /* STAT CHIPS */
                  .tcm-stat-chip {
                      display: inline-block;
                      background: #2a2a2a;
                      border-radius: 3px;
                      padding: 2px 7px;
                      font-size: 11px;
                      font-family: Consolas, monospace;
                      color: #c8c8c8;
                      margin: 2px 3px 2px 0;
                  }
                  /* NOTICE */
                  .tcm-notice {
                      background: rgba(126, 184, 255, 0.07);
                      border: 1px solid rgba(126, 184, 255, 0.22);
                      border-radius: 4px;
                      padding: 9px 13px;
                      font-size: 12px;
                      color: #c9d1d9;
                      margin-bottom: 10px;
                      line-height: 1.6;
                  }
                  .tcm-warn-box {
                      background: rgba(245,158,11,0.06);
                      border: 1px solid rgba(245,158,11,0.2);
                      border-radius: 4px;
                      padding: 7px 11px;
                      font-size: 12px;
                      color: #d97706;
                      margin-bottom: 10px;
                      line-height: 1.55;
                  }
                  /* SPIN */
                  .tcm-spin {
                      display: inline-block;
                      width: 14px; height: 14px;
                      border: 2px solid #2a2a2a;
                      border-top-color: #7eb8ff;
                      border-radius: 50%;
                      
                      vertical-align: middle;
                      margin-right: 6px;
                  }
                  
                  
                  
                  
                  /* MODE TOGGLE */
                  .tcm-mode-toggle {
                      display: flex;
                      gap: 0;
                      border: 1px solid #2a2a2a;
                      border-radius: 4px;
                      overflow: hidden;
                  }
                  .tcm-mode-toggle button {
                      flex: 1;
                      padding: 5px 10px;
                      background: #1a1a1a;
                      border: none;
                      color: #aaa;
                      cursor: pointer;
                      font-size: 12px;
                      font-family: Arial, sans-serif;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 0.04em;
                      transition: all 0.15s;
                      border-right: 1px solid #2a2a2a;
                  }
                  .tcm-mode-toggle button:last-child { border-right: none; }
                  .tcm-mode-toggle button.active { background: rgba(126, 184, 255, 0.1); color: #7eb8ff; }
                  /* PROJ */
                  .tcm-proj {
                      background: #1a1a1a;
                      border: 1px solid #2a2a2a;
                      border-radius: 4px;
                      padding: 10px 12px;
                      margin-bottom: 10px;
                  }
                  .tcm-proj .proj-name { font-weight: 700; color: #7eb8ff; font-size: 13px; margin-bottom: 6px; font-family: Arial, sans-serif; }
                  .tcm-sim-row { display: flex; gap: 6px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
                  .tcm-sim-result { font-size: 11px; font-family: Consolas, monospace; color: #888; line-height: 1.6; }
                  /* LOADING */
                  .tcm-loading { text-align: center; padding: 40px 20px; color: #aaa; font-size: 13px; font-family: Arial, sans-serif; }
                  /* DIVIDER */
                  .tcm-divider { border: none; border-top: 1px solid #2a2a2a; margin: 10px 0; }
                  /* SALARY TABLE */
                  .tcm-salary-table { width: 100%; font-size: 12px; border-collapse: collapse; }
                  .tcm-salary-table th { color: #aaa; font-weight: 600; padding: 4px 7px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #2a2a2a; font-family: Arial, sans-serif; }
                  .tcm-salary-table td { padding: 5px 7px; border-bottom: 1px solid #1a1a1a; font-family: Consolas, monospace; color: #aaa; font-size: 11px; }
                  .tcm-salary-table td:first-child { color: #ddd; font-family: Arial, sans-serif; font-weight: 600; font-size: 12px; }
                  .tcm-salary-table .pos-diff { color: #7eb8ff; font-weight: 700; }
                  .tcm-salary-table .neg-diff { color: #f66; font-weight: 700; }
                  #tcm-launcher {
                      position: fixed;
                      width: ${TCM.ICON_SIZE}px;
                      height: ${TCM.ICON_SIZE}px;
                      background: #1e1e1e;
                      border: 1px solid rgba(126, 184, 255, 0.3);
                      border-radius: 8px;
                      display: flex; align-items: center; justify-content: center;
                      cursor: pointer;
                      z-index: 2147483647;
                      box-shadow: 0 0 10px rgba(126, 184, 255, 0.2), 0 4px 14px rgba(0,0,0,0.7), inset 0 1px 0 rgba(126, 184, 255, 0.08);
                      user-select: none;
                      font-size: 18px;
                      color: #7eb8ff;
                      transition: all 0.2s ease;
                      font-family: Consolas, monospace;
                      box-sizing: border-box;
                      overflow: visible;
                      
                  }
                  #tcm-launcher:hover {
                      border-color: rgba(126, 184, 255, 0.7);
                      background: #1e1e1e;
                      box-shadow: 0 0 18px rgba(126, 184, 255, 0.35), 0 4px 16px rgba(0,0,0,0.7);
                      transform: scale(1.06);
                  }
                  #tcm-launcher:active { transform: scale(0.97); }
                  #tcm-launcher.err { border-color: rgba(239,68,68,0.5); color: #f88;  box-shadow: 0 0 12px rgba(239,68,68,0.25), 0 4px 14px rgba(0,0,0,0.7); }
                  #tcm-launcher.loading { border-color: rgba(245,158,11,0.5); color: #fc8;  box-shadow: 0 0 12px rgba(245,158,11,0.2), 0 4px 14px rgba(0,0,0,0.7); }
                  #tcm-launcher .tcm-launcher-label {
                      position: absolute;
                      bottom: -2px;
                      right: -2px;
                      background: #1a1a1a;
                      border: 1px solid rgba(126, 184, 255, 0.2);
                      border-radius: 3px;
                      font-size: 8px;
                      padding: 0 3px;
                      color: rgba(126, 184, 255, 0.6);
                      line-height: 1.5;
                      font-family: Arial, sans-serif;
                      font-weight: 700;
                      letter-spacing: 0.04em;
                      pointer-events: none;
                  }
                  .tcm-chart-wrap {
                      background: #1a1a1a;
                      border: 1px solid #2a2a2a;
                      border-radius: 4px;
                      padding: 10px 12px;
                      margin-bottom: 10px;
                      position: relative;
                  }
                  .tcm-chart-svg { display: block; width: 100%; overflow: visible; }
                  .tcm-chart-label { font-size: 10px; fill: #888; font-family: Consolas, monospace; }

                  #tcm-wrap.light .tcm-verify-card { background: #ffffff; border-color: #ddd; }
                  #tcm-wrap.light .tcm-verify-message { color: #444; }
                  #tcm-wrap.light .tcm-verify-id { color: #aaa; }

                  /* ── LIGHT MODE ── */
                  #tcm-wrap.light {
      background: #c8cdd3;
      border-color: #b0b6bc;
      color: #2a2a2a;
      box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(22,163,74,0.05);
  }
                  #tcm-wrap.light #tcm-titlebar {
      background: #b8bec5;
      border-color: #a8aeb5;
  }
                  #tcm-wrap.light #tcm-title { color: #7eb8ff; }
                  #tcm-wrap.light #tcm-title span.tcm-version { color: #c8c8c8; }
                  #tcm-wrap.light #tcm-tabs {
      background: #bdc3ca;
      border-color: #a8aeb5;
  }
                  #tcm-wrap.light .tcm-tab { color: #444; }
  #tcm-wrap.light .tcm-tab:hover { color: #2c2c2c; }
                  #tcm-wrap.light .tcm-tab.active { color: #4a8; border-bottom-color: #4a8; }
                  #tcm-wrap.light #tcm-body::-webkit-scrollbar-thumb { background: #9fa3a8; }
  #tcm-wrap.light #tcm-body { scrollbar-color: #9fa3a8 transparent; }
                  #tcm-wrap.light #tcm-statusbar {
      background: #cecfd1;
      border-color: #b8babe;
      color: #777;
  }
                  #tcm-wrap.light #tcm-statusbar span.ok { color: #4a8; }
                  #tcm-wrap.light #tcm-statusbar span.warn { color: #d97706; }
                  #tcm-wrap.light #tcm-statusbar span.err { color: #dc2626; }
                  #tcm-wrap.light .tcm-card {
      background: #d4d8dc;
      border-color: #b8bdc3;
  }
  #tcm-wrap.light .tcm-card-header {
      background: #c8cdd3;
      border-color: #b0b6bc;
      color: #2a2a2a;
  }
  #tcm-wrap.light .tcm-card-header:hover { color: #2a2a2a; }
  #tcm-wrap.light .tcm-card-body { background: #d4d8dc; }
                  #tcm-wrap.light .tcm-row { border-color: #c8cacd; }
  #tcm-wrap.light .tcm-row .lbl { color: #777; }
  #tcm-wrap.light .tcm-row .val { color: #2c2c2c; }
                  #tcm-wrap.light .tcm-row .val.green { color: #4a8; }
                  #tcm-wrap.light .tcm-row .val.red { color: #dc2626; }
                  #tcm-wrap.light .tcm-row .val.amber { color: #d97706; }
                  #tcm-wrap.light .tcm-row .val.blue { color: #2563eb; }
                  #tcm-wrap.light .tcm-rec { background: #f9fafb; }
                  #tcm-wrap.light .tcm-rec .rec-title { color: #2c2c2c; }
                  #tcm-wrap.light .tcm-rec .rec-body { color: #444; }
                  #tcm-wrap.light .tcm-emp { border-color: #eee; }
                  #tcm-wrap.light .tcm-emp .emp-name { color: #2c2c2c; }
                  #tcm-wrap.light .tcm-emp .emp-sub { color: #888; }
                  #tcm-wrap.light .tcm-bar { background: #ddd; }
                  #tcm-wrap.light .tcm-ctrl-btn { border-color: #ddd; color: #888; }
                  #tcm-wrap.light .tcm-ctrl-btn:hover { border-color: #4a8; color: #4a8; }
                  #tcm-wrap.light .tcm-ctrl-btn.active { border-color: #4a8; color: #4a8; background: rgba(22,163,74,0.07); }
                  #tcm-wrap.light .tcm-btn { background: #eee; border-color: #ddd; color: #444; }
                  #tcm-wrap.light .tcm-btn:hover { background: #ddd; border-color: #c8c8c8; color: #2c2c2c; }
                  #tcm-wrap.light .tcm-btn.green { background: rgba(22,163,74,0.1); border-color: rgba(22,163,74,0.3); color: #4a8; }
                  #tcm-wrap.light .tcm-btn.green:hover { background: rgba(22,163,74,0.2); }
                  #tcm-wrap.light .tcm-btn.red { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.3); color: #dc2626; }
                  #tcm-wrap.light .tcm-btn.amber { background: rgba(217,119,6,0.1); border-color: rgba(217,119,6,0.3); color: #d97706; }
                  #tcm-wrap.light .tcm-input { background: #d4d6d8; border-color: #b0b3b8; color: #2c2c2c; }
  #tcm-wrap.light .tcm-input:focus { border-color: #4a8; }
                  #tcm-wrap.light .tcm-notice { background: rgba(22,163,74,0.06); border-color: rgba(22,163,74,0.22); color: #444; }
                  #tcm-wrap.light .tcm-warn-box { background: rgba(217,119,6,0.06); border-color: rgba(217,119,6,0.2); color: #92400e; }
                  #tcm-wrap.light .tcm-section-label { color: #aaa; border-color: #ddd; }
                  #tcm-wrap.light .tcm-divider { border-color: #ddd; }
                  #tcm-wrap.light .tcm-stat-chip { background: #eee; color: #444; }
                  #tcm-wrap.light .tcm-queue-item { background: #ffffff; border-color: #ddd; }
                  #tcm-wrap.light .tcm-queue-item.current { background: rgba(22,163,74,0.05); border-color: rgba(22,163,74,0.3); }
                  #tcm-wrap.light .tcm-queue-item .q-name { color: #2c2c2c; }
                  #tcm-wrap.light .tcm-queue-item .q-meta { color: #888; }
                  #tcm-wrap.light .tcm-train-log th { color: #888; border-color: #ddd; }
                  #tcm-wrap.light .tcm-train-log td { border-color: #eee; color: #444; }
                  #tcm-wrap.light .tcm-train-log td:first-child { color: #2c2c2c; }
                  #tcm-wrap.light .tcm-filter-btn { background: #eee; border-color: #ddd; color: #888; }
                  #tcm-wrap.light .tcm-filter-btn:hover { border-color: #4a8; color: #4a8; }
                  #tcm-wrap.light .tcm-filter-btn.active { background: rgba(22,163,74,0.1); border-color: #4a8; color: #4a8; }
                  #tcm-wrap.light .tcm-mode-toggle { border-color: #ddd; }
                  #tcm-wrap.light .tcm-mode-toggle button { background: #f9fafb; color: #888; border-right-color: #ddd; }
                  #tcm-wrap.light .tcm-mode-toggle button.active { background: rgba(22,163,74,0.1); color: #4a8; }
                  #tcm-wrap.light .tcm-proj { background: #ffffff; border-color: #ddd; }
                  #tcm-wrap.light .tcm-proj .proj-name { color: #4a8; }
                  #tcm-wrap.light .tcm-sim-result { color: #aaa; }
                  #tcm-wrap.light .tcm-loading { color: #888; }
                  #tcm-wrap.light .tcm-salary-table th { color: #888; border-color: #ddd; }
                  #tcm-wrap.light .tcm-salary-table td { border-color: #eee; color: #888; }
                  #tcm-wrap.light .tcm-salary-table td:first-child { color: #2c2c2c; }
                  #tcm-wrap.light .tcm-chart-wrap { background: #f9fafb; border-color: #ddd; }
                  #tcm-wrap.light .tcm-chart-label { fill: #aaa; }
                  #tcm-wrap.light .tcm-verify-card { background: #ffffff; border-color: #ddd; }
                  #tcm-wrap.light .tcm-verify-message { color: #444; }
                  #tcm-wrap.light .tcm-verify-id { color: #aaa; }
                  #tcm-wrap.light .tcm-spin { border-color: #ddd; border-top-color: #4a8; }
                  #tcm-launcher.light-theme {
      background: #d4d6d8;
      border-color: #b0b3b8;
      color: #15803d;
      box-shadow: 0 0 6px rgba(22,163,74,0.25), 0 2px 8px rgba(0,0,0,0.15);
  }
                  #tcm-launcher.light-theme:hover {
                      border-color: rgba(22,163,74,0.5);
                      background: rgba(22,163,74,0.05);
                  }
                  #tcm-launcher.light-theme .tcm-launcher-label {
                      background: #f9fafb;
                      border-color: #ddd;
                      color: #aaa;
                  }
                  /* ── LIGHT MODE: override inline dark backgrounds ── */
  #tcm-wrap.light *[style*="background:#1a1a1a"],
  #tcm-wrap.light *[style*="background: #1a1a1a"] { background: #e0e2e4 !important; color: inherit !important; }
  #tcm-wrap.light *[style*="background:#2c2c2c"],
  #tcm-wrap.light *[style*="background: #2c2c2c"] { background: #e8e9ea !important; }
  #tcm-wrap.light *[style*="background:#1a1a1a"],
  #tcm-wrap.light *[style*="background: #1a1a1a"] { background: #d8dadc !important; }
                  #tcm-wrap.light *[style*="background:#1a1a2e"] { background: #1e3a5f !important; }
                  #tcm-wrap.light *[style*="background:#130808"] { background: #fff5f5 !important; }
                  #tcm-wrap.light *[style*="background:#080f09"] { background: #f0fdf4 !important; }
                  /* ── LIGHT MODE: inline bright green → dark green ── */
                  #tcm-wrap.light *[style*="color:#7eb8ff"],
                  #tcm-wrap.light *[style*="color: #7eb8ff"] { color: #15803d !important; }
                  #tcm-wrap.light *[style*="color:#fc6"],
                  #tcm-wrap.light *[style*="color: #fc6"] { color: #b45309 !important; }
                  #tcm-wrap.light *[style*="color:#f66"],
                  #tcm-wrap.light *[style*="color: #f66"] { color: #b91c1c !important; }
                  #tcm-wrap.light *[style*="color:#7eb8ff"],
                  #tcm-wrap.light *[style*="color: #7eb8ff"] { color: #1d4ed8 !important; }
                  #tcm-wrap.light *[style*="color:#a090d0"],
                  #tcm-wrap.light *[style*="color: #a090d0"] { color: #6d28d9 !important; }
                  #tcm-wrap.light *[style*="color:#fc8"] { color: #b45309 !important; }
                  #tcm-wrap.light *[style*="color:#f88"] { color: #b91c1c !important; }
                  #tcm-wrap.light *[style*="color:#facc15"] { color: #a16207 !important; }
                  /* ── LIGHT MODE: inline near-white text → dark text ── */
                  #tcm-wrap.light *[style*="color:#ddd"],
                  #tcm-wrap.light *[style*="color: #ddd"]  { color: #2c2c2c !important; }
                  #tcm-wrap.light *[style*="color:#eee"],
                  #tcm-wrap.light *[style*="color: #eee"]  { color: #2c2c2c !important; }
                  #tcm-wrap.light *[style*="color:#c8c8c8"],
                  #tcm-wrap.light *[style*="color: #c8c8c8"]  { color: #444 !important; }
                  #tcm-wrap.light *[style*="color:#c9d1d9"],
                  #tcm-wrap.light *[style*="color: #c9d1d9"]  { color: #444 !important; }
                  #tcm-wrap.light *[style*="color:#aaa"],
                  #tcm-wrap.light *[style*="color: #aaa"]  { color: #444 !important; }
                  #tcm-wrap.light *[style*="color:#888"],
                  #tcm-wrap.light *[style*="color: #888"]  { color: #444 !important; }
                  #tcm-wrap.light *[style*="color:#777"]   { color: #2a2a2a !important; }
                  /* ── LIGHT MODE: rgba green backgrounds → soft light green ── */
                  #tcm-wrap.light *[style*="background:rgba(126, 184, 255"] { background: rgba(126,184,255,0.12) !important; }
                  #tcm-wrap.light *[style*="background: rgba(126, 184, 255"] { background: rgba(126,184,255,0.12) !important; }
                  #tcm-wrap.light *[style*="background:rgba(239,68,68"]  { background: rgba(220,38,38,0.08) !important; }
                  #tcm-wrap.light *[style*="background:rgba(245,158,11"] { background: rgba(180,83,9,0.08)  !important; }
                  #tcm-wrap.light *[style*="background:rgba(96,165,250"] { background: rgba(29,78,216,0.08) !important; }
                  #tcm-wrap.light *[style*="background:rgba(167,139,250"]{ background: rgba(109,40,217,0.08)!important; }
                  /* ── LIGHT MODE: dark borders → light borders ── */
                  #tcm-wrap.light *[style*="border:1px solid #2a2a2a"],
                  #tcm-wrap.light *[style*="border: 1px solid #2a2a2a"]       { border-color: #ddd !important; }
                  #tcm-wrap.light *[style*="border-bottom:1px solid #2a2a2a"] { border-color: #ddd !important; }
                  #tcm-wrap.light *[style*="border-bottom:1px solid #2c2c2c"] { border-color: #eee !important; }
                  #tcm-wrap.light *[style*="border-bottom:1px solid #1a1a1a"] { border-color: #eee !important; }
                  #tcm-wrap.light *[style*="border-top:1px solid #2a2a2a"]    { border-color: #ddd !important; }
                  #tcm-wrap.light *[style*="border-top:2px solid #2a2a2a"]    { border-color: #ddd !important; }
                  #tcm-wrap.light *[style*="border-color:#2a2a2a"]            { border-color: #ddd !important; }
#tcm-cat-tabs { display:flex; background:#1a1a1a; border-bottom:1px solid #444; flex-shrink:0; padding:0 4px; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
                  #tcm-cat-tabs::-webkit-scrollbar { display:none; }
                  .tcm-cat { padding:8px 14px; font-size:12px; font-weight:700; color:#777; cursor:pointer; border-bottom:2px solid transparent; text-transform:uppercase; letter-spacing:0.06em; transition:all 0.15s; white-space:nowrap; user-select:none; flex-shrink:0; }
                  .tcm-cat:hover { color:#aaa; background:rgba(255,255,255,0.02); }
                 .tcm-cat.active { color:#7eb8ff; border-bottom-color:#7eb8ff; background:rgba(126, 184, 255, 0.08);   }
                  #tcm-wrap.light #tcm-cat-tabs { background:#bdc3ca; border-color:#a8aeb5; }
                  #tcm-wrap.light .tcm-cat { color:#444; }
                  #tcm-wrap.light .tcm-cat:hover { color:#2c2c2c; }
                  #tcm-wrap.light .tcm-cat.active { color:#4a8; border-bottom-color:#4a8; background:rgba(22,163,74,0.05);  }
              `);
          },





          _findIconSlot(preferredX, preferredY) {
              try {
                  const size = TCM.ICON_SIZE + TCM.ICON_GAP;

                  const occupied = [];
                  for (const el of document.querySelectorAll('*')) {
                      if (el.id === 'tcm-launcher' || el.id === 'tcm-wrap') continue;
                      const style = window.getComputedStyle(el);
                      if (style.position !== 'fixed') continue;
                      const rect = el.getBoundingClientRect();
                      if (rect.width < 10 || rect.height < 10) continue;

                      if (Math.abs(rect.left - preferredX) > 60) continue;
                      occupied.push({ top: rect.top, bottom: rect.bottom });
                  }

                  let y = preferredY;
                  let attempts = 0;
                  while (attempts < 40) {
                      const yBottom = y + TCM.ICON_SIZE;
                      const collision = occupied.find(r =>
                          !(yBottom + TCM.ICON_GAP <= r.top || y >= r.bottom + TCM.ICON_GAP)
                      );
                      if (!collision) break;
                      y = collision.bottom + TCM.ICON_GAP;
                      attempts++;
                  }
                  return Math.min(y, window.innerHeight - TCM.ICON_SIZE - 8);
              } catch (e) {
                  return preferredY;
              }
          },

          buildUI() {
              document.getElementById('tcm-wrap')?.remove();
              document.getElementById('tcm-launcher')?.remove();

              const s = Storage.getSettings();
              const iconX = Math.min(s.iconX ?? 20, window.innerWidth - TCM.ICON_SIZE - 8);
  const preferredY = Math.min(s.iconY || 200, window.innerHeight - TCM.ICON_SIZE - 8);

              let iconY;
              if (s.iconYLocked) {
                  iconY = preferredY;
              } else {
                  iconY = this._findIconSlot(iconX, preferredY);
                  if (iconY !== preferredY) {
                      s.iconY = iconY;
                      Storage.saveSettings(s);
                  }
              }

              const launcher = document.createElement('div');
              launcher.id = 'tcm-launcher';
              launcher.title = 'Torn Company Manager — click to open';
              launcher.innerHTML = '&#x2B21;<span class="tcm-launcher-label">TCM</span>';
              launcher.style.left = iconX + 'px';
              launcher.style.top  = iconY + 'px';
             document.body.appendChild(launcher);
              this.launcher = launcher;


              const wrap = document.createElement('div');
              wrap.id = 'tcm-wrap';
              if (isMobile) {
                  const mSavedX = (s.uiX && s.uiX > 0) ? Math.min(s.uiX, window.innerWidth - 60) : 4;
                  const mSavedY = (s.uiY && s.uiY > 0) ? Math.min(s.uiY, window.innerHeight - 100) : 60;
                  wrap.style.left  = mSavedX + 'px';
                  wrap.style.top   = mSavedY + 'px';
                  wrap.style.width = Math.min(s.uiW || (window.innerWidth - 8), window.innerWidth - 8) + 'px';
                  if (s.uiH) wrap.style.height = Math.min(s.uiH, window.innerHeight * 0.85) + 'px';
              } else {
                  wrap.style.left = (s.uiX || 70) + 'px';
                  wrap.style.top  = (s.uiY || 80) + 'px';
                  if (s.uiW) wrap.style.width = s.uiW + 'px';
                  if (s.uiH) wrap.style.height = s.uiH + 'px';
              }
              wrap.style.display = (s.persistOpen && !s.minimized) ? 'flex' : 'none';
              if (s.pinned) wrap.classList.add('pinned');


              wrap.addEventListener('mousedown', () => {
                  wrap.classList.add('focused');
              });
              document.addEventListener('mousedown', (e) => {
                  if (!wrap.contains(e.target)) wrap.classList.remove('focused');
              });

              wrap.innerHTML = `
                  <div id="tcm-titlebar">
                      <div id="tcm-title">
                          &#x2B21; Company Manager
                          <span class="tcm-version">v${TCM.VERSION}</span>
                      </div>
                      <div id="tcm-controls">
                          <button class="tcm-ctrl-btn" id="tcm-btn-refresh" title="Refresh data">&#x21BB;</button>
                          <button class="tcm-ctrl-btn ${s.pinned ? 'active' : ''}" id="tcm-btn-pin" title="Pin (disable drag)">&#x1F4CC;</button>
                          <button class="tcm-ctrl-btn" id="tcm-btn-settings" title="Settings">&#x2699;</button>
                          <button class="tcm-ctrl-btn" id="tcm-btn-theme" title="Toggle light/dark mode">&#x263C;</button>
                          <button class="tcm-ctrl-btn danger" id="tcm-btn-close" title="Close">&#x2715;</button>
                      </div>
                  </div>
                 <div id="tcm-tabs">
                      <div id="tcm-cat-tabs">
                          <div class="tcm-cat active" data-cat="management">Management</div>
                          <div class="tcm-cat" data-cat="expansion">Expansion</div>
                          <div class="tcm-cat" data-cat="training">Training</div>
                          <div class="tcm-cat" data-cat="proxy">Multi-Co</div>
                      </div>
                      <div id="tcm-sub-tabs"></div>
                  </div>
                  <div id="tcm-body">
                      <div class="tcm-loading"><span class="tcm-spin"></span>Initialising...</div>
                  </div>
                  <div id="tcm-statusbar">
                      <span id="tcm-status-text">Ready</span>
                      <span>TCM v${TCM.VERSION}</span>
                  </div>
              `;

              document.body.appendChild(wrap);
              this.container = wrap;


              const _CAT_MAP = {
                  management: [
                      { id: 'overview',    label: 'Overview' },
                      { id: 'finance',     label: 'Finance'  },
                      { id: 'stock',       label: 'Stock'    },
                  ],
                  expansion: [
                      { id: 'recs',        label: 'Advice'      },
                      { id: 'optimize',    label: 'Optimize'    },
                      { id: 'projections', label: 'Projections' },
                      { id: 'benchmark',   label: 'Benchmark'   },
                  ],
training: [
                      { id: 'rotation', label: 'Training'  },
                      { id: 'calc',     label: 'Contracts' },
                  ],
                  proxy: [
                      { id: 'proxy_keys',    label: 'API Keys' },
                      { id: 'proxy_compare', label: 'Compare'  },
                      { id: 'proxy_history', label: 'History'  },
                      { id: 'proxy_ee_perf', label: 'EE Performance' },
                  ],
              };

              this._renderSubTabs = (cat, activeTab) => {
                  const subContainer = document.getElementById('tcm-sub-tabs');
                  if (!subContainer) return;
                  subContainer.innerHTML = '';
                  let tabs = _CAT_MAP[cat] || [];
                  if (this.state?.limitedMode) {
                      // Public / non-director: only tabs that make sense without private director data
                      const allowed = {
                          management: ['overview'],
                          expansion: ['benchmark'],
                          training: ['rotation', 'calc'],
                          proxy: ['proxy_keys', 'proxy_compare', 'proxy_history', 'proxy_ee_perf']
                      };
                      const allow = new Set(allowed[cat] || []);
                      if (cat === 'management' && this.state?.accessMeta?.hasStock && this.state?.stock && Object.keys(this.state.stock).length) {
                          allow.add('stock');
                      }
                      tabs = tabs.filter(t => allow.has(t.id));
                  } else if (cat === 'management') {
                      const hasStock = !!(this.state?.stock && Object.keys(this.state.stock).length > 0);
                      tabs = tabs.filter(t => t.id !== 'stock' || hasStock);
                  }
                  if (activeTab && !tabs.find(t => t.id === activeTab) && tabs.length) activeTab = tabs[0].id;
                  tabs.forEach(item => {
                      const t = document.createElement('div');
                      t.className = 'tcm-tab' + (item.id === activeTab ? ' active' : '');
                      t.dataset.tab = item.id;
                      t.textContent = item.label;
                      t.addEventListener('click', e => {
                          e.stopPropagation(); e.preventDefault();
                          subContainer.querySelectorAll('.tcm-tab').forEach(x => x.classList.remove('active'));
                          t.classList.add('active');
                          this._renderTab(item.id);
                      });
                      subContainer.appendChild(t);
                  });
              };

              wrap.querySelectorAll('.tcm-cat').forEach(catEl => {
                  catEl.addEventListener('click', e => {
                      e.stopPropagation(); e.preventDefault();
                      wrap.querySelectorAll('.tcm-cat').forEach(c => c.classList.remove('active'));
                      catEl.classList.add('active');
                      this._currentCat = catEl.dataset.cat;
                      const _tb = document.getElementById('tcm-tabs');
                      if (_tb) _tb.style.display = '';
                      if (this._currentTab === 'settings') this._currentTab = null;
                      const firstTab = (_CAT_MAP[catEl.dataset.cat] || [])[0]?.id || 'overview';
                      this._renderSubTabs(catEl.dataset.cat, firstTab);
                      this._renderTab(firstTab);
                  });
              });


              this._currentCat = 'management';
              this._renderSubTabs('management', 'overview');


              wrap.querySelector('#tcm-btn-refresh').addEventListener('click', () => {
                  App.refresh(false).finally(() => App._startCountdown());
              });
              wrap.querySelector('#tcm-btn-theme').addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  s2.theme = (s2.theme === 'light') ? 'dark' : 'light';
                  Storage.saveSettings(s2);
                  this._applyTheme();
              });
              wrap.querySelector('#tcm-btn-close').addEventListener('click', () => {
                  wrap.style.display = 'none';
                  const s2 = Storage.getSettings(); s2.minimized = true; Storage.saveSettings(s2);
              });
              wrap.querySelector('#tcm-btn-pin').addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  s2.pinned = !s2.pinned;
                  Storage.saveSettings(s2);
                  if (s2.pinned) { wrap.classList.add('pinned'); wrap.querySelector('#tcm-btn-pin').classList.add('active'); }
                  else { wrap.classList.remove('pinned'); wrap.querySelector('#tcm-btn-pin').classList.remove('active'); }
              });
              wrap.querySelector('#tcm-btn-settings').addEventListener('click', () => {
                  if (this._currentTab === 'settings' || this._currentCat === 'settings') {
                      this._leaveSettingsPage();
                  } else {
                      this._openSettingsPage();
                  }
              });

launcher.addEventListener('click', () => {
                  if (wrap.style.display !== 'none') { wrap.style.display = 'none'; return; }
                  wrap.style.display = 'flex';
                  const s2 = Storage.getSettings(); s2.minimized = false; Storage.saveSettings(s2);
App._pendingLoad = false;
                  if (this.state) this._renderTab(this._currentTab);
                  App.refreshUntilGood();
              });

              this._attachDrag();
              this._attachLauncherDrag();
              this._applyTheme();
          },

          _currentTab: 'overview',
          _currentCat: 'management',

          _renderTab(tab) {
              if (tab && tab !== 'settings') {
                  const _tb = document.getElementById('tcm-tabs');
                  if (_tb) _tb.style.display = '';
              }
              this._currentTab = tab;
              const body = document.getElementById('tcm-body');
              if (!body) return;

              // Limited mode: bounce off director-only tabs
              if (this.state?.limitedMode && tab && tab !== 'settings') {
                  const limitedOk = new Set(['overview','benchmark','rotation','calc','stock','proxy_keys','proxy_compare','proxy_history','proxy_ee_perf']);
                  if (tab === 'stock' && !(this.state.accessMeta?.hasStock)) limitedOk.delete('stock');
                  if (!limitedOk.has(tab)) {
                      tab = 'overview';
                      this._currentTab = 'overview';
                  }
              }

              if (!this.state) {
                  body.innerHTML = '<div class="tcm-loading"><span class="tcm-spin"></span>Loading data...</div>';
                  return;
              }
              const _ubUpdate = (this._updateBannerHTML ? this._updateBannerHTML() : '');
              const _ubLimited = (this.state?.limitedMode) ? (
                  `<div class="tcm-notice" style="border-color:#f59e0b;background:rgba(245,158,11,0.08);margin-bottom:10px;line-height:1.55;">
                      <strong style="color:#f59e0b;">Limited view</strong>
                      <span style="color:#ccc;"> — non-director / public data only.
                      ${this.state.isDirector ? 'Your key is missing some director selections.' : 'You are not the company director.'}
                      Access: <code>${this.state.accessLevel || 'member'}</code>
                      ${this.state.accessMeta?.hasEmployees ? ' · roster' : ''}
                      ${this.state.accessMeta?.hasDetailed ? ' · detailed' : ''}
                      ${this.state.accessMeta?.hasStock ? ' · stock' : ''}.
                      Director-only tools are hidden. Paste a director key in Settings for the full dashboard.
                      </span>
                  </div>`
              ) : '';
              const _ub = _ubUpdate + _ubLimited;
              switch (tab) {
                  case 'overview':
                      body.innerHTML = _ub + this._tabOverview(this.state);
                      document.getElementById('tcm-overview-sync-btn')?.addEventListener('click', async () => {
                          const _btn = document.getElementById('tcm-overview-sync-btn');
                          if (_btn) { _btn.disabled = true; _btn.textContent = '↑ Syncing...'; }
                          const _res = await GoogleSync.syncAll(UI.state);
                          if (_btn) { _btn.disabled = false; _btn.textContent = _res?.allOk ? '✓ Synced' : '⚠ Failed'; setTimeout(() => { const b = document.getElementById('tcm-overview-sync-btn'); if (b) b.textContent = '↑ Sync Now'; }, 2000); }
                          if (_res?.allOk) UI._renderTab('overview');
                      });
                      break;
                                 case 'finance':
      body.innerHTML = _ub + this._tabFinance(this.state);

      {
          const _tt = document.getElementById('tcm-np-tooltip');
          if (_tt) {
              body.querySelectorAll('.tcm-chart-dot').forEach(g => {
                  g.addEventListener('mouseenter', () => {
                      const raw = decodeURIComponent(g.dataset.tip || '');
                      const [date, val, color] = raw.split('|');
                      _tt.innerHTML = `<span style="color:#9ca3af;">${date}</span>&nbsp;&nbsp;<span style="color:${color};font-weight:700;">${val}</span>`;
                      _tt.style.display = 'block';
                  });
                  g.addEventListener('mousemove', e => {
                      const wrap = _tt.parentElement;
                      if (!wrap) return;
                      const r = wrap.getBoundingClientRect();
                      const tx = Math.min(e.clientX - r.left + 14, wrap.offsetWidth - 170);
                      const ty = Math.max(4, e.clientY - r.top - 38);
                      _tt.style.left = tx + 'px';
                      _tt.style.top  = ty + 'px';
                  });
                  g.addEventListener('mouseleave', () => { _tt.style.display = 'none'; });
              });
          }
      }

      body.querySelectorAll('.tcm-fin-sub').forEach(btn => {
          btn.addEventListener('click', () => {
              UI._financeSubTab = btn.dataset.sub;
              this._renderTab('finance');
          });
      });

      document.getElementById('tc-reload')?.addEventListener('click', () => {
          if (TaxCollection.loadCfg().manualOnly || false) return;
          const key = Storage.getApiKey();
          if (!key) { alert('No API key set.'); return; }
          UI._taxDataLoading = true;
          UI._taxData = null;
          this._renderTab('finance');
          TaxCollection.fetchLogs(key).then(logs => {
              UI._taxData = logs;
              UI._taxDataLoading = false;
              this._renderTab('finance');
          }).catch(() => { UI._taxDataLoading = false; this._renderTab('finance'); });
      });
      document.getElementById('tc-export')?.addEventListener('click', () => {
          const employees = UI.state?.employees || {};
          const taxCfg = TaxCollection.loadCfg();
          const payments = UI._taxData ? TaxCollection.processPayments(UI._taxData, employees, taxCfg) : {};
          TaxCollection.exportCSV(employees, payments, taxCfg);
      });
      document.getElementById('tc-config-toggle')?.addEventListener('click', () => {
          const panel = document.getElementById('tc-config-panel');
          if (!panel) return;
          if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
          const employees = UI.state?.employees || {};
          panel.innerHTML = TaxCollection.configPanelHTML(employees, TaxCollection.loadCfg());
          panel.style.display = 'block';
          panel.addEventListener('input', e => {
              if (e.target.classList.contains('tc-amount')) {
                  const raw    = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                  const cursor = e.target.selectionStart;
                  const oldLen = e.target.value.length;
                  e.target.value = raw ? Number(raw).toLocaleString() : '';
                  const newLen = e.target.value.length;
                  e.target.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
              }
          });
          panel.querySelectorAll('.tc-exempt').forEach(cb => {
                  cb.addEventListener('change', () => {
                      const row = cb.closest('tr');
                      row.querySelectorAll('.tc-type,.tc-amount,.tc-period').forEach(el => el.disabled = cb.checked);
                  });
              });
              panel.querySelectorAll('.tc-period').forEach(sel => {
                  sel._prevPeriod = sel.value;
                  sel.addEventListener('change', () => {
                      const id = sel.dataset.id;
                      const amtEl = panel.querySelector(`.tc-amount[data-id="${id}"]`);
                      if (!amtEl || !sel._prevPeriod || sel._prevPeriod === sel.value) return;
                      const rawAmt = parseInt((amtEl.value || '').replace(/,/g, '')) || 0;
                      if (!rawAmt) { sel._prevPeriod = sel.value; return; }
                      const _daysMap = { weekly: 7, monthly: 30.4375, quarterly: 91.3125, none: 0 };
                      const _from = _daysMap[sel._prevPeriod] || 7;
                      const _to   = _daysMap[sel.value] || 7;
                      if (_from && _to) amtEl.value = Math.round(rawAmt * (_to / _from)).toLocaleString('en-US');
                      sel._prevPeriod = sel.value;
                  });
              });


          panel.querySelectorAll('.tc-edit-payment').forEach(btn => {
              btn.addEventListener('click', () => {
                  const empId = btn.dataset.id;
                  const empName = (UI.state?.employees || {})[empId]?.name || empId;
                  const cfg = TaxCollection.loadCfg();
                  const ec  = (cfg.employees || {})[empId] || {};
                  const manuals = (cfg.manualPayments || {})[empId] || [];
                  const weeklyTax = ec.amount || 0;


                  const editorId = `tc-manual-editor-${empId}`;
                  let existingEditor = document.getElementById(editorId);
                  if (existingEditor) { existingEditor.remove(); return; }

                  const editorHtml = `<div id="${editorId}" style="background:#111827;border:1px solid #374151;border-radius:6px;padding:12px;margin:8px 0;font-size:12px;">
                      <strong style="color:#ddd;">Manual Payments — ${empName}</strong>
                      <div style="color:#888;font-size:11px;margin:4px 0 8px;">
                          Tax: $${Number(weeklyTax).toLocaleString()} / ${ec.period||'week'}
                          ${ec.period === 'week' || !ec.period ? `
                            <span style="color:#4b5563;margin-left:8px;">·</span>
                            <span style="color:#7eb8ff;margin-left:6px;">≈ $${(weeklyTax*4.348).toLocaleString(undefined,{maximumFractionDigits:0})} /month</span>
                            <span style="color:#4b5563;margin-left:8px;">·</span>
                            <span style="color:#a78bfa;margin-left:6px;">≈ $${(weeklyTax*13.044).toLocaleString(undefined,{maximumFractionDigits:0})} /quarter</span>
                          ` : ec.period === 'monthly' ? `
                            <span style="color:#4b5563;margin-left:8px;">·</span>
                            <span style="color:#f59e0b;margin-left:6px;">≈ $${(weeklyTax/4.348).toLocaleString(undefined,{maximumFractionDigits:0})} /week</span>
                            <span style="color:#4b5563;margin-left:8px;">·</span>
                            <span style="color:#a78bfa;margin-left:6px;">≈ $${(weeklyTax*3).toLocaleString(undefined,{maximumFractionDigits:0})} /quarter</span>
                          ` : ''}
                      </div>
                      <div id="${editorId}-list">
                      ${manuals.length === 0
                          ? `<div style="color:#888;font-size:11px;margin-bottom:8px;">No entries yet.</div>`
                          : manuals.map((p, i) => `
                          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                              <input type="date" class="tc-mp-date" data-idx="${i}" value="${p.date}"
                                style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;">
                              <input type="number" class="tc-mp-amount" data-idx="${i}" value="${p.amount}" placeholder="Amount (e.g. 96000000)"
                                style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;width:140px;">
                              <input type="text" class="tc-mp-note" data-idx="${i}" value="${p.note||''}" placeholder="Note (optional)"
                                style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;width:120px;">
                              <button class="tcm-btn red tc-mp-del" data-idx="${i}" style="font-size:10px;padding:2px 6px;">✕</button>
                          </div>`).join('')
                      }
                      </div>
                      <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
                          <button class="tcm-btn green" id="${editorId}-add">+ Add Entry</button>
                          <button class="tcm-btn" id="${editorId}-save">✓ Save</button>
                          <button class="tcm-btn" id="${editorId}-cancel">Cancel</button>
                      </div>
                      <div id="${editorId}-info" style="font-size:11px;color:#9ca3af;margin-top:6px;"></div>
                  </div>`;

                  btn.closest('td').insertAdjacentHTML('afterend', `<td style="padding:0;" colspan="2">${editorHtml}</td>`);

                  const editor = document.getElementById(editorId);

                  const _getEntries = () => {
                      const entries = [];
                      editor.querySelectorAll('.tc-mp-date').forEach((dateEl, i) => {
                          const amtEl  = editor.querySelectorAll('.tc-mp-amount')[i];
                          const noteEl = editor.querySelectorAll('.tc-mp-note')[i];
                          const amount = Number(amtEl?.value) || 0;
                          if (dateEl.value && amount > 0) {
                              entries.push({ date: dateEl.value, amount, note: noteEl?.value || '' });
                          }
                      });
                      return entries;
                  };

                  const _updateInfo = () => {
                      const entries = _getEntries();
                      const total = entries.reduce((s, e) => s + e.amount, 0);
                      if (!total || !weeklyTax) { document.getElementById(`${editorId}-info`).textContent = ''; return; }
                      const periods = total / weeklyTax;
                      const latestDate = entries.reduce((d, e) => (!d || e.date > d) ? e.date : d, null);
                      if (!latestDate) return;
                      const startMs = new Date(latestDate).getTime();
                      const periodMs = (ec.period === 'monthly') ? 30.4375 * 86400000 : 7 * 86400000;
                      const paidUntil = new Date(startMs + periods * periodMs);
                      document.getElementById(`${editorId}-info`).textContent =
                          `$${(total/1e6).toFixed(2)}M total ÷ $${(weeklyTax/1e6).toFixed(1)}M per ${ec.period||'week'} = ${periods.toFixed(1)} ${ec.period||'week'}s covered → Paid until ${paidUntil.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
                  };

                  editor.addEventListener('input', _updateInfo);
                  _updateInfo();

                  editor.querySelector(`#${editorId}-add`).addEventListener('click', () => {
                      const list = document.getElementById(`${editorId}-list`);
                      const today = new Date().toISOString().slice(0, 10);
                      list.insertAdjacentHTML('beforeend', `
                          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                              <input type="date" class="tc-mp-date" value="${today}"
                                style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;">
                              <input type="number" class="tc-mp-amount" placeholder="Amount (e.g. 96000000)"
                                style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;width:140px;">
                              <input type="text" class="tc-mp-note" placeholder="Note (optional)"
                                style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;width:120px;">
                              <button class="tcm-btn red tc-mp-del" style="font-size:10px;padding:2px 6px;">✕</button>
                          </div>`);
                      editor.addEventListener('input', _updateInfo);
                  });

                  editor.addEventListener('click', e => {
                      if (e.target.classList.contains('tc-mp-del')) {
                          e.target.closest('div[style]').remove();
                          _updateInfo();
                      }
                  });

                  editor.querySelector(`#${editorId}-save`).addEventListener('click', async () => {
                      const entries = _getEntries();
                      const cfg2 = TaxCollection.loadCfg();
                      if (!cfg2.manualPayments) cfg2.manualPayments = {};
                      cfg2.manualPayments[empId] = entries;
                      TaxCollection.saveCfg(cfg2);
                      editor.closest('td')?.remove();

                      const key = Storage.getApiKey();
                      if (key) {
                          try {
                              const freshLogs = UI._taxData || await TaxCollection.fetchLogs(key).catch(() => null);
                              if (freshLogs) {
                                  const freshCfg  = TaxCollection.loadCfg();
                                  const freshPayments = TaxCollection.processPayments(freshLogs, UI.state?.employees || {}, freshCfg);
                                  await GoogleSync.syncAll(UI.state);
                              }
                          } catch(e) { console.warn('[TCM] Tax sheet sync after manual save:', e); }
                      }
                      UI._renderTab('finance');
                  });

                  editor.querySelector(`#${editorId}-cancel`).addEventListener('click', () => {
                      editor.closest('td')?.remove();
                  });
              });
          });
          document.getElementById('tc-save-cfg')?.addEventListener('click', () => {
              const cfg = TaxCollection.loadCfg();
              panel.querySelectorAll('.tc-exempt').forEach(cb => {
                  const id = cb.dataset.id;
                  if (!cfg.employees[id]) cfg.employees[id] = {};
                  cfg.employees[id].exempt = cb.checked;
              });
              panel.querySelectorAll('.tc-type').forEach(s  => { if(!cfg.employees[s.dataset.id]) cfg.employees[s.dataset.id]={}; cfg.employees[s.dataset.id].type = s.value; });
              panel.querySelectorAll('.tc-amount').forEach(n => { if(!cfg.employees[n.dataset.id]) cfg.employees[n.dataset.id]={}; cfg.employees[n.dataset.id].amount = parseInt((n.value||'').replace(/,/g,''))||10000000; });
              panel.querySelectorAll('.tc-period').forEach(s => { if(!cfg.employees[s.dataset.id]) cfg.employees[s.dataset.id]={}; cfg.employees[s.dataset.id].period = s.value; });
              panel.querySelectorAll('.tc-since').forEach(s => { if(!cfg.employees[s.dataset.id]) cfg.employees[s.dataset.id]={}; cfg.employees[s.dataset.id].paymentSince = s.value || null; });
              const _qsEl = document.getElementById('tc-quarter-start');
      if (_qsEl) { cfg.settings = cfg.settings || {}; cfg.settings.quarterStartMonth = parseInt(_qsEl.value) || 0; }
      const _wsEl = document.getElementById('tc-week-start');
      if (_wsEl) { cfg.settings = cfg.settings || {}; cfg.settings.weekStartDay = parseInt(_wsEl.value); }
      TaxCollection.saveCfg(cfg);
      UI._taxData = null;
      panel.style.display = 'none';
      this._renderTab('finance');
          });
      });
      document.getElementById('tc-periods-show-top')?.addEventListener('change', () => {
                          const _pv = parseInt(document.getElementById('tc-periods-show-top')?.value) || 2;
                          const _pcfg = TaxCollection.loadCfg();
                          _pcfg.settings = _pcfg.settings || {};
                          _pcfg.settings.periodsToShow = Math.max(1, Math.min(24, _pv));
                          TaxCollection.saveCfg(_pcfg);
                          this._renderTab('finance');
                      });
                      document.getElementById('tc-sort-toggle')?.addEventListener('click', () => {
                          UI._taxSortOrder = (UI._taxSortOrder || Storage.get('tax_sort_order', 'unpaid_first')) === 'unpaid_first' ? 'paid_first' : 'unpaid_first';
                          Storage.set('tax_sort_order', UI._taxSortOrder);
                          this._renderTab('finance');
                      });
                      document.getElementById('tc-manual-only-toggle')?.addEventListener('click', () => {
                          const _tcfgM = TaxCollection.loadCfg();
                          _tcfgM.manualOnly = !(_tcfgM.manualOnly || false);
                          if (_tcfgM.manualOnly) UI._taxData = null;
                          TaxCollection.saveCfg(_tcfgM);
                          this._renderTab('finance');
                      });
      document.getElementById('tc-save-settings')?.addEventListener('click', () => {
          const cfg = TaxCollection.loadCfg();
          cfg.settings = cfg.settings || {};
          cfg.settings.periodsToShow = parseInt(document.getElementById('tc-periods-show')?.value) || 8;
          cfg.settings.reminder = document.getElementById('tc-reminder-tmpl')?.value || cfg.settings.reminder;
          TaxCollection.saveCfg(cfg);
          this._renderTab('finance');
      });
      body.querySelectorAll('.tc-remind').forEach(a => {
          a.addEventListener('click', e => {
              e.preventDefault();
              const msg = decodeURIComponent(a.dataset.msg);
              const xid = a.dataset.xid;

              try {
                  navigator.clipboard.writeText(msg).catch(() => {

                      const ta = document.createElement('textarea');
                      ta.value = msg; ta.style.position = 'fixed'; ta.style.opacity = '0';
                      document.body.appendChild(ta); ta.focus(); ta.select();
                      document.execCommand('copy'); document.body.removeChild(ta);
                  });
              } catch(err) {}


              const tornUrl = `https://www.torn.com/messages.php#/p=compose&XID=${xid}`;
              window.open(tornUrl, '_blank');

              const orig = a.textContent;
              a.textContent = '✓ Copied! Paste in message';
              a.style.color = '#7eb8ff';
              setTimeout(() => { a.textContent = orig; a.style.color = ''; }, 3000);
          });
      });
                  body.querySelectorAll('.tc-edit-payment').forEach(btn => {
          btn.addEventListener('click', () => {
              const empId   = btn.dataset.id;
              const empName = (UI.state?.employees || {})[empId]?.name || empId;
              const cfg     = TaxCollection.loadCfg();
              const ec      = (cfg.employees || {})[empId] || {};
              const weeklyTax = Number(ec.amount) || 0;
              const periodLabel = ec.period || 'week';


              const existingRow = document.getElementById(`tc-editor-row-${empId}`);
              if (existingRow) { existingRow.remove(); return; }


              const manuals = (cfg.manualPayments || {})[empId] || [];


              const _apiRaw = (!(cfg.manualOnly||false) && UI._taxData)
                  ? TaxCollection.processPayments(UI._taxData, UI.state?.employees || {}, cfg)
                  : {};
              const _apiEntries = [];
          Object.entries(_apiRaw[empId] || {}).forEach(([, bucket]) => {
      (bucket.entries || []).filter(e => !e.manual && e.amount > 0 && e.type === (ec.type || 'money')).forEach(e => {
          _apiEntries.push({ date: new Date((e.ts||0)*1000).toISOString().slice(0,10), amount: e.amount, ts: e.ts||0, logId: e.logId || null });
      });
  });
          _apiEntries.sort((a, b) => b.ts - a.ts);
              const _curExcl = (cfg.excludedPayments || {})[empId] || [];
              const _apiSectionHtml = _apiEntries.length
                  ? `<div style="margin-bottom:10px;padding:8px;background:#0a0e14;border-radius:4px;border:1px solid #2a2a2a;">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;flex-wrap:wrap;gap:4px;">
                          <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;">
                              API Payments <span style="font-weight:400;text-transform:none;color:#4b5563;">(uncheck to exclude from coverage)</span>
                          </div>
                          <div style="display:flex;gap:4px;">
                              <button id="tc-api-incl-all-${empId}" class="tcm-btn" style="font-size:10px;padding:2px 7px;">✓ Include All</button>
                              <button id="tc-api-excl-all-${empId}" class="tcm-btn red" style="font-size:10px;padding:2px 7px;">✕ Exclude All</button>
                          </div>
                      </div>
                      ${_apiEntries.map(e => {
                          const _eKey  = e.logId || String(e.ts);
                          const _excld = _curExcl.includes(_eKey);
                          return `<div style="display:flex;gap:8px;padding:3px 0;font-size:11px;font-family:'JetBrains Mono',monospace;align-items:center;">
                              <input type="checkbox" class="tc-excl-api-payment" data-key="${_eKey}"
                                  ${_excld ? '' : 'checked'} style="accent-color:#7eb8ff;width:12px;height:12px;flex-shrink:0;">
                              <span style="color:#4b5563;min-width:84px;${_excld ? 'opacity:0.4;text-decoration:line-through;' : ''}">${e.date}</span>
                              <span style="color:#d1d5db;font-weight:600;${_excld ? 'opacity:0.4;text-decoration:line-through;' : ''}">${ec.type === 'item' ? `${e.amount} Xan` : `$${Number(e.amount).toLocaleString()}`}</span>
                              ${_excld ? '<span style="color:#f59e0b;font-size:10px;margin-left:4px;">excluded</span>' : ''}
                          </div>`;
                      }).join('')}
                     </div>`
                  : `<div style="font-size:11px;color:#4b5563;margin-bottom:8px;padding:5px 8px;background:#0a0e14;border-radius:3px;">No API payments detected${cfg.manualOnly ? ' (Manual Only mode is ON)' : ' — click Reload Payments first'}</div>`;            const buildEntryRow = (date, amount, note) => `
                  <div class="tc-mp-entry" style="display:flex;gap:6px;align-items:center;margin-bottom:5px;flex-wrap:wrap;">
                      <input type="date" class="tc-mp-date" value="${date}"
                        style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;">
                      <input type="text" class="tc-mp-amount" value="${amount ? Number(amount).toLocaleString() : ''}" placeholder="e.g. 96,000,000"
                        style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;width:150px;">
                      <input type="text" class="tc-mp-note" value="${note}" placeholder="Note (optional)"
                        style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:3px 6px;font-size:11px;width:120px;">
                      <button class="tcm-btn red tc-mp-del" style="font-size:10px;padding:2px 7px;">✕</button>
                  </div>`;

              const entriesHtml = manuals.length
                  ? manuals.map(p => buildEntryRow(p.date, p.amount, p.note || '')).join('')
                  : buildEntryRow(new Date().toISOString().slice(0,10), '', '');

              const editorHtml = `
              <div id="tc-editor-row-${empId}" style="background:#111827;border:1px solid #374151;border-radius:6px;padding:14px;margin:4px 0 10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <strong style="color:#ddd;font-size:13px;">💳 Manual Payments — ${empName}</strong>
                  <span style="color:#888;font-size:11px;">Tax: $${weeklyTax.toLocaleString()} / ${periodLabel}${periodLabel==='week' ? ` &nbsp;·&nbsp; <span style="color:#7eb8ff;">≈$${Math.round(weeklyTax*4.348).toLocaleString()}/mo</span> &nbsp;·&nbsp; <span style="color:#a78bfa;">≈$${Math.round(weeklyTax*13.044).toLocaleString()}/qtr</span>` : periodLabel==='monthly' ? ` &nbsp;·&nbsp; <span style="color:#f59e0b;">≈$${Math.round(weeklyTax/4.348).toLocaleString()}/wk</span> &nbsp;·&nbsp; <span style="color:#a78bfa;">≈$${Math.round(weeklyTax*3).toLocaleString()}/qtr</span>` : ''}</span>
                      ${periodLabel === 'week' ? ` · <span style="color:#7eb8ff;">≈$${(weeklyTax*4.348).toLocaleString(undefined,{maximumFractionDigits:0})}/mo</span> · <span style="color:#a78bfa;">≈$${(weeklyTax*13.044).toLocaleString(undefined,{maximumFractionDigits:0})}/qtr</span>` : periodLabel === 'monthly' ? ` · <span style="color:#f59e0b;">≈$${(weeklyTax/4.348).toLocaleString(undefined,{maximumFractionDigits:0})}/wk</span>` : ''}
                  </span>
                </div>
                ${_apiSectionHtml}
                <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;">Manual Payments (editable)</div>
                <div id="tc-mp-list-${empId}">${entriesHtml}</div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                  <button class="tcm-btn green" id="tc-mp-add-${empId}">+ Add Row</button>
                  <button class="tcm-btn" id="tc-mp-save-${empId}">✓ Save</button>
                  <button class="tcm-btn" id="tc-mp-cancel-${empId}">Cancel</button>
                </div>
                <div id="tc-mp-calc-${empId}" style="margin-top:10px;font-size:12px;color:#9ca3af;background:#0d1117;border-radius:4px;padding:8px;min-height:20px;"></div>
              </div>`;

          document.getElementById('tc-card-' + empId)?.insertAdjacentHTML('afterend', editorHtml);


              const _saveExclusions = () => {
                  const _edRow2   = document.getElementById(`tc-editor-row-${empId}`);
                  const _newExcl2 = [];
                  _edRow2?.querySelectorAll('.tc-excl-api-payment:not(:checked)').forEach(cb => {
                      _newExcl2.push(cb.dataset.key);
                  });
                  const _cfg3 = TaxCollection.loadCfg();
                  if (!_cfg3.excludedPayments) _cfg3.excludedPayments = {};
                  _cfg3.excludedPayments[empId] = _newExcl2;
                  TaxCollection.saveCfg(_cfg3);
              };

              document.getElementById(`tc-api-incl-all-${empId}`)?.addEventListener('click', () => {
                  document.getElementById(`tc-editor-row-${empId}`)
                      ?.querySelectorAll('.tc-excl-api-payment').forEach(cb => { cb.checked = true; });
                  _saveExclusions();
              });

              document.getElementById(`tc-api-excl-all-${empId}`)?.addEventListener('click', () => {
                  document.getElementById(`tc-editor-row-${empId}`)
                      ?.querySelectorAll('.tc-excl-api-payment').forEach(cb => { cb.checked = false; });
                  _saveExclusions();
              });

              const calcInfo = () => {
                  const list  = document.getElementById(`tc-mp-list-${empId}`);
                  if (!list) return;
                  let total = 0, latestDate = null;
                  list.querySelectorAll('.tc-mp-entry').forEach(row => {
                      const amt  = Number((row.querySelector('.tc-mp-amount')?.value || '').replace(/,/g, '')) || 0;
                      const date = row.querySelector('.tc-mp-date')?.value;
                      total += amt;
                      if (date && (!latestDate || date > latestDate)) latestDate = date;
                  });
                  const calcEl = document.getElementById(`tc-mp-calc-${empId}`);
                  if (!calcEl) return;
                  if (!total || !weeklyTax || !latestDate) {
                      calcEl.textContent = 'Enter a date and amount above to see coverage calculation.';
                      return;
                  }
                  const periods   = total / weeklyTax;
                  const periodMs  = periodLabel === 'monthly' ? 30.4375 * 86400000 : 7 * 86400000;
                  const paidUntil = new Date(new Date(latestDate).getTime() + periods * periodMs);
                  const daysLeft  = Math.floor((paidUntil - Date.now()) / 86400000);
                  const expired   = daysLeft < 0;
                  const color     = expired ? '#f87171' : daysLeft < 14 ? '#f59e0b' : '#7eb8ff';
                  calcEl.innerHTML = `
                      <span style="color:#ddd;">${ec.type === 'item' ? `${total} Xan` : `$${(total/1e6).toFixed(2)}M`}</span>
                      <span style="color:#888;"> ÷ </span>
                      <span style="color:#ddd;">${ec.type === 'item' ? `${weeklyTax} Xan/${periodLabel}` : `$${(weeklyTax/1e6).toFixed(1)}M/${periodLabel}`}</span>
                      <span style="color:#888;"> = </span>
                      <span style="color:#ddd;">${periods.toFixed(1)} ${periodLabel}s covered</span>
                      <span style="color:#888;"> → </span>
                      <span style="color:${color};font-weight:700;">
                          ${expired
                              ? `Expired ${Math.abs(daysLeft)} days ago`
                              : `Paid until ${paidUntil.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} (${daysLeft} days left)`}
                      </span>`;
              };


              document.getElementById(`tc-mp-list-${empId}`)?.addEventListener('input', e => {
                  if (e.target.classList.contains('tc-mp-amount')) {
                      const raw    = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                      const cursor = e.target.selectionStart;
                      const oldLen = e.target.value.length;
                      e.target.value = raw ? Number(raw).toLocaleString() : '';

                      const newLen = e.target.value.length;
                      e.target.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
                  }
                  calcInfo();
              });
              calcInfo();


              document.getElementById(`tc-mp-list-${empId}`)?.addEventListener('click', e => {
                  if (e.target.classList.contains('tc-mp-del')) {
                      e.target.closest('.tc-mp-entry').remove();
                      calcInfo();
                  }
              });


              document.getElementById(`tc-mp-add-${empId}`)?.addEventListener('click', () => {
                  document.getElementById(`tc-mp-list-${empId}`)
                      ?.insertAdjacentHTML('beforeend', buildEntryRow(new Date().toISOString().slice(0,10), '', ''));
                  calcInfo();
              });


              document.getElementById(`tc-mp-cancel-${empId}`)?.addEventListener('click', () => {
                  document.getElementById(`tc-editor-row-${empId}`)?.remove();
              });


              document.getElementById(`tc-mp-save-${empId}`)?.addEventListener('click', () => {
                      const list    = document.getElementById(`tc-mp-list-${empId}`);
                      const entries = [];
                      list?.querySelectorAll('.tc-mp-entry').forEach(row => {
                          const date   = row.querySelector('.tc-mp-date')?.value;
                          const amount = Number((row.querySelector('.tc-mp-amount')?.value || '').replace(/,/g, '')) || 0;
                          const note   = row.querySelector('.tc-mp-note')?.value || '';
                          if (date && amount > 0) entries.push({ date, amount, note });
                      });
                      const cfg2 = TaxCollection.loadCfg();
                      if (!cfg2.manualPayments)    cfg2.manualPayments    = {};
                      if (!cfg2.excludedPayments)  cfg2.excludedPayments  = {};
                      cfg2.manualPayments[empId] = entries;

                      const _edRow   = document.getElementById(`tc-editor-row-${empId}`);
                      const _newExcl = [];
                      _edRow?.querySelectorAll('.tc-excl-api-payment:not(:checked)').forEach(cb => {
                          _newExcl.push(cb.dataset.key);
                      });
                      cfg2.excludedPayments[empId] = _newExcl;
                      TaxCollection.saveCfg(cfg2);
                      document.getElementById(`tc-editor-row-${empId}`)?.remove();
                      UI._renderTab('finance');
                  });
          });
      });
      document.querySelectorAll('.tcm-paid-delete').forEach(btn => {
          btn.addEventListener('click', () => {
              if (!confirm('Remove this paid contract record from Finance?')) return;
              const delId = btn.dataset.id;
              const paid = Storage.getPaidContracts().filter(c => c.id !== delId);
              Storage.set('paid_contracts', paid);
              Storage.saveTrainSales(Storage.getTrainSales().filter(s => s.id !== delId));
              this._renderTab('finance');
          });
      });
      document.getElementById('tcm-contracts-in-net')?.addEventListener('change', (e) => {
                          const s2 = Storage.getSettings();
                          s2.contractsInNet = e.target.checked;
                          Storage.saveSettings(s2);
                          this._renderTab('finance');
                      });

                      body.querySelectorAll('.tc-track-since-inline').forEach(inp => {
      inp.addEventListener('change', () => {
          const _eid = inp.dataset.id;
          const _cfg2 = TaxCollection.loadCfg();
          if (!_cfg2.employees[_eid]) _cfg2.employees[_eid] = {};
          _cfg2.employees[_eid].paymentSince = inp.value || null;
          TaxCollection.saveCfg(_cfg2);
          setTimeout(() => { this._renderTab('finance'); }, 300);
      });
  });

                      document.querySelectorAll('.tc-period-toggle').forEach(el => {
                          el.addEventListener('click', () => {
                              const empId  = el.dataset.id;
                              const period = el.dataset.period;
                              const action = el.dataset.action;
                              const _cfg2  = TaxCollection.loadCfg();
                              if (!_cfg2.markedOwed) _cfg2.markedOwed = {};
                              if (!_cfg2.markedPaid) _cfg2.markedPaid = {};
                              if (!_cfg2.markedOwed[empId]) _cfg2.markedOwed[empId] = {};
                              if (!_cfg2.markedPaid[empId]) _cfg2.markedPaid[empId] = {};
                              if (!_cfg2.markedPaused) _cfg2.markedPaused = {};
                          if (!_cfg2.markedPaused[empId]) _cfg2.markedPaused[empId] = {};
                          if (action === 'owe') {
                              _cfg2.markedOwed[empId][period] = true;
                              delete _cfg2.markedPaid[empId][period];
                              delete _cfg2.markedPaused[empId][period];
                          } else if (action === 'pay') {
                              _cfg2.markedPaid[empId][period] = true;
                              delete _cfg2.markedOwed[empId][period];
                              delete _cfg2.markedPaused[empId][period];
                          } else if (action === 'pause') {
                              _cfg2.markedPaused[empId][period] = true;
                              delete _cfg2.markedOwed[empId][period];
                              delete _cfg2.markedPaid[empId][period];
                          } else {
                              delete _cfg2.markedOwed[empId][period];
                              delete _cfg2.markedPaid[empId][period];
                              delete _cfg2.markedPaused[empId][period];
                          }
                              TaxCollection.saveCfg(_cfg2);
                              this._renderTab('finance');
                          });
                      });
                      document.getElementById('tcm-merit-rate-save')?.addEventListener('click', () => {
      const _mrv = parseInt((document.getElementById('tcm-merit-rate')?.value || '').replace(/,/g, '')) || 0;
      Storage.set('merit_salary_rate', _mrv);
      const _mrb = document.getElementById('tcm-merit-rate-save');
      if (_mrb) { _mrb.textContent = '✓ Saved'; setTimeout(() => { _mrb.textContent = 'Save'; }, 1500); }
      this._renderTab('finance');
  });
  document.getElementById('tcm-merit-rate')?.addEventListener('input', function() {
      const raw = this.value.replace(/[^0-9]/g, '');
      const cursor = this.selectionStart;
      const oldLen = this.value.length;
      this.value = raw ? Number(raw).toLocaleString('en-US') : '';
      const newLen = this.value.length;
      this.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
  });
                      document.getElementById('tcm-global-mult-save')?.addEventListener('click', () => {
                          const _gmv = parseFloat(document.getElementById('tcm-global-mult')?.value || '1') || 1;
                          Storage.set('global_wage_mult', Math.round(_gmv * 100) / 100);
                          const _gmb = document.getElementById('tcm-global-mult-save');
                          if (_gmb) { _gmb.textContent = '✓ Saved'; setTimeout(() => { _gmb.textContent = 'Save'; }, 1500); }
                          this._renderTab('finance');
                      });

                      body.querySelectorAll('.tcm-wage-mult').forEach(input => {
                          input.addEventListener('change', () => {
                              const empId = input.dataset.emp;
                              const val   = parseFloat(input.value);
                              if (!empId || isNaN(val) || val < 0) return;
                              const mults = Storage.getWageMultipliers();
                              mults[empId] = Math.round(val * 100) / 100;
                              Storage.saveWageMultipliers(mults);
                              this._renderTab('finance');
                          });
                      });

                      body.querySelectorAll('.tcm-wage-hide').forEach(btn => {
                          btn.addEventListener('click', () => {
                              const empId = btn.dataset.emp;
                              if (!empId) return;
                              const excl = Storage.getWageExcluded();
                              if (!excl.includes(empId)) excl.push(empId);
                              Storage.saveWageExcluded(excl);
                              this._renderTab('finance');
                          });
                      });

                      body.querySelectorAll('.tcm-wage-restore').forEach(btn => {
                          btn.addEventListener('click', () => {
                              const empId = btn.dataset.emp;
                              if (!empId) return;
                              Storage.saveWageExcluded(Storage.getWageExcluded().filter(id => id !== empId));
                              this._renderTab('finance');
                          });
                      });

                      document.getElementById('tcm-wage-show-hidden')?.addEventListener('click', () => {
                          Storage.saveWageExcluded([]);
                          this._renderTab('finance');
                      });

                      document.getElementById('tcm-remove-all-contracts')?.addEventListener('click', () => {
                          if (!confirm('Remove all paid contract records from Finance? This cannot be undone.')) return;
                          Storage.set('paid_contracts', []);
                          this._renderTab('finance');
                      });
                      break;
                  case 'recs':         body.innerHTML = _ub + this._tabRecommendations(this.state); this._attachRecHandlers(); break;
                  case 'rotation':     body.innerHTML = _ub + this._tabRotation(this.state); this._attachRotationHandlers(this.state); break;
                  case 'optimize':     body.innerHTML = _ub + this._tabOptimizer(this.state); this._attachOptimizerHandlers(this.state); break;
                  case 'projections':  body.innerHTML = _ub + this._tabProjections(this.state); this._attachSimHandlers(this.state); break;
                  case 'stock':
                      body.innerHTML = _ub + this._tabStock(this.state);
                      body.querySelectorAll('.tcm-stock-sub').forEach(btn => {
                          btn.addEventListener('click', () => {
                              UI._stockSubTab = btn.dataset.sub;
                              this._renderTab('stock');
                          });
                      });

                      document.getElementById('tcm-perf-refresh-btn')?.addEventListener('click', () => {
                          UI._renderTab('stock');
                      });

                  document.getElementById('tcm-exp-start-btn')?.addEventListener('click', () => {
                      const name   = document.getElementById('tcm-exp-name')?.value.trim();
                      const rrpPct = parseFloat(document.getElementById('tcm-exp-rrp-pct')?.value) || 0;
                      const days   = parseInt(document.getElementById('tcm-exp-days')?.value)   || 7;
                      const notes  = document.getElementById('tcm-exp-notes')?.value.trim() || '';
                      if (!name)             { alert('Please enter an experiment name.'); return; }
                      if (rrpPct <= 0 || rrpPct > 500) { alert('Target RRP% must be between 1 and 500.'); return; }
                      const targetPrices = {};
                      Object.entries(UI.state?.stock || {}).forEach(([n, s]) => {
                          if ((s.rrp || 0) > 0) targetPrices[n] = Math.round(s.rrp * (rrpPct / 100));
                      });
                      const exp = {
                          id: 'exp_' + Date.now(),
                          typeId: Number(UI.state?.typeInt || 0),
                          name, notes, targetRrpPct: rrpPct, plannedDays: days,
                          startDate: new Date().toISOString().slice(0, 10),
                          endDate: null, status: 'active', targetPrices, dailySnapshots: {}
                      };
                      Storage.saveActivePriceExperiment(exp);
                      UI._stockSubTab = 'experiments';
                      this._renderTab('stock');
                  });


                  document.getElementById('tcm-exp-complete-btn')?.addEventListener('click', () => {
                      const exp = Storage.getActivePriceExperiment();
                      if (!exp) return;
                      const expDayHistory = Storage.getPriceHistory().filter(e => e.typeId === exp.typeId && e.date >= exp.startDate);
                      const summary = {};
                      expDayHistory.forEach(entry => {
                          Object.entries(entry.items || {}).forEach(([item, d]) => {
                              if (!summary[item]) summary[item] = { days: 0, totalSold: 0, totalProfit: 0, totalRevenue: 0 };
                              summary[item].days++;
                              summary[item].totalSold    += d.sold    || 0;
                              summary[item].totalProfit  += d.profit  || 0;
                              summary[item].totalRevenue += d.revenue || 0;
                          });
                      });
                      Object.values(summary).forEach(s => {
                          s.avgSold    = s.days > 0 ? s.totalSold    / s.days : 0;
                          s.avgProfit  = s.days > 0 ? s.totalProfit  / s.days : 0;
                          s.avgRevenue = s.days > 0 ? s.totalRevenue / s.days : 0;
                      });
                      const completed = { ...exp, status: 'completed', endDate: new Date().toISOString().slice(0, 10), daysCollected: expDayHistory.length, summary };
                      Storage.savePriceExperimentToHistory(completed);
                      Storage.clearActivePriceExperiment();
                      this._renderTab('stock');
                  });


                  document.getElementById('tcm-exp-cancel-btn')?.addEventListener('click', () => {
                      if (!confirm('Cancel experiment? Data collected so far will be saved to history.')) return;
                      const exp = Storage.getActivePriceExperiment();
                      if (exp) {
                          exp.status  = 'cancelled';
                          exp.endDate = new Date().toISOString().slice(0, 10);
                          exp.daysCollected = Storage.getPriceHistory().filter(e => e.typeId === exp.typeId && e.date >= exp.startDate).length;
                          Storage.savePriceExperimentToHistory(exp);
                      }
                      Storage.clearActivePriceExperiment();
                      this._renderTab('stock');
                  });


                  document.querySelectorAll('.tcm-exp-hist-delete').forEach(btn => {
                      btn.addEventListener('click', () => {
                          if (!confirm('Remove this experiment record permanently?')) return;
                          const arr = Storage.getPriceExperimentHistory().filter(e => e.id !== btn.dataset.id);
                          Storage.set('price_experiment_history', arr);
                          this._renderTab('stock');
                      });
                  });


                  document.getElementById('tcm-price-history-clear')?.addEventListener('click', () => {
                      if (!confirm('Clear all collected price history? This resets the RRP% analysis. Cannot be undone.')) return;
                      const remaining = Storage.getPriceHistory().filter(e => e.typeId !== Number(UI.state?.typeInt || 0));
                      Storage.set('price_history', remaining);
                      this._renderTab('stock');
                  });
                      break;
                  case 'calc':         body.innerHTML = _ub + this._tabCalc(this.state); this._attachCalcHandlers(this.state); break;
                  case 'benchmark':    body.innerHTML = _ub + this._tabBenchmark(this.state); this._attachBenchmarkHandlers(this.state); break;
case 'proxy_keys':
                  case 'proxy_compare':
                  case 'proxy_history':
                  case 'proxy_ee_perf': {
                      try {
                          const _pxCached = (tab === 'proxy_compare' && UI._proxySnapCache) || (tab === 'proxy_history' && UI._proxyMetaCache) || (tab === 'proxy_ee_perf' && UI._proxyEEPerfSnapCache);
                          if (!_pxCached) body.innerHTML = _ub + this._tabProxy(this.state, tab);
                          else this._tabProxy(this.state, tab);
                          this._attachProxyHandlers(this.state, tab);
                      } catch (e) {
                          console.error('[TCM] proxy tab render failed:', e);
                          body.innerHTML = `<div class="tcm-rec high"><div class="rec-title">⚠ Tab failed to load: ${e.message}</div></div>
                          <pre style="white-space:pre-wrap;font-size:10px;color:#888;">${(e.stack||'').toString().slice(0,600)}</pre>`;
                      }
                      break;
                  }
              }


              document.getElementById('tcm-update-snooze')?.addEventListener('click', () => {
                  const until = Date.now() + 3600000;
                  GM_setValue('TCM_update_snooze_until', until);
                  UI._updateSnoozedUntil = until;
                  document.getElementById('tcm-update-notice')?.remove();
              });
              document.getElementById('tcm-update-dismiss-inline')?.addEventListener('click', () => {
                  const v = UI._updateVersion || GM_getValue('TCM_update_pending_v', '');
                  GM_setValue('TCM_update_dismissed_v', v);
                  GM_setValue('TCM_update_pending_v', '');
                  UI._updateVersion = null;
                  document.getElementById('tcm-update-notice')?.remove();
              });
          },

         render(state, silent = false) {
              this.state = state;
              const _tabsEl = document.getElementById('tcm-tabs');
              if (_tabsEl) _tabsEl.style.display = '';
              if (this.launcher) { this.launcher.classList.remove('err', 'loading'); }
this._setStatus(`Last updated ${new Date().toLocaleTimeString()}`, 'ok');
              this._applyTheme();


if (this._renderSubTabs) {
                  const hasStock = !!(state.stock && Object.keys(state.stock).length > 0);
                  if (!hasStock && this._currentTab === 'stock' && !silent) this._currentTab = 'overview';
                  this._renderSubTabs(this._currentCat || 'management', this._currentTab);
              }

if (silent) {


                  const _ubSilent = (this._updateBannerHTML ? this._updateBannerHTML() : '');
                  if (_ubSilent && !document.getElementById('tcm-update-notice')) {
                      const _silentBody = document.getElementById('tcm-body');
                      if (_silentBody) {
                          _silentBody.insertAdjacentHTML('afterbegin', _ubSilent);
                          document.getElementById('tcm-update-snooze')?.addEventListener('click', () => {
                              const _sUntil = Date.now() + 3600000;
                              GM_setValue('TCM_update_snooze_until', _sUntil);
                              UI._updateSnoozedUntil = _sUntil;
                              document.getElementById('tcm-update-notice')?.remove();
                          });
                          document.getElementById('tcm-update-dismiss-inline')?.addEventListener('click', () => {
                              const _sV = UI._updateVersion || GM_getValue('TCM_update_pending_v', '');
                              GM_setValue('TCM_update_dismissed_v', _sV);
                              GM_setValue('TCM_update_pending_v', '');
                              UI._updateVersion = null;
                              document.getElementById('tcm-update-notice')?.remove();
                          });
                      }
                  }
              }

const skipOnRefresh = ['calc', 'settings', 'verify'];
  const _onHiringSubTab = this._currentTab === 'optimize' && (Storage.getSettings().optSubTab || 'optimizer') === 'hiring';
  if (!skipOnRefresh.includes(this._currentTab) && !(silent && _onHiringSubTab)) {

const _catForTab = { overview:'management', finance:'management', stock:'management', recs:'expansion', optimize:'expansion', projections:'expansion', benchmark:'expansion', rotation:'training', calc:'training', proxy_keys:'proxy', proxy_compare:'proxy', proxy_history:'proxy', proxy_ee_perf:'proxy' };
                  const _syncCat = _catForTab[this._currentTab] || 'management';
                  if (_syncCat !== this._currentCat) {
                      this._currentCat = _syncCat;
                      document.querySelectorAll('.tcm-cat').forEach(c => c.classList.toggle('active', c.dataset.cat === _syncCat));
                      if (this._renderSubTabs) this._renderSubTabs(_syncCat, this._currentTab);
                  } else {
                      document.querySelectorAll('#tcm-sub-tabs .tcm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this._currentTab));
                  }
                  this._renderTab(this._currentTab);
              }
          },

          _setStatus(msg, cls) {
              const el = document.getElementById('tcm-status-text');
              if (!el) return;
              el.textContent = msg;
              el.className = cls || '';

              if (cls === 'ok') el.dataset.lastUpdate = msg;
          },

          _applyTheme() {
              const s = Storage.getSettings();
              const theme = s.theme || 'dark';
              const wrap = document.getElementById('tcm-wrap');
              const launcher = document.getElementById('tcm-launcher');
              const btn = document.getElementById('tcm-btn-theme');
              if (wrap) {
                  if (theme === 'light') {
                      wrap.classList.add('light');
                  } else {
                      wrap.classList.remove('light');
                  }
              }
              if (launcher) {
                  if (theme === 'light') {
                      launcher.classList.add('light-theme');
                  } else {
                      launcher.classList.remove('light-theme');
                  }
              }
              if (btn) {
                  btn.textContent = theme === 'light' ? '\u263E' : '\u263C';
                  btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
                  btn.classList.toggle('active', theme === 'light');
              }
          },

          _updateBannerHTML() {
      const v = UI._updateVersion || GM_getValue('TCM_update_pending_v', '');
      const _bvCmp = vv => (vv||'0').split('.').map(Number).reduce((a,b,i)=>a+b*Math.pow(1000,2-i),0);
      if (!v || _bvCmp(v) <= _bvCmp(TCM.VERSION)) { GM_setValue('TCM_update_pending_v', ''); GM_setValue('TCM_update_available', ''); UI._updateVersion = null; return ''; }
      if (GM_getValue('TCM_update_dismissed_v', '') === v) return '';
      if (Date.now() < (UI._updateSnoozedUntil || GM_getValue('TCM_update_snooze_until', 0))) return '';
      return `
              <div id="tcm-update-notice" style="
                  background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.5);
                  border-radius:6px;padding:10px 14px;margin-bottom:10px;
                  display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="color:#f59e0b;font-weight:800;font-size:14px;">⚠ Update Available</span>
                <span style="color:#ddd;font-size:13px;flex:1;">
                  New version <strong style="color:#fff;">v${v}</strong> is out
                  (you have v${TCM.VERSION}).
                </span>
                <a href="https://github.com/Morrakiu/torn-company-manager/tree/Morrakiu-TCM-Alpha" target="_blank"
                   style="background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.5);
                   color:#f59e0b;border-radius:4px;padding:5px 10px;font-weight:700;font-size:12px;
                   text-decoration:none;white-space:nowrap;">
                  ⬡ Update on GitHub →
                </a>
                <button id="tcm-update-snooze" style="background:rgba(75,85,99,0.4);border:1px solid #374151;
                  color:#9ca3af;border-radius:4px;padding:5px 8px;cursor:pointer;font-size:11px;white-space:nowrap;">
                  Remind me in 1h
                </button>
                <button id="tcm-update-dismiss-inline" style="background:none;border:none;
                  color:#888;cursor:pointer;font-size:16px;padding:0;line-height:1;">✕</button>
              </div>`;
          },




          _computeProxySnapshot(companyData, keyId) {
              const profile   = companyData.company           || {};
              const employees = companyData.company_employees || {};
              const detailed  = companyData.company_detailed  || {};
              const typeInt   = profile.company_type;
              const typeName  = TCM.TYPE_MAP[typeInt] || '';
              const dirId     = String(profile.director || '');

              const nonDir = Object.entries(employees)
                  .filter(([id, e]) => e.position !== 'Director' && String(id) !== dirId);

              const totalEE = nonDir.reduce((s, [, e]) =>
                  s + (e.effectiveness?.total || e.effectiveness?.working_stats || 0), 0);
              const avgEE = nonDir.length > 0 ? Math.round(totalEE / nonDir.length) : 0;

              const roleEE = {};
              nonDir.forEach(([, emp]) => {
                  const pos = PosNorm.normalize(emp.position) || emp.position;
                  if (!roleEE[pos]) roleEE[pos] = { count: 0, totalEE: 0, avgEE: 0 };
                  const ee = emp.effectiveness?.total || emp.effectiveness?.working_stats || 0;
                  roleEE[pos].count++;
                  roleEE[pos].totalEE += ee;
              });
              Object.values(roleEE).forEach(r => {
                  r.avgEE = r.count > 0 ? Math.round(r.totalEE / r.count) : 0;
              });

              const daily    = profile.daily_income || 0;
              const salaries = nonDir.reduce((s, [, e]) => s + (e.wage || 0), 0);
              const adBudget = detailed.advertising_budget || 0;

              return {
                  companyId:       String(profile.ID || profile.id || ''),
                  date:            new Date().toISOString().slice(0, 10),
                  companyName:     profile.name || '',
                  typeName, typeInt,
                  stars:           profile.rating || 0,
                  apiKeyId:        keyId,
                  daily, salaries, adBudget,
                  netProfit:       daily - salaries - adBudget,
                  popularity:      detailed.popularity  || 0,
                  efficiency:      detailed.efficiency  || 0,
                  environment:     detailed.environment || 0,
                  employeeCount:   nonDir.length,
                  trainsAvailable: detailed.trains_available || 0,
                  totalEE, avgEE, roleEE,
adPctRevenue:    daily > 0 ? Math.round((adBudget / daily) * 100) : 0,
                  revenuePerEE:    totalEE > 0 ? Math.round(daily / totalEE) : 0,
                  employees:       employees,
                  directorId:      dirId,
              };
          },

_tabProxy(state, subTab) {
              if (subTab === 'proxy_compare') return this._tabProxyCompare();
              if (subTab === 'proxy_history') return this._tabProxyHistory();
              if (subTab === 'proxy_ee_perf') return this._tabProxyEEPerformance();
              return this._tabProxyKeys();
          },

          _tabProxyKeys() {
              const keys      = Storage.getProxyKeys();
              const lastFetch = Storage.getProxyLastFetch();

              let html = `
              <div class="tcm-section-label">Multi-Company API Keys</div>
              <div class="tcm-notice" style="font-size:11px;">
                  Add one <strong>Custom API key</strong> per company you manage (or one per director).
                  Required selections: <code>company · profile, employees, detailed, stock.</code>.<br>
                  Click <strong>↺ Refresh All</strong> to fetch every company and store the snapshot for comparison and history.
                  <strong style="color:#7eb8ff;">Auto-refreshes every 5 minutes</strong> in the background while TCM is loaded.
              </div>
              <div style="background:#0a0e14;border:1px solid rgba(126,184,255,0.25);border-radius:6px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <span style="font-size:11px;color:#9ca3af;flex:1;min-width:220px;">
                      Send this to each director you manage — the link pre-selects the right permissions, they just click <strong>Generate Key</strong> and send it back to you.
                  </span>
                  <a href="https://www.torn.com/preferences.php#tab=api?step=addNewKey&company=profile,employees,detailed,stock&title=TCM%20MultiCo" target="_blank" rel="noopener"
                      class="tcm-btn" style="font-size:11px;padding:4px 10px;text-decoration:none;">⚡ Open Pre-Filled Key Page</a>
                  <button class="tcm-btn" id="proxy-copy-key-link" style="font-size:11px;padding:4px 10px;">📋 Copy Link</button>
              </div>
              <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
                  <button class="tcm-btn green" id="proxy-add-key-btn">+ Add API Key</button>
                  <button class="tcm-btn" id="proxy-refresh-all-btn">↺ Refresh All Companies</button>
                  <button class="tcm-btn red" id="proxy-clear-db-btn">✕ Clear All Proxy Data</button>
              </div>
              <div id="proxy-refresh-progress" style="font-size:12px;color:#888;margin-bottom:8px;min-height:16px;"></div>`;

              if (!keys.length) {
                  html += `<div class="tcm-notice">No keys yet — click <strong>+ Add API Key</strong> to begin.</div>`;
              } else {
                  keys.forEach((k, i) => {
                      const lf       = lastFetch[k.id] || {};
                      const ago      = lf.ts ? Math.round((Date.now() - lf.ts) / 60000) : null;
                      const statCol  = lf.ok === false ? '#ef4444' : lf.ok === true ? '#7eb8ff' : '#888';
                      const statTxt  = lf.ok === false
                          ? `⚠ ${lf.error || 'Failed'}`
                          : lf.ok === true ? `✓ ${lf.companyName || 'OK'}`
                          : 'Not fetched yet';
                      html += `
                      <div style="background:#0d1117;border:1px solid #2a2a2a;border-radius:6px;
                                  padding:10px 14px;margin-bottom:6px;">
                          <div style="display:flex;justify-content:space-between;align-items:flex-start;
                                      flex-wrap:wrap;gap:8px;">
                              <div style="flex:1;min-width:180px;">
                                  <input type="text" class="proxy-key-label tcm-input" data-idx="${i}"
                                      value="${(k.label||'').replace(/"/g,'&quot;')}"
                                      placeholder="Label (e.g. My Nightclub)"
                                      style="width:100%;box-sizing:border-box;margin-bottom:6px;font-size:12px;"/>
                                  <input type="password" class="proxy-key-val tcm-input" data-idx="${i}"
                                      value="${k.apiKey||''}"
                                      placeholder="API Key"
                                      style="width:100%;box-sizing:border-box;font-size:12px;
                                             font-family:'JetBrains Mono',monospace;"/>
                              </div>
                              <div style="display:flex;flex-direction:column;align-items:flex-end;
                                          gap:5px;flex-shrink:0;">
                                  <span style="font-size:12px;font-weight:700;color:${statCol};">${statTxt}</span>
                                  ${ago !== null ? `<span style="font-size:10px;color:#888;">${ago}m ago</span>` : ''}
                                  <button class="tcm-btn proxy-save-key" data-idx="${i}"
                                      style="font-size:11px;padding:3px 8px;">Save</button>
                                  <button class="tcm-btn red proxy-del-key" data-idx="${i}"
                                      style="font-size:11px;padding:3px 8px;">✕ Remove</button>
                              </div>
                          </div>
                      </div>`;
                  });
              }
              return html;
          },

          _tabProxyCompare() {
              const body = document.getElementById('tcm-body');
              setTimeout(async () => {
                  if (!body || !document.body.contains(body)) return;
                  try {
let snaps = UI._proxySnapCache || await ProxyDB.getAllLatestSnapshots();
UI._proxySnapCache = snaps;
            if (!snaps.length) {
                body.innerHTML = `<div class="tcm-section-label">Company Comparison</div>
                          <div class="tcm-notice">No data yet. Go to <strong>API Keys</strong> and click
                          <strong>↺ Refresh All Companies</strong>.</div>`;
                return;
            }

            const _allCoSnaps = [...snaps];
if (!UI._proxyCompareSelected) {
    UI._proxyCompareSelected = new Set(_allCoSnaps.map(s => s.companyId));
    UI._proxyCompareKnown    = new Set(_allCoSnaps.map(s => s.companyId));
} else {
    if (!UI._proxyCompareKnown) UI._proxyCompareKnown = new Set([...UI._proxyCompareSelected]);
    _allCoSnaps.forEach(s => {
        if (s.companyId && !UI._proxyCompareKnown.has(s.companyId)) {
            UI._proxyCompareKnown.add(s.companyId);
            UI._proxyCompareSelected.add(s.companyId);
        }
    });
}
            snaps = _allCoSnaps.filter(s => UI._proxyCompareSelected.has(s.companyId));
            snaps.sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));

const fC = n => n == null ? '—'
                          : Math.abs(n) >= 1e6 ? `${n<0?'-':''}$${(Math.abs(n)/1e6).toFixed(2)}M`
                          : `${n<0?'-':''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
                      const pctCol = v => v >= 70 ? '#7eb8ff' : v >= 40 ? '#f59e0b' : '#ef4444';
                      const eeCol  = v => v >= 100 ? '#7eb8ff' : v >= 50 ? '#f59e0b' : '#ef4444';
                      const _cutPct = Storage.getSettings().proxyCutPct ?? 50;

let html = `<div class="tcm-section-label">Company Comparison — ${snaps.length} companies</div>
                      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x;max-width:100%;margin-bottom:16px;">
                      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:680px;">
                      <thead><tr style="background:#0a0e14;">
                          <th style="text-align:left;padding:6px 8px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Company</th>
                          <th style="text-align:center;padding:6px 4px;color:#fbbf24;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">★</th>
                          <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Revenue/day</th>
<th style="text-align:right;padding:6px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Net/day</th>
                          <th style="text-align:right;padding:6px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Your Cut/day</th>
                          <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Ad budget</th>
                          <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Ad%</th>
                          <th style="text-align:right;padding:6px 4px;color:#a78bfa;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Total EE</th>
                          <th style="text-align:right;padding:6px 4px;color:#a78bfa;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Avg EE</th>
                          <th style="text-align:right;padding:6px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Rev/EE</th>
                          <th style="text-align:center;padding:6px 4px;color:#f59e0b;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Pop</th>
                          <th style="text-align:center;padding:6px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Eff</th>
                          <th style="text-align:center;padding:6px 4px;color:#6f6;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Env</th>
                          <th style="text-align:center;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Trains</th>
                      </tr></thead><tbody>`;

                      snaps.forEach((s, i) => {
                          const nc      = (s.netProfit||0) >= 0 ? '#7eb8ff' : '#ef4444';
                          const adPct   = s.adPctRevenue || 0;
                          const adPctCl = adPct > 50 ? '#ef4444' : adPct > 25 ? '#f59e0b' : '#7eb8ff';
                          html += `<tr style="border-bottom:1px solid #111827;${i===0?'background:rgba(126,184,255,0.03);':''}">
                              <td style="padding:6px 8px;white-space:nowrap;">
                                  <span style="font-weight:700;color:${i===0?'#7eb8ff':'#ddd'};">${i===0?'🥇 ':''}${s.companyName||'Unknown'}</span>
                                  <div style="font-size:10px;color:#888;">${s.typeName||''}</div>
                              </td>
                              <td style="text-align:center;padding:6px 4px;color:#fbbf24;">${s.stars||0}</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#d1d5db;font-size:11px;">${fC(s.daily||0)}</td>
<td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${nc};font-size:11px;">${fC(s.netProfit||0)}</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:#7eb8ff;font-size:11px;">${fC((s.netProfit||0) * (_cutPct/100))}</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#9ca3af;font-size:11px;">${fC(s.adBudget||0)}</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:${adPctCl};font-size:11px;font-weight:700;">${adPct}%</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${eeCol(s.avgEE||0)};font-size:12px;">${(s.totalEE||0).toLocaleString('en-US')}</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${eeCol(s.avgEE||0)};font-size:12px;">${s.avgEE||0}</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#7eb8ff;font-size:11px;">${s.revenuePerEE ? '$'+(s.revenuePerEE).toLocaleString('en-US') : '—'}</td>
                              <td style="text-align:center;padding:6px 4px;color:${pctCol(s.popularity||0)};font-weight:700;">${s.popularity||0}%</td>
                              <td style="text-align:center;padding:6px 4px;color:${pctCol(s.efficiency||0)};font-weight:700;">${s.efficiency||0}%</td>
                              <td style="text-align:center;padding:6px 4px;color:${pctCol(s.environment||0)};font-weight:700;">${s.environment||0}%</td>
                              <td style="text-align:center;padding:6px 4px;color:#9ca3af;">${s.trainsAvailable||0}</td>
                          </tr>`;
                      });
                      html += `</tbody></table></div>`;


                      const _totalRevenue   = snaps.reduce((sum, s) => sum + (s.daily || 0), 0);
                      const _totalNetProfit = snaps.reduce((sum, s) => sum + (s.netProfit || 0), 0);
                      const _totalNetColor  = _totalNetProfit >= 0 ? '#7eb8ff' : '#ef4444';
                      html += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                          <div style="flex:1;min-width:160px;background:#0d1117;border:1px solid #2a2a2a;border-radius:6px;padding:10px 14px;">
                              <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Total Revenue/day (${snaps.length} compan${snaps.length!==1?'ies':'y'})</div>
                              <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;color:#d1d5db;margin-top:2px;">${fC(_totalRevenue)}</div>
                          </div>
                          <div style="flex:1;min-width:160px;background:#0d1117;border:1px solid #2a2a2a;border-radius:6px;padding:10px 14px;">
                              <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Total Net Profit/day</div>
                              <div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;color:${_totalNetColor};margin-top:2px;">${fC(_totalNetProfit)}</div>
                          </div>
                      </div>`;


const _weekCutoff  = new Date(Date.now() - 7  * 86400000).toISOString().slice(0, 10);
                      const _monthCutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                      let _weekNet = 0, _monthNet = 0, _allTimeNet = 0;
                      for (const s of snaps) {
                          const _hist = await ProxyDB.getSnapshots(s.companyId, null);
                          _hist.forEach(h => {
                              const np = h.netProfit || 0;
                              _allTimeNet += np;
                              if (h.date >= _monthCutoff) _monthNet += np;
                              if (h.date >= _weekCutoff)  _weekNet  += np;
                          });
                      }
                      const _myWeekCut  = _weekNet    * (_cutPct / 100);
                      const _myMonthCut = _monthNet   * (_cutPct / 100);
                      const _myAllCut   = _allTimeNet * (_cutPct / 100);
                      const _cutClr = v => v >= 0 ? '#7eb8ff' : '#ef4444';
                      html += `<div style="background:#0a0e14;border:1px solid rgba(96,165,250,0.25);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
                          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                              <span style="font-size:11px;font-weight:700;color:#7eb8ff;text-transform:uppercase;letter-spacing:0.06em;">Your Cut</span>
                              <input id="tcm-px-cut-pct" type="number" min="0" max="100" step="1" value="${_cutPct}"
                                  style="width:56px;background:#0d1117;border:1px solid #2a2a2a;border-radius:3px;color:#ddd;padding:3px 6px;font-size:12px;outline:none;"/>
                              <span style="font-size:11px;color:#888;">% of combined net profit from the selected companies</span>
                              <button id="tcm-px-cut-save" style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);color:#7eb8ff;border-radius:3px;padding:3px 10px;cursor:pointer;font-size:11px;font-weight:700;">Save</button>
                          </div>
                          <div style="display:flex;gap:10px;flex-wrap:wrap;">
                              <div style="flex:1;min-width:120px;">
                                  <div style="font-size:10px;color:#9ca3af;">Last 7 days</div>
                                  <div style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:15px;color:${_cutClr(_myWeekCut)};">${fC(_myWeekCut)}</div>
                              </div>
                              <div style="flex:1;min-width:120px;">
                                  <div style="font-size:10px;color:#9ca3af;">Last 30 days</div>
                                  <div style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:15px;color:${_cutClr(_myMonthCut)};">${fC(_myMonthCut)}</div>
                              </div>
                              <div style="flex:1;min-width:120px;">
                                  <div style="font-size:10px;color:#9ca3af;">All-time</div>
                                  <div style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:15px;color:${_cutClr(_myAllCut)};">${fC(_myAllCut)}</div>
                              </div>
                          </div>
                          <div style="font-size:10px;color:#4b5563;margin-top:8px;">Sum of each selected company's daily net-profit snapshots \u00D7 your %. Only days with a saved snapshot count \u2014 keep Auto-Refresh running for accurate totals.</div>
                      </div>`;

                      const allRoles = new Set();
                      snaps.forEach(s => Object.keys(s.roleEE || {}).forEach(r => allRoles.add(r)));
                      const roleList = [...allRoles].sort();

                      if (roleList.length) {

                          const _bestPerRole = {};
                          roleList.forEach(role => {
                              const vals = snaps.map(s => (s.roleEE||{})[role]?.avgEE || 0).filter(v => v > 0);
                              _bestPerRole[role] = vals.length > 1 ? Math.max(...vals) : null;
                          });

                          html += `<div class="tcm-section-label">Role EE Breakdown — Why A Outperforms B</div>
                          <div class="tcm-notice" style="font-size:11px;">
                              Average EE per employee in each role, grouped by company. Tap a company to expand it. Lower numbers
                              mean that role is undertrained or the employee is in the wrong position — the fastest way to spot
                              where a "better stats" company is actually leaving EE on the table.
                          </div>
                          <div style="display:flex;gap:12px;margin-bottom:8px;">
                              <a href="#" id="tcm-role-expand-all" style="font-size:11px;color:#7eb8ff;text-decoration:none;">▼ Expand All</a>
                              <a href="#" id="tcm-role-collapse-all" style="font-size:11px;color:#7eb8ff;text-decoration:none;">▲ Collapse All</a>
                          </div>`;

                          snaps.forEach((s, _si) => {
                              const _roles = Object.entries(s.roleEE || {})
                                  .filter(([, r]) => r && r.count)
                                  .sort(([, a], [, b]) => b.avgEE - a.avgEE);
                              if (!_roles.length) return;
                              const _avgAll = Math.round(_roles.reduce((sum, [, r]) => sum + r.avgEE, 0) / _roles.length);
                              const _avgCol = _avgAll >= 100 ? '#7eb8ff' : _avgAll >= 50 ? '#f59e0b' : '#ef4444';
                              html += `<details class="tcm-role-co" ${_si===0?'open':''} style="background:#0d1117;border:1px solid #2a2a2a;border-radius:6px;margin-bottom:6px;overflow:hidden;">
                                  <summary style="cursor:pointer;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                                      <span style="color:#ddd;font-weight:700;">${s.companyName||'Company'} <span style="color:#888;font-weight:400;font-size:10px;">(${s.stars||0}★)</span></span>
                                      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${_avgCol};">avg ${_avgAll}</span>
                                  </summary>
                                  <div style="padding:2px 12px 8px;border-top:1px solid #2a2a2a;">
                                      ${_roles.map(([role, r]) => {
                                          const col = r.avgEE >= 100 ? '#7eb8ff' : r.avgEE >= 50 ? '#f59e0b' : '#ef4444';
                                          const isBest = _bestPerRole[role] !== null && r.avgEE === _bestPerRole[role];
                                          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #111827;">
                                              <span style="color:#d1d5db;font-size:12px;">${role} <span style="color:#9ca3af;font-size:12px;font-weight:600;">×${r.count}</span></span>
                                              <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${col};font-size:12px;">${r.avgEE}${isBest?' ★':''}</span>
                                          </div>`;
                                      }).join('')}
                                  </div>
                              </details>`;
                          });

                          html += `<div style="font-size:10px;color:#888;margin-top:4px;">
                              <span style="color:#7eb8ff;">green ≥100</span> · <span style="color:#f59e0b;">amber ≥50</span> ·
                              <span style="color:#ef4444;">red &lt;50</span> · ★ = best of all companies in that role
                          </div>`;
                      }

const _coSelHtml = `<div style="background:#0a0e14;border:1px solid rgba(126,184,255,0.2);border-radius:6px;padding:10px 14px;margin-bottom:12px;">
                          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Select Companies to Compare</div>
                          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                              ${_allCoSnaps.map(s => {
                                  const _sel = UI._proxyCompareSelected.has(s.companyId);
                                  return `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:${_sel?'rgba(126,184,255,0.1)':'transparent'};border:1px solid ${_sel?'rgba(126,184,255,0.4)':'#374151'};border-radius:4px;padding:4px 10px;font-size:12px;font-weight:600;color:${_sel?'#7eb8ff':'#9ca3af'};">
                                      <input type="checkbox" class="tcm-px-co-chk" data-id="${s.companyId}" ${_sel?'checked':''} style="accent-color:#7eb8ff;width:13px;height:13px;cursor:pointer;"/>
                                      ${s.companyName||s.companyId}
                                  </label>`;
                              }).join('')}
                              <button id="tcm-px-sel-all" style="background:none;border:1px solid #374151;color:#9ca3af;border-radius:3px;padding:3px 8px;cursor:pointer;font-size:11px;font-family: Arial, sans-serif;">All</button>
                              <button id="tcm-px-sel-none" style="background:none;border:1px solid #374151;color:#9ca3af;border-radius:3px;padding:3px 8px;cursor:pointer;font-size:11px;font-family: Arial, sans-serif;">None</button>
                          </div>
                      </div>`;
body.innerHTML = _coSelHtml + html;
                      document.getElementById('tcm-role-expand-all')?.addEventListener('click', (e) => {
                          e.preventDefault();
                          body.querySelectorAll('details.tcm-role-co').forEach(d => { d.open = true; });
                      });
                      document.getElementById('tcm-role-collapse-all')?.addEventListener('click', (e) => {
                          e.preventDefault();
                          body.querySelectorAll('details.tcm-role-co').forEach(d => { d.open = false; });
                      });
                      body.querySelectorAll('.tcm-px-co-chk').forEach(cb => {
                          cb.addEventListener('change', () => {
                              if (cb.checked) UI._proxyCompareSelected.add(cb.dataset.id);
                              else UI._proxyCompareSelected.delete(cb.dataset.id);
                              UI._renderTab('proxy_compare');
                          });
                      });
                      body.querySelector('#tcm-px-sel-all')?.addEventListener('click', () => {
                          _allCoSnaps.forEach(s => UI._proxyCompareSelected.add(s.companyId));
                          UI._renderTab('proxy_compare');
                      });
                      body.querySelector('#tcm-px-sel-none')?.addEventListener('click', () => {
                          UI._proxyCompareSelected.clear();
                          UI._renderTab('proxy_compare');
                      });
                      body.querySelector('#tcm-px-cut-save')?.addEventListener('click', () => {
                          const _val = parseFloat(document.getElementById('tcm-px-cut-pct')?.value);
                          const _s = Storage.getSettings();
                          _s.proxyCutPct = isNaN(_val) ? 50 : Math.max(0, Math.min(100, _val));
                          Storage.saveSettings(_s);
                          UI._renderTab('proxy_compare');
                      });
                  } catch(e) {
                      body.innerHTML = `<div class="tcm-rec high"><div class="rec-title">⚠ Error loading comparison: ${e.message}</div></div>`;
                  }
              }, 50);
              return `<div class="tcm-loading"><span class="tcm-spin"></span>Loading comparison data…</div>`;
          },

          _tabProxyHistory() {
              const body = document.getElementById('tcm-body');
              setTimeout(async () => {
                  if (!body || !document.body.contains(body)) return;
                  try {
                      const metas = UI._proxyMetaCache || await ProxyDB.getAllCompanyMeta();
UI._proxyMetaCache = metas;
                      if (!metas.length) {
                          body.innerHTML = `<div class="tcm-section-label">History</div>
                          <div class="tcm-notice">No data yet. Go to <strong>API Keys</strong> and click
                          <strong>↺ Refresh All Companies</strong>.</div>`;
                          return;
                      }


if (!UI._proxyHistorySelIds) {
    UI._proxyHistorySelIds = new Set(metas.map(m => m.companyId));
    UI._proxyHistoryKnown  = new Set(metas.map(m => m.companyId));
} else {
    if (!UI._proxyHistoryKnown) UI._proxyHistoryKnown = new Set([...UI._proxyHistorySelIds]);
    metas.forEach(m => {
        if (m.companyId && !UI._proxyHistoryKnown.has(m.companyId)) {
            UI._proxyHistoryKnown.add(m.companyId);
            UI._proxyHistorySelIds.add(m.companyId);
        }
    });
}
                      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                      const _pxhColors = ['#7eb8ff','#7eb8ff','#f59e0b','#a78bfa','#f87171','#6f6','#fb923c'];
                      const _pxhSelMetas = metas.filter(m => UI._proxyHistorySelIds.has(m.companyId));


                      const _pxhSnapMap = {};
                      for (const m of _pxhSelMetas) {
                          _pxhSnapMap[m.companyId] = await ProxyDB.getSnapshots(m.companyId, cutoff);
                      }


                      const selId = UI._proxyHistorySelId || (metas[0]?.companyId || '');
                      const snaps = _pxhSnapMap[selId] || await ProxyDB.getSnapshots(selId, cutoff);

                      const coOpts = metas.map(m =>
                          `<option value="${m.companyId}" ${m.companyId===selId?'selected':''}>${m.companyName||m.companyId}</option>`
                      ).join('');


                      const _pxhChkHtml = `<div style="background:#0a0e14;border:1px solid rgba(126,184,255,0.2);border-radius:6px;padding:10px 14px;margin-bottom:10px;">
                          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Graph: Toggle Companies</div>
                          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                              ${metas.map((m, mi) => {
                                  const _s = UI._proxyHistorySelIds.has(m.companyId);
                                  const _c = _pxhColors[mi % _pxhColors.length];
                                  return `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:${_s?'rgba(126,184,255,0.08)':'transparent'};border:1px solid ${_s?_c+'88':'#374151'};border-radius:4px;padding:4px 10px;font-size:12px;font-weight:600;color:${_s?_c:'#9ca3af'};">
                                      <input type="checkbox" class="tcm-pxh-co-chk" data-id="${m.companyId}" ${_s?'checked':''} style="accent-color:${_c};width:13px;height:13px;cursor:pointer;"/>
                                      ${m.companyName||m.companyId}
                                  </label>`;
                              }).join('')}
                          </div>
                      </div>`;

                      let html = `<div class="tcm-section-label">Company History (Last 30 Days)</div>${_pxhChkHtml}`;


                      const _pxhAllNets = Object.values(_pxhSnapMap).flatMap(ss => ss.map(x => x.netProfit || 0));
                      if (_pxhAllNets.length > 0) {
                          const maxN = Math.max(..._pxhAllNets, 0), minN = Math.min(..._pxhAllNets, 0);
                          const range = maxN - minN || 1;
                          const cW = 380, cH = 110, padL = 44, padR = 8, padT = 8, padB = 24;
                          const chartW = cW-padL-padR, chartH = cH-padT-padB;
                          const _pxhAllDates = [...new Set(Object.values(_pxhSnapMap).flatMap(ss => ss.map(x => x.date)))].sort();
                          const _pxhDateCount = Math.max(1, _pxhAllDates.length - 1);
                          let _pxhLines = '', _pxhLegend = '';
                          _pxhSelMetas.forEach((m, mi) => {
                              const _ms = _pxhSnapMap[m.companyId] || [];
                              if (!_ms.length) return;
                              const _col = _pxhColors[mi % _pxhColors.length];
                              if (_ms.length > 1) {
                                  const pts = _ms.map(s => {
                                      const di = _pxhAllDates.indexOf(s.date);
                                      const x = padL + (di / _pxhDateCount) * chartW;
                                      const y = padT + chartH - (((s.netProfit||0) - minN) / range) * chartH;
                                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                                  }).join(' ');
                                  _pxhLines += `<polyline points="${pts}" fill="none" stroke="${_col}" stroke-width="1.8" opacity="0.85"/>`;
                              }
                              const _last = _ms[_ms.length - 1];
                              _ms.forEach(s => {
                                  const _di2 = _pxhAllDates.indexOf(s.date);
                                  const _px = padL + (_di2 / _pxhDateCount) * chartW;
                                  const _py = padT + chartH - (((s.netProfit||0) - minN) / range) * chartH;
                                  const _isLast2 = s === _last;
                                  const _tip2 = encodeURIComponent(`${s.date}|${m.companyName||m.companyId}|${Calc.fmtCash(s.netProfit||0)}|${_col}`);
                                  _pxhLines += `<g class="tcm-pxh-dot" data-tip="${_tip2}" style="cursor:pointer;"><circle cx="${_px.toFixed(1)}" cy="${_py.toFixed(1)}" r="9" fill="transparent"/><circle cx="${_px.toFixed(1)}" cy="${_py.toFixed(1)}" r="${_isLast2?4:2.5}" fill="${_col}" ${_isLast2?'stroke="#0d1117" stroke-width="1.5"':''}/></g>`;
                              });
                              _pxhLegend += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:${_col};font-weight:600;"><span style="display:inline-block;width:14px;height:3px;background:${_col};border-radius:2px;"></span>${m.companyName||m.companyId}</span>`;
                          });
                          const _pxhGrid = [maxN, 0, minN].map(v => {
                              const y = padT + chartH - ((v - minN) / range) * chartH;
                              return `<text x="${(padL-3).toFixed(1)}" y="${y.toFixed(1)}" class="tcm-chart-label" text-anchor="end" dominant-baseline="middle">${Calc.fmtNum(v)}</text><line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL+chartW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${v===0?'#374151':'#2a2a2a'}" stroke-width="${v===0?1:0.5}" stroke-dasharray="${v===0?'3,3':'none'}"/>`;
                          }).join('');
                          const _pxhXLabels = _pxhAllDates.map((d, i) => {
                              if (i !== 0 && i !== _pxhAllDates.length - 1 && i % Math.ceil(_pxhAllDates.length / 6) !== 0) return '';
                              const x = padL + (i / _pxhDateCount) * chartW;
                              const _d = new Date(d + 'T00:00:00Z');
                              return `<text x="${x.toFixed(1)}" y="${(padT+chartH+14).toFixed(1)}" class="tcm-chart-label" text-anchor="middle">${_d.getUTCMonth()+1}/${_d.getUTCDate()}</text>`;
                          }).join('');
                          html += `<div class="tcm-chart-wrap" style="margin-bottom:12px;position:relative;">
                              <svg viewBox="0 0 ${cW} ${cH}" class="tcm-chart-svg" style="height:${cH}px;">
                                  ${_pxhGrid}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#374151" stroke-width="1"/>
                                  ${_pxhLines}${_pxhXLabels}
                              </svg>
                              <div id="tcm-pxh-tooltip" style="display:none;position:absolute;background:#111827;border:1px solid #374151;border-radius:5px;padding:5px 10px;font-size:12px;font-family:'JetBrains Mono',monospace;pointer-events:none;white-space:nowrap;z-index:20;box-shadow:0 3px 10px rgba(0,0,0,0.6);"></div>
                              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:5px;">${_pxhLegend}</div>
                          </div>`;
                      }


                      html += `<div style="display:flex;align-items:center;gap:8px;margin:8px 0;flex-wrap:wrap;">
                          <span style="font-size:11px;color:#888;font-weight:700;">Detail table:</span>
                          <select id="proxy-hist-sel" class="tcm-input" style="min-width:160px;">${coOpts}</select>
                      </div>`;

                      if (!snaps.length) {
                          html += `<div class="tcm-notice">No history for this company yet. Refresh to start collecting.</div>`;
                      } else {
                          const fC2 = n => `${n>=0?'+':'-'}$${(Math.abs(n)/1e6).toFixed(2)}M`;
html += `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x;max-width:100%;"><table style="width:100%;border-collapse:collapse;font-size:11px;">
                          <thead><tr>
                              <th style="text-align:left;padding:5px 8px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Date</th>
                              <th style="text-align:right;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Revenue</th>
                              <th style="text-align:right;padding:5px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Net Profit</th>
                              <th style="text-align:right;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Ad</th>
                              <th style="text-align:center;padding:5px 4px;color:#a78bfa;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Avg EE</th>
                              <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Pop/Eff/Env</th>
                          </tr></thead><tbody>
                          ${[...snaps].reverse().map(s => {
                              const nc = (s.netProfit||0) >= 0 ? '#7eb8ff' : '#ef4444';
                              const eeC = (s.avgEE||0) >= 100 ? '#7eb8ff' : (s.avgEE||0) >= 50 ? '#f59e0b' : '#ef4444';
                              return `<tr style="border-bottom:1px solid #111827;">
                                  <td style="padding:5px 8px;color:#ddd;font-weight:600;">${s.date}</td>
                                  <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;color:#d1d5db;font-size:11px;">$${((s.daily||0)/1e6).toFixed(2)}M</td>
                                  <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${nc};font-size:11px;">${fC2(s.netProfit||0)}</td>
                                  <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;color:#9ca3af;font-size:11px;">$${((s.adBudget||0)/1e3).toFixed(0)}K</td>
                                  <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${eeC};font-size:11px;">${s.avgEE||0}</td>
                                  <td style="text-align:center;padding:5px 4px;font-size:11px;color:#9ca3af;">${s.popularity||0}/${s.efficiency||0}/${s.environment||0}</td>
                              </tr>`;
                          }).join('')}
                          </tbody></table></div>`;
                      }

body.innerHTML = html;
                      {
                          const _pxhTt = document.getElementById('tcm-pxh-tooltip');
                          if (_pxhTt) {
                              body.querySelectorAll('.tcm-pxh-dot').forEach(g => {
                                  g.addEventListener('mouseenter', () => {
                                      const [_td, _tn, _tv, _tc] = decodeURIComponent(g.dataset.tip || '').split('|');
                                      _pxhTt.innerHTML = `<span style="color:#9ca3af;">${_td}</span>&nbsp;&nbsp;<span style="color:${_tc};font-weight:700;">${_tn}</span>&nbsp;&nbsp;<span style="color:${_tc};font-weight:700;">${_tv}</span>`;
                                      _pxhTt.style.display = 'block';
                                  });
                                  g.addEventListener('mousemove', e => {
                                      const r = _pxhTt.parentElement?.getBoundingClientRect();
                                      if (!r) return;
                                      const tw = _pxhTt.offsetWidth || 220;
                                      _pxhTt.style.left = Math.max(4, Math.min(e.clientX - r.left + 14, r.width - tw - 4)) + 'px';
                                      _pxhTt.style.top = Math.max(4, e.clientY - r.top - 38) + 'px';
                                  });
                                  g.addEventListener('mouseleave', () => { _pxhTt.style.display = 'none'; });
                              });
                          }
                      }
                      document.getElementById('proxy-hist-sel')?.addEventListener('change', e => {
                          UI._proxyHistorySelId = e.target.value;
                          UI._renderTab('proxy_history');
                      });
                      body.querySelectorAll('.tcm-pxh-co-chk').forEach(cb => {
                          cb.addEventListener('change', () => {
                              if (cb.checked) UI._proxyHistorySelIds.add(cb.dataset.id);
                              else UI._proxyHistorySelIds.delete(cb.dataset.id);
                              UI._renderTab('proxy_history');
                          });
                      });
                  } catch(e) {
                      body.innerHTML = `<div class="tcm-rec high"><div class="rec-title">⚠ Error: ${e.message}</div></div>`;
                  }
              }, 50);
return `<div class="tcm-loading"><span class="tcm-spin"></span>Loading history…</div>`;
          },

          _tabProxyEEPerformance() {
              const body = document.getElementById('tcm-body');
              setTimeout(async () => {
                  if (!body || !document.body.contains(body)) return;
                  try {
                      const snaps = UI._proxyEEPerfSnapCache || await ProxyDB.getAllLatestSnapshots();
                      UI._proxyEEPerfSnapCache = snaps;
                      if (!snaps.length) {
                          body.innerHTML = `<div class="tcm-section-label">EE Performance</div>
                          <div class="tcm-notice">No data yet. Go to <strong>API Keys</strong> and click
                          <strong>↺ Refresh All Companies</strong>.</div>`;
                          return;
                      }

                      if (!UI._proxyEEPerfSelId || !snaps.some(s => s.companyId === UI._proxyEEPerfSelId)) {
                          UI._proxyEEPerfSelId = snaps[0].companyId;
                      }
                      const selId   = UI._proxyEEPerfSelId;
                      const selSnap = snaps.find(s => s.companyId === selId);

                      const coOpts = snaps.map(s =>
                          `<option value="${s.companyId}" ${s.companyId===selId?'selected':''}>${s.companyName||s.companyId}</option>`
                      ).join('');

                      let html = `<div class="tcm-section-label">EE Performance — Multi-Co</div>
                      <div class="tcm-notice" style="font-size:11px;">
                          The same EE breakdown as your own company's Optimizer tab, computed for whichever Multi-Co
                          company you select below. Uses the last saved snapshot for that company — go to
                          <strong>API Keys</strong> and click <strong>↺ Refresh All Companies</strong> for the latest data.
                      </div>
                      <div style="margin-bottom:10px;">
                          <select id="tcm-eeperf-co-sel" class="tcm-input" style="width:100%;box-sizing:border-box;">${coOpts}</select>
                      </div>`;

                      let proxyState = null, posKey = null;
                      if (!selSnap) {
                          html += '<div class="tcm-notice">Company not found — pick another from the list above.</div>';
                      } else if (!selSnap.employees) {
                          html += `<div class="tcm-notice">No employee data stored yet for this company — click
                          <strong>↺ Refresh All Companies</strong> on the API Keys tab, then come back here.</div>`;
                      } else if (!selSnap.typeName) {
                          html += '<div class="tcm-notice">Unrecognised company type — cannot compute EE performance for this company.</div>';
                      } else {
                          proxyState = { employees: selSnap.employees, typeName: selSnap.typeName, directorId: selSnap.directorId };
                          posKey = `proxy_eerank_pos_${selSnap.companyId}`;
                          html += UI._tabEEPerformance(proxyState, posKey);
                      }

                      body.innerHTML = html;

                      document.getElementById('tcm-eeperf-co-sel')?.addEventListener('change', (e) => {
                          UI._proxyEEPerfSelId = e.target.value;
                          UI._renderTab('proxy_ee_perf');
                      });

                      if (proxyState) UI._attachProxyEEPerfHandlers(proxyState, posKey, selSnap);
                  } catch(e) {
                      body.innerHTML = `<div class="tcm-rec high"><div class="rec-title">⚠ Error loading EE performance: ${e.message}</div></div>`;
                  }
              }, 50);
              return `<div class="tcm-loading"><span class="tcm-spin"></span>Loading EE performance…</div>`;
          },

          _attachProxyEEPerfHandlers(state, posKey, snap) {
              document.getElementById('tcm-eeperf-export-btn')?.addEventListener('click', () => {
                  const { employees, directorId } = state;
                  const rows = [['Employee','Position','WS EE','Merits','Settled-In','Management','Total (ex-Addiction)','Addiction','Total (incl-Addiction)']];
                  Object.entries(employees || {})
                      .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                      .map(([id, emp]) => {
                          const wsEE = emp.effectiveness?.working_stats || 0;
                          const merits = emp.effectiveness?.merits || 0;
                          const settled = emp.effectiveness?.settled_in || 0;
                          const mgmt = emp.effectiveness?.management || 0;
                          const addiction = emp.effectiveness?.addiction || 0;
                          return { name: emp.name, position: emp.position, wsEE, merits, settled, mgmt, totalEx: wsEE + merits + settled + mgmt, addiction, totalIncl: emp.effectiveness?.total || 0 };
                      })
                      .sort((a, b) => b.totalEx - a.totalEx)
                      .forEach(r => rows.push([r.name, r.position, r.wsEE, r.merits, r.settled, r.mgmt, r.totalEx, r.addiction, r.totalIncl]));
                  const _coSlug = (snap?.companyName || snap?.companyId || 'company').toString().replace(/[^a-z0-9]+/gi, '_').toLowerCase();
                  exportCsv(rows, `tcm_ee_performance_${_coSlug}_${new Date().toISOString().slice(0,10)}.csv`);
              });

              document.getElementById('tcm-eerank-pos')?.addEventListener('change', () => {
                  const pos = document.getElementById('tcm-eerank-pos')?.value || '';
                  Storage.set(posKey, pos);
                  const div = document.getElementById('tcm-eerank-results');
                  if (!div) return;
                  div.innerHTML = pos
                      ? UI._buildPosRankingHTML(pos, state)
                      : '<div style="color:#888;font-size:12px;">Select a position above to see the ranking.</div>';
              });

              document.getElementById('tcm-eerank-export-btn')?.addEventListener('click', () => {
                  const pos = document.getElementById('tcm-eerank-pos')?.value || Storage.get(posKey, '');
                  if (!pos) { alert('Select a position first.'); return; }
                  const { employees, typeName, directorId } = state;
                  const positions = CompanyData.positions(typeName) || {};
                  const pd = positions[pos];
                  if (!pd) { alert('Position data not found.'); return; }
                  const sk = { man:'manual_labor', int:'intelligence', end:'endurance' };
                  const sl = { man:'MAN', int:'INT', end:'END' };
                  const rows = [['#','Employee','Current Position','Total EE (ex-Addiction)',`${sl[pd.primary]}`,`${sl[pd.secondary]}`,'WS EE','Merits','Settled-In','Management']];
                  Object.entries(employees || {})
                      .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                      .map(([id, emp]) => {
                          const pri = emp[sk[pd.primary]] || 0;
                          const sec = emp[sk[pd.secondary]] || 0;
                          const wsEE = Calc.totalEff(pri, pd.priReq, sec, pd.secReq);
                          const merits = emp.effectiveness?.merits || 0;
                          const settled = emp.effectiveness?.settled_in || 0;
                          const mgmt = emp.effectiveness?.management || 0;
                          return { name: emp.name, position: emp.position, pri, sec, wsEE, merits, settled, mgmt, rankEE: wsEE + merits + settled + mgmt };
                      })
                      .sort((a, b) => b.rankEE - a.rankEE)
                      .forEach((r, i) => rows.push([i + 1, r.name, r.position, r.rankEE, r.pri, r.sec, r.wsEE, r.merits, r.settled, r.mgmt]));
                  const _coSlug2 = (snap?.companyName || snap?.companyId || 'company').toString().replace(/[^a-z0-9]+/gi, '_').toLowerCase();
                  exportCsv(rows, `tcm_pos_ranking_${_coSlug2}_${pos.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
              });
          },

          _attachProxyHandlers(state, subTab) {
              if (subTab !== 'proxy_keys') return;

              document.getElementById('proxy-copy-key-link')?.addEventListener('click', (e) => {
                  const btn = e.currentTarget;
                  const _apiLink = 'https://www.torn.com/preferences.php#tab=api?step=addNewKey&company=profile,employees,detailed,stock&title=TCM%20MultiCo';
                  (navigator.clipboard?.writeText(_apiLink) ?? Promise.reject())
                      .then(() => { btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 1500); })
                      .catch(() => { prompt('Copy this link and send it to your director:', _apiLink); });
              });

              document.getElementById('proxy-add-key-btn')?.addEventListener('click', () => {
                  const keys = Storage.getProxyKeys();
                  keys.push({ id: 'pk_' + Date.now(), label: '', apiKey: '', active: true });
                  Storage.saveProxyKeys(keys);
                  UI._renderTab('proxy_keys');
              });


document.querySelectorAll('.proxy-key-label, .proxy-key-val').forEach(inp => {
    inp.addEventListener('blur', () => {
        const idx = parseInt(inp.dataset.idx);
        const keys = Storage.getProxyKeys();
        const lblEl = document.querySelector(`.proxy-key-label[data-idx="${idx}"]`);
        const valEl = document.querySelector(`.proxy-key-val[data-idx="${idx}"]`);
                      if (keys[idx]) {
                          keys[idx].label  = lblEl?.value || '';
                          keys[idx].apiKey = valEl?.value || '';
                          Storage.saveProxyKeys(keys);
                      }
                  });
              });

document.querySelectorAll('.proxy-save-key').forEach(btn => {
    btn.addEventListener('click', () => {
        const idx    = parseInt(btn.dataset.idx);
        const keys   = Storage.getProxyKeys();
        const lblEl  = document.querySelector(`.proxy-key-label[data-idx="${idx}"]`);
        const valEl  = document.querySelector(`.proxy-key-val[data-idx="${idx}"]`);
                      if (keys[idx]) {
                          keys[idx].label  = lblEl?.value || '';
                          keys[idx].apiKey = valEl?.value || '';
                          Storage.saveProxyKeys(keys);
                          btn.textContent = '✓ Saved';
                          setTimeout(() => { btn.textContent = 'Save'; }, 1500);
                      }
                  });
              });

              document.querySelectorAll('.proxy-del-key').forEach(btn => {
                  btn.addEventListener('click', () => {
                      if (!confirm('Remove this API key and delete its stored company data?')) return;
                      const idx  = parseInt(btn.dataset.idx);
                      const keys = Storage.getProxyKeys();
                      const removed = keys.splice(idx, 1)[0];
                      Storage.saveProxyKeys(keys);
                      if (removed?.id) ProxyDB.deleteCompanyData(removed.id).catch(() => {});
                      UI._renderTab('proxy_keys');
                  });
              });

document.getElementById('proxy-refresh-all-btn')?.addEventListener('click', async () => {
                  const keys = Storage.getProxyKeys().filter(k => k.apiKey);
                  if (!keys.length) { alert('Add at least one API key first.'); return; }
                  await App.refreshProxyCompanies(false);
              });

              document.getElementById('proxy-clear-db-btn')?.addEventListener('click', async () => {
                  if (!confirm('Delete ALL proxy history from IndexedDB? This cannot be undone.')) return;
                  const metas = await ProxyDB.getAllCompanyMeta().catch(() => []);
                  for (const m of metas) await ProxyDB.deleteCompanyData(m.companyId).catch(() => {});
                  Storage.saveProxyLastFetch({});
                  UI._renderTab('proxy_keys');
              });
          },



          _tabOverview(state) {
              const { profile, employees, typeName, detailed, todayNews, snapshot } = state;
              const stars = profile?.rating || profile?.stars || 0;
              const popColor  = c => typeof c === 'number' ? (c >= 50 ? 'green' : c >= 25 ? 'amber' : 'red') : '';
              const trainColor = t => t > 0 ? 'green' : 'red';

              const pop    = detailed?.popularity   ?? '?';
              const eff    = detailed?.efficiency   ?? '?';
              const env    = detailed?.environment  ?? '?';
              const trains = detailed?.trains_available ?? '?';


              const daily          = snapshot?.daily          || profile?.daily_income  || 0;
              const salaries       = snapshot?.salaries       || 0;
              const adBudget       = snapshot?.adBudget       || 0;
              const dailyStockCost = snapshot?.dailyStockCost || 0;
              const net            = snapshot?.netProfit ?? (daily - salaries - adBudget - dailyStockCost);
              const netColor = net >= 0 ? '#7eb8ff' : '#ef4444';
              const trend    = Finance.getTrend();
              const trendStr = trend
                  ? `${parseFloat(trend.pct) >= 0 ? '↑' : '↓'} ${Math.abs(trend.pct)}% vs prev 7d`
                  : 'Insufficient data';
              const trendColor = trend && parseFloat(trend.pct) >= 0 ? '#7eb8ff' : '#ef4444';

              const empRows = Object.entries(employees || {})
                  .filter(([id, emp]) => emp.position !== 'Director' && String(id) !== String(state.directorId || ''))
                  .map(([id, emp]) => {
                  const wsEff     = emp.effectiveness?.working_stats || 0;
                  const merits    = emp.effectiveness?.merits        || 0;
                  const settledIn = emp.effectiveness?.settled_in    || 0;
                  const mgmt      = emp.effectiveness?.management    || 0;
                  const addiction = emp.effectiveness?.addiction     || 0;
                  const totalEff  = emp.effectiveness?.total
                      || (wsEff + merits + settledIn + mgmt + addiction);
                  const tier   = Calc.eeTier(totalEff);
                  const barPct = Math.min(100, (totalEff / 200) * 100);
                  const barCls = totalEff >= 100 ? '' : totalEff >= 50 ? 'amber' : 'red';

                  const trainedViaNews = todayNews?.find(t => t.empId === id);
                  const loggedToday    = Storage.getTodayTrained().find(t => t.empId === id && t.ts);
                  const trained        = trainedViaNews || loggedToday;
                  const inactive       = Calc.daysSince(emp.last_action?.timestamp);


                  const warnings = [];
                  if (inactive >= TCM.INACTIVE_REPLACE_DAYS)
                      warnings.push(`<span class="tcm-badge high">⚠ ${Math.floor(inactive)}d inactive</span>`);
                  else if (inactive >= TCM.INACTIVE_WARN_DAYS)
                      warnings.push(`<span class="tcm-badge medium">warn ${Math.floor(inactive)}d</span>`);
                  if (addiction <= -10)
                      warnings.push(`<span class="tcm-badge high">addict ${addiction}</span>`);
                  else if (addiction < -5)
                      warnings.push(`<span class="tcm-badge medium">addict ${addiction}</span>`);

                  const trainedTag = trained ? `<span class="tcm-badge green">✓</span>` : '';
                  const effColor   = totalEff >= 100 ? '#7eb8ff' : totalEff >= 50 ? '#f59e0b' : '#ef4444';

                  const parts = [`WS:${wsEff}`];
                  if (mgmt)      parts.push(`Mgr:+${mgmt}`);
                  if (merits)    parts.push(`Merit:+${merits}`);
                  if (settledIn) parts.push(`Sett:+${settledIn}`);
                  if (addiction) parts.push(`Add:${addiction}`);
                  const breakdown  = parts.join(' · ');
                  const lastRel    = emp.last_action?.relative || '';
                  const lastStatus = emp.last_action?.status   || 'Offline';
                  const statusCol  = lastStatus === 'Online' ? '#7eb8ff' : lastStatus === 'Idle' ? '#f59e0b' : '#888';

                  return { totalEff, html: `<div class="tcm-emp">
                      <div style="min-width:0;flex:1;">
                          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;"><span class="emp-name" style="flex:1;min-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${emp.name}</span>${trainedTag} ${warnings.join(' ')}</div>
                          <div class="emp-sub">${emp.position}${lastRel ? ` <span style="font-size:10px;font-weight:400;color:${statusCol};">● ${lastRel}</span>` : ''}</div>                        <div style="font-size:12px;color:#9ca3af;font-family:'JetBrains Mono',monospace;margin-top:2px;">MAN:${Calc.fmtNum(emp.manual_labor||0)} INT:${Calc.fmtNum(emp.intelligence||0)} END:${Calc.fmtNum(emp.endurance||0)}</div>
                      </div>
                      <div class="emp-right">
                          <span style="color:${effColor};font-weight:700;font-family:'JetBrains Mono',monospace;font-size:14px;">${totalEff}</span>
                          <span class="tcm-badge tier-${tier}" style="margin-left:4px;">T${tier}</span>
                          <div style="font-size:10px;color:#888;margin-top:2px;text-align:right;font-family:'JetBrains Mono',monospace;">${breakdown}</div>
                          <div class="tcm-bar" style="margin-top:2px;"><div class="tcm-bar-fill ${barCls}" style="width:${barPct}%"></div></div>
                      </div>
                  </div>` };
              })

              .sort((a, b) => b.totalEff - a.totalEff)
              .map(e => e.html)
              .join('');

              const starHtml = Array.from({length:10}, (_,i) =>
                  `<span style="color:${i<stars?'#fbbf24':'#374151'};font-size:15px;line-height:1;">★</span>`
              ).join('');
              const now = new Date();

              const _rankBadge = (() => {
              const _rc = Storage.getRankingCache();
              if (!_rc || Number(_rc.typeInt) !== Number(state.typeInt) || !_rc.companies?.length) return '';
              const _myCoId = String(profile?.ID || profile?.id || '');
              const _myCoEntry = _myCoId ? _rc.companies.find(c => String(c.id) === _myCoId) : null;

      const _weekly = profile?.weekly_income || (snapshot?.daily || 0) * 7;
      const _othersAll = _myCoEntry ? _rc.companies.filter(c => String(c.id) !== _myCoId) : _rc.companies;
              const _total = _rc.companies.length;
              if (_total < 2) return '';
              const _hasRankIncome = _othersAll.some(c => (c.weekly_income || c.daily_income || 0) > 0);
if (!_hasRankIncome) return '';
const _rank = _othersAll.filter(c => (c.weekly_income||(c.daily_income||0)*7) > _weekly).length + 1;
if (_rank > _total) return '';
const _pct = Math.round((_rank / _total) * 100);
const _col = _pct <= 20 ? '#7eb8ff' : _pct <= 50 ? '#f59e0b' : '#ef4444';
return `<span style="font-size:11px;font-weight:700;color:${_col};" title="Income rank vs all ${_total} ${typeName} companies">#${_rank}/${_total}</span>`;
          })();

              const _gsCfgOv = GoogleSync.getCfg();
              const _gsOvHtml = (() => {
                  if (!_gsCfgOv.webAppUrl) return '';
                  const _lsOv = _gsCfgOv.lastSync ? new Date(_gsCfgOv.lastSync).toLocaleTimeString() : '';
                  const _okOv = _gsCfgOv.lastSyncOk;
                  return `<div style="display:flex;gap:6px;align-items:center;padding:4px 0 8px;flex-wrap:wrap;">
                      ${(_gsCfgOv.sheetUrl || '') ? `<a href="${_gsCfgOv.sheetUrl}" target="_blank" rel="noopener"
                          style="background:rgba(126,184,255,0.1);border:1px solid rgba(126,184,255,0.3);
                          color:#7eb8ff;border-radius:4px;padding:3px 10px;font-size:11px;font-weight:600;
                          text-decoration:none;white-space:nowrap;">📊 Open Sheet ↗</a>` : ''}
                      <button id="tcm-overview-sync-btn"
                          style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);
                          color:#7eb8ff;border-radius:4px;padding:3px 10px;font-size:11px;font-weight:600;
                          cursor:pointer;white-space:nowrap;">↑ Sync Now</button>
                      ${_lsOv ? `<span style="font-size:10px;color:${_okOv===false?'#f59e0b':'#4b5563'};">${_okOv===false?'⚠ failed · ':' '}${_lsOv}</span>` : ''}
                  </div>`;
              })();

              return `
                  ${_gsOvHtml}
                  <div style="display:flex;align-items:center;gap:8px;padding:8px 0 6px;border-bottom:1px solid #2a2a2a;margin-bottom:10px;flex-wrap:wrap;">
                      <span style="font-size:15px;font-weight:800;color:#7eb8ff;letter-spacing:0.02em;">${profile?.name || 'Company'}</span>
                      <span style="font-size:11px;color:#374151;">—</span>
                      <span style="font-size:12px;color:#9ca3af;">${typeName || '?'}</span>
                      <span style="margin-left:2px;letter-spacing:1px;">${starHtml}</span>
                      <span style="font-size:10px;color:#888;">${stars}/10</span>
                      ${_rankBadge}
                  </div>
                  <div class="tcm-card">
                      <div class="tcm-card-body">
                          <div class="tcm-row"><span class="lbl">Employees</span><span class="val">${profile?.employees_hired||0} / ${profile?.employees_capacity||0}</span></div>
                          <div class="tcm-row"><span class="lbl">Popularity</span><span class="val ${popColor(pop)}">${pop}%</span></div>
                          <div class="tcm-row"><span class="lbl">Efficiency</span><span class="val ${popColor(eff)}">${eff}%</span></div>
                          <div class="tcm-row"><span class="lbl">Environment</span><span class="val ${popColor(env)}">${env}%</span></div>
                          <div class="tcm-row"><span class="lbl">Trains available</span><span class="val ${trainColor(trains)}">${trains}</span></div>
                          ${(() => {

                              const log = Storage.getTrainedLog();
                              const allEntries = [];
                              for (const [empId, entries] of Object.entries(log)) {
                                  if (!employees[empId]) continue;
                                  for (const e of entries) {
      if (!e.ts) continue;
      allEntries.push({ empId, name: e.name || employees[empId]?.name || empId, date: e.date });
  }
                              }
                              if (!allEntries.length) return '<div style="font-size:12px;color:#888;padding:4px 0;">No recent trains recorded yet.</div>';


                              const latestDate = allEntries.reduce((max, e) => e.date > max ? e.date : max, '');

                              const countMap = {};
                              const seenTs = new Set();
                              for (const e of allEntries.filter(e => e.date === latestDate)) {

                                  if (e.ts && seenTs.has(e.ts)) continue;
                                  if (e.ts) seenTs.add(e.ts);
                                  countMap[e.name] = (countMap[e.name] || 0) + 1;
                              }
                              const parts = Object.entries(countMap).map(([name, cnt]) => cnt > 1 ? `${name} ×${cnt}` : name);

                              const today2    = new Date().toISOString().slice(0, 10);
                              const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
                              const when      = latestDate === today2 ? 'Today' : latestDate === yesterday ? 'Yesterday' : latestDate;
                              const color     = latestDate === today2 ? '#7eb8ff' : '#9ca3af';

                              return `<div style="font-size:12px;color:${color};padding:4px 0;font-weight:600;">${when}: ${parts.join(', ')}</div>`;
                          })()}
                      </div>
                  </div>

                  <div class="tcm-section-label">Financials</div>
                  <div class="tcm-card">
                      <div class="tcm-card-body">
<div class="tcm-row"><span class="lbl">Daily Income</span><span class="val">${Calc.fmtCash(daily)}</span></div>
                          <div class="tcm-row"><span class="lbl">Weekly Income</span><span class="val">${Calc.fmtCash(profile?.weekly_income || 0)}</span></div>
                          <div class="tcm-row"><span class="lbl">Est. Weekly Income</span><span class="val" title="Daily income × 7 — an estimate, not the API's actual weekly figure">${Calc.fmtCash(daily * 7)} <span style="font-size:10px;color:#888;">est.</span></span></div>
                          <div class="tcm-row"><span class="lbl">Salaries</span><span class="val red">−${Calc.fmtCash(salaries)}</span></div>
                          <div class="tcm-row"><span class="lbl">Ad Budget</span><span class="val red">−${Calc.fmtCash(adBudget)}</span></div>
                          ${dailyStockCost > 0 ? `<div class="tcm-row"><span class="lbl">Est. Stock Cost</span><span class="val red" title="Estimated: units sold/day × wholesale price">−${Calc.fmtCash(dailyStockCost)} <span style="font-size:10px;color:#888;">est.</span></span></div>` : ''}
                          <div class="tcm-row">
                              <span class="lbl"><strong>Daily Net</strong></span>
                              <span class="val" style="color:${netColor};font-size:14px;font-weight:700;">${net>=0?'+':''}${Calc.fmtCash(net)}</span>
                          </div>
                          <div class="tcm-row"><span class="lbl">Revenue trend</span><span class="val" style="color:${trendColor};">${trendStr}</span></div>
                      </div>
                  </div>

  ${(() => {

      const _rc  = Storage.getRankingCache();
      const _myDaily = snapshot?.daily || profile?.daily_income || 0;
      const _myWeekly = profile?.weekly_income || _myDaily * 7;


      let _allCos = null, _cacheAgeMin = null;
if (_rc && Number(_rc.typeInt) === Number(state.typeInt) && _rc.companies?.length && (_rc._v || 0) >= 4) {
          _allCos      = _rc.companies;
          _cacheAgeMin = Math.round((Date.now() - (_rc.ts||0)) / 60000);
      }

if (!_allCos || !_allCos.length) {
          const _rkErr = Storage.get('ranking_fetch_error', null);
          if (_rkErr) {
              return `
              <div class="tcm-section-label">Company Ranking</div>
              <div style="background:#1a0d0d;border:1px solid #7f1d1d;border-radius:5px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#fca5a5;">
                  ⚠ Ranking fetch failed${_rkErr.code != null ? ` (code ${_rkErr.code})` : ''}: ${_rkErr.msg || 'unknown error'} <span style="color:#888;">— will retry next refresh</span>
              </div>`;
          }
          return `
          <div class="tcm-section-label">Company Ranking</div>
          <div style="background:#0d1117;border:1px solid #2a2a2a;border-radius:5px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#888;">
              <span class="tcm-spin"></span> Fetching ranking data…
          </div>`;
      }


      const _myCoId3 = String(profile?.ID || profile?.id || '');
      let _sameCos      = _allCos.filter(c => (c.rating||0) === stars);
      let _mySameEntry  = _myCoId3 ? _sameCos.find(c => String(c.id) === _myCoId3) : null;
      if (!_mySameEntry && _myCoId3) {
          _mySameEntry = {
              id: _myCoId3, name: profile?.name || 'Your company', rating: stars,
              daily_income: _myDaily, weekly_income: _myWeekly,
              employees_capacity: profile?.employees_capacity || 0
          };
          _sameCos = _sameCos.concat([_mySameEntry]);
      }
          const _myRankWeekly = _myWeekly;
          const _sameCosOthers = _mySameEntry ? _sameCos.filter(c => String(c.id) !== _myCoId3) : _sameCos;
      const _sameSorted = [..._sameCos].sort((a,b) => (b.weekly_income||(b.daily_income||0)*7)-(a.weekly_income||(a.daily_income||0)*7));
      const _totalSame  = _sameSorted.length;
      if (!_totalSame) {
          return `
          <div class="tcm-section-label">Company Ranking</div>
          <div class="tcm-card"><div class="tcm-card-body">
              <div style="font-size:12px;color:#888;padding:4px 0;">No ${stars}★ ${typeName || 'company'} data available yet — this will appear once the ranking cache refreshes.</div>
          </div></div>`;
      }
      const _myRankSame = _sameCosOthers.filter(c => (c.weekly_income||(c.daily_income||0)*7) > _myRankWeekly).length + 1;
      const _rankPct    = Math.round((_myRankSame / _totalSame) * 100);
      const _rankColor  = _rankPct <= 15 ? '#7eb8ff' : _rankPct <= 40 ? '#f59e0b' : '#ef4444';


      const _nextTierPool    = stars < 10 ? _allCos.filter(c => (c.rating||0) === stars + 1) : [];
      const _nextTierSorted2 = [..._nextTierPool].sort((a, b) => (b.weekly_income||(b.daily_income||0)*7) - (a.weekly_income||(a.daily_income||0)*7));
      const _sameRankNext    = _nextTierSorted2.length > 0
          ? _nextTierSorted2[Math.min(_nextTierSorted2.length - 1, Math.max(0, _nextTierSorted2.length - _myRankSame))]
          : null;
      const _gapSameRankNext = _sameRankNext
          ? Math.max(0, (_sameRankNext.weekly_income||(_sameRankNext.daily_income||0)*7) - _myWeekly)
          : 0;

      let _rankUpHtml = '';
      if (stars < 10) {
          const _nextCos    = _allCos.filter(c => (c.rating||0) === stars + 1);
          const _nextSorted = [..._nextCos].sort((a,b) => (b.weekly_income||(b.daily_income||0)*7)-(a.weekly_income||(a.daily_income||0)*7));

          if (_nextSorted.length > 0) {

              const _targetIdx    = Math.min(_nextSorted.length - 1, Math.max(0, _nextSorted.length - _myRankSame));
              const _targetIncome = _nextSorted[_targetIdx]?.weekly_income || (_nextSorted[_targetIdx]?.daily_income || 0) * 7;

              const _sameSortedT5 = [..._sameCos].sort((a,b)=>(b.weekly_income||(b.daily_income||0)*7)-(a.weekly_income||(a.daily_income||0)*7));
              const _top5Income   = _sameSortedT5.length >= 5 ? (_sameSortedT5[4].weekly_income||(_sameSortedT5[4].daily_income||0)*7) : 0;
              const _useTop5Same  = _top5Income > 0 && _targetIncome < _top5Income;
              const _target       = Math.round(_useTop5Same ? _top5Income : _targetIncome);
              const _gap          = _target - _myWeekly;
              const _gapCol       = _gap <= 0 ? '#7eb8ff' : _gap < 500000 ? '#f59e0b' : '#ef4444';

              const _now      = new Date();
              const _dToSun   = ((7 - _now.getUTCDay()) % 7) || 7;
              const _nextSun  = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate() + _dToSun, 18, 15, 0));
              const _hrs      = Math.round((_nextSun - _now) / 3600000);
              const _timeStr  = _hrs >= 24 ? `${Math.floor(_hrs/24)}d ${_hrs%24}h` : `${_hrs}h`;

              const _metColor = _gap <= 0 ? '#7eb8ff' : '#ef4444';
              _rankUpHtml = `
              <div class="tcm-row">
                  <span class="lbl">Required weekly income for ${_useTop5Same ? `top 5 of ${stars}★ <span style="font-size:10px;color:#f59e0b;">(next tier target too low)</span>` : `${stars+1}★`}</span>
                  <span class="val" style="font-weight:700;color:#ddd;">${Calc.fmtCash(_target)}/week</span>
              </div>
              <div class="tcm-row">
                  <span class="lbl">Your weekly income (est.)</span>
                  <span class="val" style="color:#9ca3af;">${Calc.fmtCash(_myWeekly)}/week</span>
              </div>
              <div class="tcm-row">
                  <span class="lbl">${_gap <= 0 ? '✓ Target met — surplus' : '⚠ Gap remaining'}</span>
                  <span class="val" style="color:${_metColor};font-weight:700;">${_gap <= 0
                      ? Calc.fmtCash(Math.abs(_gap)) + ' above target'
                      : Calc.fmtCash(_gap) + ' still needed'}</span>
              </div>
              <div style="font-size:11px;color:${_gap <= 0 ? '#7eb8ff' : '#9ca3af'};padding:3px 0;">
                  ${_gap <= 0
                      ? `✓ Maintain this income through Sunday 18:00–18:15 TCT (~${_timeStr})`
                      : `Next evaluation: <strong style="color:#f59e0b;">Sunday 18:00–18:15 TCT</strong> (~${_timeStr})`}
              </div>`;
          } else {
              _rankUpHtml = `<div style="font-size:12px;color:#888;padding:4px 0;">No ${stars+1}★ data yet — will appear after ranking refreshes.</div>`;
          }
      } else {
          _rankUpHtml = `<div style="font-size:11px;color:#7eb8ff;padding:4px 0;">✓ Maximum star rating (10★)</div>`;
      }

      const _ageLbl = _cacheAgeMin !== null ? `${_cacheAgeMin}m old` : 'unknown age';

      return `
      <div class="tcm-section-label">Company Ranking</div>
      <div class="tcm-card"><div class="tcm-card-body">
          <div class="tcm-row">
              <span class="lbl">Your rank among ${stars}★ companies</span>
              <span class="val" style="color:${_rankColor};font-size:15px;font-weight:800;">#${_myRankSame} / ${_totalSame}</span>
          </div>
          ${_sameRankNext && stars < 10 ? `<div class="tcm-row">
              <span class="lbl">Gap to rank #${_myRankSame} among ${stars+1}★</span>
              <span class="val ${_gapSameRankNext > 0 ? 'amber' : 'green'}">${_gapSameRankNext > 0 ? Calc.fmtCash(_gapSameRankNext)+'/week needed' : '✓ Already ahead!'}
          </div>` : ''}
          ${_rankUpHtml}
          ${(() => {
              const _decN = s => (s||'').replace(/&#(\d+);/g,(m,c)=>String.fromCharCode(c)).replace(/&amp;/g,'&').replace(/&#039;/g,"'");
              const _lowestSame = _sameSorted.length ? _sameSorted[_sameSorted.length - 1] : null;
              const _nextAllCos = stars < 10 ? _allCos.filter(c => (c.rating||0) === stars + 1) : [];
              const _nextSortedLowest = [..._nextAllCos].sort((a,b) => (a.weekly_income||(a.daily_income||0)*7)-(b.weekly_income||(b.daily_income||0)*7));
              const _lowestNext = _nextSortedLowest.length ? _nextSortedLowest[0] : null;
              let _lRows = '';
              if (_lowestSame) {
                  const _lsW = _lowestSame.weekly_income||(_lowestSame.daily_income||0)*7;
                  _lRows += `<div class="tcm-row"><span class="lbl">Lowest ${stars}★ company</span><span class="val" style="color:#888;font-size:11px;">${_decN(_lowestSame.name||'?')} · ${Calc.fmtCash(_lsW)}/wk</span></div>`;
              }
if (_lowestNext) {
                  const _lnW = _lowestNext.weekly_income||(_lowestNext.daily_income||0)*7;
                  _lRows += `<div class="tcm-row"><span class="lbl">Lowest ${stars+1}★ company</span><span class="val" style="color:#888;font-size:11px;">${_decN(_lowestNext.name||'?')} · ${Calc.fmtCash(_lnW)}/wk</span></div>`;
              }

              if (stars < 10 && _nextAllCos.length > 0) {
                  const _nextWithAge = _nextAllCos.filter(c => (c.days_old || 0) > 0);
                  if (_nextWithAge.length > 0) {
                      const _youngest = _nextWithAge.reduce((min, c) => c.days_old < min.days_old ? c : min);
                      const _yDays = _youngest.days_old;
                      const _yMonths = (_yDays / 30.44).toFixed(1);
                      const _myDays = state?.profile?.days_old || state?.detailed?.days_old || null;
                      const _ageGap = _myDays !== null ? _youngest.days_old - _myDays : null;
                      _lRows += `<div class="tcm-row">
                          <span class="lbl">Youngest ${stars+1}★ company</span>
                          <span class="val" style="color:#7eb8ff;font-size:11px;">
                              ${_decN(_youngest.name||'?')} · <strong>${_yDays}d</strong> (${_yMonths}mo)
                              ${_ageGap !== null
                                  ? _ageGap <= 0
                                      ? `<span style="color:#7eb8ff;"> · ✓ your company is old enough</span>`
                                      : `<span style="color:#f59e0b;"> · you need ${_ageGap} more day${_ageGap!==1?'s':''}</span>`
                                  : ''}
                          </span>
                      </div>`;
                  } else {
                      _lRows += `<div class="tcm-row"><span class="lbl">Youngest ${stars+1}★ company</span><span class="val" style="color:#4b5563;font-size:11px;">Age data not in API response — check console for raw keys</span></div>`;
                  }
              }
              return _lRows;
          })()}
          <div style="font-size:10px;color:#4b5563;margin-top:8px;line-height:1.5;border-top:1px solid #2a2a2a;padding-top:6px;">
                          ⚠ <strong>Estimate only.</strong> Data is ${_ageLbl}. All values are <strong>weekly</strong>. Target = weekly income of the #${_myRankSame} company among ${stars+1}★ companies. Torn's rank-up formula is not publicly documented.
                      </div>
      </div></div>`;
  })()}
                  <div class="tcm-section-label">Employees</div>
                  <div class="tcm-card"><div class="tcm-card-body">${empRows || '<div style="color:#9ca3af;">No employees.</div>'}</div></div>
              `;
          },
  _tabFinance(state) {
              const snaps30 = Finance.getRecentSnapshots(30);
              const now = new Date();

              if (snaps30.length === 0) {
                  return `<div class="tcm-section-label">Finance History</div>
                      <div class="tcm-notice">
                          No data yet. Refresh the page once to record today's snapshot.
                      </div>`;
              }

              const today = now.toISOString().slice(0, 10);
              const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);

              const todaySnap = snaps30.find(s => s.date === today);
              const yestSnap  = snaps30.find(s => s.date === yesterday);

              const sc = n => (n >= 0 ? '+' : '') + Calc.fmtCash(n);
              const cc = n => n >= 0 ? '#7eb8ff' : '#ef4444';



              const liveToday = state.snapshot
                  ? { ...state.snapshot, date: today }
                  : todaySnap;

              const snapRow = (snap, label) => {
                  if (!snap) return `<div class="tcm-row"><span class="lbl">${label}</span><span class="val" style="color:#888;">No data</span></div>`;
                  return `
                      <div class="tcm-row"><span class="lbl">${label} Gross</span><span class="val">${Calc.fmtCash(snap.daily)}</span></div>
                      <div class="tcm-row"><span class="lbl">${label} Net</span><span class="val" style="color:${cc(snap.netProfit)};">${sc(snap.netProfit)}</span></div>`;
              };

              let deltaHtml = '';
              if (liveToday && yestSnap) {
                  const grossDelta = liveToday.daily - yestSnap.daily;
                  const netDelta   = liveToday.netProfit - yestSnap.netProfit;


                  if (grossDelta !== 0 || netDelta !== 0) {
                      const grossPct = yestSnap.daily !== 0 ? ((grossDelta / Math.abs(yestSnap.daily)) * 100).toFixed(1) : null;
                      const netPct   = yestSnap.netProfit !== 0 ? ((netDelta / Math.abs(yestSnap.netProfit)) * 100).toFixed(1) : null;
                      deltaHtml = `
                          <div class="tcm-row"><span class="lbl">Gross change</span><span class="val" style="color:${cc(grossDelta)};">${sc(grossDelta)}${grossPct !== null ? ` (${parseFloat(grossPct) >= 0 ? '↑' : '↓'} ${Math.abs(grossPct)}%)` : ''}</span></div>
                          <div class="tcm-row"><span class="lbl">Net change</span><span class="val" style="color:${cc(netDelta)};">${sc(netDelta)}${netPct !== null ? ` (${parseFloat(netPct) >= 0 ? '↑' : '↓'} ${Math.abs(netPct)}%)` : ''}</span></div>`;
                  } else {
                      deltaHtml = `<div style="color:#888;font-size:12px;padding:4px 0;">No change yet — figures update after 18:00 TCT daily reset.</div>`;
                  }
              }

              const monthPfx   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
              const monthSnaps = snaps30.filter(s => s.date.startsWith(monthPfx));
              const monthNet   = monthSnaps.reduce((a, b) => a + (b.netProfit || 0), 0);
  const recentDays = snaps30.slice(-7);
  const avgRecent  = recentDays.length ? recentDays.reduce((a, b) => a + (b.netProfit || 0), 0) / recentDays.length : null;
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();
  const projected     = avgRecent !== null ? monthNet + daysRemaining * avgRecent : null;

  const paidContracts2 = Storage.getPaidContracts();
  const s2Finance = Storage.getSettings();
  const contractsInNet2 = s2Finance.contractsInNet !== false;
  const totalContractIncome2 = paidContracts2
      .filter(c => c.paidAt && c.paidAt.startsWith(monthPfx))
      .reduce((sum, c) => sum + (c.totalEarned || 0), 0);
  const _activeContractIncome2 = contractsInNet2 ? (() => {
      const _acLog = Storage.getTrainedLog();
      return Storage.getTrainSales().filter(c => !c.deleted && c.active !== false)
          .reduce((sum, c) => {
              const _acEnt = (_acLog[c.buyerEmpId] || []).filter(e => e.ts && e.date >= (c.startDate || ''));
              const _acSeen = new Set();
              const _acDone = _acEnt.filter(e => { if (_acSeen.has(e.ts)) return false; _acSeen.add(e.ts); return true; }).length;
              const _ppt2 = c.pricePerTrain || 0;
              const _pre2 = c.prepaidAmount || 0;
              const _ps2  = c.payStatus || 'unpaid';
              if (_ps2 === 'full')                            return sum + (c.totalTrains || 0) * _ppt2;
              if (_ps2 === 'partial' && _pre2 > 0 && _ppt2 > 0) {
                  const _cov = Math.floor(_pre2 / _ppt2);
                  return sum + _pre2 + Math.max(0, _acDone - _cov) * _ppt2;
              }
              return sum + _acDone * _ppt2;
          }, 0);
  })() : 0;
  const _totalContractInc2 = totalContractIncome2 + _activeContractIncome2;
  const adjustedMonthNet = contractsInNet2 ? monthNet + _totalContractInc2 : monthNet;
  const adjustedProjected = contractsInNet2 && projected !== null ? projected + _totalContractInc2 : projected;

              const nets = snaps30.map(s => s.netProfit || 0);
              const cW=380, cH=110, padL=42, padR=8, padT=10, padB=24;
              const chartW = cW-padL-padR, chartH = cH-padT-padB;
              const minNet = Math.min(0, ...nets), maxNet = Math.max(0, ...nets);
              const range  = maxNet - minNet || 1;
              const zeroY  = padT + chartH - ((0 - minNet) / range) * chartH;

              const pts = snaps30.map((s, i) => {
                  const x = padL + (i / Math.max(snaps30.length - 1, 1)) * chartW;
                  const y = padT + chartH - (((s.netProfit || 0) - minNet) / range) * chartH;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(' ');

              const dots = snaps30.map((s, i) => {
                  const x = padL + (i / Math.max(snaps30.length - 1, 1)) * chartW;
                  const y = padT + chartH - (((s.netProfit || 0) - minNet) / range) * chartH;
                  const isToday = s.date === today;
                  const dotColor = (s.netProfit||0) >= 0 ? '#7eb8ff' : '#ef4444';
                  const tip = encodeURIComponent(`${s.date}|${Calc.fmtCash(s.netProfit||0)}|${dotColor}`);
                  return `<g class="tcm-chart-dot" data-tip="${tip}" style="cursor:pointer;">
                      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="transparent"/>
                      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isToday ? 4 : 2.5}" fill="${dotColor}" ${isToday ? 'stroke="#f3f4f6" stroke-width="1.5"' : ''}/>
                  </g>`;
              }).join('');

              const labels = snaps30.map((s, i) => {
                  const x = padL + (i / Math.max(snaps30.length - 1, 1)) * chartW;
                  const d = new Date(s.date + 'T00:00:00Z');
                  const show = i === 0 || d.getUTCDate() === 1 || snaps30.length <= 7 || i === snaps30.length - 1;
                  return show ? `<text x="${x.toFixed(1)}" y="${(padT+chartH+14).toFixed(1)}" class="tcm-chart-label" text-anchor="middle">${d.getUTCMonth()+1}/${d.getUTCDate()}</text>` : '';
              }).join('');

              const gridLines = [
                  { val: maxNet, y: padT },
                  { val: 0,      y: zeroY },
                  { val: minNet, y: padT + chartH }
              ].map(l =>
                  `<text x="${(padL-3).toFixed(1)}" y="${l.y.toFixed(1)}" class="tcm-chart-label" text-anchor="end" dominant-baseline="middle">${Calc.fmtNum(l.val)}</text>` +
                  `<line x1="${padL}" y1="${l.y.toFixed(1)}" x2="${(padL+chartW).toFixed(1)}" y2="${l.y.toFixed(1)}" stroke="${l.val===0?'#374151':'#2a2a2a'}" stroke-width="${l.val===0?1:0.5}" stroke-dasharray="${l.val===0?'3,3':'none'}"/>`
              ).join('');

              const isLingerie = (state?.typeName === 'Lingerie Store' || state?.typeId === 32);
              const subTab = UI._financeSubTab || 'overview';

              const subTabBar = `
                  <div style="display:flex;gap:4px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #2a2a2a;flex-wrap:wrap;">
                    <button class="tcm-fin-sub ${subTab==='overview'?'active':''}" data-sub="overview"
                      style="background:${subTab==='overview'?'rgba(126,184,255,0.15)':'#2a2a2a'};border:1px solid ${subTab==='overview'?'rgba(126,184,255,0.4)':'#374151'};color:${subTab==='overview'?'#7eb8ff':'#9ca3af'};border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600;">
                      📊 Finance Overview
                    </button>
                    <button class="tcm-fin-sub ${subTab==='wages'?'active':''}" data-sub="wages"
                      style="background:${subTab==='wages'?'rgba(126,184,255,0.15)':'#2a2a2a'};border:1px solid ${subTab==='wages'?'rgba(126,184,255,0.4)':'#374151'};color:${subTab==='wages'?'#7eb8ff':'#9ca3af'};border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600;">
                      💰 Wage Advisor
                    </button>
                    ${isLingerie ? `<button class="tcm-fin-sub ${subTab==='tax'?'active':''}" data-sub="tax"
                      style="background:${subTab==='tax'?'rgba(126,184,255,0.15)':'#2a2a2a'};border:1px solid ${subTab==='tax'?'rgba(126,184,255,0.4)':'#374151'};color:${subTab==='tax'?'#7eb8ff':'#9ca3af'};border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600;">
                      💸 Tax Collection
                    </button>` : ''}
                  </div>`;

              if (isLingerie && subTab === 'tax') {
                  const employees = UI.state?.employees || {};
                  const taxCfg = TaxCollection.loadCfg();

                  Object.keys(employees).forEach(id => {
                      if (!taxCfg.employees[id]) {
                          taxCfg.employees[id] = { type:'money', amount:10000000, period:'weekly', exempt:false };
                      }
                  });
                  Object.keys(taxCfg.employees).forEach(id => {
                      if (!employees[id]) delete taxCfg.employees[id];
                  });
                  TaxCollection.saveCfg(taxCfg);

                  const _isManualOnly = taxCfg.manualOnly || false;
                  const payments = TaxCollection.mergeManualPayments(
                      (!_isManualOnly && UI._taxData) ? TaxCollection.processPayments(UI._taxData, employees, taxCfg) : {},
                      taxCfg
                  );
                  const loading  = UI._taxDataLoading;
                  const taxBody  = loading
      ? `<div class="tcm-loading"><span class="tcm-spin"></span> Fetching payment logs…</div>`
      : (!_isManualOnly && !UI._taxData)
          ? `<div class="tcm-notice">Click "Reload Payments" to fetch payment history from Torn.</div>
             <button class="tcm-btn green" id="tc-reload" style="margin-top:8px;">↺ Load Payments</button>`
          : (() => {
          try {
              const _fetchCount = UI._taxData?._fetchCount ?? 0;
              const _fetchSt    = UI._taxData?._fetchStatus || {};
              const _hasRealData = _fetchCount > 0;
              const _fetchWarn   = (!_isManualOnly && UI._taxData && !_hasRealData)
                  ? `<div class="tcm-warn-box" style="margin-bottom:8px;">
                      ⚠ No payment logs found from Torn API (money status: <code>${_fetchSt.money||'?'}</code>, item status: <code>${_fetchSt.item||'?'}</code>).
                      This is normal if no one has paid yet, or if log types don't match your Torn account.
                      You can still log payments manually using the <strong>✎ Payments</strong> button on each employee card,
                      or enable <strong>Manual Only</strong> mode.
                     </div>`
                  : '';
              return _fetchWarn + TaxCollection.renderHTML(employees, payments, taxCfg);
          } catch(e) {
              console.error('[TCM] Tax Collection render error:', e);
              return `<div class="tcm-rec high"><div class="rec-title">⚠ Render error — ${e.message}</div>
                      <div class="rec-body">Open browser console (F12) for details. Try reloading the Finance tab.</div></div>`;
          }
      })();

                  return subTabBar + taxBody;
              }

              if (subTab === 'wages') {
                  const _wageEmps = state?.employees || {};
                  const _wageMults = Storage.getWageMultipliers();
                  const _wageExcluded = Storage.getWageExcluded();
                  const _meritRate = Storage.get('merit_salary_rate', 0);
                  const _globalMult = parseFloat(Storage.get('global_wage_mult', 1.0)) || 1.0;
                  const _fmtComma = n => (typeof n === 'number' && isFinite(n)) ? Math.round(n).toLocaleString('en-US') : '?';
                  const _fmtW = n => '$' + _fmtComma(n);

                  const _wageRows = Object.entries(_wageEmps)
                      .filter(([id, emp]) => emp.position !== 'Director' && !_wageExcluded.includes(id))
                      .map(([id, emp]) => {
                          const man  = emp.manual_labor  || 0;
                          const intel = emp.intelligence || 0;
                          const end  = emp.endurance     || 0;
                          const statVals = { MAN: man, INT: intel, END: end };
                          const highestStat = Math.max(man, intel, end);
                          const highestKey  = highestStat > 0
                              ? Object.keys(statVals).find(k => statVals[k] === highestStat)
                              : null;

                          const mult = (_wageMults[id] !== undefined && _wageMults[id] !== null)
                              ? Number(_wageMults[id]) : _globalMult;
                          const currentWage = (typeof emp.wage === 'number' && emp.wage >= 0) ? emp.wage : null;

                          if (highestStat === 0) {
                              return `
                              <div class="tcm-card" style="margin-bottom:8px;">
                                <div class="tcm-card-body">
                                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                                    <div>
                                      <div style="font-weight:700;color:#ddd;font-size:13px;">${emp.name || id}</div>
                                      <div style="font-size:11px;color:#888;">${emp.position || '—'}</div>
                                    </div>
                                    <div style="font-size:11px;color:#888;font-style:italic;">No stat data — cannot calculate</div>
                                  </div>
                                </div>
                              </div>`;
                          }

                          const _empMerits = emp.effectiveness?.merits || 0;
                          const _meritBonus = _empMerits * _meritRate;
                          const recommendedWage = highestStat * mult + _meritBonus;
                          let statusLabel, wageColor;
                          if (currentWage === null) {
                              statusLabel = '— No wage data';
                              wageColor   = '#888';
                          } else if (currentWage > recommendedWage * 1.20) {
                              statusLabel = '⬆ Overpaid';
                              wageColor   = '#ef4444';
                          } else if (currentWage < recommendedWage * 0.90) {
                              statusLabel = '⬇ Underpaid';
                              wageColor   = '#f59e0b';
                          } else {
                              statusLabel = '✓ Optimal';
                              wageColor   = '#7eb8ff';
                          }

                          return `
                          <div class="tcm-card" style="margin-bottom:8px;">
                            <div class="tcm-card-body">
                              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                                <div style="flex:1;min-width:130px;">
                                  <div style="font-weight:700;color:#ddd;font-size:13px;">${emp.name || id}</div>
                                  <div style="font-size:11px;color:#888;">${emp.position || '—'}</div>
                                  <div style="font-size:11px;color:#9ca3af;margin-top:3px;">
                                    Top stat: <span style="color:#ddd;font-weight:600;">${highestKey} ${_fmtComma(highestStat)}</span>
                                    <span style="color:#4b5563;margin-left:4px;">MAN:${_fmtComma(man)} INT:${_fmtComma(intel)} END:${_fmtComma(end)}</span>
                                    ${_empMerits > 0 && _meritRate > 0 ? `<span style="color:#7eb8ff;margin-left:4px;">· Merits:${_empMerits} EE → +${_fmtW(_meritBonus)}</span>` : _empMerits > 0 ? `<span style="color:#4b5563;margin-left:4px;">· Merits:${_empMerits} EE (set rate below)</span>` : ''}
                                  </div>
                                </div>
                                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;">
                                  <div style="font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:5px;">
                                    <span>Multiplier:</span>
                                    <input type="number" class="tcm-wage-mult" data-emp="${id}"
                                      value="${mult}" min="0" step="0.1"
                                      style="background:#0d1117;border:1px solid #374151;border-radius:3px;color:#ddd;
                                      padding:2px 5px;font-size:12px;width:64px;outline:none;text-align:center;" />
                                  </div>
                                  <div style="font-size:12px;color:#9ca3af;">
                                    Recommended: <span style="color:#7eb8ff;font-weight:600;font-family:'JetBrains Mono',monospace;">${_fmtW(recommendedWage)}</span>
                                  </div>
                                  <div style="font-size:12px;color:#9ca3af;">
                                    Current wage: <span style="color:${wageColor};font-weight:700;font-family:'JetBrains Mono',monospace;">${currentWage !== null ? _fmtW(currentWage) : '—'}</span>
                                  </div>
                                  <div style="font-size:12px;font-weight:700;color:${wageColor};">${statusLabel}</div>
                                  <button class="tcm-wage-hide" data-emp="${id}"
                                    style="margin-top:4px;background:none;border:1px solid #374151;color:#4b5563;
                                    border-radius:3px;padding:1px 7px;cursor:pointer;font-size:10px;align-self:flex-end;">Hide</button>
                                </div>
                              </div>
                            </div>
                          </div>`;
                      }).join('');

                  return subTabBar + `
                      <div class="tcm-section-label">Wage Advisor</div>
                      <div class="tcm-notice" style="font-size:11px;">
                          Recommended wage = <strong style="color:#ddd;">highest stat × multiplier + (merits EE × merit rate)</strong>.
                          Merits are read from the API automatically and update with each refresh.
                          <span style="color:#7eb8ff;">✓ Optimal</span> = within −10%/+20% · <span style="color:#f59e0b;">⬇ Underpaid</span> · <span style="color:#ef4444;">⬆ Overpaid</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#111827;border:1px solid #2a2a2a;border-radius:5px;margin-bottom:10px;flex-wrap:wrap;">
                          <span style="font-size:12px;color:#9ca3af;font-weight:700;">Merit EE Rate:</span>
                          <input type="text" inputmode="numeric" id="tcm-merit-rate" value="${Number(_meritRate||0).toLocaleString('en-US')}"
      style="background:#0d1117;border:1px solid #374151;border-radius:3px;color:#ddd;padding:4px 8px;font-size:12px;width:120px;">
                          <span style="font-size:11px;color:#888;">$ added per 1 merit EE point</span>
                          <button id="tcm-merit-rate-save" class="tcm-btn green" style="font-size:11px;padding:3px 10px;">Save</button>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#111827;border:1px solid #2a2a2a;border-radius:5px;margin-bottom:10px;flex-wrap:wrap;">
                      <span style="font-size:12px;color:#9ca3af;font-weight:700;">Global Multiplier:</span>
                      <input type="number" id="tcm-global-mult" min="0" step="0.1" value="${_globalMult.toFixed(2)}"
                          style="background:#0d1117;border:1px solid #374151;border-radius:3px;color:#ddd;padding:4px 8px;font-size:12px;width:80px;">
                      <span style="font-size:11px;color:#888;">default for employees without an individual override</span>
                      <button id="tcm-global-mult-save" class="tcm-btn green" style="font-size:11px;padding:3px 10px;">Save</button>
                  </div>
                  ${(() => {
                      let _totCurrent = 0, _totRecommended = 0, _empCount = 0;
                      Object.entries(_wageEmps).filter(([id, emp]) => emp.position !== 'Director' && !_wageExcluded.includes(id)).forEach(([id, emp]) => {
                          const man = emp.manual_labor || 0, int_ = emp.intelligence || 0, end_ = emp.endurance || 0;
                          const highestStat = Math.max(man, int_, end_);
                          if (highestStat === 0) return;
                          const mult = (_wageMults[id] !== undefined && _wageMults[id] !== null) ? Number(_wageMults[id]) : _globalMult;
                          const _meritBonus2 = (emp.effectiveness?.merits || 0) * _meritRate;
                          _totRecommended += highestStat * mult + _meritBonus2;
                          _totCurrent += (typeof emp.wage === 'number' && emp.wage >= 0) ? emp.wage : 0;
                          _empCount++;
                      });
                      if (!_empCount) return '';
                      const _diff = _totRecommended - _totCurrent;
                      const _diffColor = _diff > 0 ? '#f59e0b' : _diff < 0 ? '#7eb8ff' : '#9ca3af';
                      const _fmtT = n => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
                      return '<div style="padding:10px 14px;background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.25);border-radius:6px;margin-bottom:10px;">' +
                          '<div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Wage Totals (' + _empCount + ' employees)</div>' +
                          '<div class="tcm-row"><span class="lbl">Total Current Wages</span><span class="val">' + _fmtT(_totCurrent) + '</span></div>' +
                          '<div class="tcm-row"><span class="lbl">Total Recommended (×' + _globalMult.toFixed(2) + ' global)</span><span class="val">' + _fmtT(_totRecommended) + '</span></div>' +
                          '<div class="tcm-row"><span class="lbl">Difference</span><span class="val" style="color:' + _diffColor + ';">' + (_diff >= 0 ? '+' : '−') + _fmtT(_diff) + ' ' + (_diff > 0 ? '(costs more)' : _diff < 0 ? '(saves money)' : '(no change)') + '</span></div>' +
                          '</div>';
                  })()}
                  ${_wageRows || '<div class="tcm-notice">No employee data yet. Refresh to load employees.</div>'}
                      ${_wageExcluded.length > 0 ? `
                      <div style="margin-top:10px;padding:8px 10px;background:#111827;border:1px solid #2a2a2a;border-radius:6px;">
                          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                              <span style="font-size:12px;color:#888;">${_wageExcluded.length} hidden employee${_wageExcluded.length !== 1 ? 's' : ''}</span>
                              <button id="tcm-wage-show-hidden"
                                style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;
                                border-radius:3px;padding:2px 8px;cursor:pointer;font-size:11px;font-weight:600;">Restore All</button>
                          </div>
                          ${_wageExcluded.map(exId => {
                              const exEmp = _wageEmps[exId];
                              if (!exEmp) return '';
                              return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid #2a2a2a;">' +
                                  '<span style="font-size:12px;color:#9ca3af;">' + (exEmp.name || exId) + ' <span style="color:#4b5563;font-size:11px;">(' + (exEmp.position || '—') + ')</span></span>' +
                                  '<button class="tcm-wage-restore" data-emp="' + exId + '" style="background:none;border:1px solid #374151;color:#9ca3af;border-radius:3px;padding:1px 7px;cursor:pointer;font-size:11px;">Restore</button>' +
                                  '</div>';
                          }).join('')}
                      </div>` : ''}
                  `;
              }

              const _allSalesFinance = Storage.getTrainSales().filter(c => !c.deleted);
              const _contractsInNetTop = Storage.getSettings().contractsInNet !== false;
              const _contractTopHtml = (() => {
                  const _trainLogF = Storage.getTrainedLog();
                  const _allConF = _allSalesFinance.map(c => {
      const _entrF = (_trainLogF[c.buyerEmpId] || []).filter(e => e.ts && e.date >= (c.startDate || ''));
      const _seenF = new Set();
      const _doneF = _entrF.filter(e => {
          const _kF = e._logId || e.ts;
          if (_seenF.has(_kF)) return false;
          _seenF.add(_kF); return true;
      }).length;
                  const _remF  = Math.max(0, (c.totalTrains || 0) - _doneF);
                  const _ppt   = c.pricePerTrain || 0;
                  const _prepaid = c.prepaidAmount || 0;
                  const _ps    = c.payStatus || 'unpaid';
                  let _earnF;
                  if (_ps === 'full') {

                      _earnF = (c.totalTrains || 0) * _ppt;
                  } else if (_ps === 'partial' && _prepaid > 0 && _ppt > 0) {

                      const _coveredTrains = Math.floor(_prepaid / _ppt);
                      _earnF = _prepaid + Math.max(0, _doneF - _coveredTrains) * _ppt;
                  } else {

                      _earnF = _doneF * _ppt;
                  }
                      const _isActive = c.active !== false;
                      const _isComplete = !Storage.isOpenEndedContract(c) && (c.totalTrains || 0) > 0 && _doneF >= (c.totalTrains || 0);
                      return { ...c, done: _doneF, remaining: _remF, earned: _earnF, isActive: _isActive, isComplete: _isComplete };
                  });
                  const _totalEarnF  = _allConF.reduce((s, c) => s + c.earned, 0);
                  const _pendingF    = _allConF.filter(c => c.isActive && !c.isComplete).reduce((s, c) => s + c.remaining * (c.pricePerTrain || 0), 0);
                  const _activeCountF = _allConF.filter(c => c.isActive && !c.isComplete).length;
                  const _rowsF = _allConF.map(c => {
                      const _pctF  = c.totalTrains > 0 ? Math.min(100, Math.round((c.done / c.totalTrains) * 100)) : 100;
                      const _scolF = c.isComplete ? '#7eb8ff' : c.isActive ? '#7eb8ff' : '#888';
                      const _slblF = Storage.isOpenEndedContract(c)
                          ? (c.isActive ? `${c.done} trains · open-ended` : `Closed (${c.done} trains)`)
                          : (c.isComplete ? `✓ ${c.done}/${c.totalTrains}` : c.isActive ? `${c.done}/${c.totalTrains} · ${c.remaining} left` : `Closed (${c.done}/${c.totalTrains})`);
                      const _enF   = (state.employees?.[c.buyerEmpId]?.name) || c.buyerName || c.buyerEmpId;
  const _dailyF = c.dailyReservation > 0 ? ` <span style="font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:2px;padding:1px 4px;">×${c.dailyReservation}/day</span>` : '';
  const _payBadgeF = c.payStatus === 'full'
      ? `<span style="font-size:10px;background:rgba(126,184,255,0.12);border:1px solid rgba(126,184,255,0.3);color:#7eb8ff;border-radius:3px;padding:1px 5px;white-space:nowrap;">💰 Paid in full</span>`
      : c.payStatus === 'partial' && (c.prepaidAmount || 0) > 0
      ? `<span style="font-size:10px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;border-radius:3px;padding:1px 5px;white-space:nowrap;">⊙ Partial ${Calc.fmtCash(c.prepaidAmount)}</span>`
      : `<span style="font-size:10px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.25);color:#7eb8ff;border-radius:3px;padding:1px 5px;white-space:nowrap;">⊘ Unpaid</span>`;
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(96,165,250,0.12);gap:6px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
          <span style="font-size:13px;color:${_scolF};font-weight:700;white-space:nowrap;">${_enF}</span>${_dailyF}
          <div style="flex:1;height:4px;background:#2a2a2a;border-radius:2px;min-width:30px;max-width:80px;"><div style="width:${_pctF}%;height:100%;background:${_scolF};border-radius:2px;"></div></div>
          <span style="font-size:11px;color:${_scolF};white-space:nowrap;">${_slblF}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
          ${_payBadgeF}
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#7eb8ff;font-weight:700;white-space:nowrap;">${Calc.fmtCash(c.earned)}</span>
      </div>
  </div>`;
                  }).join('');
                  return `<div style="background:rgba(96,165,250,0.07);border:2px solid rgba(96,165,250,0.4);border-radius:8px;padding:12px 14px;margin-bottom:14px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:${_allConF.length ? '10px' : '6px'};">
                          <div>
                              <div style="font-size:13px;font-weight:800;color:#7eb8ff;text-transform:uppercase;letter-spacing:0.06em;">📋 Train Contracts</div>
                              <div style="font-size:11px;color:#9ca3af;margin-top:1px;">${_activeCountF} active · ${_allConF.length} total</div>
                          </div>
                          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;background:${_contractsInNetTop ? 'rgba(126,184,255,0.12)' : 'rgba(96,165,250,0.08)'};border:1px solid ${_contractsInNetTop ? 'rgba(126,184,255,0.4)' : 'rgba(96,165,250,0.3)'};border-radius:6px;padding:6px 12px;">
                              <input type="checkbox" id="tcm-contracts-in-net" ${_contractsInNetTop ? 'checked' : ''} style="accent-color:#7eb8ff;width:15px;height:15px;" />
                              <span style="font-size:12px;font-weight:700;color:${_contractsInNetTop ? '#7eb8ff' : '#9ca3af'};">Add to Net Profit</span>
                          </label>
                      </div>
                      ${_allConF.length ? `<div>${_rowsF}</div>
                      <div style="display:flex;gap:20px;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(96,165,250,0.15);margin-top:6px;">
                          <div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Total Earned</div>
                              <div style="font-size:16px;font-weight:800;color:#7eb8ff;font-family:'JetBrains Mono',monospace;">${Calc.fmtCash(_totalEarnF)}</div></div>
                          ${_pendingF > 0 ? `<div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Pending</div>
                              <div style="font-size:16px;font-weight:800;color:#f59e0b;font-family:'JetBrains Mono',monospace;">${Calc.fmtCash(_pendingF)}</div></div>` : ''}
                      </div>` : `<div style="font-size:12px;color:#888;">No contracts yet — add one in <strong style="color:#9ca3af;">Training → Contracts</strong>.</div>`}
                  </div>`;
              })();

              return subTabBar + _contractTopHtml + `
${(() => {
                      const _aS = Storage.getSnapshots().sort((a, b) => a.date.localeCompare(b.date));
                      if (!_aS.length) return '';
                      const _tN  = _aS.reduce((s, n) => s + (n.netProfit || 0), 0);
                      const _tG  = _aS.reduce((s, n) => s + (n.daily || 0), 0);
                      const _tD  = _aS.length;
                      const _avg = _tD > 0 ? Math.round(_tN / _tD) : 0;
                      const _nc  = _tN  >= 0 ? '#7eb8ff' : '#ef4444';
                      const _ac  = _avg >= 0 ? '#7eb8ff' : '#ef4444';
                      return '<div class="tcm-section-label">All-Time Total</div>' +
                          '<div class="tcm-card"><div class="tcm-card-body">' +
                          '<div class="tcm-row"><span class="lbl">Total Net Profit</span>' +
                          '<span class="val" style="color:' + _nc + ';font-size:15px;font-weight:800;">' + (_tN >= 0 ? '+' : '') + Calc.fmtCash(_tN) + '</span></div>' +
                          '<div class="tcm-row"><span class="lbl">Total Gross Revenue</span>' +
                          '<span class="val">' + Calc.fmtCash(_tG) + '</span></div>' +
                          '<div class="tcm-row"><span class="lbl">Days Tracked</span>' +
                          '<span class="val">' + _tD + '</span></div>' +
                          '<div class="tcm-row"><span class="lbl">Avg Daily Net</span>' +
                          '<span class="val" style="color:' + _ac + ';">' + (_avg >= 0 ? '+' : '') + Calc.fmtCash(Math.abs(_avg)) + '</span></div>' +
                          '<div style="font-size:10px;color:#888;padding:3px 0;">' + _aS[0].date + ' \u2192 ' + _aS[_tD - 1].date + ' \u00B7 includes all imported snapshots</div>' +
                          '</div></div>';
                  })()}
                  <div class="tcm-section-label">Today vs Yesterday</div>
                  <div class="tcm-card"><div class="tcm-card-body">
                      ${snapRow(liveToday, 'Today')}
                      ${snapRow(yestSnap, 'Yesterday')}
                      ${deltaHtml || '<div style="color:#888;font-size:12px;padding:4px 0;">Need both today and yesterday data to show change.</div>'}
                  </div></div>

                  <div class="tcm-section-label">This Month</div>
                  <div class="tcm-card"><div class="tcm-card-body">
                      <div class="tcm-row"><span class="lbl">Month net so far${contractsInNet2 ? ' <span style="font-size:10px;color:#7eb8ff;">(+contracts)</span>' : ''}</span><span class="val" style="color:${cc(adjustedMonthNet)};">${sc(adjustedMonthNet)} <span style="color:#888;font-size:10px;">(${monthSnaps.length}d)</span></span></div>
      ${contractsInNet2 && _totalContractInc2 > 0 ? `<div class="tcm-row"><span class="lbl" style="color:#888;font-size:11px;">↳ incl. ${Calc.fmtCash(_totalContractInc2)} contract income</span><span class="val" style="color:#888;font-size:11px;">${sc(monthNet)} ex-contracts</span></div>` : ''}
      ${adjustedProjected !== null ? `<div class="tcm-row"><span class="lbl">Projected month-end</span><span class="val" style="color:${cc(adjustedProjected)};" title="${daysRemaining}d remaining">${sc(adjustedProjected)} <span style="color:#888;font-size:10px;">(${daysRemaining}d left)</span></span></div>` : ''}
                  </div></div>

                  <div class="tcm-section-label">Net Profit — Last ${snaps30.length} Days</div>
                  <div class="tcm-chart-wrap">
                      <svg viewBox="0 0 ${cW} ${cH}" class="tcm-chart-svg" style="height:${cH}px;">
                          ${gridLines}
                          <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+chartH}" stroke="#374151" stroke-width="1"/>
                          ${snaps30.length > 1 ? `<polyline points="${pts}" fill="none" stroke="${nets.every(n => n < 0) ? '#ef4444' : nets.every(n => n >= 0) ? '#7eb8ff' : '#f59e0b'}" stroke-width="2" stroke-linejoin="round" opacity="0.8"/>` : ''}
                          ${dots}
                          ${labels}
                      </svg>
                      <div id="tcm-np-tooltip" style="display:none;position:absolute;background:#111827;border:1px solid #374151;border-radius:5px;padding:5px 10px;font-size:12px;font-family:'JetBrains Mono',monospace;pointer-events:none;white-space:nowrap;z-index:20;box-shadow:0 3px 10px rgba(0,0,0,0.6);"></div>
                      <div style="font-size:10px;color:#888;margin-top:4px;">Hover dots for exact values · highlighted dot = today</div>
                  </div>

                  <div class="tcm-notice" style="font-size:10px;">One snapshot per page load, stored locally. Pasted data appears below.</div>

                  ${(() => {
const _nowAd = new Date();
                      const _mStr  = `${_nowAd.getFullYear()}-${String(_nowAd.getMonth()+1).padStart(2,'0')}-01`;

                      const _mSnaps = snaps30.filter(s => s.date >= _mStr);
                      if (!_mSnaps.length) return '';

                      const _sum = (arr, f) => arr.reduce((s,n) => s + (n[f]||0), 0);
                      const _mAd = _sum(_mSnaps,'adBudget'), _mRev = _sum(_mSnaps,'daily'), _mNet = _sum(_mSnaps,'netProfit');
                      const _pct = (ad, rev) => rev > 0 ? ((ad/rev)*100).toFixed(1) : null;
                      const _rpi = (ad, rev) => ad > 0 ? (rev/ad) : null;
                      const _adPctColor = p => parseFloat(p) > 50 ? 'red' : parseFloat(p) > 25 ? 'amber' : 'green';

                      const _row = (label, val, cls='') =>
                          `<div class="tcm-row"><span class="lbl">${label}</span><span class="val ${cls}">${val}</span></div>`;

return `
                      <div class="tcm-section-label" style="margin-top:8px;">Ad Spend Analysis</div>
                      <div class="tcm-card"><div class="tcm-card-body">
                          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.08em;padding:4px 0 6px;">This Month (${_mSnaps.length}d)</div>
                          ${_row('Gross Revenue', Calc.fmtCash(_mRev))}
                          ${_row('Ad Spend', `−${Calc.fmtCash(_mAd)}`, 'red')}
                          ${_row('Net Profit', Calc.fmtCash(_mNet), _mNet >= 0 ? 'green' : 'red')}
                          ${_pct(_mAd,_mRev) ? _row('Ad % of Revenue', `${_pct(_mAd,_mRev)}%`, _adPctColor(_pct(_mAd,_mRev))) : ''}
                          ${_rpi(_mAd,_mRev) !== null ? _row('Revenue per $1 ad', `$${_rpi(_mAd,_mRev).toFixed(2)}`, _rpi(_mAd,_mRev) >= 1 ? 'green' : 'red') : ''}
                      </div></div>`;
                  })()}

                  ${(() => {
                      const paidContracts = Storage.getPaidContracts();
                      if (!paidContracts.length) return '';
                      const s = Storage.getSettings();
                  const includeInNet = s.contractsInNet !== false;
                  const totalContractIncome = paidContracts
                          .reduce((sum, c) => sum + (c.totalEarned || 0), 0);
                      const recentContracts = paidContracts.slice().sort((a,b) => (b.paidAt||'').localeCompare(a.paidAt||'')).slice(0, 10);
                      return `
                          <div class="tcm-section-label" style="margin-top:8px;">Contract Income</div>
                          <div class="tcm-card"><div class="tcm-card-body">
                              <div class="tcm-row">
                                  <span class="lbl">Total earned from contracts</span>
                                  <span class="val green">${Calc.fmtCash(totalContractIncome)}</span>
                              </div>
                              <div class="tcm-row">
                                  <span class="lbl">Include in Net Profit</span>
                                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                      <input type="checkbox" id="tcm-contracts-in-net" ${includeInNet?'checked':''}
                          style="accent-color:#7eb8ff;width:14px;height:14px;" />
                      <span style="font-size:12px;font-weight:700;color:${includeInNet?'#7eb8ff':'#9ca3af'};">${includeInNet ? '✓ Included in net profit' : 'Not included in net'}</span>
                                  </label>
                              </div>
                              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;margin-bottom:6px;">
                                  <span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Recent Contracts</span>
                                  <button id="tcm-remove-all-contracts"
                                      style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);
                                      color:#ef4444;border-radius:3px;padding:1px 8px;cursor:pointer;font-size:11px;">✕ Remove All</button>
                              </div>
                             ${recentContracts.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #2a2a2a;gap:6px;">
          <span style="font-size:12px;color:#ddd;font-weight:600;flex:1;">${c.buyerName}</span>
          <span style="font-size:12px;color:#7eb8ff;font-family:'JetBrains Mono',monospace;">${Calc.fmtCash(c.totalEarned || 0)}</span>
          <span style="font-size:11px;color:#888;">${c.paidAt || '—'}</span>
          <button class="tcm-paid-delete" data-id="${c.id}"
              style="background:none;border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:3px;
              padding:1px 6px;cursor:pointer;font-size:11px;flex-shrink:0;">✕</button>
      </div>`).join('')}
  </div></div>`
                  })()}

                  ${(() => {
                      const _allMs = Storage.getSnapshots().sort((a, b) => b.date.localeCompare(a.date));
                      if (_allMs.length < 2) return '';
                      const _mMap = {};
                      _allMs.forEach(s => {
                          const mk = s.date.slice(0, 7);
                          if (!_mMap[mk]) _mMap[mk] = { days: 0, gross: 0, net: 0, ad: 0 };
                          _mMap[mk].days++;
                          _mMap[mk].gross += s.daily || 0;
                          _mMap[mk].net   += s.netProfit || 0;
                          _mMap[mk].ad    += s.adBudget  || 0;
                      });
                      const _mEntries = Object.entries(_mMap).sort(([a],[b]) => b.localeCompare(a)).slice(0, 24);
                      if (_mEntries.length < 2) return '';
                      return `
                      <div class="tcm-section-label" style="margin-top:8px;">All-Time Monthly Breakdown</div>
                      <div class="tcm-card"><div class="tcm-card-body" style="padding:8px 10px;">
                      <div style="overflow-x:auto;">
                      <table style="width:100%;border-collapse:collapse;font-size:12px;">
                      <thead><tr>
                          <th style="text-align:left;padding:4px 8px 4px 0;color:#9ca3af;font-size:10px;border-bottom:1px solid #2a2a2a;">Month</th>
                          <th style="text-align:right;padding:4px;color:#9ca3af;font-size:10px;border-bottom:1px solid #2a2a2a;">Days</th>
                          <th style="text-align:right;padding:4px;color:#9ca3af;font-size:10px;border-bottom:1px solid #2a2a2a;">Gross</th>
                          <th style="text-align:right;padding:4px;color:#9ca3af;font-size:10px;border-bottom:1px solid #2a2a2a;">Net</th>
                          <th style="text-align:right;padding:4px;color:#9ca3af;font-size:10px;border-bottom:1px solid #2a2a2a;">Ad</th>
                      </tr></thead>
                      <tbody>
                      ${_mEntries.map(([mk, d]) => {
                          const [y, m] = mk.split('-');
                          const lbl = new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
                          const nc  = d.net >= 0 ? '#7eb8ff' : '#ef4444';
                          return `<tr style="border-bottom:1px solid #111827;">
                              <td style="padding:5px 8px 5px 0;color:#ddd;font-weight:600;">${lbl}</td>
                              <td style="text-align:right;padding:5px 4px;color:#888;">${d.days}</td>
                              <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;color:#d1d5db;">${Calc.fmtCash(d.gross)}</td>
                              <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${nc};">${d.net>=0?'+':''}${Calc.fmtCash(d.net)}</td>
                              <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;color:#9ca3af;">${Calc.fmtCash(d.ad)}</td>
                          </tr>`;
                      }).join('')}
                      </tbody></table></div>
                      <div style="font-size:10px;color:#4b5563;margin-top:4px;">Includes all stored snapshots — shows imported historical data.</div>
                      </div></div>`;
                  })()}
              `;
          },
          _tabRecommendations(state) {
              const recs = Engine.generate(state);
              const daily = state.snapshot?.daily || state.profile?.daily_income || 0;
              const s = Storage.getSettings();
              const currentThreshold = Math.abs(s.addictionThreshold ?? 5);
              const _notifOn = Storage.get('addiction_notif_enabled', true);

              let html = `
                  <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin-bottom:6px;background:#111827;border:1px solid #2a2a2a;border-radius:4px;flex-wrap:wrap;">
                      <span style="font-size:11px;color:#9ca3af;flex-shrink:0;">Addiction warning threshold ≤ −</span>
                      <input id="tcm-advice-addiction-input" type="number" min="1" max="50" value="${currentThreshold}"
                          style="background:#0d1117;border:1px solid #2a2a2a;border-radius:3px;color:#ddd;
                          padding:3px 6px;font-size:12px;width:50px;outline:none;" />
                      <span style="font-size:11px;color:#888;">EE</span>
                      <button id="tcm-advice-thresh-save"
                          style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;
                          border-radius:3px;padding:2px 8px;cursor:pointer;font-size:11px;font-weight:600;">Save</button>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin-bottom:8px;background:#111827;border:1px solid #2a2a2a;border-radius:4px;flex-wrap:wrap;">
                      <span style="font-size:11px;color:#9ca3af;font-weight:700;flex-shrink:0;">Inactivity thresholds</span>
                      <input id="tcm-inactive-warn-input" type="number" min="1" max="30" value="${Storage.getSettings().inactiveThreshold ?? TCM.INACTIVE_WARN_DAYS}"
                          style="background:#0d1117;border:1px solid #2a2a2a;border-radius:3px;color:#ddd;padding:3px 6px;font-size:12px;width:46px;outline:none;" />
                      <span style="font-size:11px;color:#888;">d = warn</span>
                      <input id="tcm-inactive-replace-input" type="number" min="1" max="30" value="${Storage.getSettings().inactiveReplaceThreshold ?? TCM.INACTIVE_REPLACE_DAYS}"
                          style="background:#0d1117;border:1px solid #2a2a2a;border-radius:3px;color:#ddd;padding:3px 6px;font-size:12px;width:46px;outline:none;" />
                      <span style="font-size:11px;color:#888;">d = replace</span>
                      <button id="tcm-inactive-thresh-save"
                          style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:11px;font-weight:600;">Save</button>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;margin-bottom:10px;background:#111827;border:1px solid #2a2a2a;border-radius:4px;flex-wrap:wrap;">
                      <span style="font-size:11px;color:#9ca3af;flex-shrink:0;">Addiction browser notifications</span>
                      <button id="tcm-advice-notif-toggle" style="background:${_notifOn?'rgba(126,184,255,0.15)':'rgba(239,68,68,0.08)'};border:1px solid ${_notifOn?'rgba(126,184,255,0.4)':'rgba(239,68,68,0.3)'};color:${_notifOn?'#7eb8ff':'#f87171'};border-radius:3px;padding:2px 10px;cursor:pointer;font-size:11px;font-weight:700;">${_notifOn?'✓ ON':'✕ OFF'}</button>
                      <span style="font-size:11px;color:#888;">Post-18:15 TCT daily notification for addicted employees</span>
                  </div>`;

              if (!recs.length) {
                  html += '<div class="tcm-notice">✓ No urgent recommendations at this time.</div>';
              } else {
                  const recSnooze    = Storage.get('rec_snooze', {});
              const recDismissed = Storage.get('rec_dismissed', {});
              const now3         = Date.now();
              const s3           = Storage.getSettings();
              const showSnoozed  = s3.showSnoozed || false;
              let hiddenCount    = 0;

              recs.forEach(r => {
                  const key     = (r.empId || 'global') + '_' + (r.title || '').replace(/\s+/g, '_').slice(0, 40);
                  if (recDismissed[key]) return;
                  const snoozed = recSnooze[key] && recSnooze[key] > now3;
                  if (snoozed && !showSnoozed) { hiddenCount++; return; }

                  const snoozeMenu = `
                      <div class="tcm-rec-snooze-menu" style="display:none;gap:4px;flex-wrap:wrap;margin-top:6px;">
                          <button class="tcm-rec-snooze-opt" data-key="${key}" data-days="1"
                              style="background:#2a2a2a;border:1px solid #374151;color:#9ca3af;border-radius:3px;
                              padding:2px 8px;cursor:pointer;font-size:11px;">1 day</button>
                          <button class="tcm-rec-snooze-opt" data-key="${key}" data-days="3"
                              style="background:#2a2a2a;border:1px solid #374151;color:#9ca3af;border-radius:3px;
                              padding:2px 8px;cursor:pointer;font-size:11px;">3 days</button>
                          <button class="tcm-rec-snooze-opt" data-key="${key}" data-days="7"
                              style="background:#2a2a2a;border:1px solid #374151;color:#9ca3af;border-radius:3px;
                              padding:2px 8px;cursor:pointer;font-size:11px;">7 days</button>
                          <button class="tcm-rec-snooze-opt" data-key="${key}" data-days="-1"
                              style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);
                              color:#ef4444;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:11px;">Dismiss</button>
                      </div>`;

                  html += `<div class="tcm-rec ${r.level}" style="${(snoozed && !showSnoozed) ? 'opacity:0.5;' : ''}">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                          <div class="rec-title" style="flex:1;">${r.title}</div>
                          <button class="tcm-rec-snooze-btn"
                              style="background:none;border:1px solid #374151;color:#888;border-radius:3px;
                              padding:1px 6px;cursor:pointer;font-size:11px;margin-left:8px;flex-shrink:0;">✕</button>
                      </div>
                      <div class="rec-body">${r.reason}</div>
                      <div class="rec-meta">
                          <span class="tcm-badge ${r.level}">${r.level}</span>
                      </div>
                      ${snoozeMenu}
                  </div>`;
              });

              if (hiddenCount > 0) {
                  html += `<div style="text-align:center;padding:8px;font-size:12px;color:#888;">
                      ${hiddenCount} recommendation${hiddenCount > 1 ? 's' : ''} hidden ·
                      <a href="#" id="tcm-show-snoozed" style="color:#7eb8ff;">Show all</a>
                  </div>`;
              }
              const dismissedKeys = Object.keys(recDismissed);
              if (dismissedKeys.length > 0) {
                  html += `<div style="text-align:center;padding:4px 8px 8px;font-size:11px;color:#4b5563;">
                      ${dismissedKeys.length} dismissed · <a href="#" id="tcm-clear-dismissed" style="color:#7eb8ff;">Restore all</a>
                  </div>`;
              }
              }

              return html;
          },

          _attachRecHandlers() {
            document.getElementById('tcm-inactive-thresh-save')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  s2.inactiveThreshold = Math.max(1, parseInt(document.getElementById('tcm-inactive-warn-input')?.value || '3') || 3);
                  s2.inactiveReplaceThreshold = Math.max(1, parseInt(document.getElementById('tcm-inactive-replace-input')?.value || '7') || 7);
                  Storage.saveSettings(s2);
                  const _itb = document.getElementById('tcm-inactive-thresh-save');
                  if (_itb) { _itb.textContent = '✓'; setTimeout(() => { _itb.textContent = 'Save'; }, 1500); }
                  this._renderTab('recs');
              });
      document.getElementById('tcm-advice-thresh-save')?.addEventListener('click', () => {
              const s2 = Storage.getSettings();
                  s2.addictionThreshold = Math.max(1, parseInt(document.getElementById('tcm-advice-addiction-input')?.value || '5') || 5);
                  Storage.saveSettings(s2);
                  const btn = document.getElementById('tcm-advice-thresh-save');
                  if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = 'Save'; }, 1500); }
                  this._renderTab('recs');
              });
              document.getElementById('tcm-advice-notif-toggle')?.addEventListener('click', () => {
                  const _cur = Storage.get('addiction_notif_enabled', true);
                  Storage.set('addiction_notif_enabled', !_cur);
                  this._renderTab('recs');
              });

              const recSnooze = Storage.get('rec_snooze', {});
              document.querySelectorAll('.tcm-rec-snooze-btn').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const menu = btn.closest('.tcm-rec').querySelector('.tcm-rec-snooze-menu');
                      if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
                  });
              });
              document.querySelectorAll('.tcm-rec-snooze-opt').forEach(opt => {
                  opt.addEventListener('click', () => {
                      const key  = opt.dataset.key;
                      const days = parseInt(opt.dataset.days);
                      if (days === -1) {
                          const dismissed = Storage.get('rec_dismissed', {});
                          dismissed[key] = true;
                          Storage.set('rec_dismissed', dismissed);
                          delete recSnooze[key];
                          Storage.set('rec_snooze', recSnooze);
                      } else if (days === 0) {
                          delete recSnooze[key];
                          Storage.set('rec_snooze', recSnooze);
                      } else {
                          recSnooze[key] = Date.now() + days * 86400000;
                          Storage.set('rec_snooze', recSnooze);
                          const sS = Storage.getSettings();
                          sS.showSnoozed = false;
                          Storage.saveSettings(sS);
                      }
                      this._renderTab('recs');
                  });
              });
              document.getElementById('tcm-show-snoozed')?.addEventListener('click', (e) => {
                  e.preventDefault();
                  const s = Storage.getSettings();
                  s.showSnoozed = !s.showSnoozed;
                  Storage.saveSettings(s);
                  this._renderTab('recs');
              });
              document.getElementById('tcm-clear-dismissed')?.addEventListener('click', (e) => {
                  e.preventDefault();
                  Storage.set('rec_dismissed', {});
                  this._renderTab('recs');
              });
          },

          _tabRotation(state) {
              const { employees, typeName, todayNews, profile, directorId, detailed } = state;
              const stars = profile?.rating || 0;
              const s = Storage.getSettings();
              const mode = s.rotationMode || 'priority';
              const trainView = s.trainView || 'today';
              const filter = s.trainFilter || 'week';


              const positions = CompanyData.positions(typeName);
              const trainers = [];
              for (const emp of Object.values(employees || {})) {
                  const res = PosNorm.resolve(emp.position, positions);
                  if (res?.data?.special === 'trainer') trainers.push({ eff: emp.effectiveness?.working_stats || 0 });
              }
              const baseTrains = Math.min(20, stars);
              let trainerBonus = 0;
              for (const t of trainers) {
                  if (t.eff >= TCM.EE_TIER_4) trainerBonus += 3;
                  else if (t.eff >= TCM.EE_TIER_3) trainerBonus += 2;
                  else if (t.eff >= TCM.EE_TIER_2) trainerBonus += 1;
              }
const totalTrainBudget = baseTrains + trainerBonus;
              const trainsAvailableAPI = state.detailed?.trains_available ?? null;

              const _tornDayStartMsBudget = Storage.tornDayStart();
              const _usedTodayAllCompany = Object.values(Storage.getTrainedLog()).reduce((sum, entries) => {
                  const seen = new Set();
                  return sum + (entries || []).filter(e => {
                      if (!e.ts || e.ts < _tornDayStartMsBudget) return false;
                      const key = e._logId || e.ts;
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                  }).length;
              }, 0);

              const effectiveTodayBudget = (trainsAvailableAPI !== null)
                  ? Math.max(totalTrainBudget, trainsAvailableAPI + _usedTodayAllCompany)
                  : totalTrainBudget;
              const today           = new Date().toISOString().slice(0, 10);
              const _tornDayStartMs = Storage.tornDayStart();


              const activeSales = Storage.getTrainSales().filter(c => c.active !== false && (c.dailyReservation || 0) > 0);
              const saleLog = Storage.getTrainedLog();
              // Only count reservations that apply *today* (respect start dates + remaining trains)
              const buyerAllocations = activeSales.map(c => {
                  const reservedToday = Storage.contractReservationOnDate(c, today, saleLog);
                  if (reservedToday <= 0) return null;
                  const todayCount = (saleLog[c.buyerEmpId] || []).filter(e => e.ts && e.ts >= _tornDayStartMs).length;
                  const done = todayCount >= reservedToday;
                  return { empId: c.buyerEmpId, name: c.buyerName, reserved: reservedToday, todayCount, done, contractId: c.id };
              }).filter(Boolean).filter(b => employees[b.empId] && (employees[b.empId].days_in_company == null || employees[b.empId].days_in_company >= (Storage.getSettings().settlingInDays ?? 3)));

              const totalReserved = buyerAllocations.reduce((s, b) => s + b.reserved, 0);
              const trainBudget = Math.max(0, totalTrainBudget - totalReserved);
              const effectiveRotationBudget = Math.max(0, effectiveTodayBudget - totalReserved);
              const rotationFrozen = effectiveRotationBudget === 0 && totalReserved > 0;
              const _rotExcl = new Set(Storage.getRotation().excluded || []);
const nonDirIds = Object.keys(employees || {}).filter(id =>
    employees[id].position !== 'Director'
    && String(id) !== String(directorId || '')
    && !_rotExcl.has(id)
&& (employees[id].days_in_company == null || employees[id].days_in_company >= (Storage.getSettings().settlingInDays ?? 3))
);
const nonDirCount = nonDirIds.length;
const N = nonDirIds.length;


              const base = (!rotationFrozen && N > 0) ? Math.floor(trainBudget / N) : 0;
              const extra = (!rotationFrozen && N > 0) ? trainBudget % N : 0;


              const todayLog = Storage.getTrainedLog();
              const getTodayCount = (empId) => {
                  return (todayLog[empId] || []).filter(e => e.date === today).length;
              };


              const dailyOverrides = s.dailyOverrides || {};

              let html = '';


              html += `<div class="tcm-mode-toggle" style="margin-bottom:10px;">
                  <button type="button" class="${trainView==='today'?'active':''}" id="tcm-view-today">Today</button>
                  <button type="button" class="${trainView==='week'?'active':''}" id="tcm-view-week">This Week</button>
                  <button type="button" class="${trainView==='calendar'?'active':''}" id="tcm-view-calendar">📅 Calendar</button>
                  <button type="button" class="${trainView==='history'?'active':''}" id="tcm-view-history">History</button>
                  <button type="button" class="${trainView==='schedule'?'active':''}" id="tcm-view-schedule">Manual Schedule</button>
              </div>`;

              html += `<div class="tcm-row" style="margin-bottom:8px;">
                  <span class="lbl">Budget: <strong style="color:#7eb8ff;">${effectiveTodayBudget}</strong> trains available today</span>
                  <span style="font-size:12px;color:#9ca3af;">${totalTrainBudget}/day base${effectiveTodayBudget > totalTrainBudget ? ` · <span style="color:#f59e0b;">+${effectiveTodayBudget - totalTrainBudget} stacked</span>` : ''} · ${N} employees</span>
              </div>`;
              if (rotationFrozen) {
      html += `<div class="tcm-warn-box">⚠ All ${totalTrainBudget} trains reserved for buyers today. No trains available for regular rotation.</div>`;
  } else if (effectiveTodayBudget === 0) {
      html += `<div class="tcm-warn-box">⚠ No trains available today — your company has ${stars}★ (base: ${Math.min(20, stars)} trains/day). Trains unlock from 1★ upward.</div>`;
  }




              if (trainView === 'today') {
                  const _tmplModeActive = (s.templateModeEnabled || false);
                  if (_tmplModeActive) {
                      html += `<div class="tcm-notice" style="font-size:12px;border-color:rgba(126,184,255,0.4);background:rgba(126,184,255,0.05);">
                          <strong style="color:#7eb8ff;">✓ Manual Mode active</strong> — today's plan is recalculated live from each employee's weekly target plus everyone else's rotation debt. Go to <strong>Manual Schedule</strong> to set weekly targets.
                      </div>`;
                  } else {
                      const _ctrActiveSales = Storage.getTrainSales().filter(c => c.active !== false && !c.deleted);
  const _ctrHasReserved = _ctrActiveSales.some(c => (c.dailyReservation || 0) > 0 && employees[c.buyerEmpId]);
  const _ctrNote = mode === 'contract_rotational' && _ctrActiveSales.length > 0 && !_ctrHasReserved
      ? ` <span style="color:#f59e0b;">⚠ Contract found but <strong>Daily trains = 0</strong> — go to <strong>Trains Contracts</strong> tab, edit the contract and set a Daily trains reservation to activate it here.</span>`
      : mode === 'contract_rotational' && _ctrActiveSales.length === 0
      ? ` <span style="color:#f59e0b;">⚠ No active contracts yet — create one in the <strong>Trains Contracts</strong> tab.</span>`
      : '';
  const _md = mode === 'priority'
      ? `<strong>Priority:</strong> Trains whoever is closest to their next EE tier.`
      : mode === 'contract_rotational'
      ? `<strong>Contract+Rotational:</strong> Contract buyers get reserved trains first; remaining budget rotates fairly.`
      : `<strong>Rotational:</strong> Debt-based fairness — whoever is most behind gets priority.`;
  html += `<div class="tcm-notice" style="font-size:12px;">${_md}</div>`;
  if (mode === 'contract_rotational') {
      const _allActive = Storage.getTrainSales().filter(c => c.active !== false && !c.deleted);
      if (!_allActive.length) {
          html += `<div class="tcm-warn-box">⚠ No active contracts. Create one in <strong>Training → Contracts</strong>, then set a <strong>Daily trains</strong> reservation on it.</div>`;
      } else {
          const _today2 = new Date().toISOString().slice(0, 10);
          html += `<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:5px;padding:9px 12px;margin-bottom:8px;">
              <div style="font-size:11px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:7px;">Contract Status</div>
              ${_allActive.map(c => {
                  const _res = c.dailyReservation || 0;
                  const _bName = (employees[c.buyerEmpId]?.name) || c.buyerName;
                  const _done2 = (Storage.getTrainedLog()[c.buyerEmpId] || []).filter(e => e.date === _today2 && e.ts).length;
                  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(245,158,11,0.1);">
                      <span style="font-size:12px;color:#ddd;font-weight:600;">${_bName}</span>
                      ${_res > 0
                          ? `<span style="font-size:11px;color:${_done2 >= _res ? '#7eb8ff' : '#f59e0b'};">${_done2}/${_res} trains today</span>`
                          : `<span style="font-size:11px;color:#ef4444;">⚠ Daily trains = 0 — edit in Contracts</span>`}
                  </div>`;
              }).join('')}
          </div>`;
      }
  }
                  }
                  html += `<div class="tcm-mode-toggle" style="margin-bottom:10px;">
                      <button type="button" class="${mode==='priority'?'active':''}" id="tcm-mode-priority">Priority (1-5★)</button>
                      <button type="button" class="${mode==='rotational'?'active':''}" id="tcm-mode-rotational">Rotational (6-10★)</button>
                      <button type="button" class="${mode==='contract_rotational'?'active':''}" id="tcm-mode-contract-rot" style="color:${mode==='contract_rotational'?'#f59e0b':''};">Contracts</button>
                  </div>`;
                  html += `<div style="font-size:11px;color:#888;margin-bottom:8px;">API auto-detects trains every 60s. Use ✓ Mark only if the counter hasn't updated yet.</div>`;
                  html += `<div style="padding:6px 10px;margin-bottom:10px;background:#111827;border:1px solid #2a2a2a;border-radius:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Debt cycle start:</span>
                      <input type="date" id="tcm-rot-start-date"
                          value="${Storage.getRotation().startDate || today}"
                          max="${today}"
                          style="background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:3px 8px;font-size:12px;outline:none;" />
                      <button class="tcm-btn green" id="tcm-rot-start-save" style="font-size:11px;padding:3px 10px;">Set</button>
                      <span style="font-size:11px;color:#4b5563;flex:1;">Move back to include older trains; forward to ignore them.</span>
                  </div>`;
                  const _nowR = new Date();
                  const _mtr = (18 * 60) - (_nowR.getUTCHours() * 60 + _nowR.getUTCMinutes());
                  const _tsl = state.detailed?.trains_available ?? 0;
                  if (_mtr > 0 && _mtr <= 120 && _tsl > 0) {
                      const _hh = Math.floor(_mtr / 60), _mm2 = _mtr % 60;
                      html += `<div class="tcm-warn-box">⚠ <strong>${_tsl} train${_tsl!==1?'s':''} unused</strong> — daily reset in ${_hh > 0 ? `${_hh}h ${_mm2}m` : `${_mm2}m`} at 18:00 TCT. Use them or lose them!</div>`;
                  }
const trainsAvailable = (trainsAvailableAPI !== null)
                      ? Math.max(0, effectiveTodayBudget - _usedTodayAllCompany)
                      : null;
                  const apiTrainedIds   = new Set((todayNews || []).map(t => t.empId));


                  let queueData, rot, plan;
if (_tmplModeActive) {
                      rot = Storage.getRotation();
                      const _dp = Storage.computeTodayPlan(employees, state.directorId, effectiveRotationBudget);
                      plan = Object.keys(_dp.planned).map(id => {
                          const planned = _dp.planned[id] || 0;
                          const logged  = (todayLog[id] || []).filter(e => e.date === today && e.ts).length;
                          const emp2    = employees[id];
                          const done    = planned > 0 && logged >= planned;
                          return { empId: id, name: emp2?.name || id, planned, logged, done,
                              scheduled: planned > 0, isNext: false,
                              wsEff: emp2?.effectiveness?.working_stats || 0,
                              totalEff: emp2?.effectiveness?.total || emp2?.effectiveness?.working_stats || 0,
                              isFixed: _dp.fixedIds.includes(id),
                              debt: 0 };
                      }).filter(r => r.scheduled).sort((a, b) => b.planned - a.planned);
                      let _fn = false;
                      plan.forEach(r => { if (!_fn && !r.done) { r.isNext = true; _fn = true; } });
                      queueData = { today: plan, queue: rot, active: [], stats: {} };



                      const _overTrained = plan.filter(r => r.isFixed && r.logged > r.planned);
                      if (_overTrained.length) {
                          html += `<div class="tcm-warn-box">⚠ ${_overTrained.map(r => `<strong>${r.name}</strong> received ${r.logged - r.planned} extra train${r.logged - r.planned !== 1 ? 's' : ''} today`).join(', ')} — tomorrow's catch-up amount is reduced automatically to keep their weekly target on track.</div>`;
                      }
                  } else {
                      queueData = Storage.getTrainQueue(employees, effectiveRotationBudget, mode, state.directorId, todayNews, typeName);
                      rot  = queueData.queue;
                      plan = queueData.today;
                      Storage.saveRotation(rot);
                  }

                  const activePlan    = plan.filter(e => !rot.excluded.includes(e.empId));
                  const scheduledPlan = activePlan.filter(e => e.scheduled);
                  const totalLogged   = scheduledPlan.reduce((s, e) => s + e.logged, 0);
                  const totalPlanned  = scheduledPlan.reduce((s, e) => s + e.planned, 0);
                  const allDone       = scheduledPlan.length > 0 && scheduledPlan.every(e => e.done);
                  const nextPerson    = scheduledPlan.find(e => !e.done);


                  {
                      const _sumPending = scheduledPlan.filter(e => !e.done);
                      const _sumLog = Storage.getTrainedLog();
                      const _sumStale = nonDirIds.filter(id => {
                          const _es = (_sumLog[id] || []).filter(e => e.ts).sort((a, b) => b.ts - a.ts);
                          if (!_es.length) return true;
                          return (Date.now() - _es[0].ts) / 86400000 >= 2;
                      }).map(id => employees[id]?.name).filter(Boolean);

                      if (_sumPending.length > 0 || _sumStale.length > 0) {
                          html += `<div style="background:#0a0e14;border:1px solid #2a2a2a;border-radius:5px;padding:8px 12px;margin-bottom:10px;font-size:12px;">`;
                          if (_sumPending.length > 0) {
                              html += `<div style="margin-bottom:${_sumStale.length ? '5px' : '0'};"><span style="color:#7eb8ff;font-weight:700;">Still to train today:</span> ${
                                  _sumPending.map(e => `<span style="color:#f3f4f6;font-weight:600;">${e.name}</span> <span style="font-family:'JetBrains Mono',monospace;color:#7eb8ff;font-weight:700;">×${e.planned - e.logged}</span>`).join(' &nbsp;·&nbsp; ')
                              }</div>`;
                          }
                          if (_sumStale.length > 0) {
                              html += `<div><span style="color:#f59e0b;font-weight:700;">⚠ Not trained in 2d+:</span> <span style="color:#fbbf24;">${_sumStale.join(', ')}</span></div>`;
                          }
                          html += `</div>`;
                      }
                  }

                  const nextBuyer = buyerAllocations.find(b => !b.done);
                  if (rotationFrozen && nextBuyer) {

                      html += `<div style="background:rgba(245,158,11,0.06);border:2px solid rgba(245,158,11,0.4);border-radius:6px;padding:14px 16px;margin-bottom:12px;">
                          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Train next (contract buyer)</div>
                          <div style="display:flex;justify-content:space-between;align-items:center;">
                              <div>
                                  <div style="font-size:20px;font-weight:800;color:#f59e0b;">▶ ${nextBuyer.name}</div>
                                  <div style="font-size:12px;color:#9ca3af;margin-top:3px;">Reserved ${nextBuyer.reserved} trains/day · contract buyer</div>
                              </div>
                              <div style="text-align:right;">
                                  <div style="font-size:24px;font-weight:800;color:#f3f4f6;font-family:'JetBrains Mono',monospace;">${nextBuyer.reserved - nextBuyer.todayCount}×</div>
                                  <div style="font-size:11px;color:#888;">${nextBuyer.todayCount}/${nextBuyer.reserved} done</div>
                              </div>
                          </div>
                          ${trainsAvailable !== null ? `<div style="font-size:12px;color:#9ca3af;margin-top:8px;padding-top:8px;border-top:1px solid rgba(245,158,11,0.15);">${trainsAvailable} trains available in Torn right now</div>` : ''}
                      </div>`;
                  } else if (allDone || (!scheduledPlan.length && !nextBuyer)) {
                      html += `<div style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.3);border-radius:6px;padding:14px 16px;margin-bottom:12px;text-align:center;">
                          <div style="font-size:18px;font-weight:800;color:#7eb8ff;">✓ All trains done for today!</div>
                          <div style="font-size:12px;color:#888;margin-top:4px;">${trainsAvailable !== null ? `${trainsAvailable} trains still available in Torn` : ''}</div>
                      </div>`;
                  } else if (nextPerson) {
                      const empObj = employees[nextPerson.empId];
                      let tierStr = '';
                      if (empObj) {
                          const posRes = PosNorm.resolve(empObj.position, CompanyData.positions(typeName));
                          if (posRes) {
                              const wsEff    = empObj.effectiveness?.working_stats || 0;
                              const totalEff = empObj.effectiveness?.total || wsEff;
                              const priStat  = empObj[{ man:'manual_labor', int:'intelligence', end:'endurance' }[posRes.data.primary]] || 0;
                              const secStat  = empObj[{ man:'manual_labor', int:'intelligence', end:'endurance' }[posRes.data.secondary]] || 0;
                              const ti = Calc.trainsToNextTier(wsEff, priStat, posRes.data.priReq, secStat, posRes.data.secReq, totalEff, posRes.data.priGain, posRes.data.secGain);
                              tierStr = ti ? ` · ${ti.trains} trains to T${ti.targetTier}` : ' · max tier';
                          }
                      }
                      const remaining = nextPerson.planned - nextPerson.logged;
                      html += `<div style="background:rgba(126,184,255,0.06);border:2px solid rgba(126,184,255,0.4);border-radius:6px;padding:14px 16px;margin-bottom:12px;">
                          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Train next</div>
                          <div style="display:flex;justify-content:space-between;align-items:center;">
                              <div>
                                  <div style="font-size:20px;font-weight:800;color:#7eb8ff;">▶ ${nextPerson.name}</div>
                                  <div style="font-size:12px;color:#9ca3af;margin-top:3px;">${nextPerson.totalEff} EE${tierStr}</div>
                              </div>
                              <div style="text-align:right;">
                                  <div style="font-size:24px;font-weight:800;color:#f3f4f6;font-family:'JetBrains Mono',monospace;">${remaining}×</div>
                                  <div style="font-size:11px;color:#888;">${nextPerson.logged}/${nextPerson.planned} done</div>
                              </div>
                          </div>
                          ${trainsAvailable !== null ? `<div style="font-size:12px;color:${trainsAvailable===0?'#7eb8ff':'#9ca3af'};margin-top:8px;padding-top:8px;border-top:1px solid rgba(126,184,255,0.15);">${trainsAvailable} trains available in Torn right now</div>` : ''}
                      </div>`;
                  }


                  if (buyerAllocations.length > 0) {
                      html += `<div style="margin-bottom:10px;">
                          <div style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;font-weight:700;">Train sale buyers (reserved)</div>
                          ${buyerAllocations.map(b => `
                              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;margin-bottom:4px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);border-radius:4px;">
                                  <div>
                                      <span style="font-size:13px;color:#f59e0b;font-weight:700;">${b.done ? '✓ ' : '▶ '}${b.name}</span>
                                      <div style="font-size:11px;color:#888;margin-top:2px;">Reserved ${b.reserved} trains/day</div>
                                  </div>
                                  <div style="text-align:right;">
                                      <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:${b.done?'#7eb8ff':'#f59e0b'};">${b.todayCount}/${b.reserved}</span>
                                      ${!b.done ? `<button class="tcm-mark-btn" data-id="${b.empId}" data-name="${b.name}"
                                          style="display:block;margin-top:4px;background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);
                                          color:#7eb8ff;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;">✓ Mark</button>` : ''}
                                  </div>
                              </div>`).join('')}
                          <div style="font-size:11px;color:#888;padding:4px 0;">${totalReserved} trains reserved for buyers · ${trainBudget} remaining for rotation</div>
                      </div>`;
                  }


                  const trainedToday = scheduledPlan.filter(e => e.done);
                  if (trainedToday.length > 0) {
                      html += `<div style="margin-bottom:10px;">
                          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Trained today</div>
                          ${trainedToday.map(e => `
                              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
                                  <span style="font-size:13px;color:#7eb8ff;font-weight:600;">✓ ${e.name}</span>
                                  <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#7eb8ff;">${e.logged}× trained</span>
                              </div>`).join('')}
                      </div>`;
                  }



                  if (scheduledPlan.length > 0 || buyerAllocations.length > 0) {
                      html += `<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Today's full schedule</div>`;

                      buyerAllocations.forEach(b => {
                          html += `<div class="tcm-queue-item ${b.done ? 'trained-today' : 'current'}" style="border-color:rgba(245,158,11,${b.done?'0.1':'0.4'});">
                              <div style="flex:1;min-width:0;">
                                  <div class="q-name" style="color:${b.done?'#7eb8ff':'#f59e0b'};">${b.done?'✓ ':'▶ '}${b.name}
                                      <span class="tcm-badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);margin-left:4px;">CONTRACT</span>
                                  </div>
                                  <div class="q-meta">Reserved ${b.reserved} trains/day</div>
                              </div>
                              <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                  <span style="font-family:'JetBrains Mono',monospace;font-size:13px;min-width:40px;text-align:center;color:${b.done?'#7eb8ff':'#f59e0b'};font-weight:700;">${b.todayCount}/${b.reserved}</span>
                                  ${!b.done ? `<button class="tcm-mark-btn" data-id="${b.empId}" data-name="${b.name}" style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;margin-right:3px;">✓</button>` : ''}
                              </div>
                          </div>`;
                      });
                      scheduledPlan.forEach((e) => {
                          const fromAPI = apiTrainedIds.has(e.empId);
                          const _eJoinDate = rot.joinDates?.[e.empId];
                          const _eJoinedDays = _eJoinDate ? Math.floor((Date.now() - new Date(_eJoinDate + 'T00:00:00Z').getTime()) / 86400000) : null;
                          const _eIsNew = _eJoinedDays !== null && _eJoinedDays <= 30;
                          const _eNewBadge = _eIsNew ? `<span class="tcm-badge" style="background:rgba(167,139,250,0.15);color:#a78bfa;border:1px solid rgba(167,139,250,0.3);margin-left:4px;" title="Joined rotation ${_eJoinedDays}d ago — debt is pro-rated from join date, not company start">NEW ${_eJoinedDays}d</span>` : '';
                          html += `<div class="tcm-queue-item ${e.done ? 'trained-today' : e.isNext ? 'current' : ''}">
                              <div style="flex:1;min-width:0;">
                                  <div class="q-name">${e.isNext && !e.done ? '▶ ' : ''}${e.name}
                                      ${_eNewBadge}
                                      ${fromAPI ? '<span class="tcm-badge green" style="margin-left:4px;">✓ API</span>' : ''}
                                      ${!fromAPI && e.done ? '<span class="tcm-badge green" style="margin-left:4px;">✓</span>' : ''}
                                  </div>
                                  <div class="q-meta">${e.totalEff} EE</div>
                              </div>
                              <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                  <span style="font-family:'JetBrains Mono',monospace;font-size:13px;min-width:40px;text-align:center;color:${e.done?'#7eb8ff':'#f3f4f6'};font-weight:700;">${e.logged}/${e.planned}</span>
                                  ${!e.done ? `<button class="tcm-mark-btn" data-id="${e.empId}" data-name="${e.name}" style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;margin-right:3px;">✓</button>` : ''}
                                  <button class="tcm-exclude-btn" data-id="${e.empId}" title="Exclude" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;">✕</button>
                              </div>
                          </div>`;
                      });
                  }


                  const unscheduled = activePlan.filter(e => !e.scheduled);
                  if (unscheduled.length > 0) {
                      html += `<div style="font-size:11px;color:#888;margin:10px 0 6px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Not scheduled today</div>`;
                      unscheduled.forEach(e => {
                          const _settleBadge = e.inSettling
                              ? `<span class="tcm-badge" style="background:rgba(167,139,250,0.15);color:#a78bfa;border:1px solid rgba(167,139,250,0.3);margin-left:4px;font-size:9px;">SETTLING</span>`
                              : '';
                          html += `<div class="tcm-queue-item" style="opacity:0.6;padding:5px 8px;">
                              <div style="flex:1;min-width:0;">
                                  <div class="q-name" style="font-size:13px;">${e.name}${_settleBadge}</div>
                                  <div class="q-meta">${e.totalEff} EE</div>
                              </div>
                              ${!e.done ? `<button class="tcm-mark-btn" data-id="${e.empId}" data-name="${e.name}" style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;margin-right:3px;">✓</button>` : ''}
                                  <button class="tcm-exclude-btn" data-id="${e.empId}" title="Exclude" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;">✕</button>
                          </div>`;
                      });
                  }




                  const excludedPlan = rot.excluded
                      .map(id => ({ empId: id, name: employees[id]?.name || id }))
                      .filter(e => employees[e.empId]);
                  if (excludedPlan.length) {
                      html += `<div style="font-size:11px;color:#888;margin:10px 0 6px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Excluded from rotation</div>`;
                      excludedPlan.forEach(e => {
                          html += `<div class="tcm-queue-item trained-today" style="opacity:0.5;padding:5px 8px;">
                              <span class="q-name" style="color:#888;text-decoration:line-through;flex:1;font-size:13px;">${e.name}</span>
                              <button class="tcm-include-btn" data-id="${e.empId}" style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:12px;">↩ include</button>
                          </div>`;
                      });
                  }


                  if (mode === 'rotational') {

const _rotForCounts = Storage.getRotation();
                  const _resetDates   = _rotForCounts.resetDates || {};
                  const counts = nonDirIds
                      .map(id => ({ id, name: employees[id]?.name || id, count: Storage.getEmpAllTimeCount(id, _resetDates[id] || _rotForCounts.startDate || null), wasReset: !!_resetDates[id] }))
                      .sort((a, b) => b.count - a.count);
                  const maxC = counts[0]?.count || 0;
                  const minC = counts[counts.length-1]?.count || 0;
                  const avgC = counts.length ? counts.reduce((s,e) => s + e.count, 0) / counts.length : 0;
                  const spread = maxC - minC;
                  const isBalanced = spread <= Math.max(1, Math.round(avgC * 0.05));
                  html += `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #2a2a2a;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                          <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Rotation fairness</span>
                          <span style="font-size:13px;font-weight:700;color:${isBalanced?'#7eb8ff':'#f59e0b'};">${isBalanced?'✓ Balanced':'Catching up...'}</span>
                      </div>
                      ${counts.map(e => {
                          const _diff = e.count - avgC;
                          const _thresh = Math.max(1, Math.round(avgC * 0.05));
                          const _col = _diff > _thresh ? '#7eb8ff' : _diff < -_thresh ? '#f59e0b' : '#7eb8ff';
                          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">
                              <span style="font-size:12px;color:#f3f4f6;">${e.name}${e.wasReset?` <span style="font-size:9px;color:#a78bfa;" title="Debt reset on ${_resetDates[e.id]}">⚖ reset</span>`:''}</span>
                              <span style="display:flex;align-items:center;gap:6px;">
                                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${_col};">${e.count}</span>
                                  <button class="tcm-reset-debt-btn" data-id="${e.id}" data-name="${e.name}" title="Reset this employee's rotation debt to balanced"
                                      style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;border-radius:3px;padding:1px 5px;cursor:pointer;font-size:10px;">⚖</button>
                              </span>
                          </div>`;
                      }).join('')}
                  </div>`;
                  }

                  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:6px;flex-wrap:wrap;">
                      <span style="font-size:12px;color:${allDone?'#7eb8ff':'#9ca3af'};">
                          ${allDone ? '✓ All trains detected for today' : `${totalLogged} / ${totalPlanned} detected · refreshes every 60s`}
                      </span>
                      <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
                          <a href="https://www.torn.com/companies.php?step=your&type=1#/tab=train&option=employees" target="_blank"
                              style="background:rgba(126,184,255,0.1);border:1px solid rgba(126,184,255,0.3);
                              color:#7eb8ff;border-radius:4px;padding:4px 8px;font-size:11px;font-weight:600;
                              text-decoration:none;text-transform:uppercase;letter-spacing:0.04em;">↗ Train in Torn</a>
                          <button class="tcm-btn" id="tcm-reset-rotation-btn" style="font-size:11px;padding:4px 8px;" title="Full reset — wipes debt history">↺ Full Reset</button>
                      </div>
                  </div>
                  `;
              }


              else if (trainView === 'week') {
                  html += `<div class="tcm-mode-toggle" style="margin-bottom:10px;">
                      <button type="button" class="${mode==='priority'?'active':''}" id="tcm-mode-priority">Priority (1-5★)</button>
                      <button type="button" class="${mode==='rotational'?'active':''}" id="tcm-mode-rotational">Rotational (6-10★)</button>
                      <button type="button" class="${mode==='contract_rotational'?'active':''}" id="tcm-mode-contract-rot" style="color:${mode==='contract_rotational'?'#f59e0b':''};">Contracts</button>
                  </div>`;


                      if (s.templateModeEnabled) {
                          const _DAYS_W = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                          const _todayDowNum = new Date().getDay();
                          const _mondayOffW = _todayDowNum === 0 ? -6 : -(_todayDowNum - 1);
                          const _mondayStrW = new Date(Date.now() + _mondayOffW * 86400000).toISOString().slice(0, 10);
                          const _empListW = nonDirIds.map(id => ({ id, name: employees[id]?.name || id }));
                          const _targetsW = Storage.getWeeklyTargets();
                          const _fixedIdsW = nonDirIds.filter(id => (_targetsW[id] || 0) > 0);
                          const _poolIdsW  = nonDirIds.filter(id => (_targetsW[id] || 0) === 0);

                          html += `<div class="tcm-notice" style="font-size:12px;border-color:rgba(126,184,255,0.4);background:rgba(126,184,255,0.05);">
                              <strong style="color:#7eb8ff;">✓ Manual Mode active</strong> — Mon\u2013Today shows actual trains given. Remaining days are a <strong>live projection</strong> only \u2014 the real plan recalculates fresh every day from each employee's weekly target and everyone's rotation debt, so these numbers shift as the week actually unfolds.
                          </div>`;

                          const _dayLabelsW = _DAYS_W.map((d, i) => {
                              const offset = _mondayOffW + i;
                              const dateStr = new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
                              return { d, dateStr, isToday: offset === 0, isPast: offset < 0, isFuture: offset > 0 };
                          });

                          const _logW = Storage.getTrainedLog();
                          const _actualByDay = {};
                          _dayLabelsW.forEach(({ dateStr, isFuture }) => {
                              if (isFuture) return;
                              _actualByDay[dateStr] = {};
                              nonDirIds.forEach(id => {
                                  const seen = new Set();
                                  _actualByDay[dateStr][id] = (_logW[id] || []).filter(e => {
                                      if (e.date !== dateStr || !e.ts) return false;
                                      const key = e._logId || e.ts;
                                      if (seen.has(key)) return false;
                                      seen.add(key);
                                      return true;
                                  }).length;
                              });
                          });

                          const _rotW = Storage.getRotation();
                          const _resetsW = _rotW.resetDates || {};
                          const _simAllTime = {};
                          nonDirIds.forEach(id => { _simAllTime[id] = Storage.getEmpAllTimeCount(id, _resetsW[id] || _rotW.startDate || null); });
                          const _simThisWeek = {};
                          nonDirIds.forEach(id => { _simThisWeek[id] = Storage.getEmpAllTimeCount(id, _mondayStrW); });

                          const _resultW = {};
                          _dayLabelsW.forEach(({ dateStr, isFuture }, di) => {
                              if (!isFuture) { _resultW[dateStr] = { ..._actualByDay[dateStr] }; return; }
                              const _dayPlanned = {};
                              nonDirIds.forEach(id => { _dayPlanned[id] = 0; });
                              let _remW = totalTrainBudget;
                              const _owedW = {};
                              _fixedIdsW.forEach(id => {
                                  const _expected = Math.floor((_targetsW[id] / 7) * (di + 1));
                                  _owedW[id] = Math.max(0, _expected - _simThisWeek[id]);
                              });
                              while (_remW > 0 && _fixedIdsW.some(id => _owedW[id] > 0)) {
                                  const next = _fixedIdsW.filter(id => _owedW[id] > 0).sort((a, b) => _owedW[b] - _owedW[a])[0];
                                  if (!next) break;
                                  _dayPlanned[next]++; _owedW[next]--; _remW--;
                                  _simThisWeek[next]++; _simAllTime[next]++;
                              }
                              if (_remW > 0 && _poolIdsW.length) {
                                  while (_remW > 0) {
                                      const next = [..._poolIdsW].sort((a, b) => _simAllTime[a] - _simAllTime[b])[0];
                                      if (!next) break;
                                      _dayPlanned[next] = (_dayPlanned[next] || 0) + 1;
                                      _simAllTime[next]++; _remW--;
                                  }
                              }
                              _resultW[dateStr] = _dayPlanned;
                          });

                      html += `<div style="overflow-x:auto;margin-bottom:16px;">
                      <table style="width:100%;border-collapse:collapse;font-size:12px;">
                      <thead><tr>
                          <th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;min-width:90px;">Employee</th>
                          ${_dayLabelsW.map(({ d, dateStr, isToday, isFuture }) => {
                              const dateNum = new Date(dateStr).toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
                              return `<th style="text-align:center;padding:5px 4px;min-width:42px;color:${isToday?'#7eb8ff':isFuture?'#7eb8ff':'#9ca3af'};font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid ${isToday?'#7eb8ff':'#2a2a2a'};">
                                  ${d}<br><span style="font-size:9px;font-weight:400;color:#4b5563;">${dateNum}${isFuture?' ~':''}</span>
                              </th>`;
                          }).join('')}
                          <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;min-width:34px;">/wk</th>
                      </tr></thead>
                      <tbody>
                      ${_empListW.map(emp => {
                          let wkActual = 0;
const cells = _dayLabelsW.map(({ dateStr, isFuture }) => {
                              const v = (_resultW[dateStr] && _resultW[dateStr][emp.id]) || 0;
                              if (!isFuture) wkActual += v;
                              const color = v > 0 ? (isFuture ? '#7eb8ff' : '#7eb8ff') : '#374151';
                              return `<td style="text-align:center;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:${color};">${v || '·'}</td>`;
                          }).join('');
                          const _targetW = _targetsW[emp.id] || 0;
                          return `<tr style="border-bottom:1px solid #111827;">
                              <td style="padding:6px 8px 6px 0;color:#ddd;font-weight:600;white-space:nowrap;font-size:12px;">${emp.name}</td>
                              ${cells}
                              <td style="text-align:center;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#888;">${wkActual}${_targetW ? `/${_targetW}` : ''}</td>
                          </tr>`;
                      }).join('')}
                      </tbody>
                      </table></div>
                      <div style="font-size:11px;color:#888;">Mon\u2013Today = actual trains given \u00B7 <span style="color:#7eb8ff;">~</span> future columns = live projection, recalculated every refresh \u00B7 Edit targets in <strong>Manual Schedule</strong> tab</div>`;
                  } else {

const rot2 = Storage.getRotation();
                  const _resetDatesSim = rot2.resetDates || {};
                  const simCounts = {};
                  for (const _wid of nonDirIds) {
                      simCounts[_wid] = Storage.getEmpAllTimeCount(_wid, _resetDatesSim[_wid] || rot2.startDate || null);
                  }

                  const _settlingDaysW = Storage.getSettings().settlingInDays ?? 3;
                  const _weekSimBuyerIds = new Set(Storage.getTrainSales()
                      .filter(c => c.active !== false)
                      .map(c => c.buyerEmpId));
                  const simActive = nonDirIds
.filter(id => !(rot2.excluded || []).includes(id) && !_weekSimBuyerIds.has(id) && (employees[id]?.days_in_company == null || employees[id].days_in_company >= (Storage.getSettings().settlingInDays ?? 3)))
                      .map(id => {
                          const _sjDate = (rot2.joinDates && rot2.joinDates[id]) || rot2.startDate || today;
                          const _sRawDays = Storage.daysSinceStart(_sjDate);
return {
    id,
    name:       employees[id]?.name || id,
    actual:     simCounts[id] || 0,
    inSettling: _sRawDays <= _settlingDaysW,
    totalEff:   employees[id]?.effectiveness?.total || employees[id]?.effectiveness?.working_stats || 0,
    _joinDays:  _sRawDays
};
                      })
                      .filter(e => !e.inSettling);
                  {
                      const _wkTenureDays   = simActive.reduce((s, e) => s + Math.max(1, e._joinDays), 0);
                      const _wkTenureTrains = simActive.reduce((s, e) => s + e.actual, 0);
                      const _wkAvgDailyRate = _wkTenureDays > 0 ? _wkTenureTrains / _wkTenureDays : 0;
                      simActive.forEach(e => { e.expected = _wkAvgDailyRate * Math.max(1, e._joinDays); });
                  }


                  const weekBuyerSales = Storage.getTrainSales().filter(c => c.active !== false && (c.dailyReservation || 0) > 0 && employees[c.buyerEmpId]);
                  const weekBuyerSimRemaining = {};
                  weekBuyerSales.forEach(c => {
                      const entries = (Storage.getTrainedLog()[c.buyerEmpId] || []).filter(e => e.date >= c.startDate);
                      weekBuyerSimRemaining[c.id] = Storage.isOpenEndedContract(c) ? 9999 : Math.max(0, (c.totalTrains || 0) - entries.length);
                  });
                  const weekBuyerDayAllocs = [];
                  for (let d = 0; d < 7; d++) {
                      const dayIso = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
                      const dayAllocs = {};
                      weekBuyerSales.forEach(c => {
                          const st = (c.startDate || '').slice(0, 10);
                          if (st && dayIso < st) return;
                          const left = weekBuyerSimRemaining[c.id] || 0;
                          if (!(left > 0)) return;
                          const trains = Math.min(c.dailyReservation || 0, left);
                          if (trains <= 0) return;
                          dayAllocs[c.buyerEmpId] = (dayAllocs[c.buyerEmpId] || 0) + trains;
                          if (left !== 9999) {
                              weekBuyerSimRemaining[c.id] = Math.max(0, left - trains);
                          }
                      });
                      weekBuyerDayAllocs.push(dayAllocs);
                  }

                  const simN = simActive.length;
                  const hasBuyers = weekBuyerSales.length > 0;
                  if (!simN && !hasBuyers) {
                      html += '<div class="tcm-notice">No active employees or contracts to simulate.</div>';
                  } else {

                      const weekRotationBudget = effectiveRotationBudget;


      const todayDow     = new Date().getDay();
      const mondayOffset = todayDow === 0 ? -6 : -(todayDow - 1);

                  const _mondayStr2 = new Date(Date.now() + mondayOffset * 86400000).toISOString().slice(0, 10);
                  const _simContrTotals = {};
                  const _simContrThisWeek = {};
                  const _simContrByDate = {};
                  for (const _cs2 of Storage.getTrainSales().filter(c => c.buyerEmpId)) {
                      const _csLog2 = Storage.getTrainedLog()[_cs2.buyerEmpId] || [];
                      const _cs2Seen = new Set();
                      for (const _e2 of _csLog2) {
                          if (!_e2.ts || !_e2.date) continue;
                          if (_e2.date < (_cs2.startDate || '')) continue;
                          if (rot2.startDate && _e2.date < rot2.startDate) continue;
                          if (_cs2Seen.has(_e2.ts)) continue;
                          _cs2Seen.add(_e2.ts);
                          const _cid = _cs2.buyerEmpId;
                          _simContrTotals[_cid] = (_simContrTotals[_cid] || 0) + 1;
                          if (_e2.date >= _mondayStr2) {
                              _simContrThisWeek[_cid] = (_simContrThisWeek[_cid] || 0) + 1;
                              if (!_simContrByDate[_cid]) _simContrByDate[_cid] = {};
                              _simContrByDate[_cid][_e2.date] = (_simContrByDate[_cid][_e2.date] || 0) + 1;
                          }
                      }
                  }

                  const simActualCopy = {};




                  simActive.forEach(e => {
                    simActualCopy[e.id] = simCounts[e.id] || 0;
                });
      const daySchedules = [];


  const priorityTierTrains = {};
  if (mode === 'priority') {
      simActive.forEach(e => {
          const emp = state.employees[e.id];
          if (!emp) { priorityTierTrains[e.id] = 999; return; }
          const wsEff = emp.effectiveness?.working_stats || 0;
          const totalEff = emp.effectiveness?.total || wsEff;
          const _pos = CompanyData.positions(state.typeName);
          const _res = _pos ? PosNorm.resolve(emp.position, _pos) : null;
          if (_res) {
              const _pd = _res.data;
              const _sk = { man: 'manual_labor', int: 'intelligence', end: 'endurance' };
              const _ti = Calc.trainsToNextTier(wsEff, emp[_sk[_pd.primary]]||0, _pd.priReq, emp[_sk[_pd.secondary]]||0, _pd.secReq, totalEff, _pd.priGain, _pd.secGain);
              priorityTierTrains[e.id] = _ti ? _ti.trains : 999;
          } else {
              const next = [50,100,150,200].find(t => t > totalEff);
              priorityTierTrains[e.id] = next ? Math.ceil((next - totalEff) / 37) : 999;
          }
      });
  }

  for (let d = mondayOffset; d <= mondayOffset + 6; d++) {
                          const dateStr = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
                          const isToday = d === 0;
                          const isPast  = d < 0;
                          const isFuture = d > 0;
                          const dayLabel = new Date(Date.now() + d * 86400000)
                              .toLocaleDateString('en-US', { weekday: 'short' });
                          const dateLabel = new Date(Date.now() + d * 86400000)
                              .toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                          const plannedMap2 = {};
                          simActive.forEach(e => { plannedMap2[e.id] = 0; });

                          if (mode === 'priority') {


      const sorted = [...simActive].sort((a, b) => {
          const getRemaining = id => {
                          const tierTrains = priorityTierTrains[id] || 999;
                          const givenThisWeek = (simActualCopy[id] || 0) - (simCounts[id] || 0);
                          const remaining = tierTrains - givenThisWeek;
                          return remaining <= 0 ? 999 : remaining;
                      };
          const ra = getRemaining(a.id), rb = getRemaining(b.id);
          if (ra !== rb) return ra - rb;
          return (priorityTierTrains[a.id] || 999) - (priorityTierTrains[b.id] || 999);
      });


const _wkUsedToday = isToday
          ? simActive.reduce((sum, e) => {
              const seen = new Set();
              const c = (Storage.getTrainedLog()[e.id] || []).filter(en => {
                  if (!en.ts || en.date !== dateStr) return false;
                  const key = en._logId || en.ts;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
              }).length;
              return sum + c;
          }, 0)
          : 0;
      const _wkRemaining = Math.max(0, weekRotationBudget - _wkUsedToday);
const _wkMaxPri = _wkRemaining > 0 ? (_wkRemaining < 5 ? 1 : 2) : 0;
    const _wkPriPpl = Math.min(_wkMaxPri, sorted.length);
    const _wkBase   = _wkPriPpl > 0 ? Math.floor(_wkRemaining / _wkPriPpl) : 0;
    const _wkExtra  = _wkPriPpl > 0 ? _wkRemaining % _wkPriPpl : 0;
    sorted.forEach((e, i) => { plannedMap2[e.id] = i < _wkPriPpl ? (_wkBase + (i < _wkExtra ? 1 : 0)) : 0; });
} else {
                          for (let t = 0; t < weekRotationBudget; t++) {
                              simActive.sort((a, b) => {
                                  const aEff = ((simActualCopy[a.id] || 0) + plannedMap2[a.id]) - (a.expected || 0);
                                  const bEff = ((simActualCopy[b.id] || 0) + plannedMap2[b.id]) - (b.expected || 0);
                                  if (aEff !== bEff) return aEff - bEff;
                                  return (a.totalEff || 0) - (b.totalEff || 0);
                              });
                              if (simActive.length > 0) plannedMap2[simActive[0].id] += 1;
                          }
                      }

                          const actualOnDay   = (isToday || isPast) ? Storage.getTrainedOnDate(dateStr).filter(t => t.ts) : [];
                          const trainedIdsSet = isFuture ? new Set() : new Set(actualOnDay.map(t => t.empId));


                          const actualCountOnDay = {};
                          for (const entry of actualOnDay) {
                              actualCountOnDay[entry.empId] = (actualCountOnDay[entry.empId] || 0) + 1;
                          }



                          simActive.forEach(e => {
                              if (!isPast && !isToday) {
                                  simActualCopy[e.id] += plannedMap2[e.id];
                              }
                          });

                          daySchedules.push({ dateStr, dayLabel, dateLabel, isToday, isPast, isFuture: !isPast && !isToday, plannedMap: { ...plannedMap2 }, trainedIds: trainedIdsSet, actualCounts: { ...actualCountOnDay } });
                      simActive.forEach(e => { plannedMap2[e.id] = 0; });
                      }


                      const _initCounts = simActive.map(e => e.actual);
                      const _initMax    = _initCounts.length ? Math.max(..._initCounts) : 0;
                      const _initMin    = _initCounts.length ? Math.min(..._initCounts) : 0;
                      const initSpread  = Math.max(0, _initMax - _initMin);
                      const initScore   = Math.max(0, Math.min(100, Math.round(100 - (initSpread * 2))));
                      const scoreColor  = initScore >= 80 ? '#7eb8ff' : initScore >= 50 ? '#f59e0b' : '#ef4444';

                      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                          <span style="font-size:12px;color:#9ca3af;">${weekRotationBudget} trains/day · ${simN} employees</span>
                          <span style="font-size:13px;font-weight:700;color:${scoreColor};">Fairness: ${initScore}%</span>
                      </div>`;

                      const sortedEmps = [...simActive].sort((a, b) => a.name.localeCompare(b.name));
                      const todayDowW = new Date().getDay();
                      const mondayOffW = todayDowW === 0 ? -6 : -(todayDowW - 1);
                      const dayLabelsW = Array.from({length:7}, (_,d) => ({
                          dayLabel: new Date(Date.now()+(mondayOffW+d)*86400000).toLocaleDateString('en-US',{weekday:'short'}),
                          dateLabel: new Date(Date.now()+(mondayOffW+d)*86400000).toLocaleDateString('en-US',{month:'numeric',day:'numeric'}),
                          isToday: (mondayOffW+d) === 0
                      }));

                      html += `<div style="overflow-x:auto;margin-bottom:16px;">
                          <table style="width:100%;border-collapse:collapse;font-size:12px;">
                              <thead><tr>
                                  <th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Employee</th>
                                  ${dayLabelsW.map(d => `
                                      <th style="text-align:center;padding:5px 4px;min-width:40px;
                                          color:${d.isToday ? '#7eb8ff' : '#9ca3af'};font-size:10px;font-weight:700;text-transform:uppercase;
                                          border-bottom:2px solid ${d.isToday ? '#7eb8ff' : '#2a2a2a'};white-space:nowrap;">
                                          ${d.dayLabel}<br><span style="font-size:9px;font-weight:400;color:#4b5563;">${d.dateLabel}</span>
                                      </th>`).join('')}
                              </tr></thead>
                              <tbody>
                                  ${weekBuyerSales.map(c => {
                                      const empName = employees[c.buyerEmpId]?.name || c.buyerName;
                                      return `<tr style="border-bottom:1px solid #111827;background:rgba(245,158,11,0.04);">
                                          <td style="padding:6px 8px 6px 0;color:#f59e0b;font-weight:700;white-space:nowrap;font-size:12px;">
                                              ${empName} <span style="font-size:9px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);border-radius:2px;padding:1px 4px;">CONTRACT</span>
                                          </td>
                                          ${weekBuyerDayAllocs.map(dayAlloc => {
                                              const count = dayAlloc[c.buyerEmpId] || 0;
                                              return `<td style="text-align:center;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:${count>0?'#f59e0b':'#374151'};">${count>0?'×'+count:''}</td>`;
                                          }).join('')}
                                      </tr>`;
                                  }).join('')}
                                  ${sortedEmps.map(emp => `
                                      <tr style="border-bottom:1px solid #111827;">
                                          <td style="padding:6px 8px 6px 0;color:#ddd;font-weight:600;white-space:nowrap;font-size:12px;">${emp.name}</td>
                                          ${daySchedules.map(d => {
                                              const count   = d.plannedMap[emp.id] || 0;
                                              const actual  = (d.isToday || d.isPast) ? (d.actualCounts?.[emp.id] || 0) : 0;
                                              const done    = (d.isToday || d.isPast) && actual > 0 && (count === 0 || actual >= count);
                                              const partial = (d.isToday || d.isPast) && actual > 0 && count > 0 && actual < count;
                                              const missed  = (d.isToday || d.isPast) && actual === 0 && count > 0;
                                             const _sjDateW = (rot2.joinDates && rot2.joinDates[emp.id]) || rot2.startDate || today;
                                              const _sRawW   = Storage.daysSinceStart(_sjDateW);
                                              const _settDW  = Storage.getSettings().settlingInDays ?? 3;
                                              const _inSettW = d.isPast && _sRawW <= _settDW && new Date(d.dateStr + 'T00:00:00Z') < new Date(_sjDateW + 'T00:00:00Z');
                                              const cell    = _inSettW ? '~' : done ? (actual > 1 ? `×${actual}` : '✓') : partial ? `${actual}/${count}` : missed ? `0/${count}` : count > 1 ? `×${count}` : count === 1 ? '×1' : '';
                              const color   = _inSettW ? '#4b5563' : done ? '#7eb8ff' : partial ? '#f59e0b' : missed ? '#ef4444' : count > 0 ? (d.isFuture ? '#9ca3af' : '#f3f4f6') : '#374151';
                              const bg      = _inSettW ? 'transparent' : done ? 'rgba(126,184,255,0.08)' : partial ? 'rgba(245,158,11,0.06)' : missed ? 'rgba(239,68,68,0.06)' : (count > 0 && d.isFuture ? 'rgba(96,165,250,0.05)' : 'transparent');
                                              return `<td style="text-align:center;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:${done||actual>0||count>0?'700':'400'};color:${color};background:${bg};">${cell}</td>`;
                                          }).join('')}
                                      </tr>`).join('')}
                              </tbody>
                          </table>
                      </div>`;


const _simAvg = simActive.length > 0
    ? simActive.reduce((s, e) => s + (simCounts[e.id] || 0), 0) / simActive.length
    : 0;
const debtView = simActive.map(e => ({
    name:   e.name,
    debt:   Number((_simAvg - (simCounts[e.id] || 0)).toFixed(2)),
    actual: simCounts[e.id] || 0
})).sort((a, b) => b.debt - a.debt);
                      const _maxSpread = debtView.length
                          ? Math.max(...debtView.map(e => Math.abs(e.debt)))
                          : 1;

                      html += `<div class="tcm-section-label">Training Balance</div>`;
                      html += `<div class="tcm-notice" style="font-size:11px;">
                          <span style="color:#f59e0b;">▲ Owed</span> = below average all-time trains, gets priority &nbsp;·&nbsp;
                          <span style="color:#7eb8ff;">✓ Balanced</span> = near average &nbsp;·&nbsp;
                          <span style="color:#7eb8ff;">▼ Ahead</span> = above average, steps back naturally.
                      </div>`;
                      debtView.forEach(e => {
                          const _debtThresh = Math.max(2, Math.round(_simAvg * 0.05));
                          const color  = e.debt > _debtThresh ? '#f59e0b' : e.debt <= -_debtThresh ? '#7eb8ff' : '#7eb8ff';
                          const label  = e.debt > _debtThresh ? 'owed' : e.debt <= -_debtThresh ? 'ahead' : '✓ balanced';
                          const bar    = _maxSpread > 0 ? Math.min(80, Math.round((Math.abs(e.debt) / _maxSpread) * 80)) : 0;
                          html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;padding:4px 0;">
                              <span style="font-size:13px;color:#f3f4f6;font-weight:600;min-width:100px;">${e.name}</span>
                              <div style="flex:1;height:6px;background:#2a2a2a;border-radius:3px;overflow:hidden;">
                                  <div style="width:${bar}%;height:100%;background:${color};border-radius:3px;"></div>
                              </div>
                              <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${color};min-width:48px;text-align:right;">
                                  ${e.debt >= 0 ? '+' : ''}${e.debt.toFixed(1)}
                              </span>
                              <span style="font-size:11px;color:${color};min-width:52px;text-align:right;font-weight:600;">${label}</span>
                              <span style="font-size:11px;color:#888;min-width:40px;text-align:right;">${e.actual} total</span>
                          </div>`;
                      });
                  }
                  }
              }

                   else if (trainView === 'history') {
                  const histEmpSel = s.historyEmpSel || '';
                  const _bdEmpOpts = Object.entries(employees || {})
                      .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                      .map(([id, e]) => `<option value="${id}">${e.name}</option>`).join('');
                  html += `<div style="background:#0a0e14;border:1px solid rgba(126,184,255,0.2);border-radius:6px;padding:10px 14px;margin-bottom:10px;">
                      <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Backdate a Train</div>
                      <div style="font-size:11px;color:#4b5563;margin-bottom:7px;">Manually log a train that was already done but not recorded. Does not trigger a real train — logging only.</div>
                      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                          <select id="tcm-backdate-emp" class="tcm-input" style="flex:1;min-width:120px;">
                              <option value="">— Employee —</option>
                              ${_bdEmpOpts}
                          </select>
                          <input type="date" id="tcm-backdate-date" class="tcm-input"
                              value="${new Date().toISOString().slice(0,10)}"
                              max="${new Date().toISOString().slice(0,10)}"
                              style="width:140px;" />
                          <input type="number" id="tcm-backdate-count" class="tcm-input"
                              value="1" min="1" max="10"
                              style="width:58px;text-align:center;" title="Number of trains to log on this date" />
                          <button class="tcm-btn green" id="tcm-backdate-submit" style="font-size:12px;padding:4px 12px;">+ Log Train</button>
                      </div>
                      <div id="tcm-backdate-feedback" style="font-size:11px;margin-top:5px;min-height:16px;"></div>
                  </div>`;
html += `<div class="tcm-filter-bar">
                      <button class="tcm-filter-btn ${filter==='today'?'active':''}" data-filter="today">Today</button>
                      <button class="tcm-filter-btn ${filter==='yesterday'?'active':''}" data-filter="yesterday">Yesterday</button>
                      <button class="tcm-filter-btn ${filter==='week'?'active':''}" data-filter="week">Last 7d</button>
                      <button class="tcm-filter-btn ${filter==='month'?'active':''}" data-filter="month">Last 30d</button>
                      <button class="tcm-filter-btn ${filter==='year'?'active':''}" data-filter="year">This Year</button>
                      <button class="tcm-filter-btn ${filter==='all'?'active':''}" data-filter="all">All Time</button>
                  </div>`;

                  const showFormer = s.historyShowFormer !== false;
                  html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 10px;background:#0a0e14;border:1px solid #2a2a2a;border-radius:5px;">
                      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ddd;">
                          <input type="checkbox" id="tcm-history-show-former" ${showFormer ? 'checked' : ''}
                              style="accent-color:#7eb8ff;width:14px;height:14px;" />
                          Include employees who have left the company
                      </label>
                  </div>`;

                  const now = new Date();
                  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
                  const week7 = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
                  const month30 = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
                  const yearStart = `${now.getFullYear()}-01-01`;

                  let sinceDate = null, exactDate = null;
                  if (filter === 'today')     exactDate = today;
                  else if (filter === 'yesterday') exactDate = yesterday;
                  else if (filter === 'week')  sinceDate = week7;
                  else if (filter === 'month') sinceDate = month30;
                  else if (filter === 'year')  sinceDate = yearStart;

let displayData = [];
                  if (exactDate) {
                      const trained = Storage.getTrainedOnDate(exactDate);
                      displayData = trained.map(t => ({
                          empId: t.empId,
                          name: t.name || (employees[t.empId]?.name) || t.empId,
                          isFormer: !employees[t.empId],
                          count: 1, lastTrained: exactDate
                      }));
                  } else {
                      const raw = Storage.getTrainSummary(sinceDate);
                      displayData = Object.entries(raw).map(([empId, d]) => ({
                          empId, name: employees[empId]?.name || d.name || empId,
                          isFormer: !employees[empId],
                          count: d.count, lastTrained: d.lastTrained
                      })).sort((a, b) => (b.lastTrained || '').localeCompare(a.lastTrained || ''));
                  }

                  if (!showFormer) displayData = displayData.filter(d => !d.isFormer);

                  const maxCount = displayData.reduce((m, d) => Math.max(m, d.count), 1);

                  if (!displayData.length) {
                      html += `<div class="tcm-notice">No training records for this period. Trains are auto-imported from the API on every refresh.</div>`;
                  } else {
const empOptions = [...displayData]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
.map(d => `<option value="${d.empId}" ${d.empId === histEmpSel ? 'selected' : ''}>${d.name}${d.isFormer ? ' — Former employee' : ''}</option>`)
      .join('');

  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap;">
      <span style="font-size:11px;color:#888;">${displayData.length} employee${displayData.length!==1?'s':''}</span>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <select id="tcm-export-emp-select" style="background:#0d1117;border:1px solid #2a2a2a;border-radius:4px;color:#ddd;padding:3px 6px;font-size:11px;">
              <option value="">All employees</option>
              ${empOptions}
          </select>
          <button class="tcm-btn" id="tcm-export-csv" style="font-size:11px;padding:3px 8px;">↓ Export Summary</button>
          <button class="tcm-btn green" id="tcm-export-daily-csv" style="font-size:11px;padding:3px 8px;">↓ Export Daily</button>
      </div>
  </div>`;

                  const _totalTrains = displayData.reduce((sum, d) => sum + d.count, 0);
                  const _filterLabels = { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 days', month: 'Last 30 days', year: 'This Year', all: 'All Time' };
                  html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:8px;background:#0a0e14;border:1px solid rgba(126,184,255,0.2);border-radius:5px;">
                      <span style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;">${_filterLabels[filter] || filter}</span>
                      <span style="font-size:11px;color:#4b5563;">·</span>
                      <span style="font-size:22px;font-weight:800;color:#7eb8ff;font-family:'JetBrains Mono',monospace;">${_totalTrains}</span>
                      <span style="font-size:12px;color:#9ca3af;">total train${_totalTrains !== 1 ? 's' : ''}</span>
                      <span style="font-size:11px;color:#4b5563;">·</span>
                      <span style="font-size:12px;color:#888;">${displayData.length} employee${displayData.length !== 1 ? 's' : ''}</span>
                  </div>`;

                  if (histEmpSel) {

                          const _hLog = Storage.getTrainedLog();
                          const _hEntries = (_hLog[histEmpSel] || []).filter(e => {
                              if (exactDate) return e.date === exactDate;
                              if (sinceDate) return e.date >= sinceDate;
                              return true;
                          });
                          const _hPerDay = {};
                          const _hSeenTs = new Set();
                          for (const e of _hEntries) {
                              if (e.ts) { if (_hSeenTs.has(e.ts)) continue; _hSeenTs.add(e.ts); }
                              _hPerDay[e.date] = (_hPerDay[e.date] || 0) + 1;
                          }
const _hDays = Object.entries(_hPerDay).sort(([a],[b]) => b.localeCompare(a));
                          const _hTotal = _hDays.reduce((s,[,c]) => s + c, 0);
                          const _hMatch = displayData.find(d => d.empId === histEmpSel);
                          const _hName = _hMatch?.name || employees[histEmpSel]?.name || (_hEntries.find(e => e.name)?.name) || histEmpSel;
                          const _hIsFormer = _hMatch ? _hMatch.isFormer : !employees[histEmpSel];
html += `<div style="font-size:13px;font-weight:700;color:#7eb8ff;margin-bottom:8px;padding:6px 10px;background:rgba(126,184,255,0.06);border:1px solid rgba(126,184,255,0.2);border-radius:4px;">
                              ${_hName}${_hIsFormer ? ' <span style="font-size:10px;color:#f59e0b;font-weight:700;">Former employee</span>' : ''} — ${_hTotal} trains in period</div>`;
                          if (!_hDays.length) {
                              html += `<div class="tcm-notice">No training records for this employee in the selected period.</div>`;
                          } else {
                              html += `<table class="tcm-train-log"><thead><tr>
                                  <th>Date</th><th style="text-align:center;">Trains</th>
                              </tr></thead><tbody>`;
                              _hDays.forEach(([date, count]) => {
                                  const cls2 = count >= 3 ? 'count-high' : count >= 2 ? 'count-mid' : 'count-low';
                                  html += `<tr><td>${date}</td><td style="text-align:center;"><span class="${cls2}">${count}</span></td></tr>`;
                              });
                              html += '</tbody></table>';
                          }
                      } else {
html += `<table class="tcm-train-log"><thead><tr>
                              <th>Employee</th><th>Trains</th><th>Last Trained</th>
                          </tr></thead><tbody>`;
                          displayData.forEach(d => {
                              const ratio = d.count / maxCount;
                              const cls = ratio >= 0.7 ? 'count-high' : ratio >= 0.3 ? 'count-mid' : 'count-low';
                              const formerTag = d.isFormer ? ' <span style="font-size:10px;color:#f59e0b;font-weight:700;">Former employee</span>' : '';
                              html += `<tr><td>${d.name}${formerTag}</td><td><span class="${cls}">${d.count}</span></td><td>${d.lastTrained||'—'}</td></tr>`;
                          });
                          html += '</tbody></table>';
                          const trainedIds = new Set(displayData.map(d => d.empId));
                          const untrained = nonDirIds.filter(id => !trainedIds.has(id)).map(id => employees[id]?.name || id);
                          if (untrained.length && filter !== 'today') {
                              html += `<div class="tcm-warn-box" style="margin-top:8px;">Not trained in period: <strong>${untrained.join(', ')}</strong></div>`;
                          }
                      }
                  }
              }


              if (trainView === 'calendar') {
                  const _calLog = Storage.getTrainedLog();
                  const _calNow = new Date();
                  const _calTodayStr = `${_calNow.getFullYear()}-${String(_calNow.getMonth()+1).padStart(2,'0')}-${String(_calNow.getDate()).padStart(2,'0')}`;
                  const _calSelDay = s.calendarSelectedDay || '';


                  const _calDow = _calNow.getDay() || 7;
                  const _calMonOff = 1 - _calDow;
                  const _calWkStart = new Date(_calNow);
                  _calWkStart.setDate(_calNow.getDate() + _calMonOff);
                  const _calWkStartStr = _calWkStart.toISOString().slice(0, 10);
                  const _calMonthStart = `${_calNow.getFullYear()}-${String(_calNow.getMonth()+1).padStart(2,'0')}-01`;

                  let _calWeekCount = 0, _calMonthCount = 0, _calTotalCount = 0;
                  const _calTrainsByDate = {};

                  for (const [empId, entries] of Object.entries(_calLog)) {
                      if (!employees[empId]) continue;
                      const _calSeenTs = new Set();
                      for (const e of entries) {
                          if (!e.ts) continue;
                          if (_calSeenTs.has(e.ts)) continue;
                          _calSeenTs.add(e.ts);
                          if (!_calTrainsByDate[e.date]) _calTrainsByDate[e.date] = [];
                          _calTrainsByDate[e.date].push({
                              empId,
                              name: e.name || employees[empId]?.name || empId,
                              ts: e.ts
                          });
                          _calTotalCount++;
                          if (e.date >= _calWkStartStr) _calWeekCount++;
                          if (e.date >= _calMonthStart) _calMonthCount++;
                      }
                  }


                  const _calSchedDates = {};
                  if (s.templateModeEnabled) {
                      const _calTargets = Storage.getWeeklyTargets();
                      const _calTotalFixed = Object.values(_calTargets).reduce((s2,v) => s2 + (v||0), 0);

                      const _calDailyEst = trainBudget;
                      if (_calDailyEst > 0) {
                          for (let _di = 1; _di <= 14; _di++) {
                              const _fd = new Date(_calNow);
                              _fd.setDate(_calNow.getDate() + _di);
                              _calSchedDates[_fd.toISOString().slice(0, 10)] = _calDailyEst;
                          }
                      }
                  }

                  const _calEmpCount = nonDirIds.length;


                  const _calAllLogDates = Object.values(_calLog)
                      .flatMap(entries => entries.filter(e => e.ts).map(e => e.date))
                      .filter(Boolean);
                  const _calOldestDate = _calAllLogDates.length
                      ? _calAllLogDates.reduce((min, d) => d < min ? d : min, _calTodayStr)
                      : _calTodayStr;
                  const _calMaxWeeksBack = Math.min(12, Math.max(1,
                      Math.ceil((new Date(_calTodayStr) - new Date(_calOldestDate)) / (7 * 86400000)) + 1
                  ));
                  const _calWeeksBack = Math.min(_calMaxWeeksBack, s.calendarWeeksBack || 5);
                  const _calDaysBack = _calWeeksBack * 7;
                  const _calWeekOpts = Array.from({length: _calMaxWeeksBack}, (_, i) => i + 1)
                      .map(w => `<option value="${w}" ${w === _calWeeksBack ? 'selected' : ''}>${w} week${w > 1 ? 's' : ''}</option>`)
                      .join('');
                  html += `
                  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;">
                      <div style="background:#111827;border:1px solid #2a2a2a;border-radius:5px;padding:8px;text-align:center;">
                          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">This Week</div>
                          <div style="font-size:20px;font-weight:800;color:#7eb8ff;font-family:'JetBrains Mono',monospace;">${_calWeekCount}</div>
                      </div>
                      <div style="background:#111827;border:1px solid #2a2a2a;border-radius:5px;padding:8px;text-align:center;">
                          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">This Month</div>
                          <div style="font-size:20px;font-weight:800;color:#7eb8ff;font-family:'JetBrains Mono',monospace;">${_calMonthCount}</div>
                      </div>
                      <div style="background:#111827;border:1px solid #2a2a2a;border-radius:5px;padding:8px;text-align:center;">
                          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">All Time</div>
                          <div style="font-size:20px;font-weight:800;color:#f3f4f6;font-family:'JetBrains Mono',monospace;">${_calTotalCount}</div>
                      </div>
                      <div style="background:#111827;border:1px solid #2a2a2a;border-radius:5px;padding:8px;text-align:center;">
                          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Employees</div>
                          <div style="font-size:20px;font-weight:800;color:#f3f4f6;font-family:'JetBrains Mono',monospace;">${_calEmpCount}</div>
                      </div>
                  </div>`;
                  html += `
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                      <div style="display:flex;align-items:center;gap:8px;">
                          <span style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;">LAST ${_calWeeksBack} WEEK${_calWeeksBack > 1 ? 'S' : ''} · NEXT 2 WEEKS</span>
                          <select id="tcm-cal-weeks" style="background:#0d1117;color:#ddd;border:1px solid #374151;border-radius:3px;padding:2px 5px;font-size:10px;">${_calWeekOpts}</select>
                      </div>
                      <div style="display:flex;gap:10px;font-size:10px;color:#9ca3af;">
                          <span><span style="display:inline-block;width:10px;height:10px;background:#7eb8ff;border-radius:2px;margin-right:3px;vertical-align:middle;"></span>LOGGED</span>
                          <span><span style="display:inline-block;width:10px;height:10px;border:1px solid #7eb8ff;border-radius:2px;margin-right:3px;vertical-align:middle;"></span>SCHEDULED</span>
                      </div>
                  </div>`;


                  const _CAL_HEADERS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
                  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:10px;">`;
                  for (const _wh of _CAL_HEADERS) {
                      html += `<div style="text-align:center;padding:3px 1px;font-size:9px;font-weight:700;color:#888;text-transform:uppercase;">${_wh}</div>`;
                  }


                  const _calStart = new Date(_calNow);
                  _calStart.setDate(_calNow.getDate() - _calDaysBack);
                  _calStart.setDate(_calStart.getDate() - _calStart.getDay());


                  const _calEnd = new Date(_calNow);
                  _calEnd.setDate(_calNow.getDate() + 14);
                  _calEnd.setDate(_calEnd.getDate() + (6 - _calEnd.getDay()));
                  let _calCur = new Date(_calStart);
                  while (_calCur <= _calEnd) {
                      const _dStr = `${_calCur.getFullYear()}-${String(_calCur.getMonth()+1).padStart(2,'0')}-${String(_calCur.getDate()).padStart(2,'0')}`;
                      const _isToday = _dStr === _calTodayStr;
                      const _isFuture = _dStr > _calTodayStr;
                      const _trains = _calTrainsByDate[_dStr] || [];
                      const _count = _trains.length;
                      const _sched = _calSchedDates[_dStr] || 0;
                      const _isSel = _dStr === _calSelDay;

                      let _cellBg = 'transparent';
                      let _cellBorder = '1px solid transparent';
                      let _dayColor = '#374151';
                      let _countColor = '#7eb8ff';

                      if (_count > 0) {
                          _cellBg = 'rgba(126,184,255,0.18)';
                          _cellBorder = '1px solid rgba(126,184,255,0.5)';
                          _dayColor = '#7eb8ff';
                      } else if (_sched > 0 && _isFuture) {
                          _cellBorder = '1px solid rgba(96,165,250,0.55)';
                          _dayColor = '#7eb8ff';
                          _countColor = '#7eb8ff';
                      }
                      if (_isToday) {
                          _cellBorder = '2px solid #7eb8ff';
                          _dayColor = '#7eb8ff';
                      }
                      if (_isSel) {
                          _cellBg = 'rgba(126,184,255,0.25)';
                          _cellBorder = '2px solid #7eb8ff';
                      }

                      const _dayNum = _calCur.getDate();
                      html += `<div class="tcm-cal-day" data-date="${_dStr}"
                          style="cursor:pointer;text-align:center;padding:4px 1px;border-radius:4px;
                          background:${_cellBg};border:${_cellBorder};min-height:36px;
                          display:flex;flex-direction:column;align-items:center;justify-content:center;
                          transition:background 0.1s;">
                          <div style="font-size:10px;color:${_dayColor};font-weight:${_isToday?'800':'400'};">${_dayNum}</div>
                          ${_count > 0
                              ? `<div style="font-size:12px;font-weight:800;color:${_countColor};font-family:'JetBrains Mono',monospace;line-height:1;">${_count}</div>`
                              : _sched > 0 && _isFuture
                              ? `<div style="font-size:10px;color:#7eb8ff;font-family:'JetBrains Mono',monospace;line-height:1;">×${_sched}</div>`
                              : ''}
                      </div>`;

                      _calCur.setDate(_calCur.getDate() + 1);
                  }
                  html += `</div>`;


                  if (_calSelDay) {
                      const _selTrains = _calTrainsByDate[_calSelDay] || [];
                      const _selSched  = _calSchedDates[_calSelDay] || 0;
                      const _selDateObj = new Date(_calSelDay + 'T00:00:00Z');
                      const _selLabel = _selDateObj.toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
                      });
                      const _isFutureSel = _calSelDay > _calTodayStr;

                      const _calEmpOpts = nonDirIds
                          .map(id => `<option value="${id}">${employees[id]?.name || id}</option>`)
                          .join('');

                      html += `<div style="background:#111827;border:1px solid #2a2a2a;border-radius:6px;padding:12px;margin-bottom:10px;">
                          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                              <strong style="color:#7eb8ff;font-size:13px;">${_selLabel}</strong>
                              <button id="tcm-cal-close" class="tcm-btn" style="font-size:11px;padding:2px 8px;">✕</button>
                          </div>`;

if (!_isFutureSel) {
                          if (_selTrains.length > 0) {

                              const _empGrp = {};
                              _selTrains.forEach(t => {
                                  if (!_empGrp[t.empId]) _empGrp[t.empId] = { name: t.name || employees[t.empId]?.name || t.empId, cnt: 0 };
                                  _empGrp[t.empId].cnt++;
                              });
                              html += `<div style="font-size:11px;color:#9ca3af;margin-bottom:6px;">${_selTrains.length} train${_selTrains.length !== 1 ? 's' : ''} logged</div>`;
                              Object.entries(_empGrp).forEach(([eid, g]) => {
                                  html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #2a2a2a;">
                                      <span style="font-size:13px;color:#ddd;font-weight:600;">✓ ${g.name}</span>
                                      <span style="display:flex;align-items:center;gap:6px;">
                                          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#7eb8ff;font-weight:700;">×${g.cnt}</span>
<button class="tcm-cal-remove-train" data-empid="${eid}" data-date="${_calSelDay}" data-count="${g.cnt}"
                                              style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:3px;padding:1px 7px;cursor:pointer;font-size:11px;">✕ Remove</button>
                                      </span>
                                  </div>`;
                              });
                          } else {
                              html += `<div style="font-size:12px;color:#888;margin-bottom:6px;">No trains logged on this day.</div>`;
                          }


                          html += `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #2a2a2a;">
                              <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">+ Add Entry</div>
                              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                                  <select id="tcm-cal-add-emp" class="tcm-input" style="flex:1;min-width:120px;font-size:12px;">
                                      <option value="">— Employee —</option>
                                      ${_calEmpOpts}
                                  </select>
                                  <input type="number" id="tcm-cal-add-count" value="1" min="1" max="10"
                                      class="tcm-input" style="width:52px;font-size:12px;text-align:center;" title="Number of trains" />
                                  <button id="tcm-cal-add-btn" class="tcm-btn green" style="font-size:11px;padding:4px 10px;">+ Add</button>
                              </div>
                              <div id="tcm-cal-add-feedback" style="font-size:11px;margin-top:4px;min-height:14px;"></div>
                          </div>`;
                      } else {

                          if (_selSched > 0) {
                              html += `<div style="font-size:12px;color:#7eb8ff;">📅 ${_selSched} train${_selSched !== 1 ? 's' : ''} scheduled (from Manual Schedule template)</div>`;
                          } else {
                              html += `<div style="font-size:12px;color:#888;">No trains scheduled. Set up a schedule in Manual Schedule tab.</div>`;
                          }
                      }
                      html += `</div>`;
                  }


                  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                      <span style="font-size:11px;color:#888;">Click any day to view or add entries.</span>
                      <button id="tcm-cal-clear-all" class="tcm-btn red" style="font-size:11px;padding:3px 8px;">Clear All Logs</button>
                  </div>`;
              }

              if (trainView === 'schedule') {
                  const _targetsS    = Storage.getWeeklyTargets();
                  const _rotS        = Storage.getRotation();
                  const _exclS       = new Set(_rotS.excluded || []);
                  const empList      = nonDirIds.map(id => ({ id, name: employees[id]?.name || id }));
                  const weeklyBudget = totalTrainBudget * 7;
  const _stackedExtra = Math.max(0, effectiveTodayBudget - trainBudget);
  const _weeklyBudget = totalTrainBudget * 7 + _stackedExtra;

                  const _fixedListS = empList.filter(e => (_targetsS[e.id] || 0) > 0);
                  const _poolListS  = empList.filter(e => (_targetsS[e.id] || 0) === 0 && !_exclS.has(e.id));
                  const totalAllocated = _fixedListS.reduce((s, e) => s + (_targetsS[e.id] || 0), 0);
                  const overBudget = totalAllocated > weeklyBudget;


                  const _dpS = Storage.computeTodayPlan(employees, state.directorId, effectiveRotationBudget);

                  html += `
                  <div class="tcm-notice" style="font-size:11px;">
                      Set each employee's <strong>weekly trains target</strong>, or leave at <strong>0</strong> to place them in the <span style="color:#f59e0b;">auto-rotating pool</span>.
                      <strong>No grid to manage</strong> — the script recalculates each day's real plan live from these targets plus everyone's rotation debt.
                      Fixed employees are paced evenly (~${totalTrainBudget}/7 per day); pool employees fill the remaining slots by debt order, lowest trains-ever goes first.
                      Budget: <strong>${_weeklyBudget}</strong> trains/week (${totalTrainBudget}/day × 7${_stackedExtra > 0 ? ` + <span style="color:#f59e0b;">${_stackedExtra} stacked</span>` : ''}).
                  </div>`;

                  if (_poolListS.length > 0) {
                      const _resetsS = _rotS.resetDates || {};
                      const _poolSorted = [..._poolListS].sort((a, b) =>
                          Storage.getEmpAllTimeCount(a.id, _resetsS[a.id] || null) - Storage.getEmpAllTimeCount(b.id, _resetsS[b.id] || null)
                      );
                      html += `<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25);border-radius:5px;padding:7px 12px;margin-bottom:8px;">
                          <span style="color:#f59e0b;font-weight:700;">↻ Rotating pool (${_poolListS.length}):</span>
                          <span style="color:#9ca3af;"> ${_poolListS.map(e=>e.name).join(', ')}</span>
                          <span style="color:#7eb8ff;"> · Next up (by debt): ${_poolSorted.slice(0,4).map(e=>e.name).join(' → ')}${_poolListS.length > 4 ? '…' : ''}</span>
                      </div>`;
                  }

                  html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:8px 12px;background:#111827;border:1px solid #2a2a2a;border-radius:4px;flex-wrap:wrap;">
                      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                          <input type="checkbox" id="tcm-tmpl-enabled" ${s.templateModeEnabled?'checked':''}
                              style="accent-color:#7eb8ff;width:14px;height:14px;" />
                          <span style="font-size:13px;font-weight:700;color:${s.templateModeEnabled?'#7eb8ff':'#9ca3af'};">
                              Manual Mode ${s.templateModeEnabled?'ON':'OFF'}
                          </span>
                      </label>
                  </div>`;

                  html += `<div style="background:#0a0e14;border:1px solid #2a2a2a;border-radius:6px;padding:10px 14px;margin-bottom:12px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
                          <span style="font-size:12px;font-weight:700;color:#9ca3af;">Weekly Budget</span>
                          <span id="tcm-weekly-total-display" style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:800;color:${overBudget?'#ef4444':totalAllocated===weeklyBudget?'#7eb8ff':'#f59e0b'};">${totalAllocated} / ${weeklyBudget}</span>
                      </div>
                      <div style="height:6px;background:#2a2a2a;border-radius:3px;overflow:hidden;">
                          <div id="tcm-weekly-bar" style="height:100%;width:${Math.min(100,Math.round((totalAllocated/Math.max(1,weeklyBudget))*100))}%;background:${overBudget?'#ef4444':totalAllocated===weeklyBudget?'#7eb8ff':'#f59e0b'};border-radius:3px;transition:width 0.2s;"></div>
                      </div>
                      <div style="font-size:11px;color:#888;margin-top:4px;">${weeklyBudget-totalAllocated} remaining for pool rotation · ${totalTrainBudget}/day × 7 = ${weeklyBudget} total</div>
                  </div>`;

                  html += `<div id="tcm-weekly-emp-list" style="margin-bottom:10px;">`;
                  empList.forEach(emp => {
                      const weekly = _targetsS[emp.id] || 0;
                      const pct = weeklyBudget > 0 ? Math.min(100, Math.round((weekly / weeklyBudget) * 100)) : 0;
                      const perDay = weekly > 0 ? (weekly / 7).toFixed(1) : '0.0';
                      const todayPlan = _dpS.planned[emp.id] || 0;
                      const todayLabel = todayPlan > 0
                          ? `<span style="font-size:10px;color:${_dpS.fixedIds.includes(emp.id)?'#7eb8ff':'#f59e0b'};margin-left:4px;">▸ ${todayPlan} today</span>`
                          : '';
                      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;flex-wrap:wrap;">
                          <span style="min-width:100px;max-width:120px;font-size:12px;font-weight:600;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${emp.name}">${emp.name}</span>
                          <input type="number" min="0" max="${weeklyBudget}" value="${weekly}"
                              class="tcm-weekly-input" data-empid="${emp.id}"
                              style="width:58px;background:#0d1117;border:1px solid #2a2a2a;border-radius:3px;color:#ddd;padding:4px 6px;font-size:13px;text-align:center;font-family:'JetBrains Mono',monospace;outline:none;" />
                          <span style="font-size:11px;color:#888;min-width:58px;">${perDay}/day avg${todayLabel}</span>
                          <div style="flex:1;height:5px;background:#2a2a2a;border-radius:3px;min-width:40px;overflow:hidden;">
                              <div style="width:${pct}%;height:100%;background:#7eb8ff;border-radius:3px;"></div>
                          </div>
                      </div>`;
                  });
                  html += `</div>`;

                  html += `${(() => {
                      const _DAYS_P = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                      const _dppData = Storage.getDayPriorityPlan();
                      const _dppOpen = Storage.get('dpp_panel_open', false);
                      const _planRowsHtml = _DAYS_P.map(d => {
                          const _entries = _dppData[d] || [];
                          const _usedDay = _entries.reduce((s, e) => s + (e.trains || 0), 0);
                          const _remDay  = totalTrainBudget - _usedDay;
                          const _overDay = _usedDay > totalTrainBudget;
                          const _entryHtml = _entries.map((e, idx) =>
                              `<div style="display:flex;gap:5px;align-items:center;margin-bottom:4px;flex-wrap:wrap;">
                                  <select class="tcm-dpp-emp" data-day="${d}" data-idx="${idx}"
                                      style="background:#0d1117;border:1px solid #374151;color:#ddd;border-radius:3px;padding:3px 5px;font-size:11px;flex:1;min-width:90px;">
                                      ${empList.map(em => `<option value="${em.id}" ${em.id === e.empId ? 'selected' : ''}>${em.name}</option>`).join('')}
                                  </select>
                                  <input type="number" class="tcm-dpp-trains" data-day="${d}" data-idx="${idx}"
                                      value="${e.trains || 1}" min="1" max="${totalTrainBudget}"
                                      style="width:42px;background:#0d1117;border:1px solid #374151;color:#ddd;border-radius:3px;padding:3px 4px;font-size:12px;text-align:center;font-family:'JetBrains Mono',monospace;"/>
                                  <span style="font-size:10px;color:#888;">trains</span>
                                  <button class="tcm-dpp-remove" data-day="${d}" data-idx="${idx}"
                                      style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:11px;">✕</button>
                              </div>`
                          ).join('');
                          return `<tr style="border-bottom:1px solid #111827;">
                              <td style="padding:6px 10px 6px 0;color:#9ca3af;font-weight:700;font-size:12px;white-space:nowrap;vertical-align:top;">${d}</td>
                              <td style="padding:6px 4px;vertical-align:top;">
                                  ${_entryHtml}
                                  <button class="tcm-dpp-add" data-day="${d}"
                                      style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:2px 9px;cursor:pointer;font-size:11px;font-weight:700;">+ Priority</button>
                              </td>
                              <td style="padding:6px 4px;text-align:right;vertical-align:top;white-space:nowrap;font-family:'JetBrains Mono',monospace;">
                                  ${_usedDay > 0
                                      ? `<span style="font-size:12px;font-weight:700;color:${_overDay ? '#ef4444' : _remDay === 0 ? '#7eb8ff' : '#9ca3af'};">${_overDay ? '⚠ ' : ''}${_remDay} left</span>`
                                      : `<span style="font-size:11px;color:#4b5563;">rotating</span>`}
                              </td>
                          </tr>`;
                      }).join('');
                      return `<div style="margin-bottom:10px;background:#0d1117;border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;">
                          <div id="tcm-dpp-toggle-header" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;user-select:none;">
                              <span style="font-size:11px;font-weight:700;color:#7eb8ff;text-transform:uppercase;letter-spacing:0.06em;">⚙ Per-Day Priority Planner</span>
                              <span style="font-size:10px;color:#4b5563;">(optional — overrides rotating queue for specific days)</span>
                              <span id="tcm-dpp-chevron" style="color:#888;margin-left:auto;font-size:14px;">${_dppOpen ? '▲' : '▼'}</span>
                          </div>
                          <div id="tcm-dpp-panel" style="display:${_dppOpen ? 'block' : 'none'};padding:0 12px 10px;">
                              <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;padding:5px 8px;background:#111827;border-radius:3px;">
                                  Priority employees are placed first on their configured day. All remaining daily slots go to the rotating queue.
                                  Leave a day empty to use the rotating queue for its full budget.
                              </div>
                              <div style="overflow-x:auto;">
                              <table style="width:100%;border-collapse:collapse;">
                              <thead><tr>
                                  <th style="text-align:left;padding:5px 10px 5px 0;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #2a2a2a;">Day</th>
                                  <th style="padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #2a2a2a;">Priority Employees</th>
                                  <th style="text-align:right;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #2a2a2a;white-space:nowrap;">Remaining</th>
                              </tr></thead>
                              <tbody>${_planRowsHtml}</tbody>
                              </table></div>
                              <button class="tcm-btn red" id="tcm-dpp-clear" style="margin-top:8px;font-size:11px;padding:3px 10px;">✕ Clear All Day Priorities</button>
                          </div>
                      </div>`;
                  })()}
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                      <button class="tcm-btn green" id="tcm-weekly-apply">💾 Save Targets</button>
                      <button class="tcm-btn amber" id="tcm-weekly-even">⚖ Distribute Evenly</button>
                      <button class="tcm-btn" id="tcm-weekly-preview-next">👁 Preview Today's Plan</button>
                      <button class="tcm-btn" id="tcm-weekly-reset-queue">↺ Reset Rotation</button>
                      <button class="tcm-btn red" id="tcm-weekly-clear">Clear All</button>
                  </div>
                  <div id="tcm-weekly-preview" style="margin-top:12px;"></div>
                  <div style="font-size:11px;color:#888;">Budget: ${effectiveTodayBudget > totalTrainBudget ? `<span style="color:#f59e0b;">${effectiveTodayBudget} today</span> / ` : ''}${totalTrainBudget}/day base · ${_weeklyBudget}/week total · ${N} employees</div>
                  ${(() => {
                      const _logAll = Storage.getManualScheduleLog();
                      const _logDates = Object.keys(_logAll).sort((a,b) => b.localeCompare(a));
                      if (!_logDates.length) return '';
                      const _trainedLogForCheck = Storage.getTrainedLog();
                      const _actualOnDate = (id, dateStr) => {
                          const seen = new Set();
                          return (_trainedLogForCheck[id] || []).filter(e => {
                              if (e.date !== dateStr || !e.ts) return false;
                              const key = e._logId || e.ts;
                              if (seen.has(key)) return false;
                              seen.add(key);
                              return true;
                          }).length;
                      };
                      const _rows = _logDates.slice(0, 60).map(dateStr => {
                          const dayPlan = _logAll[dateStr] || {};
                          const totalPlanned = Object.values(dayPlan).reduce((s,v)=>s+(v||0),0);
                          if (totalPlanned === 0) return null;
                          const cells = Object.entries(dayPlan)
                              .filter(([,v]) => v > 0)
                              .map(([id, planned]) => {
                                  const empName = employees[id]?.name || id;
                                  const actualOnDay = _actualOnDate(id, dateStr);
                                  const met = actualOnDay >= planned;
                                  const partial = actualOnDay > 0 && actualOnDay < planned;
                                  const color = met ? '#7eb8ff' : partial ? '#f59e0b' : (dateStr < today ? '#ef4444' : '#9ca3af');
                                  return `<span style="display:inline-block;margin:1px 4px 1px 0;font-size:11px;color:${color};">${empName}: ${actualOnDay}/${planned}</span>`;
                              }).join('');
                          return `<tr style="border-bottom:1px solid #111827;">
                              <td style="padding:5px 8px 5px 0;color:${dateStr===today?'#7eb8ff':'#ddd'};font-weight:${dateStr===today?'700':'600'};white-space:nowrap;vertical-align:top;">${dateStr}${dateStr===today?' ◀ today':''}</td>
                              <td style="padding:5px 4px;">${cells}</td>
                          </tr>`;
                      }).filter(Boolean).join('');
                      if (!_rows) return '';
                      return `<div class="tcm-section-label" style="margin-top:14px;">📅 Generated Schedule Log (${Math.min(60,_logDates.length)} days)</div>
                      <div class="tcm-notice" style="font-size:11px;">This is the permanent dated record — every day is locked the moment it's actually generated, so this is the real history to verify against, not a guess. <span style="color:#7eb8ff;">Green</span> = met · <span style="color:#f59e0b;">Amber</span> = partial · <span style="color:#ef4444;">Red</span> = missed.</div>
                      <div style="max-height:260px;overflow-y:auto;border:1px solid #2a2a2a;border-radius:4px;">
                      <table style="width:100%;border-collapse:collapse;font-size:12px;">
                      <tbody>${_rows}</tbody>
                      </table>
                      </div>`;
                  })()}
              `;
              }

              return html;
          },

          _attachRotationHandlers(state) {
              const s = Storage.getSettings();
              const today = new Date().toISOString().slice(0, 10);


      if (s.templateModeEnabled && (s.trainView || 'today') === 'schedule') {
          const _aaDow = new Date().getDay();
          const _aaMonOff = _aaDow === 0 ? -6 : -(_aaDow - 1);
          const _aaThisMonday = new Date(Date.now() + _aaMonOff * 86400000).toISOString().slice(0, 10);
          const _aaLastMonday = Storage.get('weekly_schedule_monday', '');
          const _aaHasTargets = Object.values(Storage.getWeeklyTargets()).some(v => (v || 0) > 0);
          if (_aaLastMonday && _aaLastMonday !== _aaThisMonday && _aaHasTargets) {
              setTimeout(() => {
                  const _aaBtn = document.getElementById('tcm-weekly-apply');
                  if (_aaBtn && !_aaBtn.disabled) _aaBtn.click();
              }, 400);
          }
      }


      const { employees, typeName, directorId } = state;
              const stars = state.profile?.rating || 0;
              const positions = CompanyData.positions(typeName);
              let trainerBonus = 0;
              for (const emp of Object.values(employees || {})) {
                  const res = PosNorm.resolve(emp.position, positions);
                  if (res?.data?.special === 'trainer') {
                      const eff = emp.effectiveness?.working_stats || 0;
                      if (eff >= TCM.EE_TIER_4) trainerBonus += 3;
                      else if (eff >= TCM.EE_TIER_3) trainerBonus += 2;
                      else if (eff >= TCM.EE_TIER_2) trainerBonus += 1;
                  }
              }
              const trainBudget = Math.min(20, stars) + trainerBonus;
  const _apiTrainsAvail = state.detailed?.trains_available ?? null;
  const effectiveTodayBudget = (_apiTrainsAvail !== null && _apiTrainsAvail > trainBudget)
      ? _apiTrainsAvail : trainBudget;
  const _stackedExtra = Math.max(0, effectiveTodayBudget - trainBudget);
const _weeklyBudget = trainBudget * 7 + _stackedExtra;
  const _handlerExcl = new Set(Storage.getRotation().excluded || []);
  const nonDirIds = Object.keys(employees || {}).filter(id =>
      employees[id].position !== 'Director'
      && String(id) !== String(directorId || '')
      && !_handlerExcl.has(id)
  );
  const N = nonDirIds.length;


              document.getElementById('tcm-view-calendar')?.addEventListener('click', () => {
                  s.trainView = 'calendar';
                  Storage.saveSettings(s);
                  this._renderTab('rotation');
              });


              document.getElementById('tcm-cal-weeks')?.addEventListener('change', (e) => {
                  s.calendarWeeksBack = parseInt(e.target.value) || 5;
                  Storage.saveSettings(s);
                  this._renderTab('rotation');
              });


              document.querySelectorAll('.tcm-cal-day').forEach(cell => {
                  cell.addEventListener('click', () => {
                      const date = cell.dataset.date;
                      s.calendarSelectedDay = (s.calendarSelectedDay === date) ? '' : date;
                      Storage.saveSettings(s);
                      this._renderTab('rotation');
                  });
              });


              document.getElementById('tcm-cal-close')?.addEventListener('click', () => {
                  s.calendarSelectedDay = '';
                  Storage.saveSettings(s);
                  this._renderTab('rotation');
              });


              document.getElementById('tcm-cal-add-btn')?.addEventListener('click', () => {
                  const empId    = document.getElementById('tcm-cal-add-emp')?.value;
                  const count    = Math.max(1, Math.min(10, parseInt(document.getElementById('tcm-cal-add-count')?.value || '1') || 1));
                  const date     = s.calendarSelectedDay;
                  const feedback = document.getElementById('tcm-cal-add-feedback');

                  if (!empId) {
                      if (feedback) { feedback.textContent = '⚠ Select an employee.'; feedback.style.color = '#ef4444'; }
                      return;
                  }
                  if (!date) {
                      if (feedback) { feedback.textContent = '⚠ No date selected.'; feedback.style.color = '#ef4444'; }
                      return;
                  }
                  if (date > new Date().toISOString().slice(0, 10)) {
                      if (feedback) { feedback.textContent = '⚠ Cannot log future trains.'; feedback.style.color = '#ef4444'; }
                      return;
                  }

                  const empName = state.employees[empId]?.name || empId;

                  const baseTs = Math.floor(new Date(date + 'T12:00:00Z').getTime() / 1000);
                  for (let i = 0; i < count; i++) {
                      Storage.logTrained(empId, empName, baseTs + i, null);
                  }
                  if (feedback) {
                      feedback.textContent = `✓ Added ${count} train${count !== 1 ? 's' : ''} for ${empName}.`;
                      feedback.style.color = '#7eb8ff';
                  }
                  setTimeout(() => {
                      this._renderTab('rotation');
                  }, 700);
              });


document.getElementById('tcm-cal-clear-all')?.addEventListener('click', () => {
                  if (!confirm('Clear ALL training logs? This cannot be undone.')) return;
                  Storage.set('trained_log', {});
                  Storage.saveProcessedLogIds([]);
                  s.calendarSelectedDay = '';
                  Storage.saveSettings(s);
                  this._renderTab('rotation');
              });


document.querySelectorAll('.tcm-cal-remove-train').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const empId    = btn.dataset.empid;
                      const date     = btn.dataset.date;
                      const dayTotal = Math.max(1, parseInt(btn.dataset.count || '1') || 1);
                      if (!empId || !date) return;
                      const empName = state.employees[empId]?.name || empId;
                      const input = prompt(`How many logged trains should be removed for ${empName} on ${date}? (${dayTotal} logged that day)`, dayTotal);
                      if (input === null) return;
                      const count = Math.max(1, Math.min(dayTotal, parseInt(input) || 0));
                      if (!count) { alert('Enter a valid number of trains to remove.'); return; }
                      if (!confirm(`Remove ${count} logged train${count !== 1 ? 's' : ''} for ${empName} on ${date}? (e.g. if it was backtracked/cancelled in Torn)`)) return;
                      const removed = Storage.removeTrainedEntry(empId, date, count);
                      if (!removed) { alert('No matching train entry found to remove.'); return; }
                      this._renderTab('rotation');
                  });
              });



              document.getElementById('tcm-backdate-submit')?.addEventListener('click', () => {
                  const empId    = document.getElementById('tcm-backdate-emp')?.value;
                  const dateVal  = document.getElementById('tcm-backdate-date')?.value;
                  const count    = Math.max(1, Math.min(10, parseInt(document.getElementById('tcm-backdate-count')?.value || '1') || 1));
                  const feedback = document.getElementById('tcm-backdate-feedback');
                  if (!empId) {
                      if (feedback) { feedback.textContent = '⚠ Select an employee.'; feedback.style.color = '#ef4444'; }
                      return;
                  }
                  if (!dateVal) {
                      if (feedback) { feedback.textContent = '⚠ Pick a date.'; feedback.style.color = '#ef4444'; }
                      return;
                  }
                  if (dateVal > new Date().toISOString().slice(0,10)) {
                      if (feedback) { feedback.textContent = '⚠ Cannot log future trains.'; feedback.style.color = '#ef4444'; }
                      return;
                  }
                  const empName = state.employees[empId]?.name || empId;

                  const baseTs = Math.floor(new Date(dateVal + 'T12:00:00Z').getTime() / 1000);
                  for (let i = 0; i < count; i++) {
                      Storage.logTrained(empId, empName, baseTs + i, null);
                  }
                  if (feedback) {
                      feedback.textContent = `✓ Logged ${count} train${count !== 1 ? 's' : ''} for ${empName} on ${dateVal}.`;
                      feedback.style.color = '#7eb8ff';
                  }
                  setTimeout(() => this._renderTab('rotation'), 800);
              });
              document.getElementById('tcm-export-daily-csv')?.addEventListener('click', () => {
      const s2     = Storage.getSettings();
      const cf     = s2.trainFilter || 'week';
      const empSel = document.getElementById('tcm-export-emp-select')?.value || '';
      const now2   = new Date();
      const t2     = now2.toISOString().slice(0, 10);
      const y2     = new Date(now2 - 86400000).toISOString().slice(0, 10);

      let fromDate = null, exactDate = null;
      if (cf === 'today')     exactDate = t2;
      else if (cf === 'yesterday') exactDate = y2;
      else if (cf === 'week')  fromDate = new Date(now2 - 7  * 86400000).toISOString().slice(0, 10);
      else if (cf === 'month') fromDate = new Date(now2 - 30 * 86400000).toISOString().slice(0, 10);
      else if (cf === 'year')  fromDate = `${now2.getFullYear()}-01-01`;


const log = Storage.getTrainedLog();
      const showFormerDaily = Storage.getSettings().historyShowFormer !== false;
      const currentIdsDaily = Object.keys(state.employees).filter(id =>
          state.employees[id].position !== 'Director' &&
          String(id) !== String(state.directorId || '')
      );


      const targetIds = empSel
          ? [empSel]
          : (showFormerDaily ? Object.keys(log) : currentIdsDaily);


      const rows = [['Employee', 'Date', 'Trains']];
      const perDay = {};

      for (const empId of targetIds) {
          const entries = log[empId] || [];
          for (const e of entries) {
              if (exactDate && e.date !== exactDate) continue;
              if (fromDate  && e.date < fromDate)   continue;
              const key = `${empId}|${e.date}`;
              perDay[key] = (perDay[key] || 0) + 1;
          }
      }


const sorted = Object.entries(perDay).map(([key, count]) => {
          const [empId, date] = key.split('|');
          const name = state.employees[empId]?.name
              || (log[empId] || []).find(e => e.name)?.name
              || empId;
          return { name, date, count };
      }).sort((a, b) => a.name.localeCompare(b.name) || a.date.localeCompare(b.date));

      if (!sorted.length) { alert('No training data for that selection.'); return; }

      sorted.forEach(r => rows.push([r.name, r.date, r.count]));

      const empLabel = empSel
          ? (state.employees[empSel]?.name || (log[empSel] || []).find(e => e.name)?.name || empSel).replace(/\s+/g, '_')
          : 'all';
      exportCsv(rows, `tcm_daily_trains_${empLabel}_${cf}.csv`);
  });
              document.getElementById('tcm-export-csv')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  const cf = s2.trainFilter || 'week';
                  const empSel = document.getElementById('tcm-export-emp-select')?.value || '';
                  const now2 = new Date();
                  const t2 = now2.toISOString().slice(0, 10);
                  const y2 = new Date(now2 - 86400000).toISOString().slice(0, 10);
                  let sinceDate2 = null, exactDate2 = null;
                  if (cf === 'today') exactDate2 = t2;
                  else if (cf === 'yesterday') exactDate2 = y2;
                  else if (cf === 'week')  sinceDate2 = new Date(now2 - 7*86400000).toISOString().slice(0,10);
                  else if (cf === 'month') sinceDate2 = new Date(now2 - 30*86400000).toISOString().slice(0,10);
                  else if (cf === 'year')  sinceDate2 = `${now2.getFullYear()}-01-01`;

const showFormerCsv = Storage.getSettings().historyShowFormer !== false;
                  const rows = [['Employee','Trains','Last Trained']];
                  if (exactDate2) {
                      Storage.getTrainedOnDate(exactDate2)
                          .filter(t => !empSel || t.empId === empSel)
                          .filter(t => showFormerCsv || employees[t.empId])
                          .forEach(t => {
                              rows.push([t.name || employees[t.empId]?.name || t.empId, 1, exactDate2]);
                          });
                  } else {
                      const raw2 = Storage.getTrainSummary(sinceDate2);
                      Object.entries(raw2)
                          .filter(([empId]) => !empSel || empId === empSel)
                          .filter(([empId]) => showFormerCsv || employees[empId])
                          .sort(([,a],[,b]) => (b.lastTrained || '').localeCompare(a.lastTrained || ''))
                          .forEach(([, d]) => {
                              rows.push([d.name, d.count, d.lastTrained || '']);
                          });
                  }
                  const empLabel = empSel ? (state.employees[empSel]?.name || empSel).replace(/\s+/g, '_') : 'all';
                  exportCsv(rows, `tcm_training_${empLabel}_${cf}.csv`);
              });


              document.getElementById('tcm-view-today')?.addEventListener('click', () => {
      s.trainView = 'today'; Storage.saveSettings(s); UI._renderTab('rotation');
  });
  document.getElementById('tcm-view-week')?.addEventListener('click', () => {
      s.trainView = 'week'; Storage.saveSettings(s); UI._renderTab('rotation');
  });
  document.getElementById('tcm-view-history')?.addEventListener('click', () => {
      s.trainView = 'history'; Storage.saveSettings(s); UI._renderTab('rotation');
  });
  document.getElementById('tcm-view-schedule')?.addEventListener('click', () => {
      s.trainView = 'schedule'; Storage.saveSettings(s); UI._renderTab('rotation');
  });

              document.getElementById('tcm-tmpl-enabled')?.addEventListener('change', (e) => {
                  s.templateModeEnabled = e.target.checked;
                  Storage.saveSettings(s);
                  if (e.target.checked) {

                      const cfg = Storage.getScheduleConfig();
                      if (cfg.enabled) { cfg.enabled = false; Storage.saveScheduleConfig(cfg); }
                  }
                  this._renderTab('rotation');
              });


              document.getElementById('tcm-sched-enabled')?.addEventListener('change', (e) => {
                  const cfg = Storage.getScheduleConfig();
                  cfg.enabled = e.target.checked;
                  if (cfg.enabled) {
                      const s2 = Storage.getSettings();
                      s2.templateModeEnabled = false;
                      Storage.saveSettings(s2);
                  }
                  Storage.saveScheduleConfig(cfg);
                  this._renderTab('rotation');
              });

              document.getElementById('tcm-sched-save')?.addEventListener('click', () => {
                  const cfg = Storage.getScheduleConfig();
                  cfg.mode           = document.getElementById('tcm-sched-mode')?.value || 'soft';
                  cfg.cycleDays      = Math.max(1, parseInt(document.getElementById('tcm-sched-cycledays')?.value) || 7);
                  cfg.cycleStartDate = document.getElementById('tcm-sched-startdate')?.value || cfg.cycleStartDate || today;
                  Storage.saveScheduleConfig(cfg);

                  const overrides = {};
                  document.querySelectorAll('.tcm-sched-target').forEach(inp => {
                      const id = inp.dataset.id;
                      const lockedBox = document.querySelector(`.tcm-sched-locked[data-id="${id}"]`);
                      const locked = lockedBox?.checked || false;
                      const raw = parseInt(inp.value);
                      if (locked) {
                          overrides[id] = { locked: true };
                      } else if (!isNaN(raw) && raw >= 0 && inp.value.trim() !== '') {
                          overrides[id] = { trainsPerCycle: raw };
                      }
                  });
                  Storage.saveScheduleOverrides(overrides);

                  const btn = document.getElementById('tcm-sched-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = '💾 Save Debt-Tracking Targets'; }, 1500); }
                  this._renderTab('rotation');
              });

              document.querySelectorAll('.tcm-sched-locked').forEach(cb => {
                  cb.addEventListener('change', () => {
                      const target = document.querySelector(`.tcm-sched-target[data-id="${cb.dataset.id}"]`);
                      if (target) target.disabled = cb.checked;
                  });
              });




              document.querySelectorAll('.tcm-weekly-input').forEach(inp => {
                  inp.addEventListener('input', () => {
                      let _tot = 0;
                      document.querySelectorAll('.tcm-weekly-input').forEach(i => { _tot += Math.max(0, parseInt(i.value)||0); });
                      const _over = _tot > _weeklyBudget;
                      const _dispEl = document.getElementById('tcm-weekly-total-display');
                      const _barEl  = document.getElementById('tcm-weekly-bar');
                      const _col = _over ? '#ef4444' : _tot === _weeklyBudget ? '#7eb8ff' : '#f59e0b';
                      if (_dispEl) { _dispEl.textContent = `${_tot} / ${_weeklyBudget}`; _dispEl.style.color = _col; }
                      if (_barEl)  { _barEl.style.width = Math.min(100, Math.round((_tot / Math.max(1,_weeklyBudget))*100)) + '%'; _barEl.style.background = _col; }
                      inp.style.borderColor = _over ? '#ef4444' : '#2a2a2a';
                  });
              });


              document.getElementById('tcm-weekly-apply')?.addEventListener('click', () => {
                  const _inputs = {};
                  let _tot = 0;
                  document.querySelectorAll('.tcm-weekly-input').forEach(inp => {
                      const v = Math.max(0, parseInt(inp.value)||0);
                      _inputs[inp.dataset.empid] = v;
                      _tot += v;
                  });
                  if (_tot > _weeklyBudget) {
                      alert(`Total fixed weekly trains (${_tot}) exceeds weekly budget (${_weeklyBudget}). Reduce or let the pool absorb the rest.`);
                      return;
                  }
                  Storage.saveWeeklyTargets(_inputs);
                  const _btn = document.getElementById('tcm-weekly-apply');
                  if (_btn) { _btn.textContent = '✓ Targets Saved!'; setTimeout(() => { _btn.textContent = '💾 Save Targets'; }, 2000); }


                  const _prev = document.getElementById('tcm-weekly-preview');
                  if (_prev) {
                      const _dp2 = Storage.computeTodayPlan(employees, state.directorId, effectiveRotationBudget);
                      const _rotExcl2 = new Set(Storage.getRotation().excluded || []);
                      const _poolList2 = nonDirIds.filter(id => (_inputs[id]||0) === 0 && !_rotExcl2.has(id));
                      let _ph = `<div style="font-size:11px;font-weight:700;color:#7eb8ff;margin-bottom:6px;">✓ Today's Live Plan (auto-updates every refresh)</div>
                      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
                      <thead><tr>
                          <th style="text-align:left;padding:4px 6px 4px 0;color:#9ca3af;border-bottom:1px solid #2a2a2a;font-size:11px;">Employee</th>
                          <th style="text-align:center;padding:4px 6px;color:#9ca3af;border-bottom:1px solid #2a2a2a;font-size:11px;">Today</th>
                          <th style="text-align:center;padding:4px 6px;color:#9ca3af;border-bottom:1px solid #2a2a2a;font-size:11px;">Done</th>
                          <th style="text-align:left;padding:4px 6px;color:#9ca3af;border-bottom:1px solid #2a2a2a;font-size:11px;">Type</th>
                      </tr></thead><tbody>`;
                      nonDirIds.forEach(id => {
                          const planned2 = _dp2.planned[id] || 0;
                          if (!planned2) return;
                          const logged2 = (Storage.getTrainedLog()[id] || []).filter(e => e.date === today && e.ts).length;
                          const done2 = logged2 >= planned2;
                          const type2 = _dp2.fixedIds.includes(id) ? `<span style="color:#7eb8ff;">fixed</span>` : `<span style="color:#f59e0b;">pool</span>`;
                          _ph += `<tr style="border-bottom:1px solid #111827;">
                              <td style="padding:5px 6px 5px 0;color:#ddd;font-weight:600;">${employees[id]?.name||id}</td>
                              <td style="text-align:center;padding:5px 6px;font-family:'JetBrains Mono',monospace;font-weight:700;color:#7eb8ff;">${planned2}</td>
                              <td style="text-align:center;padding:5px 6px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${done2?'#7eb8ff':'#888'};">${logged2}${done2?' ✓':''}</td>
                              <td style="padding:5px 6px;font-size:11px;">${type2}</td>
                          </tr>`;
                      });
                      _ph += `</tbody></table></div>`;
                      if (_poolList2.length > 0) {
                          const _rot2 = Storage.getRotation();
                          const _resets2 = _rot2.resetDates || {};
                          const _nextPool = [..._poolList2].sort((a,b) => Storage.getEmpAllTimeCount(a,_resets2[a]||null) - Storage.getEmpAllTimeCount(b,_resets2[b]||null));
                          _ph += `<div style="font-size:11px;padding:7px 10px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:4px;margin-top:6px;">
                              <span style="color:#f59e0b;font-weight:700;">↻ Pool (${_poolList2.length}):</span>
                              <span style="color:#9ca3af;"> ${_poolList2.map(id=>employees[id]?.name||id).join(', ')}</span><br>
                              <span style="color:#7eb8ff;">Next by debt: ${_nextPool.slice(0,4).map(id=>employees[id]?.name||id).join(' → ')}${_poolList2.length>4?'…':''}</span>
                          </div>`;
                      }
                      _ph += `<div style="font-size:10px;color:#888;margin-top:5px;">No manual generation needed — the plan above recalculates live from targets + debt every API refresh.</div>`;
                      _prev.innerHTML = _ph;
                  }
              });


              document.getElementById('tcm-weekly-even')?.addEventListener('click', () => {
                  const _n = nonDirIds.length;
                  if (!_n) return;
                  const _inps = document.querySelectorAll('.tcm-weekly-input');
                  if (_weeklyBudget < _n) {

                      _inps.forEach(inp => { inp.value = 0; inp.dispatchEvent(new Event('input',{bubbles:true})); });
                  } else {
                      const _base = Math.floor(_weeklyBudget / _n);
                      const _xtra = _weeklyBudget - _base * _n;

                      _inps.forEach((inp, idx) => {
                          inp.value = _base + (idx < _xtra ? 1 : 0);
                          inp.dispatchEvent(new Event('input',{bubbles:true}));
                      });
                  }
                  setTimeout(() => { document.getElementById('tcm-weekly-apply')?.click(); }, 150);
              });


              document.getElementById('tcm-dpp-toggle-header')?.addEventListener('click', () => {
                  const _panel = document.getElementById('tcm-dpp-panel');
                  const _chev  = document.getElementById('tcm-dpp-chevron');
                  if (!_panel) return;
                  const _open = _panel.style.display !== 'none';
                  _panel.style.display = _open ? 'none' : 'block';
                  if (_chev) _chev.textContent = _open ? '▼' : '▲';
                  Storage.set('dpp_panel_open', !_open);
              });


              const _dppReadDOM = () => {
                  const _pd = {};
                  document.querySelectorAll('.tcm-dpp-emp').forEach(sel => {
                      const _dd = sel.dataset.day;
                      const _ii = parseInt(sel.dataset.idx);
                      if (!_pd[_dd]) _pd[_dd] = [];
                      while (_pd[_dd].length <= _ii) _pd[_dd].push({});
                      _pd[_dd][_ii].empId = sel.value;
                  });
                  document.querySelectorAll('.tcm-dpp-trains').forEach(inp => {
                      const _dd = inp.dataset.day;
                      const _ii = parseInt(inp.dataset.idx);
                      if (!_pd[_dd]) _pd[_dd] = [];
                      while (_pd[_dd].length <= _ii) _pd[_dd].push({});
                      _pd[_dd][_ii].trains = Math.max(1, parseInt(inp.value) || 1);
                  });
                  Object.keys(_pd).forEach(dk => {
                      _pd[dk] = _pd[dk].filter(e => e && e.empId);
                      if (!_pd[dk].length) delete _pd[dk];
                  });
                  return _pd;
              };


              const _dppRefreshRemaining = () => {
                  const DAYS_U = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                  const _live = _dppReadDOM();
                  DAYS_U.forEach(d => {
                      const _used = (_live[d] || []).reduce((s, e) => s + (e.trains || 0), 0);
                      const _rem2 = trainBudget - _used;
                      const _addBtn = document.querySelector(`.tcm-dpp-add[data-day="${d}"]`);
                      if (!_addBtn) return;
                      const _remCell = _addBtn.closest('tr')?.querySelector('td:last-child');
                      if (!_remCell) return;
                      const _over = _used > trainBudget;
                      _remCell.innerHTML = _used > 0
                          ? `<span style="font-size:12px;font-weight:700;color:${_over ? '#ef4444' : _rem2 === 0 ? '#7eb8ff' : '#9ca3af'};font-family:'JetBrains Mono',monospace;">${_over ? '⚠ ' : ''}${_rem2} left</span>`
                          : `<span style="font-size:11px;color:#4b5563;">rotating</span>`;
                  });
              };

              document.querySelectorAll('.tcm-dpp-add').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const d = btn.dataset.day;
                      const _pd2 = _dppReadDOM();
                      if (!_pd2[d]) _pd2[d] = [];
                      const _usedNow = _pd2[d].reduce((s, e) => s + (e.trains || 0), 0);
                      if (_usedNow >= trainBudget) {
                          const _orig = btn.textContent;
                          btn.textContent = '⚠ Day full';
                          btn.style.color = '#ef4444';
                          setTimeout(() => { btn.textContent = _orig; btn.style.color = '#7eb8ff'; }, 2000);
                          return;
                      }
                      _pd2[d].push({ empId: nonDirIds[0] || '', trains: 1 });
                      Storage.saveDayPriorityPlan(_pd2);
                      Storage.set('dpp_panel_open', true);
                      this._renderTab('rotation');
                  });
              });

              document.querySelectorAll('.tcm-dpp-remove').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const _pd3 = _dppReadDOM();
                      const d = btn.dataset.day;
                      const idx = parseInt(btn.dataset.idx);
                      if (_pd3[d]) {
                          _pd3[d].splice(idx, 1);
                          if (!_pd3[d].length) delete _pd3[d];
                      }
                      Storage.saveDayPriorityPlan(_pd3);
                      Storage.set('dpp_panel_open', true);
                      this._renderTab('rotation');
                  });
              });

              document.querySelectorAll('.tcm-dpp-emp').forEach(sel => {
                  sel.addEventListener('change', () => {
                      Storage.saveDayPriorityPlan(_dppReadDOM());
                  });
              });

              document.querySelectorAll('.tcm-dpp-trains').forEach(inp => {
                  inp.addEventListener('input', () => {
                      Storage.saveDayPriorityPlan(_dppReadDOM());
                      _dppRefreshRemaining();
                  });
              });

              document.getElementById('tcm-dpp-clear')?.addEventListener('click', () => {
                  if (!confirm('Clear all per-day priority assignments?')) return;
                  Storage.saveDayPriorityPlan({});
                  Storage.set('dpp_panel_open', false);
                  this._renderTab('rotation');
              });

              document.getElementById('tcm-weekly-reset-queue')?.addEventListener('click', () => {
                  if (!confirm('Reset rotation queue? All rotating employees will restart from the beginning of the cycle.')) return;
                  Storage.saveManualScheduleQueue({ queue: [], pointer: 0 });
                  this._renderTab('rotation');
              });


              document.getElementById('tcm-weekly-preview-next')?.addEventListener('click', () => {
                  const _ppDiv = document.getElementById('tcm-weekly-preview');
                  if (!_ppDiv) return;

                  const _piDom = {};
                  document.querySelectorAll('.tcm-weekly-input').forEach(inp => {
                      _piDom[inp.dataset.empid] = Math.max(0, parseInt(inp.value)||0);
                  });
                  Storage.saveWeeklyTargets(_piDom);
                  const _dpPrev = Storage.computeTodayPlan(employees, state.directorId, effectiveRotationBudget);
                  const _rotExclPrev = new Set(Storage.getRotation().excluded || []);
                  const _poolPrev = nonDirIds.filter(id => (_piDom[id]||0) === 0 && !_rotExclPrev.has(id));
                  let ph = `<div style="font-size:11px;font-weight:700;color:#7eb8ff;margin-bottom:6px;">👁 Today's Live Plan Preview</div>
                  <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
                  <thead><tr>
                      <th style="text-align:left;padding:4px 6px 4px 0;color:#9ca3af;border-bottom:1px solid #2a2a2a;font-size:11px;">Employee</th>
                      <th style="text-align:center;padding:4px 6px;color:#9ca3af;border-bottom:1px solid #2a2a2a;font-size:11px;">Trains Today</th>
                      <th style="text-align:left;padding:4px 6px;color:#9ca3af;border-bottom:1px solid #2a2a2a;font-size:11px;">Type</th>
                  </tr></thead><tbody>`;
                  let _totalPrev = 0;
                  nonDirIds.forEach(id => {
                      const pv = _dpPrev.planned[id] || 0;
                      if (!pv) return;
                      _totalPrev += pv;
                      const typePv = _dpPrev.fixedIds.includes(id)
                          ? `<span style="color:#7eb8ff;">fixed (${_piDom[id]}/wk target)</span>`
                          : `<span style="color:#f59e0b;">pool (debt rotation)</span>`;
                      ph += `<tr style="border-bottom:1px solid #111827;">
                          <td style="padding:5px 6px 5px 0;color:#ddd;font-weight:600;">${employees[id]?.name||id}</td>
                          <td style="text-align:center;padding:5px 6px;font-family:'JetBrains Mono',monospace;font-weight:700;color:#7eb8ff;">${pv}</td>
                          <td style="padding:5px 6px;font-size:11px;">${typePv}</td>
                      </tr>`;
                  });
                  ph += `<tr style="border-top:2px solid #2a2a2a;background:#0a0e14;">
                      <td style="padding:5px 6px 5px 0;font-size:10px;color:#888;font-weight:700;text-transform:uppercase;">Total</td>
                      <td style="text-align:center;padding:5px 6px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${_totalPrev===effectiveRotationBudget?'#7eb8ff':_totalPrev>effectiveRotationBudget?'#ef4444':'#9ca3af'};">${_totalPrev}</td>
                      <td></td>
                  </tr>`;
                  ph += `</tbody></table></div>`;
                  if (_poolPrev.length) {
                      const _rotPrev = Storage.getRotation();
                      const _resetsPrev = _rotPrev.resetDates || {};
                      const _poolSortedPrev = [..._poolPrev].sort((a,b) => Storage.getEmpAllTimeCount(a,_resetsPrev[a]||null) - Storage.getEmpAllTimeCount(b,_resetsPrev[b]||null));
                      ph += `<div style="font-size:11px;padding:7px 10px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:4px;margin-top:6px;">
                          <span style="color:#f59e0b;font-weight:700;">↻ Pool (${_poolPrev.length}):</span>
                          <span style="color:#9ca3af;"> ${_poolPrev.map(id=>employees[id]?.name||id).join(', ')}</span><br>
                          <span style="color:#7eb8ff;">Next by debt: ${_poolSortedPrev.slice(0,4).map(id=>employees[id]?.name||id).join(' → ')}${_poolPrev.length>4?'…':''}</span>
                      </div>`;
                  }
                  ph += `<div style="font-size:10px;color:#888;margin-top:5px;">This preview reflects the actual plan that will run today. It recalculates on every API refresh automatically.</div>`;
                  _ppDiv.innerHTML = ph;
              });

              document.getElementById('tcm-weekly-clear')?.addEventListener('click', () => {
                  if (!confirm('Clear all weekly targets? Everyone will go into the rotating pool.')) return;
                  Storage.saveWeeklyTargets({});
                  this._renderTab('rotation');
              });

              const _modeRender = () => {
      const _bd = document.getElementById('tcm-body');
      const _st = _bd ? _bd.scrollTop : 0;
      UI._renderTab('rotation');
      requestAnimationFrame(() => { const _bd2 = document.getElementById('tcm-body'); if (_bd2) _bd2.scrollTop = _st; });
  };
              document.getElementById('tcm-mode-priority')?.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const _s2 = Storage.getSettings();
                  _s2.rotationMode = 'priority'; Storage.saveSettings(_s2); _modeRender();
              });
              document.getElementById('tcm-mode-rotational')?.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const _s2 = Storage.getSettings();
                  _s2.rotationMode = 'rotational'; Storage.saveSettings(_s2); _modeRender();
              });
              document.getElementById('tcm-mode-contract-rot')?.addEventListener('click', (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const _s2 = Storage.getSettings();
                  _s2.rotationMode = 'contract_rotational'; Storage.saveSettings(_s2); _modeRender();
              });


document.querySelectorAll('.tcm-filter-btn').forEach(btn => {
                  btn.addEventListener('click', () => {
                      s.trainFilter = btn.dataset.filter; Storage.saveSettings(s); this._renderTab('rotation');
                  });
              });

              document.getElementById('tcm-history-show-former')?.addEventListener('change', (e) => {
                  s.historyShowFormer = e.target.checked;
                  Storage.saveSettings(s);
                  this._renderTab('rotation');
              });

              document.getElementById('tcm-export-emp-select')?.addEventListener('change', (e) => {
                  s.historyEmpSel = e.target.value;
                  Storage.saveSettings(s);
                  this._renderTab('rotation');
              });


              document.getElementById('tcm-reset-rotation-btn')?.addEventListener('click', () => {
                  if (!confirm('Full reset: debt history cleared and cycle restarts from today. Training logs are kept.')) return;
                  const activeIds = Object.keys(state.employees || {}).filter(id =>
                      state.employees[id].position !== 'Director' &&
                      String(id) !== String(state.directorId || '')
                  );
                  Storage.resetRotation(activeIds);
                  this._renderTab('rotation');
              });



              document.querySelectorAll('.tcm-reset-debt-btn').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const empId = btn.dataset.id;
                      const empName = btn.dataset.name || empId;
                      if (!confirm(`Reset ${empName}'s rotation debt to balanced?\nTheir train count starts fresh from today — past trains (including any from a finished contract) no longer count against their fairness ranking.`)) return;
                      const rot = Storage.getRotation();
                      if (!rot.resetDates) rot.resetDates = {};
                      rot.resetDates[empId] = new Date().toISOString().slice(0, 10);
                      Storage.saveRotation(rot);
                      this._renderTab('rotation');
                  });
              });


              document.getElementById('tcm-rot-start-save')?.addEventListener('click', () => {
                  const _newDate = document.getElementById('tcm-rot-start-date')?.value;
                  if (!_newDate) return;
                  const _rot2 = Storage.getRotation();
    _rot2.startDate = _newDate;


    if (_rot2.joinDates) {
        for (const id of Object.keys(_rot2.joinDates)) {
            if (_rot2.joinDates[id] > _newDate) {
                _rot2.joinDates[id] = _newDate;
            }
        }
    }
    Storage.saveRotation(_rot2);
    const _sb = document.getElementById('tcm-rot-start-save');
                  if (_sb) { _sb.textContent = '✓ Saved'; setTimeout(() => { _sb.textContent = 'Set'; }, 1500); }
                  this._renderTab('rotation');
              });



              document.querySelectorAll('.tcm-exclude-btn').forEach(btn => {
                  btn.addEventListener('click', () => {
                      Rotation.exclude(btn.dataset.id);
                      this._renderTab('rotation');
                  });
              });



              document.querySelectorAll('.tcm-mark-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          const empId = btn.dataset.id;
          const empName = btn.dataset.name;
          const trainsAvail = state.detailed?.trains_available ?? null;
          if (trainsAvail !== null && trainsAvail <= 0) {
              alert('No trains available in Torn right now — nothing to mark.');
              return;
          }
const todayStr = new Date().toISOString().slice(0, 10);
          const allLog = Storage.getTrainedLog();
          const manualToday = Object.values(allLog).reduce((sum, entries) =>
              sum + entries.filter(e => e.date === todayStr && !e.ts).length, 0);
          if (manualToday >= effectiveTodayBudget) {
      alert(`Daily budget of ${effectiveTodayBudget} train${effectiveTodayBudget !== 1 ? 's' : ''} already reached. Wait for the API to auto-detect.`);
              return;
          }
          Storage.logTrained(empId, empName, null, null);
          const _qi = btn.closest('.tcm-queue-item');
          if (_qi) {
              const _rd = _qi.querySelector('div[style*="flex-shrink"]');
              if (_rd) {
                  const _cs = _rd.querySelector('span');
                  if (_cs && _cs.textContent.includes('/')) {
                      const _pts = _cs.textContent.split('/');
                      const _nl = (parseInt(_pts[0]) || 0) + 1;
                      const _pl = parseInt(_pts[1]) || 0;
                      _cs.textContent = `${_nl}/${_pl}`;
                      if (_nl >= _pl) { _cs.style.color = '#7eb8ff'; _qi.classList.remove('current'); _qi.classList.add('trained-today'); }
                  }
              }
              btn.textContent = '✓'; btn.disabled = true; btn.style.opacity = '0.6';
          }
          clearTimeout(UI._markRenderTimer);
          UI._markRenderTimer = setTimeout(() => {
              const _sp = document.getElementById('tcm-body')?.scrollTop || 0;
              this._renderTab('rotation');
              requestAnimationFrame(() => { const _b = document.getElementById('tcm-body'); if (_b) _b.scrollTop = _sp; });
          }, 1200);
      });
  });


              document.querySelectorAll('.tcm-include-btn').forEach(btn => {
                  btn.addEventListener('click', () => {
                      Rotation.include(btn.dataset.id, Object.keys(state.employees || {}));
                      this._renderTab('rotation');
                  });
              });


              if ((s.trainView || 'today') === 'schedule') {
                  const _autoPrev = document.getElementById('tcm-weekly-preview');
                  const _autoTargets = Storage.getWeeklyTargets();
                  const _hasTargets = Object.values(_autoTargets).some(v => (v || 0) > 0);
                  if (_autoPrev && _autoPrev.innerHTML.trim() === '' && _hasTargets) {

                      setTimeout(() => { document.getElementById('tcm-weekly-preview-next')?.click(); }, 50);
                  }
              }
          },

          _tabOptimizer(state) {
              const { employees, typeName, directorId } = state;
              const s = Storage.getSettings();
              const optSubTab = s.optSubTab || 'optimizer';
              const subTabHtml = `<div class="tcm-mode-toggle" style="margin-bottom:12px;">
                  <button class="${optSubTab==='optimizer'?'active':''}" id="tcm-opt-sub-optimizer">Optimizer</button>
                  <button class="${optSubTab==='ee_perf'?'active':''}" id="tcm-opt-sub-eeperf">EE Performance</button>
                  <button class="${optSubTab==='hiring'?'active':''}" id="tcm-opt-sub-hiring">Hiring</button>
                  <button class="${optSubTab==='role_planner'?'active':''}" id="tcm-opt-sub-roleplanner">Role Planner</button>
              </div>`;
              if (optSubTab === 'ee_perf')     return subTabHtml + this._tabEEPerformance(state);
              if (optSubTab === 'hiring')      return subTabHtml + this._tabHiring(state);
              if (optSubTab === 'role_planner') return subTabHtml + this._tabRolePlanner(state);
              const result = Optimizer.optimize(employees, typeName, directorId);
              if (!result) return subTabHtml + '<div class="tcm-notice">No position data for this company type.</div>';

              const _optPositions = CompanyData.positions(typeName);
              const _specialSlots = _optPositions
                  ? [...new Set(Object.values(_optPositions).map(p => p.special).filter(Boolean))]
                      .map(s => `Max 1 ${s.charAt(0).toUpperCase() + s.slice(1)}`)
                      .join(' · ')
                  : 'None detected';

              let html = `<div class="tcm-warn-box" style="margin-bottom:8px;">
      ⚠ <strong>EE-only optimisation</strong> — this tab maximises Employee Effectiveness only. Revenue is not optimised because no public formula for company revenue exists. Position changes suggested here will not necessarily increase your daily income.
  </div>
  <div class="tcm-notice" style="font-size:11px;">
      Maximises total EE across all employees. Higher-gain positions win tiebreaks.
      Only swaps with genuine EE improvement are suggested. One Manager, one Trainer max.
      35% stat floor prevents nonsense assignments.<br>
      Uses a greedy algorithm — near-optimal for most rosters but may miss the globally best arrangement when two employees compete for the same high-value role.
  </div>
  <div class="tcm-notice" style="font-size:11px;border-color:#374151;margin-top:0;">
      <span style="color:#9ca3af;font-weight:700;">Guarantees:</span>
      <span style="color:#888;"> Revenue slots protected (never below current count) · ${_specialSlots} · No employee placed below 35% stat floor.</span>
  </div>`;
              html += `<div class="tcm-card"><div class="tcm-card-body">
                  <div class="tcm-row"><span class="lbl">Employees analysed</span><span class="val">${result.employeeCount}</span></div>
                  <div class="tcm-row"><span class="lbl">Total EE (current)</span><span class="val">${result.totalBefore}</span></div>
                  ${result.changes.length > 0 ? `<div class="tcm-row"><span class="lbl">Total EE after changes</span><span class="val green">${result.totalAfter} (+${result.gain})</span></div>` : ''}
              </div></div>`;

              if (result.gain === 0 && !result.changes.length) {
                  html += `<div class="tcm-notice" style="color:#7eb8ff;">✓ All employees are already in their optimal positions for this mode.</div>`;
              } else if (result.changes.length) {
                  html += `<div class="tcm-warn-box">⚠ ${result.changes.length} suggested change(s). Recommendations only — move positions manually in Torn.</div>`;
                  result.changes.forEach(c => {
                      html += `<div class="tcm-rec medium">
                          <div class="rec-title">${c.empName}: ${c.from} → <strong>${c.to}</strong> <span class="tcm-badge green">+${c.gain} EE</span></div>
                          <div class="rec-body">${c.eeBefore} EE → ${c.eeAfter} EE in new role</div>
                      </div>`;
                  });
              }


              if (result.employeeCount > 0) {
                  const positions = CompanyData.positions(state.typeName);
                  const statKey = { man:'manual_labor', int:'intelligence', end:'endurance' };
                  let roadmapHtml = '';

                  for (const { id, emp } of Object.entries(state.employees)
                      .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(state.directorId))
                      .map(([id, emp]) => ({ id, emp }))) {

                      const res = PosNorm.resolve(emp.position, positions);
                      if (!res) continue;
                      const pos = res.data;
                      const priStat = emp[statKey[pos.primary]] || 0;
                      const secStat = emp[statKey[pos.secondary]] || 0;
                      const curEE   = emp.effectiveness?.total || emp.effectiveness?.working_stats || 0;
                      const merits  = (emp.effectiveness?.merits || 0) + (emp.effectiveness?.settled_in || 0);




                      const occupiedSpecials = new Set();
                      for (const [oid, oemp] of Object.entries(state.employees)) {
                          if (oemp.position === 'Director' || String(oid) === String(state.directorId)) continue;
                          if (String(oid) === String(id)) continue;
                          const ores = PosNorm.resolve(oemp.position, positions);
                          if (ores?.data?.special) occupiedSpecials.add(ores.data.special);
                      }

                      const SPECIAL_TYPES = new Set(['cleaner','manager','trainer','marketer','secretary']);
                      const currentGain = pos.priGain + pos.secGain;

                      let bestUpgrade = null;
                      for (const trainCount of [5, 10, 20, 50]) {
                          const projPri = priStat + trainCount * TCM.TRAIN_PRIMARY;
                          const projSec = secStat + trainCount * TCM.TRAIN_SECONDARY;


                          for (const [posName, posData] of Object.entries(positions)) {
                              if (posName === res.key) continue;

                              if (SPECIAL_TYPES.has(posData.special)) continue;

                              if ((posData.priGain + posData.secGain) <= currentGain) continue;

                              if (projPri < posData.priReq * 0.80) continue;
                              const projEE = Math.min(200, Calc.totalEff(projPri, posData.priReq, projSec, posData.secReq) + merits);
                              const gain   = projEE - curEE;
                              if (gain > 5) {
                                  if (!bestUpgrade || gain > bestUpgrade.gain) {
                                      bestUpgrade = { posName, trains: trainCount, projEE, gain, isSpecial: false };
                                  }
                              }
                          }



                          if (!bestUpgrade) {
                              for (const [posName, posData] of Object.entries(positions)) {
                                  if (posName === res.key) continue;
                                  if (!SPECIAL_TYPES.has(posData.special)) continue;

                                  if (posData.special && occupiedSpecials.has(posData.special)) continue;
                                  if ((posData.priGain + posData.secGain) <= currentGain) continue;
                                  if (projPri < posData.priReq * 0.80) continue;
                                  const projEE = Math.min(200, Calc.totalEff(projPri, posData.priReq, projSec, posData.secReq) + merits);
                                  const gain   = projEE - curEE;
                                  if (gain > 5) {
                                      if (!bestUpgrade || gain > bestUpgrade.gain) {
                                          bestUpgrade = { posName, trains: trainCount, projEE, gain, isSpecial: true };
                                      }
                                  }
                              }
                          }

                          if (bestUpgrade) break;
                      }

                      if (bestUpgrade) {
                          roadmapHtml += `<div style="padding:7px 12px;margin-bottom:5px;background:#0d1117;border:1px solid #2a2a2a;border-radius:4px;">
                              <span style="color:#f3f4f6;font-weight:600;">${emp.name}</span>
                              <span style="color:#888;font-size:12px;"> · ${emp.position} (${curEE} EE)</span><br>
                              <span style="font-size:12px;color:#7eb8ff;">After ${bestUpgrade.trains} trains → could move to <strong>${bestUpgrade.posName}</strong> for ${bestUpgrade.projEE} EE (+${bestUpgrade.gain})</span>
                          </div>`;
                      }
                  }

if (roadmapHtml) {
                      html += `<div class="tcm-section-label" style="margin-top:10px;">Training Roadmap</div>`;
                      html += `<div class="tcm-notice" style="font-size:11px;">Projected positions based on training in current role. Stats from primary/secondary gains per train.</div>`;
                      html += roadmapHtml;
                  }
              }


              {
                  const _roleMap = {};
                  Object.entries(employees || {}).forEach(([id, emp]) => {
                      if (emp.position === 'Director' || String(id) === String(directorId || '')) return;
                      const posKey = PosNorm.normalize(emp.position) || emp.position;
                      if (!_roleMap[posKey]) _roleMap[posKey] = { count: 0, totalEE: 0, wsTotal: 0 };
                      const _totalEmpEE = emp.effectiveness?.total || emp.effectiveness?.working_stats || 0;
                      const _wsEmpEE    = emp.effectiveness?.working_stats || 0;
                      _roleMap[posKey].count++;
                      _roleMap[posKey].totalEE  += _totalEmpEE;
                      _roleMap[posKey].wsTotal  += _wsEmpEE;
                  });
                  const _roleEntries = Object.entries(_roleMap)
                      .map(([pos, r]) => ({
                          pos,
                          count:   r.count,
                          totalEE: r.totalEE,
                          avgEE:   r.count > 0 ? Math.round(r.totalEE / r.count) : 0,
                          avgWS:   r.count > 0 ? Math.round(r.wsTotal / r.count)  : 0,
                          posData: CompanyData.positions(typeName)?.[pos] || null,
                      }))
                      .sort((a, b) => b.totalEE - a.totalEE);

                  if (_roleEntries.length > 0) {
                      const _grandTotal = _roleEntries.reduce((s, r) => s + r.totalEE, 0);
                      const _roleRows = _roleEntries.map(r => {
                          const tierBadge = r.avgEE >= 150 ? 'tier-4' : r.avgEE >= 100 ? 'tier-3' : r.avgEE >= 50 ? 'tier-2' : 'tier-1';
                          const statStr   = r.posData
                              ? `${r.posData.primary.toUpperCase()} / ${r.posData.secondary.toUpperCase()}`
                              : '—';
                          const specialBadge = r.posData?.special
                              ? `<span class="tcm-badge" style="background:rgba(96,165,250,0.12);color:#7eb8ff;border:1px solid rgba(96,165,250,0.3);margin-left:4px;font-size:9px;">${r.posData.special}</span>`
                              : '';
                          return `<tr style="border-bottom:1px solid #111827;">
                              <td style="padding:6px 8px 6px 0;white-space:nowrap;">
                                  <span style="color:#ddd;font-weight:600;">${r.pos}</span>${specialBadge}
                              </td>
                              <td style="text-align:center;padding:6px 4px;color:#9ca3af;">${r.count}</td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#7eb8ff;font-weight:700;">${r.totalEE.toLocaleString('en-US')}</td>
                              <td style="text-align:right;padding:6px 4px;">
                                  <span class="tcm-badge ${tierBadge}">${r.avgEE}</span>
                              </td>
                              <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#9ca3af;font-size:11px;">${r.avgWS}</td>
                              <td style="text-align:center;padding:6px 4px;font-size:10px;color:#888;">${statStr}</td>
                          </tr>`;
                      }).join('');

                      html += `<div class="tcm-section-label" style="margin-top:10px;">Current EE by Role</div>
                      <div class="tcm-notice" style="font-size:11px;">
                          Where is your company's EE concentrated?
                      </div>
                      <div class="tcm-card"><div class="tcm-card-body" style="padding:8px 10px;">
                      <table style="width:100%;border-collapse:collapse;font-size:12px;">
                      <thead><tr style="background:#0a0e14;">
                          <th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Role</th>
                          <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">#</th>
                          <th style="text-align:right;padding:5px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Total EE</th>
                          <th style="text-align:right;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Avg EE</th>
                          <th style="text-align:right;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Avg WS</th>
                          <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Stats</th>
                      </tr></thead>
                      <tbody>${_roleRows}</tbody>
                      <tfoot><tr style="background:#0a0e14;border-top:2px solid #2a2a2a;">
                          <td style="padding:6px 8px 6px 0;color:#7eb8ff;font-weight:800;font-size:13px;">TOTAL</td>
                          <td style="text-align:center;padding:6px 4px;color:#9ca3af;">${_roleEntries.reduce((s,r)=>s+r.count,0)}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#7eb8ff;font-weight:800;font-size:14px;">${_grandTotal.toLocaleString('en-US')}</td>
                          <td colspan="3"></td>
                      </tr></tfoot>
                      </table></div></div>`;
                  }
              }

              return subTabHtml + html;
          },

          _tabProjections(state) {
              const { employees, typeName } = state;
              const s = Storage.getSettings();

              const projs = Object.entries(employees || {})
                  .map(([id, emp]) => { emp._id = id; return Projections.analyse(emp, typeName, s.weights); })
                  .filter(Boolean)
                  .sort((a, b) => a.totalTrains - b.totalTrains);

              if (!projs.length) return '<div class="tcm-notice">No projection data available.</div>';

              const roiColors = { 'short-term': 'green', 'long-term': 'amber', 'not-worth-it': 'red' };
              const roiLabels = { 'short-term': 'Short-term', 'long-term': 'Long-term', 'not-worth-it': 'Far off' };

              return projs.map(p => {
                  const priL = p.primary.toUpperCase(), secL = p.secondary.toUpperCase();
                  const tierCross = p.crossesTierAt10 ? `<span class="tcm-badge green">↑ Tier in 10!</span>` : '';
                  const tierInfo  = p.tierInfo ? `<span class="tcm-badge amber">${p.tierInfo.trains} trains → T${p.tierInfo.targetTier}</span>` : '';


                  const breakdown = [];
                  breakdown.push(`<span class="tcm-stat-chip">WS: ${p.wsEff}</span>`);
                  if (p.management)  breakdown.push(`<span class="tcm-stat-chip" title="Manager bonus — unconfirmed formula">Mgr: ${p.management > 0 ? '+' : ''}${p.management}${p.management > 0 ? ' ⚠' : ''}</span>`);
                  if (p.merits)      breakdown.push(`<span class="tcm-stat-chip">Merits: +${p.merits}</span>`);
                  if (p.settledIn)   breakdown.push(`<span class="tcm-stat-chip">Settled: +${p.settledIn}</span>`);
                  if (p.addiction)   breakdown.push(`<span class="tcm-stat-chip" style="color:#ef4444;">Addiction: ${p.addiction}</span>`);

                  return `<div class="tcm-proj">
                      <div class="proj-name">${p.empName} — ${p.position}</div>
                      <div style="margin-bottom:6px;">
                          <span class="tcm-stat-chip">${priL}: ${Calc.fmtNum(p.priCurrent)} / ${Calc.fmtNum(p.priRequired)}</span>
                          <span class="tcm-stat-chip">${secL}: ${Calc.fmtNum(p.secCurrent)} / ${Calc.fmtNum(p.secRequired)}</span>
                      </div>
                      <div class="tcm-row">
                          <span class="lbl">Total EE</span>
                          <span class="val">${p.currentEff} <span class="tcm-badge tier-${p.currentTier}">T${p.currentTier}</span></span>
                      </div>
                      <div style="margin:4px 0 8px;">${breakdown.join('')}</div>
                      <div class="tcm-row"><span class="lbl">Trains to meet req.</span><span class="val ${roiColors[p.roiClass]}">${p.totalTrains} — ${roiLabels[p.roiClass]} ${tierInfo}</span></div>
                      <div class="tcm-row"><span class="lbl">After 10 trains</span><span class="val">${p.sim10Eff} EE (+${p.wsEEGain} WS) <span class="tcm-badge tier-${p.sim10Tier}">T${p.sim10Tier}</span> ${tierCross}</span></div>
                      <div class="tcm-sim-row" style="margin-top:8px;">
                          <input class="tcm-input tcm-sim-input" type="number" min="1" max="200" value="10" data-empid="${p.empId}" style="width:60px;padding:4px 6px;" />
                          <button class="tcm-btn green tcm-sim-btn" data-empid="${p.empId}">Simulate</button>
                          <span class="tcm-sim-result" id="tcm-sim-${p.empId}"></span>
                      </div>
                  </div>`;
              }).join('');
          },

          _attachSimHandlers(state) {
              document.querySelectorAll('.tcm-sim-btn').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const empId = btn.dataset.empid;
                      const input  = document.querySelector(`.tcm-sim-input[data-empid="${empId}"]`);
                      const result = document.getElementById(`tcm-sim-${empId}`);
                      if (!input || !result) return;
                      const trains = parseInt(input.value, 10);
                      if (isNaN(trains) || trains < 1) return;
                      const emp = state.employees?.[empId];
                      if (!emp) return;
                      emp._id = empId;
                      const sim = Projections.simulate(emp, state.typeName, trains);
                      if (!sim) { result.textContent = 'No data'; return; }


                      result.innerHTML = `
                          <span style="font-size:12px;color:#9ca3af;line-height:1.6;">
                              EE: ${sim.before} → <strong style="color:#7eb8ff;">${sim.after}</strong> (+${sim.gain})
                              ${sim.crossesTier ? '<span style="color:#7eb8ff;"> ↑ Tier!</span>' : ''}<br>
                              ${sim.priLabel}: ${Calc.fmtNum(sim.priCurrent)} → ${Calc.fmtNum(sim.priAfter)} (+${Calc.fmtNum(sim.priGain)})<br>
                              ${sim.secLabel}: ${Calc.fmtNum(sim.secCurrent)} → ${Calc.fmtNum(sim.secAfter)} (+${Calc.fmtNum(sim.secGain)})
                          </span>`;


                  });
              });
          },

          _attachOptimizerHandlers(state) {
              document.getElementById('tcm-opt-sub-optimizer')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings(); s2.optSubTab = 'optimizer'; Storage.saveSettings(s2);
                  this._renderTab('optimize');
              });
              document.getElementById('tcm-opt-sub-eeperf')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings(); s2.optSubTab = 'ee_perf'; Storage.saveSettings(s2);
                  this._renderTab('optimize');
              });
              document.getElementById('tcm-opt-sub-hiring')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings(); s2.optSubTab = 'hiring'; Storage.saveSettings(s2);
                  this._renderTab('optimize');
              });
              document.getElementById('tcm-opt-sub-roleplanner')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings(); s2.optSubTab = 'role_planner'; Storage.saveSettings(s2);
                  this._renderTab('optimize');
              });


              if ((Storage.getSettings().optSubTab || 'optimizer') === 'role_planner') {
                  const { employees: rpEmps, typeName: rpType, directorId: rpDir } = state;
                  const rpPositions = CompanyData.positions(rpType) || {};
                  const rpPosNames  = Object.keys(rpPositions).sort((a, b) =>
                      (rpPositions[b].priGain + rpPositions[b].secGain) - (rpPositions[a].priGain + rpPositions[a].secGain)
                  );
                  const rpEmpCount = Object.entries(rpEmps || {})
                      .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(rpDir || '')).length;

                  const _rpSave = (cfg) => {
                      Storage.saveRolePlannerConfig(cfg);
                      this._renderTab('optimize');
                  };


                  document.getElementById('tcm-rp-mode-priority')?.addEventListener('click', () => {
                      const c = Storage.getRolePlannerConfig(); c.mode = 'priority'; _rpSave(c);
                  });
                  document.getElementById('tcm-rp-mode-maxee')?.addEventListener('click', () => {
                      const c = Storage.getRolePlannerConfig(); c.mode = 'maxee'; _rpSave(c);
                  });


                  document.getElementById('tcm-rp-add')?.addEventListener('click', () => {
                      const c = Storage.getRolePlannerConfig();
                      c.roles = c.roles || [];
                      c.roles.push({ posName: rpPosNames[0] || '', count: 1 });
                      _rpSave(c);
                  });


                  document.getElementById('tcm-rp-load-current')?.addEventListener('click', () => {
                      const counts = {};
                      Object.entries(rpEmps || {}).forEach(([id, e]) => {
                          if (e.position === 'Director' || String(id) === String(rpDir || '')) return;
                          const np = PosNorm.normalize(e.position);
                          if (rpPositions[np] || rpPositions[e.position]) counts[np] = (counts[np] || 0) + 1;
                      });
                      const c = Storage.getRolePlannerConfig();
                      c.roles = Object.entries(counts).map(([posName, count]) => ({ posName, count }));
                      _rpSave(c);
                  });


                  document.querySelectorAll('.tcm-rp-up').forEach(btn => {
                      btn.addEventListener('click', () => {
                          const idx = parseInt(btn.dataset.idx);
                          if (idx === 0) return;
                          const c = Storage.getRolePlannerConfig();
                          [c.roles[idx - 1], c.roles[idx]] = [c.roles[idx], c.roles[idx - 1]];
                          _rpSave(c);
                      });
                  });
                  document.querySelectorAll('.tcm-rp-dn').forEach(btn => {
                      btn.addEventListener('click', () => {
                          const idx = parseInt(btn.dataset.idx);
                          const c = Storage.getRolePlannerConfig();
                          if (idx >= c.roles.length - 1) return;
                          [c.roles[idx], c.roles[idx + 1]] = [c.roles[idx + 1], c.roles[idx]];
                          _rpSave(c);
                      });
                  });


                  document.querySelectorAll('.tcm-rp-pos').forEach(sel => {
                      sel.addEventListener('change', () => {
                          const c = Storage.getRolePlannerConfig();
                          c.roles[parseInt(sel.dataset.idx)].posName = sel.value;
                          Storage.saveRolePlannerConfig(c);
                      });
                  });


                  document.querySelectorAll('.tcm-rp-count').forEach(inp => {
                      inp.addEventListener('change', () => {
                          const c = Storage.getRolePlannerConfig();
                          const v = Math.max(1, Math.min(rpEmpCount, parseInt(inp.value) || 1));
                          c.roles[parseInt(inp.dataset.idx)].count = v;
                          inp.value = v;
                          Storage.saveRolePlannerConfig(c);
                      });
                  });


                  document.querySelectorAll('.tcm-rp-rm').forEach(btn => {
                      btn.addEventListener('click', () => {
                          const c = Storage.getRolePlannerConfig();
                          c.roles.splice(parseInt(btn.dataset.idx), 1);
                          _rpSave(c);
                      });
                  });


                  document.getElementById('tcm-rp-run')?.addEventListener('click', () => {
                      const c      = Storage.getRolePlannerConfig();
                      const mode2  = c.mode || 'priority';
                      const roles2 = c.roles || [];
                      if (!roles2.length) {
                          const rd = document.getElementById('tcm-rp-results');
                          if (rd) rd.innerHTML = '<div class="tcm-warn-box">Add at least one role before running.</div>';
                          return;
                      }

                      document.querySelectorAll('.tcm-rp-pos').forEach(sel => {
                          const idx = parseInt(sel.dataset.idx);
                          if (idx < roles2.length) roles2[idx].posName = sel.value;
                      });
                      document.querySelectorAll('.tcm-rp-count').forEach(inp => {
                          const idx = parseInt(inp.dataset.idx);
                          if (idx < roles2.length) roles2[idx].count = Math.max(1, parseInt(inp.value) || 1);
                      });
                      const out = mode2 === 'priority'
                          ? RolePlanner.assignPriority(rpEmps, rpPositions, roles2, rpDir)
                          : RolePlanner.assignMaxEE(rpEmps, rpPositions, roles2, rpDir);
                      const rd = document.getElementById('tcm-rp-results');
                      if (rd) rd.innerHTML = UI._renderRolePlannerResults(out.results, roles2, rpPositions, out.unassigned, mode2);
                  });
              }

              if ((Storage.getSettings().optSubTab || 'optimizer') === 'ee_perf') {
                  document.getElementById('tcm-eeperf-export-btn')?.addEventListener('click', () => {
                      const { employees, directorId } = state;
                      const rows = [['Employee','Position','WS EE','Merits','Settled-In','Management','Total (ex-Addiction)','Addiction','Total (incl-Addiction)']];
                      Object.entries(employees || {})
                          .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                          .map(([id, emp]) => {
                              const wsEE = emp.effectiveness?.working_stats || 0;
                              const merits = emp.effectiveness?.merits || 0;
                              const settled = emp.effectiveness?.settled_in || 0;
                              const mgmt = emp.effectiveness?.management || 0;
                              const addiction = emp.effectiveness?.addiction || 0;
                              return { name: emp.name, position: emp.position, wsEE, merits, settled, mgmt, totalEx: wsEE + merits + settled + mgmt, addiction, totalIncl: emp.effectiveness?.total || 0 };
                          })
                          .sort((a, b) => b.totalEx - a.totalEx)
                          .forEach(r => rows.push([r.name, r.position, r.wsEE, r.merits, r.settled, r.mgmt, r.totalEx, r.addiction, r.totalIncl]));
                      exportCsv(rows, `tcm_ee_performance_${new Date().toISOString().slice(0,10)}.csv`);
                  });

                  document.getElementById('tcm-eerank-pos')?.addEventListener('change', () => {
                      const pos = document.getElementById('tcm-eerank-pos')?.value || '';
                      Storage.set('eerank_selected_pos', pos);
                      const div = document.getElementById('tcm-eerank-results');
                      if (!div) return;
                      div.innerHTML = pos
                          ? UI._buildPosRankingHTML(pos, state)
                          : '<div style="color:#888;font-size:12px;">Select a position above to see the ranking.</div>';
                  });

                  document.getElementById('tcm-eerank-export-btn')?.addEventListener('click', () => {
                      const pos = document.getElementById('tcm-eerank-pos')?.value || Storage.get('eerank_selected_pos', '');
                      if (!pos) { alert('Select a position first.'); return; }
                      const { employees, typeName, directorId } = state;
                      const positions = CompanyData.positions(typeName) || {};
                      const pd = positions[pos];
                      if (!pd) { alert('Position data not found.'); return; }
                      const sk = { man:'manual_labor', int:'intelligence', end:'endurance' };
                      const sl = { man:'MAN', int:'INT', end:'END' };
                      const rows = [['#','Employee','Current Position','Total EE (ex-Addiction)',`${sl[pd.primary]}`,`${sl[pd.secondary]}`,'WS EE','Merits','Settled-In','Management']];
                      Object.entries(employees || {})
                          .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                          .map(([id, emp]) => {
                              const pri = emp[sk[pd.primary]] || 0;
                              const sec = emp[sk[pd.secondary]] || 0;
                              const wsEE = Calc.totalEff(pri, pd.priReq, sec, pd.secReq);
                              const merits = emp.effectiveness?.merits || 0;
                              const settled = emp.effectiveness?.settled_in || 0;
                              const mgmt = emp.effectiveness?.management || 0;
                              return { name: emp.name, position: emp.position, pri, sec, wsEE, merits, settled, mgmt, rankEE: wsEE + merits + settled + mgmt };
                          })
                          .sort((a, b) => b.rankEE - a.rankEE)
                          .forEach((r, i) => rows.push([i + 1, r.name, r.position, r.rankEE, r.pri, r.sec, r.wsEE, r.merits, r.settled, r.mgmt]));
                      exportCsv(rows, `tcm_pos_ranking_${pos.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
                  });
              }


              if ((Storage.getSettings().optSubTab || 'optimizer') === 'hiring') {
                  const _hPositions = CompanyData.positions(state.typeName);
                  const _hStatKey = { man: 'manual_labor', int: 'intelligence', end: 'endurance' };
                  const _hStatLabel = { man: 'MAN', int: 'INT', end: 'END' };
const _hUpdate = () => {
                      const man  = parseInt((document.getElementById('tcm-hire-man')?.value  || '0').replace(/,/g, '')) || 0;
                      const int_ = parseInt((document.getElementById('tcm-hire-int')?.value  || '0').replace(/,/g, '')) || 0;
                      const end_ = parseInt((document.getElementById('tcm-hire-end')?.value  || '0').replace(/,/g, '')) || 0;
const statMap = { man, int: int_, end: end_ };
                      const resultDiv = document.getElementById('tcm-hire-results');
                      if (!resultDiv || !_hPositions) return;
                      if (man === 0 && int_ === 0 && end_ === 0) {
                          resultDiv.innerHTML = '<div style="color:#888;padding:8px;">Enter working stats above to preview EE in each position.</div>';
                          return;
                      }
                      const _bonusChk    = document.getElementById('tcm-hire-bonus-chk')?.checked || false;
                      const _mgmtBonus   = _bonusChk ? (parseInt(document.getElementById('tcm-hire-mgmt')?.value    || '0') || 0) : 0;
                      const _settledBonus= _bonusChk ? (parseInt(document.getElementById('tcm-hire-settled')?.value  || '0') || 0) : 0;
                      const posNames = Object.keys(_hPositions).sort((a, b) =>
                          (_hPositions[b].priGain + _hPositions[b].secGain) - (_hPositions[a].priGain + _hPositions[a].secGain)
                      );
let html = '';
                      html = posNames.map(posName => {
                          const posData    = _hPositions[posName];
                          const priL       = posData.primary.toUpperCase();
                          const secL       = posData.secondary.toUpperCase();
                          const pri        = statMap[posData.primary]   || 0;
                          const sec        = statMap[posData.secondary] || 0;
                          const wsEE       = Calc.totalEff(pri, posData.priReq, sec, posData.secReq);
                          const displayEE  = Math.min(200, wsEE + _mgmtBonus + _settledBonus);
                          const meetsFloor = (pri / posData.priReq) >= TCM.OPT_MIN_FIT;
                          const tier       = Calc.eeTier(displayEE);
const tierColor = !meetsFloor ? '#ef4444' : tier === 3 ? '#a78bfa' : tier === 2 ? '#7eb8ff' : '#9ca3af';
                          const tierBg    = !meetsFloor ? 'rgba(239,68,68,0.08)' : tier === 3 ? 'rgba(167,139,250,0.08)' : tier === 2 ? 'rgba(126,184,255,0.08)' : 'rgba(255,255,255,0.02)';
                          const tierStr2  = ` <span style="font-size:9px;opacity:0.7;">(T${tier})</span>`;
                          const bonusNote = (_bonusChk && (displayEE !== wsEE))
                              ? ` <span style="font-size:9px;color:#7eb8ff;">(WS:${wsEE}+${_mgmtBonus+_settledBonus})</span>`
                              : '';
                          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 10px;margin-bottom:2px;border-radius:3px;background:${tierBg};">
                              <div style="min-width:0;flex:1;">
                                  <span style="font-size:12px;color:${tierColor};font-weight:${tier>=2?'700':'500'};">${posName}</span>
                                  ${!meetsFloor ? `<span style="font-size:9px;color:#ef4444;margin-left:5px;">[below floor]</span>` : ''}
                                  <div style="font-size:10px;color:#4b5563;margin-top:1px;">${priL}: ${Calc.fmtNum(posData.priReq)} req · ${secL}: ${Calc.fmtNum(posData.secReq)} req · +${posData.priGain}/${posData.secGain} per train</div>
                              </div>
                              <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:${tierColor};font-weight:700;flex-shrink:0;margin-left:8px;">${displayEE}${tierStr2}${bonusNote}</span>
                          </div>`;
                      });
                      resultDiv.innerHTML = html || '<div style="color:#888;padding:8px;">No positions available.</div>';
                  };
                  ['tcm-hire-man','tcm-hire-int','tcm-hire-end'].forEach(id => {
                      const _hEl = document.getElementById(id);
                      if (!_hEl) return;
                      _hEl.addEventListener('input', e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          const cursor = e.target.selectionStart;
                          const oldLen = e.target.value.length;
                          e.target.value = raw ? Number(raw).toLocaleString('en-US') : '';
                          const newLen = e.target.value.length;
                          e.target.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
                          _hUpdate();
                      });
                  });
_hUpdate();


                  ['tcm-hire-bonus-chk','tcm-hire-mgmt','tcm-hire-settled'].forEach(id => {
                      document.getElementById(id)?.addEventListener('change', _hUpdate);
                      document.getElementById(id)?.addEventListener('input',  _hUpdate);
                  });

                  document.getElementById('tcm-hire-fetch-apps')?.addEventListener('click', async () => {
                      const _appBtn = document.getElementById('tcm-hire-fetch-apps');
                      const _appRes = document.getElementById('tcm-hire-apps-results');
                      if (!_appBtn || !_appRes) return;
                      _appBtn.disabled = true; _appBtn.textContent = '…Loading';
                      _appRes.innerHTML = '<span class="tcm-spin"></span> Fetching applicants…';
                      const _appKey = Storage.getApiKey();
                      if (!_appKey) {
                          _appRes.textContent = '⚠ No API key set.';
                          _appBtn.disabled = false; _appBtn.textContent = '↺ Fetch Applicants';
                          return;
                      }
                      try {
                          const _appData = await new Promise((resolve, reject) => {
                              GM_xmlhttpRequest({
                                  method: 'GET',
                                  url: `${TCM.API_BASE}/company/?selections=applications&key=${_appKey}`,
                                  timeout: 10000,
                                  onload(r) {
                                      try {
                                          const d = JSON.parse(r.responseText);
                                          if (d.error) reject({ code: d.error.code, msg: d.error.error });
                                          else resolve(d);
                                      } catch(e) { reject(new Error('Could not parse API response')); }
                                  },
                                  onerror() { reject(new Error('Network error')); },
                                  ontimeout() { reject(new Error('Request timed out')); }
                              });
                          });
                          const _apps = _appData.company_applications || _appData.applications || {};

                          const _currentEmpIds = new Set(Object.keys(state.employees || {}));
                          const _appList = Object.entries(_apps).filter(([id, app]) => !_currentEmpIds.has(String(id)) && app.status === 'active');
                          if (!_appList.length) {
                              const _hasField = 'company_applications' in _appData;
                              _appRes.innerHTML = _hasField
                                  ? '<span style="color:#9ca3af;">No current applicants.</span>'
                                  : `<span style="color:#f59e0b;">⚠ API returned no applications field. Try refreshing from the top right side of the dashboard and try again!</a></span>`;
                              _appBtn.disabled = false; _appBtn.textContent = '↺ Fetch Applicants';
                              return;
                          }
                          const _appPositions = CompanyData.positions(state.typeName);

                          const _occupiedPos = new Set();
                          Object.values(state.employees || {}).forEach(e => {
                              if (e.position === 'Director') return;
                              _occupiedPos.add(PosNorm.normalize(e.position));
                              _occupiedPos.add(e.position);
                          });
                          const _emptyPositions = new Set(
                              Object.keys(_appPositions || {}).filter(p =>
                                  !_occupiedPos.has(p) && !_occupiedPos.has(PosNorm.normalize(p))
                              )
                          );

                          const _enriched = _appList.map(([id, app]) => {
                              const _man = app.stats?.manual_labor || app.manual_labor || 0;
                              const _int = app.stats?.intelligence || app.intelligence || 0;
                              const _end = app.stats?.endurance    || app.endurance    || 0;
                              const _statMap = { man: _man, int: _int, end: _end };
                              let _bestEE = -1, _bestPos = null, _bestIsEmpty = false;
                              const _posRows = _appPositions ? Object.entries(_appPositions).map(([posName, posData]) => {
                                  const _pri = _statMap[posData.primary]   || 0;
                                  const _sec = _statMap[posData.secondary] || 0;
                                  const _wsEE = Calc.totalEff(_pri, posData.priReq, _sec, posData.secReq);
                                  const _meetsFloor = (_pri / posData.priReq) >= TCM.OPT_MIN_FIT;
                                  const _tier = Calc.eeTier(_wsEE);
                                  const _isEmpty = _emptyPositions.has(posName);
                                  const _thisGain = posData.priGain + posData.secGain;

                                  if (_meetsFloor && _tier >= 1) {
                                      const _prevGain = _bestPos ? ((_appPositions[_bestPos]?.priGain || 0) + (_appPositions[_bestPos]?.secGain || 0)) : -1;
                                      const _replace = !_bestPos ||
                                          (_isEmpty && !_bestIsEmpty) ||
                                          (_isEmpty === _bestIsEmpty && _thisGain > _prevGain) ||
                                          (_isEmpty === _bestIsEmpty && _thisGain === _prevGain && _wsEE > _bestEE);
                                      if (_replace) { _bestEE = _wsEE; _bestPos = posName; _bestIsEmpty = _isEmpty; }
                                  }
                                  return { posName, _wsEE, _meetsFloor, _tier, _gain: _thisGain, _isEmpty };
                              }).sort((a, b) => b._wsEE - a._wsEE) : [];
                              return { id, app, _man, _int, _end, _bestEE, _bestPos, _bestIsEmpty, _posRows };
                          }).sort((a, b) => {
                              if (b._bestIsEmpty !== a._bestIsEmpty) return b._bestIsEmpty ? 1 : -1;
                              return b._bestEE - a._bestEE;
                          });
                          let _appHtml = `<div style="font-size:11px;color:#888;margin-bottom:8px;">${_appList.length} applicant${_appList.length !== 1 ? 's' : ''} — sorted by best EE fit</div>`;
_enriched.forEach(({ id, app, _man, _int, _end, _bestEE, _bestPos, _bestIsEmpty, _posRows }) => {
                              const _realId = app.user?.id || app.user_id || app.userID || app.player_id || id;
                              const _name = app.user?.name || app.name || `#${_realId}`;
                              const _eeColor = _bestEE >= 100 ? '#7eb8ff' : _bestEE >= 50 ? '#f59e0b' : '#ef4444';
                              const _tier = Calc.eeTier(_bestEE);
                              const _topRows = _posRows.map(r => {
                                  const _tierColors = ['#ef4444','#f59e0b','#7eb8ff','#7eb8ff','#a78bfa'];
                                  const _bc = !r._meetsFloor ? '#374151' : _tierColors[r._tier] || '#9ca3af';
                                  const _tierLabel = r._meetsFloor ? ` <span style="font-size:9px;opacity:0.8;">T${r._tier}</span>` : '';
                                  return `<span style="font-size:10px;color:${_bc};background:${_bc}18;border:1px solid ${_bc}55;border-radius:3px;padding:2px 6px;margin:2px;display:inline-block;">${r.posName}: <strong>${r._wsEE}</strong>${_tierLabel}${!r._meetsFloor ? ' <span style="font-size:9px;">[low]</span>' : ''}</span>`;
                              }).join('');
                              _appHtml += `<div style="background:#0d1117;border:1px solid #2a2a2a;border-radius:5px;padding:9px 12px;margin-bottom:6px;">
                                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;flex-wrap:wrap;gap:4px;">
                                      <span style="font-weight:700;color:#f3f4f6;font-size:13px;">
<a href="https://www.torn.com/profiles.php?XID=${_realId}" target="_blank" style="color:#7eb8ff;text-decoration:none;">${_name}</a>
                                          <span style="font-size:11px;color:#888;font-weight:400;">[${_realId}]</span>
                                      </span>
                                      ${_bestPos
                                          ? `<span style="font-size:12px;color:${_eeColor};font-weight:700;">Best: ${_bestPos}${_bestIsEmpty ? ' <span style="font-size:10px;background:rgba(126,184,255,0.15);border:1px solid rgba(126,184,255,0.4);color:#7eb8ff;border-radius:3px;padding:1px 5px;">🆕 EMPTY</span>' : ''} — ${_bestEE} EE <span class="tcm-badge tier-${_tier}">T${_tier}</span></span>`
                                          : '<span style="color:#888;font-size:11px;">No suitable position (Tier 0 in all roles)</span>'}
                                  </div>
                                  <div style="font-size:11px;font-family:\'JetBrains Mono\',monospace;color:#9ca3af;margin-bottom:6px;">MAN: ${_man.toLocaleString()} · INT: ${_int.toLocaleString()} · END: ${_end.toLocaleString()}</div>
                                  <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">All Positions</div>
                                  <div style="display:flex;flex-wrap:wrap;gap:2px;">${_topRows}</div>
                              </div>`;
                          });
                          _appRes.innerHTML = _appHtml;
                      } catch(err) {
                          _appRes.innerHTML = `<span style="color:#ef4444;">⚠ Failed to load applicants: ${err.message || JSON.stringify(err)}</span>`;
                      }
                      _appBtn.disabled = false; _appBtn.textContent = '↺ Fetch Applicants';
                  });
              }
          },

          _tabRolePlanner(state) {
              const { employees, typeName, directorId } = state;
              const positions = CompanyData.positions(typeName) || {};
              const posNames  = Object.keys(positions).sort((a, b) =>
                  (positions[b].priGain + positions[b].secGain) - (positions[a].priGain + positions[a].secGain)
              );
              const cfg  = Storage.getRolePlannerConfig();
              const mode = cfg.mode || 'priority';
              const roles = cfg.roles || [];

              const empCount   = Object.values(employees || {}).filter(e => e.position !== 'Director' && String(Object.keys(employees).find(k => employees[k] === e)) !== String(directorId || '')).length;
              const totalSlots = roles.reduce((s, r) => s + (r.count || 0), 0);
              const overSlots  = totalSlots > empCount;

              const tierColors = ['#ef4444','#f59e0b','#7eb8ff','#7eb8ff','#a78bfa'];
              const fmtEE = ee => `<span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${tierColors[Calc.eeTier(ee)] || '#9ca3af'};">${ee}</span>`;

              let html = `
              <div class="tcm-notice" style="font-size:11px;">
                  Define required headcount per role, then click <strong>Run Assignment</strong>.
                  <br>
                  <strong style="color:#7eb8ff;">Priority mode</strong> — top employees fill the #1 role first, then remaining employees fill #2, etc.
                  &nbsp;|&nbsp;

                  <strong style="color:#a78bfa;">Max EE mode</strong> — assigns everyone to maximise the grand total EE across all roles. (THIS WILL ONLY BOOST TOTAL WS - NOT REVENUE)
              </div>

              <div class="tcm-mode-toggle" style="margin-bottom:12px;">
                  <button class="${mode==='priority'?'active':''}" id="tcm-rp-mode-priority">▲ Priority</button>
                  <button class="${mode==='maxee'?'active':''}" id="tcm-rp-mode-maxee" style="color:${mode==='maxee'?'#a78bfa':''};">∑ Max Total EE</button>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                  <span style="font-size:12px;color:#9ca3af;">${empCount} employees &nbsp;·&nbsp; ${totalSlots} slots defined</span>
                  ${overSlots ? `<span style="color:#f59e0b;font-size:11px;font-weight:700;">⚠ ${totalSlots - empCount} more slots than employees — some will be unfilled</span>` : totalSlots === empCount ? `<span style="color:#7eb8ff;font-size:11px;">✓ Slots match employee count</span>` : `<span style="color:#888;font-size:11px;">${empCount - totalSlots} employees unassigned</span>`}
              </div>

              <div id="tcm-rp-roles-list" style="margin-bottom:10px;">
              ${roles.length === 0 ? `<div class="tcm-notice" style="color:#888;font-size:12px;text-align:center;">No roles defined yet. Click <strong>+ Add Role</strong> or <strong>⟳ Load Current</strong>.</div>` :
              roles.map((role, idx) => {
                  const pd = role.posName ? positions[role.posName] : null;
                  const gainStr = pd ? `+${pd.priGain} ${pd.primary.toUpperCase()} / +${pd.secGain} ${pd.secondary.toUpperCase()}` : '';
                  return `<div class="tcm-rp-role-row" style="display:flex;gap:6px;align-items:center;padding:7px 0;border-bottom:1px solid #2a2a2a;flex-wrap:wrap;">
                      ${mode === 'priority' ? `<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;">
                          <button class="tcm-rp-up" data-idx="${idx}" style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:1px 6px;cursor:pointer;font-size:11px;line-height:1.4;" title="Higher priority">↑</button>
                          <button class="tcm-rp-dn" data-idx="${idx}" style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:1px 6px;cursor:pointer;font-size:11px;line-height:1.4;" title="Lower priority">↓</button>
                      </div>
                      <span style="font-size:12px;font-weight:800;color:#f59e0b;min-width:26px;text-align:center;">#${idx+1}</span>` : ''}
                      <select class="tcm-rp-pos" data-idx="${idx}" style="flex:1;min-width:140px;background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:4px 6px;font-size:12px;">
                          ${posNames.map(p => `<option value="${p}" ${p===role.posName?'selected':''}>${p}</option>`).join('')}
                      </select>
                      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                          <span style="font-size:11px;color:#888;">Count:</span>
                          <input type="number" class="tcm-rp-count" data-idx="${idx}" value="${role.count||1}" min="1" max="${empCount}"
                              style="width:52px;background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:3px 6px;font-size:13px;text-align:center;font-family:'JetBrains Mono',monospace;"/>
                      </div>
                      <span style="font-size:10px;color:#4b5563;min-width:110px;">${gainStr}</span>
                      <button class="tcm-rp-rm" data-idx="${idx}" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#ef4444;border-radius:3px;padding:3px 8px;cursor:pointer;font-size:11px;flex-shrink:0;">✕</button>
                  </div>`;
              }).join('')}
              </div>

              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                  <button class="tcm-btn green" id="tcm-rp-add">+ Add Role</button>
                  <button class="tcm-btn" id="tcm-rp-load-current">⟳ Load Current Roster</button>
                  <button class="tcm-btn green" id="tcm-rp-run" style="font-weight:800;padding:5px 16px;margin-left:auto;">▶ Run Assignment</button>
              </div>

              <div id="tcm-rp-results"></div>`;
              return html;
          },

          _renderRolePlannerResults(result, roles, positions, unassigned, mode) {
              const tierColors = ['#ef4444','#f59e0b','#7eb8ff','#7eb8ff','#a78bfa'];
              const totalEE = result.reduce((s, r) => s + r.assignments.reduce((a, b) => a + b.ee, 0), 0);
              let html = `
              <div style="background:#0a0e14;border:1px solid rgba(126,184,255,0.2);border-radius:6px;padding:12px 14px;margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                      <span style="font-size:13px;font-weight:800;color:#7eb8ff;">${mode === 'priority' ? '▲ Priority Assignment' : '∑ Max Total EE Assignment'} Results</span>
                      <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;color:#7eb8ff;">Grand Total EE: ${totalEE}</span>
                  </div>`;

              result.forEach((r, idx) => {
                  const posData = positions[r.roleName];
                  const roleEE  = r.assignments.reduce((s, a) => s + a.ee, 0);
                  const avg     = r.assignments.length ? Math.round(roleEE / r.assignments.length) : 0;
                  const avgColor = tierColors[Calc.eeTier(avg)] || '#9ca3af';
                  html += `
                  <div style="margin-bottom:8px;padding:8px 10px;background:#111827;border:1px solid #2a2a2a;border-radius:5px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
                          <span style="font-weight:700;color:#ddd;font-size:13px;">${mode === 'priority' ? `<span style="color:#f59e0b;">#${idx+1}</span> ` : ''}${r.roleName}</span>
                          <div style="display:flex;gap:10px;font-size:11px;font-family:'JetBrains Mono',monospace;">
                              <span style="color:#9ca3af;">Total EE: <strong style="color:#7eb8ff;">${roleEE}</strong></span>
                              <span style="color:#9ca3af;">Avg EE: <strong style="color:${avgColor};">${avg}</strong></span>
                              ${r.unfilledSlots > 0 ? `<span style="color:#ef4444;font-weight:700;">⚠ ${r.unfilledSlots} unfilled</span>` : `<span style="color:#7eb8ff;">✓ ${r.assignments.length}/${r.count}</span>`}
                          </div>
                      </div>
                      <div style="display:flex;flex-wrap:wrap;gap:5px;">
                          ${r.assignments.map(a => {
                              const tier = Calc.eeTier(a.ee);
                              const col  = tierColors[tier] || '#9ca3af';
                              return `<span style="background:#0d1117;border:1px solid ${col}44;border-radius:4px;padding:3px 8px;font-size:11px;">
                                  <span style="color:#ddd;font-weight:600;">${a.name}</span>
                                  <span style="color:${col};font-family:'JetBrains Mono',monospace;font-weight:700;margin-left:5px;">${a.ee}</span>
                                  <span style="color:#4b5563;font-size:9px;margin-left:2px;">T${tier}</span>
                              </span>`;
                          }).join('')}
                          ${r.unfilledSlots > 0 ? Array.from({length: r.unfilledSlots}, () =>
                              `<span style="background:#130808;border:1px dashed rgba(239,68,68,0.3);border-radius:4px;padding:3px 10px;font-size:11px;color:#4b5563;">empty slot</span>`
                          ).join('') : ''}
                      </div>
                  </div>`;
              });

              if (unassigned.length > 0) {
                  html += `<div style="padding:8px 10px;background:#0d1117;border:1px solid #2a2a2a;border-radius:5px;margin-top:4px;">
                      <div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;">Unassigned (${unassigned.length})</div>
                      <div style="display:flex;flex-wrap:wrap;gap:4px;">
                          ${unassigned.map(e => `<span style="background:#111827;border:1px solid #374151;border-radius:3px;padding:2px 7px;font-size:11px;color:#888;">${e.name}</span>`).join('')}
                      </div>
                  </div>`;
              }

              html += `</div>`;
              return html;
          },
          _tabHiring(state) {
              const positions = CompanyData.positions(state.typeName);
              if (!positions) return '<div class="tcm-notice">No position data for this company type.</div>';
              const posNames = Object.keys(positions).sort((a, b) =>
                  (positions[b].priGain + positions[b].secGain) - (positions[a].priGain + positions[a].secGain)
              );
return `
                  <div class="tcm-notice" style="font-size:11px;border-color:rgba(255,255,255,0.2);">
                      <span style="color:#ffffff;font-weight:700;">⚠ Estimates only — no official EE formula exists.</span><br>
                      <span style="color:#9ca3af;">Enter a candidate's working stats to preview WS EE in every position.</span><br>
                      <span style="color:#7eb8ff;">◀ T1</span> · <span style="color:#7eb8ff;font-weight:700;">◀◀ T2 (green)</span> · <span style="color:#a78bfa;font-weight:700;">★ T3 (purple)</span> · <span style="color:#ef4444;">dim = below 35% floor</span>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
                      <div>
                          <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px;">Manual Labor</div>
                          <input id="tcm-hire-man" type="text" inputmode="numeric" value="" placeholder="e.g. 50,000"
                              style="width:100%;box-sizing:border-box;background:#111827;border:1px solid #374151;color:#f3f4f6;padding:6px 8px;border-radius:4px;font-size:14px;font-family:'JetBrains Mono',monospace;outline:none;">
                      </div>
                      <div>
                          <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px;">Intelligence</div>
                          <input id="tcm-hire-int" type="text" inputmode="numeric" value="" placeholder="e.g. 50,000"
                              style="width:100%;box-sizing:border-box;background:#111827;border:1px solid #374151;color:#f3f4f6;padding:6px 8px;border-radius:4px;font-size:14px;font-family:'JetBrains Mono',monospace;outline:none;">
                      </div>
                      <div>
                          <div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:4px;">Endurance</div>
                          <input id="tcm-hire-end" type="text" inputmode="numeric" value="" placeholder="e.g. 50,000"
                              style="width:100%;box-sizing:border-box;background:#111827;border:1px solid #374151;color:#f3f4f6;padding:6px 8px;border-radius:4px;font-size:14px;font-family:'JetBrains Mono',monospace;outline:none;">
                      </div>
                  </div>
<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;
                              background:#111827;border:1px solid #2a2a2a;border-radius:5px;
                              margin-bottom:10px;flex-wrap:wrap;">
                      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;
                                    font-size:12px;color:#ddd;white-space:nowrap;">
                          <input type="checkbox" id="tcm-hire-bonus-chk"
                              style="accent-color:#7eb8ff;width:14px;height:14px;" />
                          Include bonuses in EE display
                      </label>
                      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                          <span style="font-size:11px;color:#9ca3af;white-space:nowrap;">+Director's Education</span>
                          <input id="tcm-hire-mgmt" type="number" min="0" value="0"
                              style="width:52px;background:#0d1117;border:1px solid #374151;
                              border-radius:3px;color:#ddd;padding:3px 5px;font-size:12px;text-align:center;"/>
                          <span style="font-size:11px;color:#9ca3af;white-space:nowrap;">+Settled-In</span>
                          <input id="tcm-hire-settled" type="number" min="0" value="0"
                              style="width:52px;background:#0d1117;border:1px solid #374151;
                              border-radius:3px;color:#ddd;padding:3px 5px;font-size:12px;text-align:center;"/>
                          <span style="font-size:10px;color:#4b5563;">Added on top of WS EE for each position score</span>
                      </div>
                  </div>
                  <div style="font-size:11px;color:#888;margin-bottom:8px;">Updates live as you type · sorted by stat gain</div>
                  <div id="tcm-hire-results"></div>
                  <hr style="border:none;border-top:1px solid #2a2a2a;margin:14px 0 10px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                      <span style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Current Applicants</span>
                      <button class="tcm-btn green" id="tcm-hire-fetch-apps" style="font-size:11px;padding:3px 10px;">↺ Fetch Applicants</button>
                  <a href="https://www.torn.com/companies.php?step=your&type=1#/option=applications" target="_blank"
                     style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);color:#7eb8ff;
                     border-radius:4px;padding:3px 10px;font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap;">
                     ↗ View Applications in Torn</a>
                  </div>
                  <div id="tcm-hire-apps-results" style="font-size:12px;color:#888;">Click "Fetch Applicants" to load and evaluate current job applications.</div>
              `;
          },
_tabEEPerformance(state, posKey = 'eerank_selected_pos') {
              const { employees, typeName, directorId } = state;
              const positions = CompanyData.positions(typeName);
              if (!positions) return '<div class="tcm-notice">No position data for this company type.</div>';
              const statKey = { man:'manual_labor', int:'intelligence', end:'endurance' };
              const posNames = Object.keys(positions).sort((a, b) =>
                  (positions[b].priGain + positions[b].secGain) - (positions[a].priGain + positions[a].secGain)
              );
              let html = `<div class="tcm-notice" style="font-size:11px;border-color:rgba(255,255,255,0.2);">
                  <span style="color:#ffffff;font-weight:700;">⚠ These are estimates only. Torn has never published an official EE formula. Numbers may differ from what the game shows.</span><br>
                  <span style="color:#ffffff;">WS EE calculated per position using the script's approximation: linear(stat/req) + log₂(stat/req) components, capped at 50 each.</span><br>
                  <span style="color:#7eb8ff;">◀ current position</span> ·
                  <span style="color:#a78bfa;">★ best available</span> ·
                  <span style="color:#888;">dim = below 35% stat floor</span>
              </div>`;
              const empList = Object.entries(employees || {})
                  .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                  .sort((a, b) => (b[1].effectiveness?.total || 0) - (a[1].effectiveness?.total || 0));
              if (!empList.length) return html + '<div class="tcm-notice">No employees.</div>';
              empList.forEach(([id, emp]) => {
                  const currentRes = PosNorm.resolve(emp.position, positions);
                  const currentKey = currentRes?.key || emp.position;
                  const apiTotal   = emp.effectiveness?.total || 0;
                  const apiWs      = emp.effectiveness?.working_stats || 0;
                  const merits     = (emp.effectiveness?.merits || 0) + (emp.effectiveness?.settled_in || 0);
                  let bestEE = -1, bestPos = null;
                  const eeMap = {};
                  posNames.forEach(posName => {
                      const pd = positions[posName];
                      const pri = emp[statKey[pd.primary]]   || 0;
                      const sec = emp[statKey[pd.secondary]] || 0;
                      const meetsFloor = (pri / pd.priReq) >= TCM.OPT_MIN_FIT;
      const wsEE = Calc.totalEff(pri, pd.priReq, sec, pd.secReq);
      const totalEE = wsEE;
      eeMap[posName] = { wsEE, totalEE, meetsFloor };
      if (meetsFloor && totalEE > bestEE) { bestEE = totalEE; bestPos = posName; }
                  });
                  const rows = posNames.map(posName => {
                      const { wsEE, totalEE, meetsFloor } = eeMap[posName];
                      const isCurrent = posName === currentKey;
                      const isBest    = posName === bestPos && !isCurrent;
                      const tier      = Calc.eeTier(totalEE);
                      let col = '#888', bg = 'transparent', fw = '400';
                      if (!meetsFloor)       { col = '#2d3748'; }
                      else if (isCurrent)    { col = '#7eb8ff'; bg = 'rgba(126,184,255,0.08)'; fw = '700'; }
                      else if (isBest)       { col = '#a78bfa'; bg = 'rgba(167,139,250,0.08)'; fw = '700'; }
                      else                   { col = '#9ca3af'; fw = '500'; }
                      const tierStr = meetsFloor ? ` <span style="font-size:9px;opacity:0.7;">(T${tier})</span>` : '';
                      const label   = posName + (isCurrent ? ' ◀' : isBest ? ' ★' : '');
                      const tierColor = !meetsFloor ? '#ef4444' : tier === 3 ? '#a78bfa' : tier === 2 ? '#7eb8ff' : '#9ca3af';
                      const tierBg    = !meetsFloor ? 'rgba(239,68,68,0.08)' : tier === 3 ? 'rgba(167,139,250,0.08)' : tier === 2 ? 'rgba(126,184,255,0.08)' : 'rgba(255,255,255,0.03)';
                      const tierStr2  = ` <span style="font-size:9px;opacity:0.7;">(T${tier})</span>`;
                      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 8px;margin-bottom:2px;border-radius:3px;background:${isCurrent||isBest?bg:tierBg};">
                          <span style="font-size:11px;color:${isCurrent||isBest?col:tierColor};font-weight:${fw};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;" title="${posName}${!meetsFloor?' (below 35% stat floor)':''}">${label}${!meetsFloor?' <span style="font-size:9px;">[low]</span>':''}</span>
                          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${isCurrent||isBest?col:tierColor};font-weight:700;flex-shrink:0;">${totalEE}${tierStr2}</span>
                      </div>`;
                  }).join('');
                  const man = emp.manual_labor || 0;
                  const int_ = emp.intelligence || 0;
                  const end_ = emp.endurance || 0;
                  html += `<div class="tcm-card" style="margin-bottom:8px;"><div class="tcm-card-body" style="padding:8px 12px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
                          <span style="font-weight:700;color:#7eb8ff;font-size:13px;">${emp.name}</span>
                          <div style="font-size:11px;color:#9ca3af;text-align:right;">
                              <span style="color:#f3f4f6;font-weight:700;">${currentKey}</span> ·
                              API Total: <span style="color:#7eb8ff;font-weight:700;">${apiTotal}</span> ·
                              WS: <span style="color:#9ca3af;">${apiWs}</span>
                              ${merits ? ` · Bonuses: <span style="color:#7eb8ff;">+${merits}</span>` : ''}
                          </div>
                      </div>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;padding:5px 8px;background:#0a0e14;border-radius:4px;border:1px solid #2a2a2a;">
                          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:#9ca3af;">MAN: <strong style="color:#ddd;">${Calc.fmtNum(man)}</strong></span>
                          <span style="font-size:11px;color:#374151;">·</span>
                          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:#9ca3af;">INT: <strong style="color:#ddd;">${Calc.fmtNum(int_)}</strong></span>
                          <span style="font-size:11px;color:#374151;">·</span>
                          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:#9ca3af;">END: <strong style="color:#ddd;">${Calc.fmtNum(end_)}</strong></span>
                      </div>
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">${rows}</div>
                  </div></div>`;
              });
              html = `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
                  <button class="tcm-btn" id="tcm-eeperf-export-btn" style="font-size:11px;padding:3px 10px;">↓ Export CSV</button>
              </div>` + html;

              const _prPosNames = Object.keys(positions).sort((a, b) =>
                  (positions[b].priGain + positions[b].secGain) - (positions[a].priGain + positions[a].secGain)
              );
const _prSavedPos = Storage.get(posKey, '');
              html += `
              <div class="tcm-section-label" style="margin-top:14px;">Position Ranking</div>
              <div class="tcm-notice" style="font-size:11px;">Select a position to rank all employees by their EE in that role. WS EE is calculated using that position's stat requirements, plus merits, settled-in, and management. Addiction is excluded from all calculations.</div>
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
                  <select id="tcm-eerank-pos" class="tcm-input" style="flex:1;min-width:160px;">
                      <option value="">— Select position —</option>
                      ${_prPosNames.map(p => `<option value="${p}" ${p === _prSavedPos ? 'selected' : ''}>${p}</option>`).join('')}
                  </select>
                  <button class="tcm-btn green" id="tcm-eerank-export-btn" style="font-size:11px;padding:3px 10px;">↓ Export CSV</button>
              </div>
              <div id="tcm-eerank-results">${_prSavedPos ? this._buildPosRankingHTML(_prSavedPos, state) : '<div style="color:#888;font-size:12px;">Select a position above to see the ranking.</div>'}</div>`;

              return html;
          },

          _buildPosRankingHTML(posName, state) {
              const { employees, typeName, directorId } = state;
              const positions = CompanyData.positions(typeName);
              if (!positions || !posName || !positions[posName]) return '<div style="color:#888;font-size:12px;">Position not found.</div>';
              const posData = positions[posName];
              const statKey = { man:'manual_labor', int:'intelligence', end:'endurance' };
              const statLabel = { man:'MAN', int:'INT', end:'END' };

              const ranked = Object.entries(employees || {})
                  .filter(([id, e]) => {
                      if (e.position === 'Director' || String(id) === String(directorId || '')) return false;
                      const empPosNorm = PosNorm.normalize(e.position);
                      return empPosNorm === posName || e.position === posName;
                  })
                  .map(([id, emp]) => {
                      const pri = emp[statKey[posData.primary]] || 0;
                      const sec = emp[statKey[posData.secondary]] || 0;
                      const wsEE = Calc.totalEff(pri, posData.priReq, sec, posData.secReq);
                      const merits = 0;
                      const settled = 0;
                      const mgmt = 0;
                      const rankEE = wsEE;
                      const tier = Calc.eeTier(rankEE);
                      const curNorm = PosNorm.normalize(emp.position);
                      const isCurrentPos = curNorm === posName || emp.position === posName;
                      return { id, name: emp.name, position: emp.position, pri, sec, wsEE, merits, settled, mgmt, rankEE, tier, isCurrentPos };
                  })
                  .sort((a, b) => b.rankEE - a.rankEE);

              if (!ranked.length) return `<div style="color:#888;font-size:12px;padding:8px 0;">No employees are currently assigned to <strong style="color:#ddd;">${posName}</strong>. Only employees in the selected position are shown here.</div>`;

              return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead><tr style="background:#0a0e14;">
                  <th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">#</th>
                  <th style="text-align:left;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Employee</th>
                  <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">${statLabel[posData.primary]}</th>
                  <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">${statLabel[posData.secondary]}</th>
                  <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">WS EE</th>
                  <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Bonuses</th>
                  <th style="text-align:center;padding:5px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">WS EE</th>
                  <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Tier</th>
              </tr></thead>
              <tbody>
              ${ranked.map((r, i) => `<tr style="border-bottom:1px solid #111827;${r.isCurrentPos ? 'background:rgba(126,184,255,0.04);' : ''}">
                  <td style="padding:5px 8px 5px 0;color:#888;font-family:'JetBrains Mono',monospace;font-size:11px;">${i + 1}</td>
                  <td style="padding:5px 4px;">
                      <span style="color:#ddd;font-weight:600;">${r.name}</span>${r.isCurrentPos ? ' <span style="font-size:9px;color:#7eb8ff;background:rgba(126,184,255,0.15);border:1px solid rgba(126,184,255,0.3);border-radius:2px;padding:1px 4px;margin-left:3px;">current</span>' : ''}
                      <br><span style="font-size:10px;color:#888;">${r.position}</span>
                  </td>
                  <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#d1d5db;">${Calc.fmtNum(r.pri)}</td>
                  <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#d1d5db;">${Calc.fmtNum(r.sec)}</td>
                  <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#9ca3af;">${r.wsEE}</td>
                  <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#7eb8ff;">+${r.merits + r.settled + r.mgmt}</td>
                  <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;color:${r.rankEE >= 100 ? '#7eb8ff' : r.rankEE >= 50 ? '#f59e0b' : '#ef4444'};">${r.rankEE}</td>
                  <td style="text-align:center;padding:5px 4px;"><span class="tcm-badge tier-${r.tier}">T${r.tier}</span></td>
              </tr>`).join('')}
              </tbody></table></div>
              <div style="font-size:10px;color:#888;margin-top:4px;">Pure WS EE only — no bonuses, no addiction applied · Uses ${posName} stat requirements</div>`;
          },

          _tabBenchmark(state) {
              const { typeName, typeInt } = state;
              if (!typeName || !typeInt) return '<div class="tcm-notice">Company data not loaded. Refresh first.</div>';
              const benchSubTab = Storage.getSettings().benchSubTab || 'overview';
              const _subTabHtml = `<div class="tcm-mode-toggle" style="margin-bottom:12px;">
                  <button class="${benchSubTab==='overview'?'active':''}" id="tcm-benchsub-overview">Overview</button>
                  <button class="${benchSubTab==='stats'?'active':''}" id="tcm-benchsub-stats">Employee Stats</button>
              </div>`;
              if (benchSubTab === 'stats') return _subTabHtml + this._tabBenchmarkStats(state);
              return _subTabHtml + this._tabBenchmarkOverview(state);
          },

          _tabBenchmarkOverview(state) {
              const { profile, typeName, typeInt } = state;
              const myStars         = parseInt(profile?.rating || 0) || 0;

              const myDailyIncome   = profile?.daily_income || 0;
              const myCapacity      = parseInt(profile?.employees_capacity || profile?.employees_hired || 10);
              const benchSizeFilter = Storage.getSettings().benchSameSize;
              let savedCat = App._benchSelectedCat || Storage.getSettings().benchSelectedCat || 'same';
              if (myStars >= 10 && savedCat === 'above') savedCat = 'same';
              App._benchSelectedCat = savedCat;
              const cache           = Storage.getBenchmarkCache(savedCat, benchSizeFilter);
              const cacheAge        = cache ? Math.round((Date.now() - (cache.ts || 0)) / 60000) : null;
              const _resetTs = (() => {
                  const _n = new Date();
                  const _t = new Date(Date.UTC(_n.getUTCFullYear(), _n.getUTCMonth(), _n.getUTCDate(), 18, 15, 0));
                  return _n.getTime() < _t.getTime() ? _t.getTime() - 86400000 : _t.getTime();
              })();
              const cacheValid      = cache && cache.typeInt === typeInt
                  && cache.sameSize === benchSizeFilter
                  && (cache.ts || 0) > _resetTs;
const catLabels = { same: `${myStars}★ Same`, above: `${myStars+1}–${Math.min(myStars+3,10)}★`, top: '8–10★ Top' };
              const _benchEtaCount  = Math.max(1, Math.min(300, Storage.getSettings().benchFetchCount || 50));
              const _benchEtaWs     = Storage.getSettings().benchFetchWorkingStats;
              const _benchEtaRate   = Math.max(10, Math.min(100, parseInt(Storage.getSettings().apiRateLimit) || 60));
              const _benchEtaCalls  = _benchEtaCount + (_benchEtaWs ? _benchEtaCount * myCapacity : 0);
              const _benchEtaMins   = Math.max(1, Math.ceil(_benchEtaCalls / _benchEtaRate));
              const _benchEtaTxt    = `Estimated: ~${_benchEtaCalls.toLocaleString()} API calls · ~${_benchEtaMins} min at ${_benchEtaRate}/min${_benchEtaWs ? ` (assumes ~${myCapacity} employees/company)` : ''}`;
              let html = `<div class="tcm-section-label">Company Benchmark — ${typeName}</div>
              <div class="tcm-notice" style="font-size:11px;">
                  Pick a category, then load. Fetches the top <strong>${_benchEtaCount}</strong> companies in that tier (adjustable below, up to 300). Results cached 4 hours.<br>
                  <strong>API cost:</strong> 1 call for the list + 1 per company fetched${_benchEtaWs ? ' + 1 per employee (working stats)' : ''} — <strong>~${_benchEtaCalls.toLocaleString()} calls total</strong> this run. Does not run automatically.
              </div>

              <div style="margin-bottom:10px;">
                  <div style="font-size:11px;color:#888;margin-bottom:6px;">Compare against:</div>
                  <div class="tcm-mode-toggle" style="margin-bottom:8px;">
                      <button class="tcm-bench-cat ${savedCat==='same'?'active':''}" data-cat="same">${myStars}★ Same Rating</button>
                      ${myStars < 10 ? `<button class="tcm-bench-cat ${savedCat==='above'?'active':''}" data-cat="above">${myStars+1}–${Math.min(myStars+3,10)}★</button>` : ''}
                      <button class="tcm-bench-cat ${savedCat==='top'?'active':''}" data-cat="top">8–10★ Top</button>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
                      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ddd;">
                          <input type="checkbox" id="tcm-bench-samesize" ${Storage.getSettings().benchSameSize ? 'checked' : ''}
                              style="accent-color:#7eb8ff;width:14px;height:14px;" />
                          Same capacity only (${myCapacity}-slot)
                      </label>
<span style="font-size:11px;color:#888;">— unchecked = all sizes</span>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
                      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ddd;">
                          <input type="checkbox" id="tcm-bench-workingstats" ${Storage.getSettings().benchFetchWorkingStats ? 'checked' : ''}
                              style="accent-color:#7eb8ff;width:14px;height:14px;" />
                          Fetch working stats
                      </label>
                      <span style="font-size:11px;color:#888;">— +1 API call per employee, much slower</span>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                      <div style="display:flex;align-items:center;gap:5px;background:#0a0e14;border:1px solid #2a2a2a;border-radius:4px;padding:4px 8px;">
                          <span style="font-size:11px;color:#9ca3af;white-space:nowrap;">Companies to fetch:</span>
                          <input type="number" id="tcm-bench-count" min="1" max="300"
                              value="${Math.max(1, Math.min(300, Storage.getSettings().benchFetchCount || 50))}"
                              style="width:54px;background:#0d1117;border:1px solid #374151;border-radius:3px;
                              color:#ddd;padding:2px 5px;font-size:12px;text-align:center;font-family:'JetBrains Mono',monospace;"/>
                          <span style="font-size:10px;color:#4b5563;">/ 300 max</span>
                      </div>
                      <button class="tcm-btn green" id="tcm-bench-load" style="font-size:12px;padding:4px 10px;">
                          ${cacheValid ? '↺ Reload' : '▶ Load Benchmark'}
                      </button>
                      ${cacheValid ? `<button class="tcm-btn" id="tcm-bench-export" style="font-size:12px;padding:4px 10px;">↓ Export Data</button>` : ''}
                      ${cacheValid ? `<button class="tcm-btn red" id="tcm-bench-delete-cache" style="font-size:12px;padding:4px 10px;">✕ Clear Cache</button>` : ''}
${cacheValid ? `<span style="font-size:11px;color:#888;">(cached ${cacheAge}m ago · ${cache.fetchedCount||0} co. · ${catLabels[cache.filter]||cache.filter||'?'})</span>` : ''}
                  </div>
                  <div id="tcm-bench-eta" style="font-size:11px;color:#888;margin-top:4px;">${_benchEtaTxt}</div>
              </div>`;

              if (!cacheValid) {
                  const _bf = App._benchFetching;
                  const _partial2 = Storage.getBenchmarkPartial();
                  const _hasResumable = _partial2
                      && _partial2.filter === savedCat
                      && _partial2.sameSize === benchSizeFilter
                      && _partial2.typeInt === typeInt
                      && (_partial2.done || 0) < (_partial2.total || 1);
                  if (_bf && _bf.category === savedCat) {
                      html += `<div class="tcm-notice" style="border-color:rgba(126,184,255,0.4);color:#7eb8ff;">
                          <span class="tcm-spin"></span> <span id="tcm-bench-progress">Fetching: ${_bf.done}/${_bf.total} companies loaded.</span>
                          <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Progress is saved after every company — if you navigate away, click Resume to continue.</div>
                      </div>`;
                  } else if (_hasResumable) {
                      html += `<div class="tcm-notice" style="border-color:rgba(245,158,11,0.4);color:#f59e0b;">
                          ⚡ Interrupted fetch found: <strong>${_partial2.done}/${_partial2.total}</strong> companies already saved.
                          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                              <button class="tcm-btn green" id="tcm-bench-resume" style="font-size:11px;padding:3px 8px;">↺ Resume Fetch</button>
                              <button class="tcm-btn" id="tcm-bench-discard" style="font-size:11px;padding:3px 8px;">✕ Start Over</button>
                          </div>
                      </div>`;
                      if (App._benchFetchError) {
                          html += `<div class="tcm-rec high" style="margin-bottom:8px;"><div class="rec-title">⚠ Last attempt failed: ${App._benchFetchError}</div></div>`;
                      }
                  } else if (App._benchFetchError) {
                      html += `<div class="tcm-rec high" style="margin-bottom:8px;"><div class="rec-title">⚠ Load failed: ${App._benchFetchError}</div></div>`;
                  } else {
                      html += `<div class="tcm-notice" style="border-color:#374151;color:#9ca3af;">
                          No benchmark data for this category. Click "Load Benchmark" to fetch.<br>
                          <span style="font-size:10px;">Your stars: ${myStars} · Type ID: ${typeInt} · Capacity: ${myCapacity}</span>
                      </div>`;
                  }
                  return html;
              }


          const allCos    = Object.values(cache.companies || {});
          const _myWeeklyForTab = profile?.weekly_income || (myDailyIncome * 7);
const _coIncTab = c => c.weekly_income || (c.daily_income || 0) * 7;
const sorted    = [...allCos].sort((a, b) => _coIncTab(b) - _coIncTab(a));
const _rIdx  = sorted.findIndex(c => _coIncTab(c) <= _myWeeklyForTab);
          const total     = cache.totalCos   || sorted.length;
          const myRank = cache.myRankFull || (_rIdx === -1 ? total : _rIdx + 1);
          const rankPct   = total > 0 ? Math.round((myRank / total) * 100) : 50;
          const rankCol   = rankPct <= 20 ? '#7eb8ff' : rankPct <= 50 ? '#f59e0b' : '#ef4444';


          const poolTotal    = cache.totalAvailable || cache.fetchedCount || 0;
          const poolFetched  = cache.fetchedCount   || 0;
          const poolLabel    = `${catLabels[savedCat] || savedCat}${benchSizeFilter ? ` · ${myCapacity}-slot only` : ' · all sizes'} · income > yours`;


          const top5 = sorted.slice(0, 5);

              html += `<div class="tcm-card"><div class="tcm-card-body">
                  <div class="tcm-row"><span class="lbl">Your income rank (all ${typeName})</span>
                      <span class="val" style="color:${rankCol};">
                          #${myRank} / ${total}
                          <span style="font-size:10px;color:#888;"> (top ${rankPct}% of all ${total} companies)</span>
                      </span>
                  </div>
                  <div class="tcm-row">
                      <span class="lbl">Benchmark pool</span>
                      <span class="val" style="font-size:11px;">${poolFetched === poolTotal ? poolTotal : `${poolFetched} fetched / ${poolTotal} in pool`} companies</span>
                  </div>
                  <div style="font-size:11px;color:#888;padding:3px 0 4px;">${poolLabel}</div>
              </div></div>`;

              if (savedCat === 'top') {
                  html += `<div class="tcm-section-label" style="margin-top:4px;">Top 5 Companies by Daily Income</div>
                  <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
                  <thead><tr>
                      <th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">#</th>
                      <th style="text-align:left;padding:5px 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Company</th>
                      <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">★</th>
                      <th style="text-align:right;padding:5px 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Daily Income</th>
                  </tr></thead><tbody>
                  ${top5.map((c, i) => `<tr style="border-bottom:1px solid #111827;">
                      <td style="padding:5px 8px 5px 0;color:#888;font-family:'JetBrains Mono',monospace;">${i+1}</td>
                      <td style="padding:5px 4px;color:#ddd;font-weight:600;">${c.name || 'Unknown'}</td>
                      <td style="text-align:center;padding:5px 4px;color:#fbbf24;">${c.rating || '?'}</td>
                      <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;color:#7eb8ff;font-weight:700;">${Calc.fmtCash(c.daily_income || Math.round((c.weekly_income||0)/7))}/day</td>
                  </tr>`).join('')}
                  </tbody></table></div>`;
              }


const compData     = cache.companyData || {};
              const companyCount = Object.keys(compData).length;
              if (!companyCount) {
                  html += `<div class="tcm-notice" style="margin-top:8px;">No employee roster data available in this cache. Reload benchmark to fetch.</div>`;
                  return html;
              }

              const _wsFetchedFlagCount = Object.values(compData).reduce((s, co) => s + Object.values(co || {}).filter(e => typeof e.workingStats?.value === 'number' && e.workingStats.value > 0).length, 0);
              if (_wsFetchedFlagCount) {
                  html += `<div class="tcm-notice" style="margin-top:8px;">${_wsFetchedFlagCount} employees have working stats fetched. See the <strong>Employee Stats</strong> sub-tab above for the full list, sortable/searchable, plus per-position averages.</div>`;
} else if (Storage.getSettings().benchFetchWorkingStats) {
                  html += `<div class="tcm-notice" style="margin-top:8px;">No working stats came back for this cache. Most likely your API key is missing the <strong>hof</strong> permission (required to pull other players' working stats) — regenerate your key with that scope via Settings, then click <strong>↺ Reload</strong>. It can also happen if this was fetched before the checkbox was on, or requests got rate-limited.</div>`;
              } else {
                  html += `<div class="tcm-notice" style="margin-top:8px;">No working stats fetched for this cache. Check <strong>Fetch working stats</strong> above, then <strong>↺ Reload</strong> to pull it.</div>`;
              }


              const myPos = {};
              for (const emp of Object.values(state.employees || {})) {
                  if (emp.position === 'Director') continue;
                  myPos[emp.position] = (myPos[emp.position] || 0) + 1;
              }

              const coIdsWithData = Object.keys(compData);
              const _getCo = id => (cache.companies || {})[id] || {};

              const allPosCounts = {};
              for (const id of coIdsWithData) {
                  for (const emp of Object.values(compData[id] || {})) {
                      if (emp.position === 'Director') continue;
                      allPosCounts[emp.position] = (allPosCounts[emp.position] || 0) + 1;
                  }
              }


              const buildSegTable = (ids, label, notice) => {
                  if (!ids.length) return `<div style="color:#888;font-size:12px;padding:6px 0 12px;">No ${label} companies in fetched data.</div>`;
                  const counts = {};
                  for (const id of ids) {
                      for (const emp of Object.values(compData[id] || {})) {
                          if (emp.position === 'Director') continue;
                          counts[emp.position] = (counts[emp.position] || 0) + 1;
                      }
                  }
                  const rows = Object.entries(counts)
      .map(([pos, cnt]) => {
          const companiesWithRole = ids.filter(id =>
              Object.values(compData[id] || {}).some(emp => emp.position === pos)
          ).length;
          return { pos, cnt, avg: (cnt / ids.length).toFixed(1), pct: Math.round((companiesWithRole / ids.length) * 100) };
      })
      .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
                  const topPos = rows.filter(r => parseFloat(r.avg) >= 0.5).map(r => r.pos);
                  const missing = topPos.filter(p => !myPos[PosNorm.normalize(p)] && !myPos[p]);
                  let out = `<div class="tcm-section-label" style="margin-top:12px;">${label} <span style="font-size:10px;color:#888;font-weight:400;text-transform:none;letter-spacing:0;">(${ids.length} co.)</span></div>`;
                  if (notice) out += `<div class="tcm-notice" style="font-size:11px;">${notice}</div>`;
                  out += `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
                  <thead><tr>
                      <th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Position</th>
                      <th style="padding:5px 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Usage</th>
                      <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Avg/Co</th>
                      <th style="text-align:center;padding:5px 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Yours</th>
                  </tr></thead><tbody>
                  ${rows.map(r => {
                      const mine   = myPos[PosNorm.normalize(r.pos)] || myPos[r.pos] || 0;
                      const avgNum = parseFloat(r.avg);
                      const barCol = r.pct >= 70 ? '#7eb8ff' : r.pct >= 40 ? '#f59e0b' : '#888';

                      let yoursCol = '#374151', yoursTag = '';
                      if (mine > 0) {
                          if (avgNum >= 1 && mine < avgNum * 0.6) {
                              yoursCol = '#f59e0b'; yoursTag = ' ▼';
                          } else if (mine > avgNum * 1.4 && mine > avgNum + 1) {
                              yoursCol = '#f87171'; yoursTag = ' ▲';
                          } else if (avgNum < 0.5 && mine >= 1) {
                              yoursCol = '#f87171'; yoursTag = ' ▲';
                          } else {
                              yoursCol = '#7eb8ff';
                          }
                      }
                      const yoursTip = yoursTag === ' ▼'
                          ? `You have ${mine} but the average is ${avgNum.toFixed(1)} — consider adding more`
                          : yoursTag === ' ▲'
                          ? `This role is rare (avg ${avgNum.toFixed(1)}/company) but you have ${mine} — consider replacing some`
                          : '';
                      return `<tr style="border-bottom:1px solid #111827;">
                          <td style="padding:6px 8px 6px 0;color:${mine > 0 ? '#7eb8ff' : '#9ca3af'};font-weight:${mine > 0 ? '700' : '400'};">${r.pos}</td>
                          <td style="padding:5px 4px;"><div style="display:flex;align-items:center;gap:5px;">
                              <div style="flex:1;height:5px;background:#2a2a2a;border-radius:2px;min-width:40px;">
                                  <div style="width:${Math.min(100,r.pct)}%;height:100%;background:${barCol};border-radius:2px;"></div>
                              </div>
                              <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${barCol};min-width:28px;">${r.pct}%</span>
                          </div></td>
                          <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#9ca3af;">${r.avg}</td>
                          <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:${yoursCol};"
                              title="${yoursTip}">${mine > 0 ? mine + yoursTag : '—'}</td>
                      </tr>`;
                  }).join('')}
                  </tbody></table></div>`;
                  const _avgTotalEmps = (Object.values(counts).reduce((s, c) => s + c, 0) / Math.max(1, ids.length)).toFixed(1);
          out += `<div style="font-size:11px;color:#888;padding:4px 0 2px;">Avg non-director employees/company in this set: <strong style="color:#9ca3af;">${_avgTotalEmps}</strong> — position Avg/Co values should sum to roughly this number.</div>`;
          if (missing.length) {
              out += `<div class="tcm-warn-box" style="margin-top:6px;margin-bottom:4px;">⚠ You're missing: <strong>${missing.join(', ')}</strong></div>`;
          }
          return out;
      };


              if (myStars < 10) {
                  const _abcRaw     = Storage.getBenchmarkCache('above', benchSizeFilter);
                  const _abcValid   = _abcRaw && _abcRaw.typeInt === typeInt && _abcRaw.sameSize === benchSizeFilter
                                      && (Date.now() - (_abcRaw.ts || 0)) < 4 * 3600000;
                  if (_abcValid) {
                      const _abCos    = Object.values(_abcRaw.companies || {});
                      const _abSorted = [..._abCos].sort((a, b) => (b.daily_income || 0) - (a.daily_income || 0));
                      const _beatCnt  = _abCos.filter(c => (c.daily_income || 0) < myDailyIncome).length;
                      const _nrIdx    = _abSorted.findIndex(c => (c.daily_income || 0) < myDailyIncome);
                      const _nrRank   = _nrIdx === -1 ? _abCos.length + 1 : _nrIdx + 1;
                      if (_beatCnt > 0) {
                          const _isStrong = _beatCnt >= Math.ceil(_abCos.length * 0.5);
                          html += `<div style="background:rgba(126,184,255,0.07);border:1px solid rgba(126,184,255,0.3);border-radius:6px;padding:10px 14px;margin-bottom:10px;">
                              <div style="font-weight:700;color:#7eb8ff;font-size:13px;">⬆ Rank-Up Potential</div>
                              <div style="font-size:12px;color:#d1d5db;margin-top:5px;line-height:1.6;">
                                  Your daily income beats <strong style="color:#7eb8ff;">${_beatCnt} / ${_abCos.length}</strong> companies at <strong>${myStars + 1}★</strong>.
                                  You'd rank <strong style="color:#7eb8ff;">#${_nrRank}</strong> among ${myStars + 1}★ companies in this sample.
                                  ${_isStrong ? '<br><span style="color:#f59e0b;font-weight:700;">You may be near the rank-up threshold — keep pushing!</span>' : ''}
                              </div>
                          </div>`;
                      }
                  } else {
                      html += `<div style="background:#0d1117;border:1px solid #2a2a2a;border-radius:5px;padding:7px 12px;margin-bottom:10px;font-size:11px;color:#888;">
                          💡 Load the <strong style="color:#9ca3af;">${myStars + 1}–${Math.min(myStars + 3, 10)}★</strong> category to see rank-up potential vs the next tier.
                      </div>`;
                  }
              }

              if (cache.truncated) {
                  html += `<div class="tcm-warn-box">⚠ ${cache.totalAvailable||'50+'} companies exist in this tier — only the top ${cache.fetchedCount || 50} by daily income were fetched. Increase "Companies to fetch" above (up to 300) to widen the sample. Results represent the strongest performers.</div>`;
              }


              const _n = coIdsWithData.length || 1;
              const missing  = [];
              const tooFew   = [];
              const tooMany  = [];

              for (const [pos, cnt] of Object.entries(allPosCounts)) {
                  const avgPer = cnt / _n;
                  const mine   = myPos[PosNorm.normalize(pos)] || myPos[pos] || 0;
                  if (avgPer >= 0.5 && mine === 0) {
                      missing.push(pos);
                  } else if (avgPer >= 1 && mine > 0 && mine < avgPer * 0.6) {
                      tooFew.push(`${pos} (you: ${mine}, avg: ${avgPer.toFixed(1)})`);
                  }
              }
              for (const [pos, mine] of Object.entries(myPos)) {
                  const normalized = PosNorm.normalize(pos);
                  const cnt    = allPosCounts[pos] || allPosCounts[normalized] || 0;
                  const avgPer = cnt / _n;
                  if (mine > avgPer * 1.4 && mine > avgPer + 1) {
                      tooMany.push(`${pos} (you: ${mine}, avg: ${avgPer.toFixed(1)})`);
                  }
              }

              const _hasIssues = missing.length || tooFew.length || tooMany.length;
              if (_hasIssues) {
                  html += `<div class="tcm-card" style="margin-top:8px;margin-bottom:4px;"><div class="tcm-card-body">`;
                  if (missing.length)  html += `<div class="tcm-row"><span class="lbl" style="color:#ef4444;">⚠ Missing roles</span><span style="font-size:12px;color:#f87171;">${missing.join(', ')}</span></div>`;
                  if (tooFew.length)   html += `<div class="tcm-row"><span class="lbl" style="color:#f59e0b;">▼ Too few vs benchmark</span><span style="font-size:12px;color:#fbbf24;">${tooFew.join(' · ')}</span></div>`;
                  if (tooMany.length)  html += `<div class="tcm-row"><span class="lbl" style="color:#f87171;">▲ More than typical — consider replacing</span><span style="font-size:12px;color:#f87171;">${tooMany.join(' · ')}</span></div>`;
                  html += `</div></div>`;
              } else {
                  html += `<div class="tcm-notice" style="color:#7eb8ff;margin-top:4px;">✓ Your roster composition and quantities match this tier.</div>`;
              }

              const catDisplayLabel = cache.filter === 'top' ? `8–10★ Companies (${myCapacity}-slot)`
                  : cache.filter === 'above' ? `${myStars+1}–${myStars+3}★ Companies (${myCapacity}-slot)`
                  : `${myStars}★ Companies (${myCapacity}-slot)`;
              html += buildSegTable(coIdsWithData, catDisplayLabel, `Composition of ${coIdsWithData.length} fetched ${catDisplayLabel}. <span style="color:#7eb8ff;">Green row</span> = you have it · bar = how commonly used across fetched companies.`);


              const cosWithData = Object.entries(compData).map(([id, emps]) => {
                  const coInfo = _getCo(id);
                  return { id, name: coInfo.name || id, stars: coInfo.rating || coInfo.stars || 0, daily: coInfo.daily_income || 0, emps };
              }).sort((a, b) => b.daily - a.daily);

              if (cosWithData.length) {
                  const topCos = cosWithData;
                  html += `<div class="tcm-section-label" style="margin-top:12px;">All Company Rosters (${cosWithData.length})</div>`;
                  html += `<div class="tcm-notice" style="font-size:11px;">Compositions of all ${cosWithData.length} fetched companies, sorted by daily income. <span style="color:#7eb8ff;">Green</span> = you have it · <span style="color:#f59e0b;">Amber</span> = they have it, you don't.</div>`;                topCos.forEach((co, idx) => {
                      const empList    = Object.values(co.emps).filter(e => e.position !== 'Director');
                      const posBuckets = {};
                      for (const e of empList) posBuckets[e.position] = (posBuckets[e.position] || 0) + 1;
const posEntries = Object.entries(posBuckets).sort(([,a],[,b]) => b - a);
                      const _empWs   = empList.map(e => e.workingStats?.value).filter(v => typeof v === 'number' && v > 0);
                      const _coAvgWs = _empWs.length ? Math.round(_empWs.reduce((a,b)=>a+b,0) / _empWs.length) : null;
                      html += `<div style="background:#0d1117;border:1px solid #2a2a2a;border-radius:4px;padding:10px 12px;margin-bottom:8px;">
                          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                              <span style="font-weight:700;color:#f3f4f6;font-size:13px;">#${idx+1} — <span style="color:#7eb8ff;">${co.name}</span></span>
                              <div style="display:flex;gap:8px;align-items:center;">
                                  <span style="font-size:12px;color:#fbbf24;">${co.stars}★</span>
                                  ${_coAvgWs !== null ? `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#9ca3af;">Avg WS: ${_coAvgWs.toLocaleString()}</span>` : ''}
                                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#7eb8ff;font-weight:700;">${Calc.fmtCash(co.daily)}/day</span>
                              </div>
                          </div>
                          <div style="display:flex;gap:6px;flex-wrap:wrap;">
                              ${posEntries.map(([pos, cnt]) => {
                                  const iHave     = myPos[PosNorm.normalize(pos)] || myPos[pos] || 0;
                                  const borderCol = iHave > 0 ? 'rgba(126,184,255,0.4)' : 'rgba(245,158,11,0.3)';
                                  const textCol   = iHave > 0 ? '#7eb8ff' : '#f59e0b';
                                  return `<span style="background:#111827;border:1px solid ${borderCol};border-radius:3px;padding:3px 8px;font-size:11px;color:${textCol};">${cnt > 1 ? cnt + '× ' : ''}${pos}</span>`;
                              }).join('')}
                          </div>
                      </div>`;
                  });
              }

              return html;
          },

          _tabBenchmarkStats(state) {
              try {
              const { profile, typeName, typeInt } = state || {};
              if (!typeName || !typeInt) return '<div class="tcm-notice">Company data not loaded. Refresh first.</div>';
              const benchSizeFilter = !!Storage.getSettings().benchSameSize;
              const myStars = parseInt(profile?.rating || 0) || 0;
              let savedCat = App._benchSelectedCat || Storage.getSettings().benchSelectedCat || 'same';
              if (myStars >= 10 && savedCat === 'above') savedCat = 'same';
              App._benchSelectedCat = savedCat;

              const cache = Storage.getBenchmarkCache(savedCat, benchSizeFilter);
              const _resetTs = (() => {
                  const _n = new Date();
                  const _t = new Date(Date.UTC(_n.getUTCFullYear(), _n.getUTCMonth(), _n.getUTCDate(), 18, 15, 0));
                  return _n.getTime() < _t.getTime() ? _t.getTime() - 86400000 : _t.getTime();
              })();

              // Soft validity: prefer matching typeInt; allow showing rosters even if sameSize flag drifted
              const hasRosters = !!(cache && cache.companyData && Object.keys(cache.companyData).length);
              const typeOk = !!(cache && (cache.typeInt == null || cache.typeInt === typeInt));
              const freshOk = !!(cache && (cache.ts || 0) > _resetTs);
              if (!cache || !typeOk) {
                  return `<div class="tcm-notice" style="border-color:#444;color:#aaa;">No benchmark data loaded yet. Go to the <strong>Overview</strong> sub-tab and click <strong>Load Benchmark</strong> first.</div>`;
              }
              if (!hasRosters) {
                  return `<div class="tcm-notice">No employee roster data in this cache. Reload benchmark on the Overview sub-tab (rosters are required for Employee Stats).</div>`;
              }
              if (!freshOk) {
                  // Still show data, but warn — don't blank the whole tab after daily reset boundary
              }

              const compData = cache.companyData || {};
              const companies = cache.companies || {};

              // Normalize working-stats from several shapes (HOF object, plain number, effectiveness)
              const readWs = (e) => {
                  if (!e || typeof e !== 'object') return null;
                  if (typeof e.workingStats === 'number' && e.workingStats > 0) return e.workingStats;
                  if (e.workingStats && typeof e.workingStats.value === 'number' && e.workingStats.value > 0) return e.workingStats.value;
                  if (typeof e.working_stats === 'number' && e.working_stats > 0) return e.working_stats;
                  if (e.effectiveness && typeof e.effectiveness.working_stats === 'number' && e.effectiveness.working_stats > 0) {
                      return e.effectiveness.working_stats;
                  }
                  return null;
              };

              const _allEmps = [];
              for (const [_coId, _empsObj] of Object.entries(compData)) {
                  if (!_empsObj || typeof _empsObj !== 'object') continue;
                  const _coMeta = companies[String(_coId)] || companies[_coId] || {};
                  for (const [_eid, _e] of Object.entries(_empsObj)) {
                      if (!_e || typeof _e !== 'object') continue;
                      _allEmps.push({
                          id: String(_eid),
                          name: _e.name || ('#' + _eid),
                          position: _e.position || '—',
                          company: _coMeta.name || ('Company #' + _coId),
                          ws: readWs(_e)
                      });
                  }
              }

              if (!_allEmps.length) {
                  return `<div class="tcm-notice">Roster cache is present but empty. Reload benchmark on the Overview sub-tab.</div>`;
              }

              const _wsEmps = _allEmps.filter(e => e.ws !== null);
              const _wsAvg  = _wsEmps.length ? Math.round(_wsEmps.reduce((a, e) => a + e.ws, 0) / _wsEmps.length) : null;

              const _byPos = {};
              for (const e of _wsEmps) {
                  if (!_byPos[e.position]) _byPos[e.position] = [];
                  _byPos[e.position].push(e.ws);
              }
              const _posRows = Object.entries(_byPos).map(([pos, vals]) => ({
                  pos,
                  count: vals.length,
                  avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
                  max: Math.max(...vals),
                  min: Math.min(...vals)
              })).sort((a, b) => b.avg - a.avg);

              const s       = Storage.getSettings();
              const sortBy  = s.benchStatsSort || 'ws';
              const sortDir = s.benchStatsDir  || 'desc';
              const _sorted = [..._allEmps].sort((a, b) => {
                  let av, bv;
                  if (sortBy === 'ws') {
                      av = a.ws != null ? a.ws : -1;
                      bv = b.ws != null ? b.ws : -1;
                  } else if (sortBy === 'company') {
                      av = String(a.company || '').toLowerCase();
                      bv = String(b.company || '').toLowerCase();
                  } else if (sortBy === 'position') {
                      av = String(a.position || '').toLowerCase();
                      bv = String(b.position || '').toLowerCase();
                  } else {
                      av = String(a.name || '').toLowerCase();
                      bv = String(b.name || '').toLowerCase();
                  }
                  const cmp = av < bv ? -1 : av > bv ? 1 : 0;
                  return sortDir === 'asc' ? cmp : -cmp;
              });

              let html = `<div class="tcm-section-label">Employee Stats — ${Object.keys(compData).length} companies · ${_allEmps.length} employees${_wsEmps.length ? ` · ${_wsEmps.length} with working stats` : ''}</div>`;
              if (!freshOk) {
                  html += `<div class="tcm-notice" style="font-size:11px;color:#fc6;">Cache is from before today's 18:15 TCT reset — figures may be stale. Reload on Overview when convenient.</div>`;
              }
              if (_wsAvg !== null) {
                  html += `<div class="tcm-notice" style="font-size:11px;">Avg working stats across fetched employees: <strong style="color:#7eb8ff;">${_wsAvg.toLocaleString()}</strong></div>`;
              } else {
                  html += `<div class="tcm-notice" style="margin-top:4px;">${Storage.getSettings().benchFetchWorkingStats
                      ? 'No working stats in this cache — reload from Overview (needs <strong>hof</strong> on your API key).'
                      : 'Working stats were not fetched. Enable <strong>Fetch working stats</strong> on Overview, then reload.'}</div>`;
              }

              if (_posRows.length) {
                  html += `<div class="tcm-section-label" style="margin-top:12px;">By position (working stats)</div>
                  <div style="overflow-x:auto;margin-bottom:12px;">
                  <table style="width:100%;font-size:12px;border-collapse:collapse;table-layout:auto;display:table;">
                  <thead>
                  <tr>
                      <th style="display:table-cell;text-align:left;padding:5px 6px;border-bottom:1px solid #444;background:#2a2a2a;color:#ccc;font-weight:600;">Position</th>
                      <th style="display:table-cell;text-align:right;padding:5px 6px;border-bottom:1px solid #444;background:#2a2a2a;color:#ccc;font-weight:600;">n</th>
                      <th style="display:table-cell;text-align:right;padding:5px 6px;border-bottom:1px solid #444;background:#2a2a2a;color:#ccc;font-weight:600;">Avg WS</th>
                      <th style="display:table-cell;text-align:right;padding:5px 6px;border-bottom:1px solid #444;background:#2a2a2a;color:#ccc;font-weight:600;">Min</th>
                      <th style="display:table-cell;text-align:right;padding:5px 6px;border-bottom:1px solid #444;background:#2a2a2a;color:#ccc;font-weight:600;">Max</th>
                  </tr>
                  </thead>
                  <tbody>`;
                  for (const r of _posRows) {
                      html += `<tr>
                          <td style="display:table-cell;padding:4px 6px;border-bottom:1px solid #333;color:#c8c8c8;">${r.pos}</td>
                          <td style="display:table-cell;padding:4px 6px;border-bottom:1px solid #333;text-align:right;color:#aaa;">${r.count}</td>
                          <td style="display:table-cell;padding:4px 6px;border-bottom:1px solid #333;text-align:right;color:#7eb8ff;font-weight:700;">${r.avg.toLocaleString()}</td>
                          <td style="display:table-cell;padding:4px 6px;border-bottom:1px solid #333;text-align:right;color:#888;">${r.min.toLocaleString()}</td>
                          <td style="display:table-cell;padding:4px 6px;border-bottom:1px solid #333;text-align:right;color:#888;">${r.max.toLocaleString()}</td>
                      </tr>`;
                  }
                  html += `</tbody></table></div>`;
              }

              html += `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0 8px;">
                  <input type="search" id="tcm-benchstats-search" placeholder="Search name / company…"
                      style="flex:1;min-width:140px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#ddd;padding:4px 8px;font-size:12px;" />
                  <select id="tcm-benchstats-sort" style="background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#ddd;padding:4px 6px;font-size:12px;">
                      <option value="ws" ${sortBy==='ws'?'selected':''}>Sort: Working Stats</option>
                      <option value="company" ${sortBy==='company'?'selected':''}>Sort: Company</option>
                      <option value="position" ${sortBy==='position'?'selected':''}>Sort: Position</option>
                      <option value="name" ${sortBy==='name'?'selected':''}>Sort: Name</option>
                  </select>
                  <button class="tcm-btn" id="tcm-benchstats-dir" style="font-size:12px;padding:4px 10px;">${sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}</button>
              </div>
              <div style="max-height:480px;overflow-y:auto;border:1px solid #333;border-radius:4px;">
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead><tr style="background:#2a2a2a;position:sticky;top:0;">
                  <th style="text-align:left;padding:5px 6px;color:#aaa;">#</th>
                  <th style="text-align:left;padding:5px 6px;color:#aaa;">Player</th>
                  <th style="text-align:left;padding:5px 6px;color:#aaa;">Company</th>
                  <th style="text-align:left;padding:5px 6px;color:#aaa;">Position</th>
                  <th style="text-align:right;padding:5px 6px;color:#aaa;">Working Stats</th>
              </tr></thead><tbody id="tcm-benchstats-tbody">`;

              html += _sorted.map((e, i) => {
                  const search = (String(e.name) + ' ' + String(e.company) + ' ' + String(e.position)).toLowerCase().replace(/"/g, '');
                  const wsCell = e.ws !== null
                      ? `<span style="color:#7eb8ff;font-weight:700;">${e.ws.toLocaleString()}</span>`
                      : `<span style="color:#666;">—</span>`;
                  return `<tr style="border-top:1px solid #2a2a2a;" data-search="${search}">
                      <td style="padding:4px 6px;color:#888;">${i + 1}</td>
                      <td style="padding:4px 6px;color:#ddd;">${e.name}</td>
                      <td style="padding:4px 6px;color:#aaa;">${e.company}</td>
                      <td style="padding:4px 6px;color:#aaa;">${e.position}</td>
                      <td style="padding:4px 6px;text-align:right;font-family:Consolas,monospace;">${wsCell}</td>
                  </tr>`;
              }).join('');

              html += `</tbody></table></div>`;
              return html;
              } catch (err) {
                  console.error('[TCM] Employee Stats render failed:', err);
                  return `<div class="tcm-notice" style="color:#f88;">Employee Stats failed to render: ${String(err?.message || err)}. Try reloading benchmark from Overview.</div>`;
              }
          },

          _attachBenchmarkHandlers(state) {
const { typeInt, profile, typeName } = state;
              const myStars = parseInt(profile?.rating || 0) || 0;
              const myCapacity = parseInt(profile?.employees_capacity || profile?.employees_hired || 10);

              document.getElementById('tcm-benchsub-overview')?.addEventListener('click', () => {
                  const s3 = Storage.getSettings(); s3.benchSubTab = 'overview'; Storage.saveSettings(s3);
                  this._renderTab('benchmark');
              });
              document.getElementById('tcm-benchsub-stats')?.addEventListener('click', () => {
                  const s3 = Storage.getSettings(); s3.benchSubTab = 'stats'; Storage.saveSettings(s3);
                  this._renderTab('benchmark');
              });
              document.getElementById('tcm-benchstats-sort')?.addEventListener('change', (e) => {
                  const s3 = Storage.getSettings(); s3.benchStatsSort = e.target.value; Storage.saveSettings(s3);
                  this._renderTab('benchmark');
              });
              document.getElementById('tcm-benchstats-dir')?.addEventListener('click', () => {
                  const s3 = Storage.getSettings();
                  s3.benchStatsDir = (s3.benchStatsDir || 'desc') === 'desc' ? 'asc' : 'desc';
                  Storage.saveSettings(s3);
                  this._renderTab('benchmark');
              });
              document.getElementById('tcm-benchstats-search')?.addEventListener('input', (e) => {
                  const q = e.target.value.trim().toLowerCase();
                  document.querySelectorAll('#tcm-benchstats-tbody tr').forEach(row => {
                      row.style.display = !q || (row.dataset.search || '').includes(q) ? '' : 'none';
                  });
              });


document.getElementById('tcm-bench-samesize')?.addEventListener('change', (e) => {

                  const s2 = Storage.getSettings();
                  s2.benchSameSize = e.target.checked;
                  Storage.saveSettings(s2);

                  this._renderTab('benchmark');
              });

document.getElementById('tcm-bench-workingstats')?.addEventListener('change', (e) => {
                  const s2b = Storage.getSettings();
                  s2b.benchFetchWorkingStats = e.target.checked;
                  Storage.saveSettings(s2b);
                  const _etaEl = document.getElementById('tcm-bench-eta');
                  if (_etaEl) {
                      const _c3 = Math.max(1, Math.min(300, parseInt(document.getElementById('tcm-bench-count')?.value || '50') || 50));
                      const _calls3 = _c3 + (e.target.checked ? _c3 * myCapacity : 0);
                      const _mins3  = Math.max(1, Math.ceil(_calls3 / 60));
                      _etaEl.textContent = `Estimated: ~${_calls3.toLocaleString()} API calls · ~${_mins3} min at 60/min${e.target.checked ? ` (assumes ~${myCapacity} employees/company)` : ''}`;
                  }
              });


              let selectedCategory = App._benchSelectedCat || Storage.getSettings().benchSelectedCat || 'same';
              document.querySelectorAll('.tcm-bench-cat').forEach(catBtn => {
                  catBtn.addEventListener('click', () => {
                      document.querySelectorAll('.tcm-bench-cat').forEach(b => b.classList.remove('active'));
                      catBtn.classList.add('active');
                      selectedCategory = catBtn.dataset.cat;
                      App._benchSelectedCat = selectedCategory;
                      const _scat = Storage.getSettings();
                      _scat.benchSelectedCat = selectedCategory;
                      Storage.saveSettings(_scat);

                      this._renderTab('benchmark');
                  });
              });
            document.getElementById('tcm-bench-resume')?.addEventListener('click', () => {
                  if (App._benchFetching) return;
                  const _myCapR = parseInt(profile?.employees_capacity || profile?.employees_hired || 10);
                  App._benchSelectedCat = selectedCategory;
                  App._benchFetching = { done: 0, total: 0, category: selectedCategory };

App.startBenchmarkFetch(typeInt, profile, myStars, _myCapR, selectedCategory, Storage.getSettings().benchSameSize, Storage.getSettings().benchFetchCount || 50, Storage.getSettings().benchFetchWorkingStats);
                  this._renderTab('benchmark');
              });



              document.getElementById('tcm-bench-discard')?.addEventListener('click', () => {
                  Storage.clearBenchmarkPartial();
                  App._benchFetchError = null;
                  this._renderTab('benchmark');
              });
          document.getElementById('tcm-bench-delete-cache')?.addEventListener('click', () => {
                  const _bsf2 = Storage.getSettings().benchSameSize;
                  const _catNames = { same: `${myStars}★ Same Rating`, above: `${myStars + 1}–${myStars + 3}★`, top: '8–10★ Top' };
                  const _catLabel = _catNames[selectedCategory] || selectedCategory;
                  if (!confirm(`Delete cached benchmark data for "${_catLabel}" (${_bsf2 ? 'same employee capacity only' : 'all sizes'})?\n\nYou'll need to reload to see fresh data.`)) return;
                  Storage.deleteBenchmarkCache(selectedCategory, _bsf2);
                  this._renderTab('benchmark');
              });
          document.getElementById('tcm-bench-export')?.addEventListener('click', () => {
              const _cache = Storage.getBenchmarkCache();
              if (!_cache) { alert('No benchmark data to export.'); return; }
              const _cd2exp  = _cache.companyData || {};
              const _decHtml = str => (str||'').replace(/&#(\d+);/g, (m,c) => String.fromCharCode(c))
                  .replace(/&amp;/g,'&').replace(/&#039;/g,"'").replace(/&apos;/g,"'")
                  .replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
              const _allCos2 = Object.entries(_cache.companies || {})
                  .filter(([id]) => _cd2exp[id])
                  .sort(([,a],[,b]) => (b.daily_income||0)-(a.daily_income||0));
              if (!_allCos2.length) { alert('No fetched roster data to export. Load benchmark first.'); return; }
              const rows = [['Rank','Company Name','Stars','Daily Income','Weekly Income','Employees','Capacity','Roster']];
              _allCos2.forEach(([id, co], i) => {
                  const _empList2 = Object.values(_cd2exp[id] || {}).filter(e => e.position !== 'Director');
                  const _pCounts  = {};
                  _empList2.forEach(e => { _pCounts[e.position] = (_pCounts[e.position]||0)+1; });
                  const _roster   = Object.entries(_pCounts).map(([p,n]) => n>1?`${p} x${n}`:p).join(', ');
                  rows.push([
                      i + 1,
                      _decHtml(co.name),
                      co.rating || '',
                      co.daily_income || 0,
                      co.weekly_income || 0,
                      co.employees_hired || _empList2.length || '',
                      co.employees_capacity || '',
                      _roster
                  ]);
              });
              exportCsv(rows, `tcm_benchmark_${(typeName||'').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`);
          });

              document.getElementById('tcm-bench-count')?.addEventListener('change', (e) => {
                  const _bv = Math.max(1, Math.min(300, parseInt(e.target.value) || 50));
                  e.target.value = _bv;
                  e.target.style.borderColor = _bv > 300 ? '#ef4444' : '#374151';
                  const _bs3 = Storage.getSettings();
                  _bs3.benchFetchCount = _bv;
                  Storage.saveSettings(_bs3);
              });
document.getElementById('tcm-bench-count')?.addEventListener('input', (e) => {
                  const _bv2 = parseInt(e.target.value) || 0;
                  e.target.style.borderColor = _bv2 > 300 ? '#ef4444' : _bv2 < 1 ? '#f59e0b' : '#374151';
                  const _etaEl = document.getElementById('tcm-bench-eta');
                  if (_etaEl) {
                      const _c2  = Math.max(1, Math.min(300, _bv2 || 50));
                      const _ws2 = Storage.getSettings().benchFetchWorkingStats;
                      const _calls2 = _c2 + (_ws2 ? _c2 * myCapacity : 0);
                      const _mins2  = Math.max(1, Math.ceil(_calls2 / 60));
                      _etaEl.textContent = `Estimated: ~${_calls2.toLocaleString()} API calls · ~${_mins2} min at 60/min${_ws2 ? ` (assumes ~${myCapacity} employees/company)` : ''}`;
                  }
              });
              document.getElementById('tcm-bench-load')?.addEventListener('click', () => {
                  if (App._benchFetching) return;
                  const _bsf = Storage.getSettings().benchSameSize;
                  const _existingCache = Storage.getBenchmarkCache(selectedCategory, _bsf);
                  const _cacheStillValid = _existingCache
                      && _existingCache.typeInt === typeInt
                      && _existingCache.sameSize === _bsf
                      && (Date.now() - (_existingCache.ts || 0)) < 4 * 900000;
                  if (_cacheStillValid) {
                      const btn2 = document.getElementById('tcm-bench-load');
                      if (btn2) { btn2.textContent = '✓ Already cached'; setTimeout(() => this._renderTab('benchmark'), 500); }
                      return;
                  }
                  const myCapacity2 = parseInt(profile?.employees_capacity || profile?.employees_hired || 10);
                  const _userCount = Math.max(1, Math.min(300, parseInt(document.getElementById('tcm-bench-count')?.value || '50') || 50));
                  const _bs4 = Storage.getSettings(); _bs4.benchFetchCount = _userCount; Storage.saveSettings(_bs4);
                  App._benchSelectedCat = selectedCategory;
                  App._benchFetching = { done: 0, total: 0, category: selectedCategory };
                  Storage.clearBenchmarkPartial();
App.startBenchmarkFetch(typeInt, profile, myStars, myCapacity2, selectedCategory, _bsf, _userCount, Storage.getSettings().benchFetchWorkingStats);
                  this._renderTab('benchmark');
              });
      },

          _tabStock(state) {
              const { stock, detailed, typeName } = state;
              const storageCapacity = detailed?.upgrades?.storage_space || 0;
              const prices = TCM.STOCK_PRICES[typeName] || {};
              const _typeStockPrices = TCM.STOCK_PRICES[typeName];
              const isPerfCo = _typeStockPrices !== undefined
                  && Object.keys(_typeStockPrices).length === 0
                  && !!(stock && Object.keys(stock).length > 0);
              const stockSubTab = (UI._stockSubTab || 'current');


              const _mkStockTab = (sub, label) => {
                  const act = stockSubTab === sub;
                  return `<button class="tcm-stock-sub ${act?'active':''}" data-sub="${sub}"
                      style="background:${act?'rgba(126,184,255,0.15)':'#2a2a2a'};border:1px solid ${act?'rgba(126,184,255,0.4)':'#374151'};color:${act?'#7eb8ff':'#9ca3af'};border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600;">${label}</button>`;
              };
              const subTabBar = `<div style="display:flex;gap:4px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #2a2a2a;flex-wrap:wrap;">
                  ${_mkStockTab('current','📦 Current Stock')}
                  ${isPerfCo ? _mkStockTab('performance','📈 Performance') : ''}
                  ${_mkStockTab('experiments','🧪 Experiments')}
              </div>`;

              if (stockSubTab === 'performance') {
                  return subTabBar + this._tabStockPerformance(state);
              }
              if (stockSubTab === 'experiments') {
                  return subTabBar + this._tabPricingExperiments(state);
              }

              if (!stock || !Object.keys(stock).length) {
                  return subTabBar + `<div class="tcm-notice">No stock data available yet. Refresh to load.</div>`;
              }

              let totalInStock = 0, totalOnOrder = 0, totalSoldDaily = 0;
              const items = Object.entries(stock).map(([name, s], idx) => {
                  const inStock   = s.in_stock    || 0;
                  const onOrder   = s.on_order    || 0;



                  const soldAmt = s.sold_amount || 0;
                  const daysLeft   = soldAmt > 0 ? (inStock / soldAmt) : (inStock > 0 ? 999 : 0);
                  const combined  = inStock + onOrder;
                  const costPer   = prices[name] || null;
                  const target7d  = Math.ceil(soldAmt * 7);

                  const needMore  = costPer ? Math.max(0, target7d - combined) : 0;
                  const reorderCost = (costPer && needMore > 0) ? needMore * costPer : null;
                  totalInStock   += inStock;
                  totalOnOrder   += onOrder;
                  totalSoldDaily += soldAmt;
                  return { name, inStock, onOrder, soldDaily: soldAmt, daysLeft, combined, costPer, needMore, reorderCost };
              });

              const availableSpace = storageCapacity ? storageCapacity - totalInStock - totalOnOrder : null;
              items.sort((a, b) => a.daysLeft - b.daysLeft);

              let html = `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 5px;border-bottom:1px solid #2a2a2a;margin-bottom:10px;">
                  <span style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.12em;font-family:Arial,sans-serif;">Company Stock</span>
                  <a href="https://www.torn.com/companies.php?step=your&type=1#/tab=stock&option=stock" target="_blank"
                      style="background:rgba(126,184,255,0.1);border:1px solid rgba(126,184,255,0.3);
                      color:#7eb8ff;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:600;
                      text-decoration:none;text-transform:uppercase;letter-spacing:0.04em;">↗ Manage Stock</a>
              </div>`;

              if (storageCapacity) {
                  const usedPct = Math.round(((totalInStock + totalOnOrder) / storageCapacity) * 100);
                  const barCls  = usedPct > 90 ? 'red' : usedPct > 70 ? 'amber' : '';
                  html += `<div class="tcm-card"><div class="tcm-card-body">
                      <div class="tcm-row"><span class="lbl">Storage</span><span class="val">${Calc.fmtNum(storageCapacity)}</span></div>
                      <div class="tcm-row"><span class="lbl">In stock</span><span class="val">${Calc.fmtNum(totalInStock)}</span></div>
                      <div class="tcm-row"><span class="lbl">On order</span><span class="val">${Calc.fmtNum(totalOnOrder)}</span></div>
                      <div class="tcm-row"><span class="lbl">Free space</span><span class="val ${barCls}">${availableSpace !== null ? Calc.fmtNum(availableSpace) : '?'}</span></div>
                      <div style="margin-top:6px;">
                          <div class="tcm-bar"><div class="tcm-bar-fill ${barCls}" style="width:${Math.min(100,usedPct)}%"></div></div>
                          <div style="font-size:11px;color:#9ca3af;margin-top:2px;text-align:right;">${usedPct}% used</div>
                      </div>
                  </div></div>`;
              }

              html += `<div class="tcm-section-label" style="margin-top:4px;">Products — sorted by urgency</div>`;

              items.forEach(item => {
                  const dayColor = item.daysLeft === -1 ? '#888' : item.daysLeft <= 0 ? '#ef4444' : item.daysLeft <= 2 ? '#ef4444' : item.daysLeft <= 5 ? '#f59e0b' : '#7eb8ff';
                  const wasReset = Storage.get('stock_sold_reset_flag', false);
  const daysTxt  = item.daysLeft === -1
      ? (wasReset ? 'Recalculating...' : 'Calculating...')
      : item.daysLeft >= 999 ? '∞ days'
      : item.daysLeft === 0 ? '⚠ OUT OF STOCK'
      : `${item.daysLeft.toFixed(1)}d left`;
                  const pct      = item.soldDaily > 0 && totalSoldDaily > 0
                      ? Math.round((item.soldDaily / totalSoldDaily) * 100) : 0;

                  html += `<div class="tcm-card" style="margin-bottom:6px;"><div class="tcm-card-body" style="padding:8px 12px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                          <span style="font-weight:700;color:#ddd;font-size:13px;">${item.name}</span>
                          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${dayColor};font-weight:700;">${daysTxt}</span>
                      </div>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                          <span class="tcm-stat-chip">Stock: ${Calc.fmtNum(item.inStock)}</span>
                          <span class="tcm-stat-chip">Order: ${Calc.fmtNum(item.onOrder)}</span>
                          <span class="tcm-stat-chip">${item.soldDaily > 0 ? Calc.fmtNum(item.soldDaily)+'/day' : 'no sales'}</span>
                          ${item.costPer ? `<span class="tcm-stat-chip">$${item.costPer}/unit</span>` : ''}
                          <span class="tcm-stat-chip">${pct}% of sales</span>
                      </div>
                      ${item.needMore > 0
                          ? `<div style="font-size:11px;color:#f59e0b;">⚠ Order ${Calc.fmtNum(item.needMore)} more (7d supply)${item.reorderCost ? ' — est. <strong style="color:#ddd;">'+Calc.fmtCash(item.reorderCost)+'</strong>' : ''}</div>`
                          : `<div style="font-size:11px;color:#7eb8ff;">✓ Well stocked (7d+)</div>`}
                  </div></div>`;
              });

              html += `<div class="tcm-notice" style="font-size:10px;">sold_amount resets daily after 18:00 TCT. Days left = current stock ÷ today's sales. Reorder cost from Wiki wholesale prices.</div>`;
              return subTabBar + html;
          },


          _tabStockPerformance(state) {
              const perfData = Storage.getStockPerf()
                  .filter(e => e.typeId === Number(state.typeInt))
                  .slice()
                  .reverse();

              const fmtN = n => (n == null ? '—' : Number(n).toLocaleString('en-US'));
              const fmtC = n => (n == null ? '—' : '$' + Number(n).toLocaleString('en-US'));

              let html = `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                  <div>
                      <div style="font-size:12px;color:#9ca3af;">Showing up to <strong style="color:#ddd;">14 days</strong> of captured data.
                      Data is saved automatically on each TCM refresh after 18:00 TCT.</div>
                  </div>
                  <button id="tcm-perf-refresh-btn" class="tcm-btn green" style="font-size:11px;padding:3px 10px;">↺ Refresh Now</button>
              </div>`;

              if (!perfData.length) {
                  return html + `<div class="tcm-notice">
                      No performance data yet for this company.<br>
                      Click <strong>Refresh Now</strong> or wait for the next auto-refresh after 18:00 TCT.
                  </div>`;
              }


              const allProducts = new Set();
              perfData.forEach(e => Object.keys(e.products || {}).forEach(p => allProducts.add(p)));
              const products = [...allProducts];


              html += `<div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px;">
              <thead><tr style="background:#0a0e14;">
                  <th style="text-align:left;padding:6px 8px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Date</th>
                  <th style="text-align:left;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Product</th>
                  <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Price</th>
                  <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Sold</th>
                  <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Created</th>
                  <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Stock</th>
                  <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Worth</th>
                  <th style="text-align:right;padding:6px 4px;color:#7eb8ff;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Profit</th>
                  <th style="text-align:right;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Net Flow</th>
                  <th style="text-align:left;padding:6px 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;white-space:nowrap;">Employees</th>
              </tr></thead>
              <tbody>`;


              perfData.forEach((entry, idx) => {
                  const prevEntry = perfData[idx + 1];
                  const posStr = Object.entries(entry.positions || {})
                      .sort((a,b) => b[1]-a[1])
                      .map(([abbr, cnt]) => `${abbr}:${cnt}`)
                      .join(' ');
                  const empInfo = `${entry.employeeCount} (${posStr || '—'})`;
                  const entryProducts = entry.products || {};
                  const productNames = Object.keys(entryProducts);
                  const rowCount = Math.max(productNames.length, 1);

                  productNames.forEach((prodName, pi) => {
                      const prod = entryProducts[prodName];
                      const prevProd = prevEntry?.products?.[prodName];

                      const sold    = prod.sold_amount || 0;
                      const stock   = prod.in_stock    || 0;
                      const worth   = prod.sold_worth  || 0;
                      const price   = prod.price       || 0;
                      const cost    = prod.cost        || 0;
                      const profit  = (price - cost) * sold;


                      const created = prevProd != null
                          ? stock - (prevProd.in_stock || 0) + sold
                          : null;
                      const netFlow = created != null ? created - sold : null;


                      const prevProd2 = prevEntry?.products?.[prodName];
                      const prevProfit = prevProd2 != null ? ((prevProd2.price||0) - (prevProd2.cost||0)) * (prevProd2.sold_amount||0) : null;
                      let rowBg = 'transparent';
                      if (prevProfit != null) {
                          if (profit > prevProfit) rowBg = 'rgba(126,184,255,0.06)';
                          else if (profit < prevProfit) rowBg = 'rgba(239,68,68,0.06)';
                      }
                      const profitColor = prevProfit == null ? '#7eb8ff'
                          : profit > prevProfit ? '#7eb8ff'
                          : profit < prevProfit ? '#ef4444'
                          : '#9ca3af';

                      const netFlowColor = netFlow == null ? '#9ca3af'
                          : netFlow > 0 ? '#7eb8ff'
                          : netFlow < 0 ? '#ef4444'
                          : '#9ca3af';

                      html += `<tr style="border-bottom:1px solid #111827;background:${rowBg};">
                          ${pi === 0 ? `<td rowspan="${rowCount}" style="padding:6px 8px 6px 0;color:#ddd;font-weight:700;white-space:nowrap;vertical-align:top;font-size:12px;">${entry.date}</td>` : ''}
                          <td style="padding:6px 4px;color:#d1d5db;font-size:11px;white-space:nowrap;">${prodName}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#ddd;">${fmtC(price)}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#ddd;">${fmtN(sold)}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:${created==null?'#888':'#d1d5db'};">${created==null?'—':fmtN(created)}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#ddd;">${fmtN(stock)}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#d1d5db;">${fmtC(worth)}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:${profitColor};">${fmtC(profit)}</td>
                          <td style="text-align:right;padding:6px 4px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:${netFlowColor};">${netFlow==null?'—':(netFlow>=0?'+':'')+fmtN(netFlow)}</td>
                          ${pi === 0 ? `<td rowspan="${rowCount}" style="padding:6px 4px;color:#9ca3af;font-size:10px;line-height:1.6;vertical-align:top;max-width:140px;word-break:break-all;">${empInfo}</td>` : ''}
                      </tr>`;
                  });

                  if (!productNames.length) {
                      html += `<tr style="border-bottom:1px solid #111827;">
                          <td style="padding:6px 8px 6px 0;color:#ddd;font-weight:700;">${entry.date}</td>
                          <td colspan="8" style="padding:6px 4px;color:#888;font-size:11px;">No product data captured</td>
                          <td style="padding:6px 4px;color:#9ca3af;font-size:10px;">${empInfo}</td>
                      </tr>`;
                  }
              });

              html += `</tbody></table></div>
              <div style="font-size:10px;color:#888;margin-top:6px;line-height:1.6;">
                  <strong>Profit</strong> = (Price − Cost) × Sold &nbsp;·&nbsp;
                  <strong>Created</strong> = today's stock − yesterday's stock + today's sold (requires 2 consecutive days) &nbsp;·&nbsp;
                  <strong>Net Flow</strong> = Created − Sold &nbsp;·&nbsp;
                  <span style="color:#7eb8ff;">■</span> Profit up vs prior day &nbsp;
                  <span style="color:#ef4444;">■</span> Profit down
              </div>`;

              return html;
          },


          _tabPricingExperiments(state) {
              const { stock, typeInt } = state;
              const history   = Storage.getPriceHistory().filter(e => e.typeId === Number(typeInt));
              const activeExp = Storage.getActivePriceExperiment();
              const expHistory = Storage.getPriceExperimentHistory().filter(e => e.typeId === Number(typeInt));
              const analysis  = Storage.analyzeBestRrp(Number(typeInt));
              const fmtC = n => n == null ? '—' : (Math.round(n) < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
              const fmtN = n => n == null ? '—' : Math.round(n).toLocaleString('en-US');

              let html = '';





              const _today = new Date().toISOString().slice(0, 10);
              const _todayEntry = history.find(e => e.date === _today);
              const _mismatched = [];
              if (_todayEntry && stock) {
                  Object.entries(stock).forEach(([name, s]) => {
                      const stored = _todayEntry.items?.[name];
                      if (stored?._currentPrice) {
                          _mismatched.push({ name, locked: stored.price, current: stored._currentPrice });
                      }
                  });
              }
              if (_mismatched.length > 0) {
                  html += `<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.5);border-radius:6px;padding:10px 14px;margin-bottom:12px;">
                      <div style="font-size:13px;font-weight:800;color:#f59e0b;margin-bottom:5px;">⚠ Price Changed Mid-Day — Data Locked to Original</div>
                      <div style="font-size:12px;color:#d1d5db;line-height:1.6;">
                          You changed prices today. <strong style="color:#f59e0b;">Sales data in the analysis still reflects yesterday's price</strong>
                          — Torn only resets the daily counter at <strong>18:00–18:15 TCT</strong>.
                          Until then, any profit numbers you see for today use the old price that was actually active during those sales.
                      </div>
                      <div style="font-size:11px;color:#9ca3af;margin-top:6px;padding-top:6px;border-top:1px solid rgba(245,158,11,0.2);">
                          ${_mismatched.map(m =>
                              `<span style="color:#ddd;font-weight:600;">${m.name}:</span>
                               analysis uses <span style="color:#7eb8ff;">${fmtC(m.locked)}</span>
                               · new price (not in analysis yet): <span style="color:#f59e0b;">${fmtC(m.current)}</span>`
                          ).join(' &nbsp;·&nbsp; ')}
                      </div>
                  </div>`;
              }


              if (activeExp && activeExp.typeId === Number(typeInt)) {
                  const _expDays = history.filter(e => e.date >= activeExp.startDate).length;
                  const _daysLeft = Math.max(0, activeExp.plannedDays - _expDays);
                  const _pct = Math.min(100, activeExp.plannedDays > 0
                      ? Math.round((_expDays / activeExp.plannedDays) * 100) : 0);
                  html += `<div style="background:rgba(126,184,255,0.07);border:1px solid rgba(126,184,255,0.4);border-radius:6px;padding:10px 14px;margin-bottom:12px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                          <div>
                              <div style="font-size:13px;font-weight:800;color:#7eb8ff;">🧪 Active: ${activeExp.name}</div>
                              <div style="font-size:11px;color:#9ca3af;margin-top:2px;">
                                  Target: <strong style="color:#7eb8ff;">${activeExp.targetRrpPct}% of RRP</strong>
                                  &nbsp;·&nbsp; ${_expDays}/${activeExp.plannedDays} days collected
                                  &nbsp;·&nbsp; ${_daysLeft > 0 ? _daysLeft + ' days remaining' : '⚠ Target reached'}
                              </div>
                          </div>
                          <div style="display:flex;gap:6px;">
                              <button class="tcm-btn green" id="tcm-exp-complete-btn" style="font-size:11px;padding:4px 10px;">✓ Complete</button>
                              <button class="tcm-btn red"   id="tcm-exp-cancel-btn"  style="font-size:11px;padding:4px 10px;">✕ Cancel</button>
                          </div>
                      </div>
                      <div style="height:5px;background:#2a2a2a;border-radius:3px;margin-top:8px;overflow:hidden;">
                          <div style="width:${_pct}%;height:100%;background:${_daysLeft <= 0 ? '#f59e0b' : '#7eb8ff'};border-radius:3px;"></div>
                      </div>
                  </div>`;
              } else {

                  html += `<div class="tcm-card" style="margin-bottom:12px;"><div class="tcm-card-body">
                      <div style="font-size:12px;font-weight:700;color:#9ca3af;margin-bottom:8px;">🧪 Run a Price Experiment</div>
                      <div style="font-size:11px;color:#888;margin-bottom:10px;line-height:1.6;">
                          Pick a target RRP% (e.g. 95%), set your prices manually in Torn to match,
                          and TCM will track daily sales for you. Come back after 7+ days to see results.
                      </div>
                      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
                          <div>
                              <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Experiment Name</div>
                              <input type="text" id="tcm-exp-name" class="tcm-input" placeholder="e.g. Test 95% RRP"
                                  style="width:100%;box-sizing:border-box;font-size:12px;"/>
                          </div>
                          <div>
                              <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Target RRP %</div>
                              <input type="number" id="tcm-exp-rrp-pct" class="tcm-input" value="90" min="1" max="500"
                                  style="width:100%;box-sizing:border-box;font-size:12px;"/>
                          </div>
                          <div>
                              <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Run for (days)</div>
                              <input type="number" id="tcm-exp-days" class="tcm-input" value="7" min="3" max="30"
                                  style="width:100%;box-sizing:border-box;font-size:12px;"/>
                          </div>
                      </div>
                      <button class="tcm-btn green" id="tcm-exp-start-btn" style="width:100%;font-size:12px;padding:7px;">
                          ▶ Start Experiment
                      </button>
                  </div></div>`;
              }


              const _hasAnalysis = Object.keys(analysis).length > 0;
              if (_hasAnalysis) {
                  html += `
                  <div class="tcm-section-label">📊 Best RRP% — What Actually Made Money</div>
                  <div style="font-size:11px;color:#888;margin-bottom:10px;">
                      Based on <strong style="color:#9ca3af;">${history.length} days</strong> of collected data.
                      <span style="color:#7eb8ff;">★ Best profit</span> &nbsp;·&nbsp;
                      <span style="color:#7eb8ff;">💰 Best revenue</span> &nbsp;·&nbsp;
                      <span style="color:#f59e0b;">📦 Most sales</span> &nbsp;·&nbsp;
                      <span style="color:#a78bfa;">● Your current price</span>
                  </div>`;

                  Object.entries(analysis).forEach(([item, data]) => {
                      const { ranked, bestProfitPct, bestRevenuePct, bestSoldPct } = data;
                      if (!ranked.length) return;
                      const _cs  = stock?.[item];
const _cur = _cs?.rrp > 0 ? Math.round((_cs.price / _cs.rrp) * 100) : null;
              const _curPrice = (_cs?.price && _cs.price > 0) ? Math.round(_cs.price) : null;
              const _opt = _curPrice !== null && _curPrice === bestProfitPct;

                      html += `<div style="background:#0d1117;border:1px solid ${_opt ? 'rgba(126,184,255,0.35)' : '#2a2a2a'};border-radius:6px;padding:10px 12px;margin-bottom:8px;">
                          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                              <span style="font-size:14px;font-weight:800;color:#7eb8ff;">${item}</span>
                              <div style="display:flex;gap:10px;font-size:12px;font-weight:700;flex-wrap:wrap;">
${_cur !== null ? `<span style="color:#a78bfa;">Now: $${_curPrice} (${_cur}%)</span>` : ''}
                                  ${bestProfitPct  != null ? `<span style="color:#7eb8ff;">★ Best profit: $${bestProfitPct} (${ranked.find(r=>r.pct===bestProfitPct)?.rrpPct ?? '?'}%)</span>` : ''}
                                  ${bestRevenuePct != null && bestRevenuePct !== bestProfitPct ? `<span style="color:#7eb8ff;">💰 $${bestRevenuePct} (${ranked.find(r=>r.pct===bestRevenuePct)?.rrpPct ?? '?'}%)</span>` : ''}
                                  ${bestSoldPct    != null && bestSoldPct !== bestProfitPct && bestSoldPct !== bestRevenuePct ? `<span style="color:#f59e0b;">📦 $${bestSoldPct} (${ranked.find(r=>r.pct===bestSoldPct)?.rrpPct ?? '?'}%)</span>` : ''}
                                  ${_opt ? `<span style="background:rgba(126,184,255,0.15);border:1px solid rgba(126,184,255,0.4);color:#7eb8ff;border-radius:3px;padding:1px 8px;font-size:10px;">✓ Already optimal</span>` : ''}
                              </div>
                          </div>
                          <div style="overflow-x:auto;">
                          <table style="width:100%;border-collapse:collapse;font-size:11px;">
                          <thead><tr style="background:#0a0e14;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">
                              <th style="text-align:left;padding:4px 8px;border-bottom:1px solid #2a2a2a;">RRP %</th>
                              <th style="text-align:center;padding:4px 6px;border-bottom:1px solid #2a2a2a;">Days tested</th>
                              <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #2a2a2a;">Avg sold/day</th>
                              <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #2a2a2a;color:#7eb8ff;">Avg profit/day</th>
                              <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #2a2a2a;">Avg revenue/day</th>
                          </tr></thead><tbody>
${ranked.sort((a, b) => b.avgProfit - a.avgProfit).map(r => {
                              const _bp  = r.pct === bestProfitPct;
                              const _ic  = r.pct === _curPrice;
                              const _col = _bp ? '#7eb8ff' : _ic ? '#a78bfa' : '#9ca3af';
                              return `<tr style="border-bottom:1px solid #111827;${_bp ? 'background:rgba(126,184,255,0.05);' : ''}">
                                  <td style="padding:5px 8px;font-weight:700;color:${_col};font-family:'JetBrains Mono',monospace;">
                                      $${r.pct}${r.rrpPct != null ? ` <span style="font-size:10px;font-weight:400;">(${r.rrpPct}%)</span>` : ''}${_bp ? ' ★' : ''}${_ic && !_bp ? ' ●' : ''}
                                  </td>
                                  <td style="text-align:center;padding:5px 6px;color:#888;">${r.days}</td>
                                  <td style="text-align:right;padding:5px 6px;font-family:'JetBrains Mono',monospace;color:#d1d5db;">${fmtN(Math.round(r.avgSold))}</td>
                                  <td style="text-align:right;padding:5px 6px;font-family:'JetBrains Mono',monospace;font-weight:${_bp ? '800' : '400'};color:${_bp ? '#7eb8ff' : r.avgProfit >= 0 ? '#d1d5db' : '#ef4444'};">${fmtC(r.avgProfit)}</td>
                                  <td style="text-align:right;padding:5px 6px;font-family:'JetBrains Mono',monospace;color:#d1d5db;">${fmtC(r.avgRevenue)}</td>
                              </tr>`;
                          }).join('')}
                          </tbody></table></div>
                      </div>`;
                  });
              } else {
                  html += `
                  <div class="tcm-section-label">📊 Price Intelligence</div>
                  <div class="tcm-notice" style="font-size:11px;">
                      No data yet. TCM collects price + sales data automatically on every refresh.
                      Come back after a few days and you'll see which RRP% performs best for each product.
                  </div>`;
              }


              if (history.length >= 2) {
                  const _recent = [...history].reverse().slice(0, 7);
                  html += `
                  <div class="tcm-section-label" style="margin-top:8px;">Last 7 Days</div>
                  <div style="overflow-x:auto;">
                  <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:380px;">
                  <thead><tr style="background:#0a0e14;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:0.04em;">
                      <th style="text-align:left;padding:5px 8px;border-bottom:2px solid #2a2a2a;">Date</th>
                      <th style="text-align:left;padding:5px 4px;border-bottom:2px solid #2a2a2a;">Product</th>
                      <th style="text-align:center;padding:5px 4px;border-bottom:2px solid #2a2a2a;">RRP%</th>
                      <th style="text-align:right;padding:5px 4px;border-bottom:2px solid #2a2a2a;">Units sold</th>
                      <th style="text-align:right;padding:5px 4px;border-bottom:2px solid #2a2a2a;color:#7eb8ff;">Profit/day</th>
                  </tr></thead>
                  <tbody>
                  ${_recent.flatMap(entry =>
                      Object.entries(entry.items || {}).map(([name, d]) => {
                          const _isExp = activeExp && entry.date >= activeExp.startDate;
                          const _pc    = d.rrpPct == null ? '#888'
                                       : d.rrpPct >= 100 ? '#f59e0b'
                                       : d.rrpPct >= 70  ? '#7eb8ff'
                                       : '#ef4444';
                          const _changed = d._currentPrice ? ` <span style="font-size:9px;color:#f59e0b;" title="Price changed — sales data uses original price">⚠</span>` : '';
                          return `<tr style="border-bottom:1px solid #111827;">
                              <td style="padding:5px 8px;color:#ddd;white-space:nowrap;font-weight:600;">${entry.date}${_isExp ? ' <span style="font-size:9px;color:#7eb8ff;font-weight:700;">EXP</span>' : ''}</td>
                              <td style="padding:5px 4px;color:#d1d5db;">${name}${_changed}</td>
                              <td style="text-align:center;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-weight:700;color:${_pc};">${d.rrpPct != null ? d.rrpPct + '%' : '—'}</td>
                              <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;color:#d1d5db;">${fmtN(d.sold)}</td>
                              <td style="text-align:right;padding:5px 4px;font-family:'JetBrains Mono',monospace;font-weight:600;color:${d.profit >= 0 ? '#7eb8ff' : '#ef4444'};">${fmtC(d.profit)}</td>
                          </tr>`;
                      })
                  ).join('')}
                  </tbody></table></div>
                  <div style="font-size:10px;color:#888;margin-top:5px;">
                      ⚠ = price changed mid-day; profit uses the price that was active when sales happened.
                  </div>`;
              }


              if (expHistory.length) {
                  html += `<div class="tcm-section-label" style="margin-top:8px;">Past Experiments (${expHistory.length})</div>`;
                  expHistory.forEach(exp => {
                      const _col = exp.status === 'completed' ? '#7eb8ff' : '#888';
                      html += `<div style="background:#0d1117;border:1px solid #2a2a2a;border-radius:4px;padding:8px 12px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                          <div>
                              <span style="font-size:13px;font-weight:700;color:${_col};">${exp.name}</span>
                              <span style="font-size:11px;color:#888;margin-left:8px;">${exp.targetRrpPct}% RRP · ${exp.startDate} · ${exp.daysCollected || 0} days · ${exp.status}</span>
                          </div>
                          <button class="tcm-exp-hist-delete tcm-btn red" data-id="${exp.id}" style="font-size:10px;padding:2px 8px;">✕</button>
                      </div>`;
                  });
              }


              if (history.length > 0) {
                  html += `<div style="text-align:right;margin-top:8px;">
                      <button class="tcm-btn red" id="tcm-price-history-clear" style="font-size:11px;padding:3px 8px;">✕ Clear All Price History</button>
                  </div>`;
              }

              return html;
          },





          _tabCalc(state) {
              const s = Storage.getSettings();
              const calcSubTab = s.calcSubTab || 'calculator';
              const subTabHtml = `
                  <div class="tcm-mode-toggle" style="margin-bottom:12px;">
                      <button class="${calcSubTab==='calculator'?'active':''}" id="tcm-calcsub-calculator">Calculator</button>
                      <button class="${calcSubTab==='sales'?'active':''}" id="tcm-calcsub-sales">Train Sales</button>
                  </div>`;
              if (calcSubTab === 'sales') return subTabHtml + this._tabTrainSales(state);
              const { employees, typeName, directorId } = state;
              const positions = CompanyData.positions(typeName) || {};

              const empOptions = Object.entries(employees || {})
                  .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                  .sort((a, b) => (b[1].effectiveness?.total||0) - (a[1].effectiveness?.total||0))
                  .map(([id, e]) => `<option value="${id}">${e.name} (${e.position})</option>`)
                  .join('');

              const posOptions = Object.entries(positions)
                  .sort((a, b) => (b[1].priGain + b[1].secGain) - (a[1].priGain + a[1].secGain))
                  .map(([name, p]) => `<option value="${name}">${name} (+${p.priGain} ${p.primary.toUpperCase()}, +${p.secGain} ${p.secondary.toUpperCase()})</option>`)
                  .join('');



              const mainRoleOptions = Object.entries(positions)
                  .sort((a, b) => (b[1].priGain + b[1].secGain) - (a[1].priGain + a[1].secGain))
                  .map(([name]) => `<option value="${name}">${name}</option>`)
                  .join('');

              return subTabHtml + `
                  <div class="tcm-section-label">Trains Calculator</div>
                  <div class="tcm-notice" style="font-size:11px;">
                      Two modes: <strong>Target Stats</strong> — how many trains to reach a goal.
                      <strong>Reverse</strong> — what stats will N trains give you.
                      Employee selection is optional; leave blank to enter stats manually.
                      Includes train-swap analysis (move to high-gain role after 18:00 TCT, train, move back).
                  </div>

                  <div class="tcm-card"><div class="tcm-card-body">
                      <div class="tcm-section-label">Employee (optional)</div>
                      <select class="tcm-input" id="calc-emp" style="width:100%;margin-bottom:6px;">
                          <option value="">— Manual entry —</option>
                          ${empOptions}
                      </select>
                      <div id="calc-emp-stats" style="margin-bottom:8px;"></div>

                      <div class="tcm-section-label">Current Stats</div>
                      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
                          <div><div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">MAN</div>
                              <input class="tcm-input" id="calc-cur-man" type="number" min="0" placeholder="0" style="width:100%;box-sizing:border-box;"/></div>
                          <div><div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">INT</div>
                              <input class="tcm-input" id="calc-cur-int" type="number" min="0" placeholder="0" style="width:100%;box-sizing:border-box;"/></div>
                          <div><div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">END</div>
                              <input class="tcm-input" id="calc-cur-end" type="number" min="0" placeholder="0" style="width:100%;box-sizing:border-box;"/></div>
                      </div>

                      <div class="tcm-section-label">Training Position</div>
                      <select class="tcm-input" id="calc-pos" style="width:100%;margin-bottom:4px;">
                          <option value="">— Select position —</option>
                          ${posOptions}
                      </select>
                      <div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">Primary stat gains +50/train, secondary +25/train in this position.</div>

                      <div class="tcm-section-label">Main Role (for EE impact + train-swap)</div>
                      <select class="tcm-input" id="calc-main-pos" style="width:100%;margin-bottom:8px;">
                          <option value="">— Same as training position —</option>
                          ${mainRoleOptions}
                      </select>

                      <div class="tcm-mode-toggle" style="margin-bottom:10px;">
                          <button class="active" id="calc-mode-target">Target Stats</button>
                          <button id="calc-mode-reverse">N Trains → Stats</button>
                      </div>

                      <div id="calc-target-panel">
                          <div class="tcm-section-label">Target Stats</div>
                          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
                              <div><div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">MAN target</div>
                                  <input class="tcm-input" id="calc-target-man" type="number" min="0" placeholder="0" style="width:100%;box-sizing:border-box;"/></div>
                              <div><div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">INT target</div>
                                  <input class="tcm-input" id="calc-target-int" type="number" min="0" placeholder="0" style="width:100%;box-sizing:border-box;"/></div>
                              <div><div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">END target</div>
                                  <input class="tcm-input" id="calc-target-end" type="number" min="0" placeholder="0" style="width:100%;box-sizing:border-box;"/></div>
                          </div>
                      </div>

                      <div id="calc-reverse-panel" style="display:none;">
                          <div class="tcm-section-label">Number of Trains</div>
                          <input class="tcm-input" id="calc-num-trains" type="number" min="1" placeholder="e.g. 100"
                              style="width:100%;box-sizing:border-box;margin-bottom:10px;"/>
                      </div>

                      <button class="tcm-btn green" id="calc-run" style="width:100%;">Calculate</button>
                  </div></div>

                  <div id="calc-result" style="margin-top:10px;"></div>
              `;
          },

          _attachCalcHandlers(state) {
              const s = Storage.getSettings();

              document.getElementById('tcm-calcsub-calculator')?.addEventListener('click', () => {
                  s.calcSubTab = 'calculator'; Storage.saveSettings(s); this._renderTab('calc');
              });
              document.getElementById('tcm-calcsub-sales')?.addEventListener('click', () => {
                  s.calcSubTab = 'sales'; Storage.saveSettings(s); this._renderTab('calc');
              });

              if ((s.calcSubTab || 'calculator') === 'sales') {
                  this._attachTrainSalesHandlers(state);
                  return;
              }

              const { employees, typeName, directorId } = state;
              const positions = CompanyData.positions(typeName) || {};
              let calcMode = 'target';


              document.getElementById('calc-mode-target')?.addEventListener('click', () => {
                  calcMode = 'target';
                  document.getElementById('calc-mode-target').classList.add('active');
                  document.getElementById('calc-mode-reverse').classList.remove('active');
                  document.getElementById('calc-target-panel').style.display = '';
                  document.getElementById('calc-reverse-panel').style.display = 'none';
              });
              document.getElementById('calc-mode-reverse')?.addEventListener('click', () => {
                  calcMode = 'reverse';
                  document.getElementById('calc-mode-reverse').classList.add('active');
                  document.getElementById('calc-mode-target').classList.remove('active');
                  document.getElementById('calc-target-panel').style.display = 'none';
                  document.getElementById('calc-reverse-panel').style.display = '';
              });


              document.getElementById('calc-emp')?.addEventListener('change', (e) => {
                  const emp = employees[e.target.value];
                  const statsDiv = document.getElementById('calc-emp-stats');
                  if (!statsDiv) return;
                  if (!emp) { statsDiv.innerHTML = ''; return; }

                  const man = emp.manual_labor || 0, int_ = emp.intelligence || 0, end = emp.endurance || 0;
                  const totalEff = emp.effectiveness?.total || 0;

                  document.getElementById('calc-cur-man').value = man;
                  document.getElementById('calc-cur-int').value = int_;
                  document.getElementById('calc-cur-end').value = end;
                  document.getElementById('calc-target-man').value = man;
                  document.getElementById('calc-target-int').value = int_;
                  document.getElementById('calc-target-end').value = end;

                  statsDiv.innerHTML = `
                      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                          <span class="tcm-stat-chip">MAN: ${Calc.fmtNum(man)}</span>
                          <span class="tcm-stat-chip">INT: ${Calc.fmtNum(int_)}</span>
                          <span class="tcm-stat-chip">END: ${Calc.fmtNum(end)}</span>
                          <span class="tcm-stat-chip">EE: ${totalEff}</span>
                          <span class="tcm-stat-chip">${emp.position}</span>
                      </div>`;


                  const normalized = PosNorm.normalize(emp.position);
                  for (const sel of ['calc-pos', 'calc-main-pos']) {
                      const s = document.getElementById(sel);
                      if (!s) continue;
                      for (const opt of s.options) {
                          if (opt.value === normalized || opt.value === emp.position) { s.value = opt.value; break; }
                      }
                  }
              });


              document.getElementById('calc-run')?.addEventListener('click', () => {
                  const posName     = document.getElementById('calc-pos')?.value;
                  const mainPosName = document.getElementById('calc-main-pos')?.value || posName;
                  const posData     = posName ? positions[posName] : null;
                  const mainPosData = mainPosName ? positions[mainPosName] : null;
                  const resultDiv   = document.getElementById('calc-result');
                  if (!resultDiv) return;

                  if (!posData) {
                      resultDiv.innerHTML = '<div class="tcm-warn-box">Select a training position first.</div>';
                      return;
                  }

                  const curMan = parseInt(document.getElementById('calc-cur-man')?.value || '0') || 0;
                  const curInt = parseInt(document.getElementById('calc-cur-int')?.value || '0') || 0;
                  const curEnd = parseInt(document.getElementById('calc-cur-end')?.value || '0') || 0;

                  const priKey  = posData.primary;
                  const secKey  = posData.secondary;
                  const statMap = { man: curMan, int: curInt, end: curEnd };
                  const empId   = document.getElementById('calc-emp')?.value;
                  const emp     = employees[empId] || null;
                  const label   = emp ? emp.name : 'Manual';

                  if (calcMode === 'reverse') {
                      const numTrains = parseInt(document.getElementById('calc-num-trains')?.value || '0');
                      if (numTrains < 1) {
                          resultDiv.innerHTML = '<div class="tcm-warn-box">Enter a number of trains ≥ 1.</div>';
                          return;
                      }
                      const priGained = numTrains * TCM.TRAIN_PRIMARY;
                      const secGained = numTrains * TCM.TRAIN_SECONDARY;
                      const afterMan  = curMan + (priKey==='man' ? priGained : secKey==='man' ? secGained : 0);
                      const afterInt  = curInt + (priKey==='int' ? priGained : secKey==='int' ? secGained : 0);
                      const afterEnd  = curEnd + (priKey==='end' ? priGained : secKey==='end' ? secGained : 0);


                      const wsEEBefore = Calc.totalEff(statMap[priKey], posData.priReq, statMap[secKey], posData.secReq);
                      const wsEEAfter  = Calc.totalEff(
                          priKey==='man'?afterMan:priKey==='int'?afterInt:afterEnd, posData.priReq,
                          secKey==='man'?afterMan:secKey==='int'?afterInt:afterEnd, posData.secReq
                      );


                      let mainEEHtml = '';
                      if (mainPosData && mainPosName !== posName) {
                          const mBefore = Calc.totalEff(statMap[mainPosData.primary], mainPosData.priReq, statMap[mainPosData.secondary], mainPosData.secReq);
                          const mAfter  = Calc.totalEff(
                              mainPosData.primary==='man'?afterMan:mainPosData.primary==='int'?afterInt:afterEnd, mainPosData.priReq,
                              mainPosData.secondary==='man'?afterMan:mainPosData.secondary==='int'?afterInt:afterEnd, mainPosData.secReq
                          );
                          const mDelta = mAfter - mBefore;
                          mainEEHtml = `<div class="tcm-row"><span class="lbl">WS EE benefit in ${mainPosName} (stat gains carry over)</span><span class="val ${mDelta>0?'green':'red'}">${mBefore} → ${mAfter} (${mDelta>=0?'+':''}${mDelta})</span></div>`;
                      }

                      resultDiv.innerHTML = `<div class="tcm-card"><div class="tcm-card-body">
                          <div class="tcm-section-label">${label}: ${numTrains} trains in ${posName}</div>
                          <div class="tcm-row"><span class="lbl">${priKey.toUpperCase()} gain (+${TCM.TRAIN_PRIMARY}/train)</span><span class="val green">+${Calc.fmtNum(priGained)} → ${Calc.fmtNum(statMap[priKey]+priGained)}</span></div>
                          <div class="tcm-row"><span class="lbl">${secKey.toUpperCase()} gain (+${TCM.TRAIN_SECONDARY}/train)</span><span class="val green">+${Calc.fmtNum(secGained)} → ${Calc.fmtNum(statMap[secKey]+secGained)}</span></div>
                          <div class="tcm-row"><span class="lbl">WS EE in training position</span><span class="val">${wsEEBefore} → ${wsEEAfter} (+${wsEEAfter-wsEEBefore})</span></div>
                          ${mainEEHtml}
                      </div></div>`;
                      return;
                  }


                  const tgtMan = parseInt(document.getElementById('calc-target-man')?.value || '0') || curMan;
                  const tgtInt = parseInt(document.getElementById('calc-target-int')?.value || '0') || curInt;
                  const tgtEnd = parseInt(document.getElementById('calc-target-end')?.value || '0') || curEnd;

                  const tgtMap  = { man: tgtMan, int: tgtInt, end: tgtEnd };
                  const priNeed = Math.max(0, Math.ceil((tgtMap[priKey] - statMap[priKey]) / TCM.TRAIN_PRIMARY));
                  const secNeed = Math.max(0, Math.ceil((tgtMap[secKey] - statMap[secKey]) / TCM.TRAIN_SECONDARY));
                  const trains  = Math.max(priNeed, secNeed);

                  const afterPri = statMap[priKey] + trains * TCM.TRAIN_PRIMARY;
                  const afterSec = statMap[secKey] + trains * TCM.TRAIN_SECONDARY;
                  const afterMan = priKey==='man'?afterPri:secKey==='man'?afterSec:curMan;
                  const afterInt = priKey==='int'?afterPri:secKey==='int'?afterSec:curInt;
                  const afterEnd = priKey==='end'?afterPri:secKey==='end'?afterSec:curEnd;


                  const wsEEBefore = Calc.totalEff(statMap[priKey], posData.priReq, statMap[secKey], posData.secReq);
                  const wsEEAfter  = Calc.totalEff(afterPri, posData.priReq, afterSec, posData.secReq);


                  const isSamePos  = !mainPosName || mainPosName === posName;
                  const mainPD     = isSamePos ? posData : mainPosData;
                  let mainEEHtml = '', swapHtml = '';
                  if (mainPD) {
                      const mBefore = Calc.totalEff(statMap[mainPD.primary], mainPD.priReq, statMap[mainPD.secondary], mainPD.secReq);
                      const mAftPri = mainPD.primary==='man'?afterMan:mainPD.primary==='int'?afterInt:afterEnd;
                      const mAftSec = mainPD.secondary==='man'?afterMan:mainPD.secondary==='int'?afterInt:afterEnd;
                      const mAfter  = Calc.totalEff(mAftPri, mainPD.priReq, mAftSec, mainPD.secReq);
                      const mDelta  = mAfter - mBefore;
                      mainEEHtml = `<div class="tcm-row"><span class="lbl">WS EE in ${mainPosName||posName} (stat gains carry over permanently)</span><span class="val ${mDelta>0?'green':mDelta<0?'red':''}">${mBefore} → ${mAfter} (${mDelta>=0?'+':''}${mDelta})</span></div>`;

                      if (!isSamePos) {
                          const swapEE = Calc.totalEff(statMap[priKey], posData.priReq, statMap[secKey], posData.secReq);
                          swapHtml = `<div class="tcm-card" style="margin-top:8px;border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.04);">
                              <div class="tcm-card-body">
                                  <div class="tcm-section-label" style="color:#f59e0b;">Train-Swap Technique</div>
                                  <div class="tcm-notice" style="font-size:11px;">
                                      After 18:00 TCT (once the daily EE calculation has run), move
                                      <strong>${label}</strong> from <strong>${mainPosName}</strong> to
                                      <strong>${posName}</strong>, have them trained, then move back.
                                      The daily EE calculation already ran — this position change does not
                                      affect today's revenue or EE bonuses.
                                  </div>
                                  <div class="tcm-row"><span class="lbl">Their EE in ${posName}</span><span class="val ${swapEE>=50?'amber':'red'}">${swapEE} (temp)</span></div>
                                  <div class="tcm-row"><span class="lbl">Stat gain per train</span><span class="val">+${TCM.TRAIN_PRIMARY} ${priKey.toUpperCase()}, +${TCM.TRAIN_SECONDARY} ${secKey.toUpperCase()}</span></div>
                              </div>
                          </div>`;
                      }
                  }

                  resultDiv.innerHTML = `
                      <div class="tcm-card"><div class="tcm-card-body">
                          <div class="tcm-section-label">${label} → ${posName}</div>
                          <div class="tcm-row"><span class="lbl">Trains needed</span><span class="val green" style="font-size:15px;font-weight:800;">${trains}</span></div>
                          <div class="tcm-row"><span class="lbl">${priKey.toUpperCase()} (primary +${TCM.TRAIN_PRIMARY})</span><span class="val">+${trains*TCM.TRAIN_PRIMARY} (${Calc.fmtNum(statMap[priKey])} → ${Calc.fmtNum(afterPri)})</span></div>
                          <div class="tcm-row"><span class="lbl">${secKey.toUpperCase()} (secondary +${TCM.TRAIN_SECONDARY})</span><span class="val">+${trains*TCM.TRAIN_SECONDARY} (${Calc.fmtNum(statMap[secKey])} → ${Calc.fmtNum(afterSec)})</span></div>
                          <div class="tcm-row"><span class="lbl">WS EE in ${posName}</span><span class="val">${wsEEBefore} → ${wsEEAfter} (+${wsEEAfter-wsEEBefore})</span></div>
                          ${mainEEHtml}
                      </div></div>
                      ${swapHtml}`;
              });
          },


          _tabTrainSales(state) {
              const { employees, directorId } = state;
              const sales = Storage.getTrainSales();
              const log = Storage.getTrainedLog();
              const today = new Date().toISOString().slice(0, 10);

              const stars = state.profile?.rating || 0;
              const positions = CompanyData.positions(state.typeName);
              let trainerBonus = 0;
              for (const emp of Object.values(employees || {})) {
                  const res = PosNorm.resolve(emp.position, positions);
                  if (res?.data?.special === 'trainer') {
                      const eff = emp.effectiveness?.working_stats || 0;
                      if (eff >= TCM.EE_TIER_4) trainerBonus += 3;
                      else if (eff >= TCM.EE_TIER_3) trainerBonus += 2;
                      else if (eff >= TCM.EE_TIER_2) trainerBonus += 1;
                  }
              }
              const _activeSalesH = Storage.getTrainSales().filter(c => c.active !== false && (c.dailyReservation || 0) > 0);
              const _rawBudget = Math.min(20, stars) + trainerBonus;
              // Today only — do not count future-start or already-finished contract days
              const _todayIso = new Date().toISOString().slice(0, 10);
              const _todayAvail = Storage.freeTrainsOnDate(_todayIso, state, {});
              const totalReserved = _todayAvail.reserved || 0;
              const trainBudget = Math.max(0, _rawBudget - totalReserved);
              const _rotExclHandler = new Set(Storage.getRotation().excluded || []);
              const nonDirIds = Object.keys(employees || {}).filter(id =>
                  employees[id].position !== 'Director'
                  && String(id) !== String(directorId || '')
                  && !_rotExclHandler.has(id)
              );
              const N = nonDirIds.length;

              const contracts = sales.map(c => {
      const _rawEntries = (log[c.buyerEmpId] || []).filter(e => e.ts && e.date >= (c.startDate || ''));
  const _seenTs = new Set();
  const entries = _rawEntries.filter(e => {
      const _k = e._logId || e.ts;
      if (_seenTs.has(_k)) return false;
      _seenTs.add(_k); return true;
      return true;
  });
      const done = entries.length;
                  const openEnded = Storage.isOpenEndedContract(c);
                  const isFree = Storage.isFreeContract(c);
                  const freeAllowance = Storage.getFreeAllowance(c);
                  const freeUsed = Storage.freeTrainsUsed(c, done);
                  const freeLeft = isFinite(freeAllowance) ? Math.max(0, freeAllowance - freeUsed) : 0;
                  const totalTrainsN = openEnded ? 0 : (Number(c.totalTrains) || 0);
                  const remaining = openEnded ? null : Math.max(0, totalTrainsN - done);
                  const ppt = isFree ? 0 : (Number(c.pricePerTrain) || 0);
                  const billableDone = Storage.billableTrainsDone(c, done);
                  const cashEarned = billableDone * ppt;
                  const billableTotal = openEnded || !isFinite(freeAllowance)
                      ? null
                      : Math.max(0, totalTrainsN - freeAllowance);
                  const cashRemaining = openEnded ? null
                      : (isFree ? 0 : Math.max(0, (billableTotal != null ? billableTotal : totalTrainsN) - billableDone) * ppt);
                  const totalValue = openEnded ? null : (isFree ? 0 : ((billableTotal != null ? billableTotal : totalTrainsN) * ppt));
                  const payments = isFree ? [] : Storage.getContractPayments(c);
                  const amountPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  const balanceDue = isFree ? 0 : (cashEarned - amountPaid);
                  const trainsCovered = (!isFree && ppt > 0) ? Math.floor(amountPaid / ppt) : 0;
                  const unpaidBillable = (!isFree && billableDone > trainsCovered) ? (billableDone - trainsCovered) : 0;
                  const week7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
                  const recentEntries = entries.filter(e => e.date >= week7);
                  const dailyRate = recentEntries.length / 7;

                  const effectiveRate = (c.dailyReservation > 0) ? c.dailyReservation : dailyRate;
                  const daysToComplete = (!openEnded && remaining != null && effectiveRate > 0)
                      ? Math.ceil(remaining / effectiveRate) : null;
                  return {
                      ...c,
                      openEnded,
                      isFree,
                      freeAllowance: isFinite(freeAllowance) ? freeAllowance : null,
                      freeUsed,
                      freeLeft,
                      billableDone,
                      totalTrains: openEnded ? 0 : totalTrainsN,
                      done,
                      remaining,
                      cashEarned,
                      cashRemaining,
                      totalValue,
                      payments,
                      amountPaid,
                      balanceDue,
                      trainsCovered,
                      unpaidBillable,
                      daysToComplete,
                      dailyRate: effectiveRate
                  };
              });

             const activeContracts  = contracts.filter(c => c.active !== false && !c.deleted);
              const archivedContracts = contracts.filter(c => c.active === false && !c.deleted);
              // Reserved/free for *today* (same numbers as 7-day schedule row 1)
              const reservedPerDay   = totalReserved;
              const freeTrains       = trainBudget;

              const empOptions = Object.entries(employees || {})
                  .filter(([id, e]) => e.position !== 'Director' && String(id) !== String(directorId || ''))
                  .map(([id, e]) => `<option value="${id}">${e.name}</option>`)
                  .join('');

              let html = '';


              html += `<div class="tcm-card"><div class="tcm-card-body">
                  <div class="tcm-row"><span class="lbl">Daily train budget</span><span class="val">${_rawBudget} <span style="font-size:10px;color:#888;">(${Math.min(20, stars)}★ + ${trainerBonus} trainer bonus)</span></span></div>
      <div class="tcm-row"><span class="lbl">Reserved for buyers <span style="font-size:10px;color:#666;font-weight:400;">(today)</span></span><span class="val ${reservedPerDay > _rawBudget ? 'red' : 'amber'}">${reservedPerDay}</span></div>
     <div class="tcm-row"><span class="lbl">Free for rotation <span style="font-size:10px;color:#666;font-weight:400;">(today)</span></span><span class="val ${freeTrains === 0 ? 'red' : 'green'}">${freeTrains} trains · ${N} employees</span></div>
                  ${reservedPerDay > _rawBudget ? `<div class="tcm-warn-box" style="margin-top:6px;">⚠ Today over-reserved by ${reservedPerDay - _rawBudget} trains — reduce daily reservations on contracts active today.</div>` : ''}
              </div></div>`;


              html += `<div class="tcm-section-label">Active Contracts (${activeContracts.length})</div>`;
              if (!activeContracts.length) {
                  html += `<div class="tcm-notice">No active contracts. Add one below.</div>`;
              }
              activeContracts.forEach(c => {
                  const pct    = c.openEnded ? 0 : Math.min(100, c.totalTrains > 0 ? Math.round((c.done / c.totalTrains) * 100) : 0);
                  const barCls = pct >= 100 ? '' : pct >= 50 ? 'amber' : 'red';
                  const empName = employees[c.buyerEmpId]?.name || c.buyerName;
                  html += `<div class="tcm-card" style="margin-bottom:8px;"><div class="tcm-card-body">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                          <span style="font-weight:700;color:#7eb8ff;font-size:14px;">${empName}</span>
                          <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
                              <button class="tcm-sale-edit" data-id="${c.id}"
                                  style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
                                  color:#f59e0b;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:11px;">✎ Edit</button>
                              <button class="tcm-sale-paid" data-id="${c.id}"
                                  style="background:rgba(126,184,255,0.1);border:1px solid rgba(126,184,255,0.3);
                                  color:#7eb8ff;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:11px;">✓ Complete contract</button>
                              <button class="tcm-sale-export" data-id="${c.id}"
                                  style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);
                                  color:#7eb8ff;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:11px;">↓ Export</button>
                              <button class="tcm-sale-sync" data-id="${c.id}"
                                  style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.25);
                                  color:#7eb8ff;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:11px;">↑ Sheet</button>
                              <button class="tcm-sale-archive" data-id="${c.id}"
                                  style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);
                                  color:#7eb8ff;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:11px;">Archive</button>
                              <button class="tcm-sale-delete" data-id="${c.id}"
                                  style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);
                                  color:#ef4444;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:11px;">✕</button>
                          </div>
                      </div>
                      <div class="tcm-row"><span class="lbl">Contract</span><span class="val">${c.isFree
                          ? (c.openEnded ? 'Open-ended · <span style="color:#7eb8ff;">FREE</span>' : (c.totalTrains + ' trains · <span style="color:#7eb8ff;">FREE</span>'))
                          : (c.openEnded
                              ? ('Open-ended · ' + Calc.fmtCash(c.pricePerTrain) + '/train')
                              : (c.totalTrains + ' trains @ ' + Calc.fmtCash(c.pricePerTrain) + ' each'))}</span></div>
                      ${c.isFree
                          ? '<div class="tcm-row"><span class="lbl">Type</span><span class="val" style="color:#7eb8ff;">Complimentary — no payment</span></div>'
                          : (c.openEnded
                              ? '<div class="tcm-row"><span class="lbl">Type</span><span class="val" style="color:#a78bfa;">Long-term / no fixed total</span></div>'
                              : ('<div class="tcm-row"><span class="lbl">Total value</span><span class="val">' + Calc.fmtCash(c.totalValue) + '</span></div>'))}
                      ${(c.freeAllowance > 0 || c.isFree) ? `<div class="tcm-row"><span class="lbl">Free trains</span><span class="val" style="color:#7eb8ff;">${c.isFree
                          ? (c.done + ' delivered (all complimentary)')
                          : (c.freeUsed + ' / ' + c.freeAllowance + ' free used · ' + c.freeLeft + ' free left · ' + (c.billableDone || 0) + ' billable')}</span></div>` : ''}
                      <div class="tcm-row"><span class="lbl">Progress</span><span class="val green">${c.openEnded
                          ? (c.done + ' trains delivered')
                          : (c.done + ' / ' + c.totalTrains + ' trains (' + pct + '%)')}</span></div>
                      ${c.openEnded ? '' : `<div style="margin:4px 0 8px;">
                          <div class="tcm-bar" style="width:100%;height:6px;">
                              <div class="tcm-bar-fill ${barCls}" style="width:${pct}%;"></div>
                          </div>
                      </div>`}
                      ${c.isFree ? `
                      <div class="tcm-row"><span class="lbl">Payment</span><span class="val" style="color:#7eb8ff;">Free — excluded from balance sheet</span></div>
                      ` : `
                      <div class="tcm-row"><span class="lbl">Billable train value</span><span class="val green">${Calc.fmtCash(c.cashEarned)}${(c.freeUsed > 0) ? ' <span style="color:#7eb8ff;font-size:11px;">(' + c.freeUsed + ' free not charged)</span>' : ''}</span></div>
                      <div class="tcm-row"><span class="lbl">Payments received</span><span class="val" style="color:#a78bfa;">${Calc.fmtCash(c.amountPaid || 0)}</span></div>
                      ${(c.trainsCovered > 0 || c.unpaidBillable > 0) ? `<div class="tcm-row"><span class="lbl">Trains covered by payments</span><span class="val" style="color:#a78bfa;">${c.trainsCovered} train${c.trainsCovered !== 1 ? 's' : ''}${c.unpaidBillable > 0 ? ' <span style="color:#f59e0b;">(' + c.unpaidBillable + ' unpaid)</span>' : ''}</span></div>` : ''}
                      <div class="tcm-row"><span class="lbl">Balance (billable − paid)</span><span class="val ${(c.balanceDue||0) > 0 ? 'amber' : (c.balanceDue||0) < 0 ? 'green' : ''}">${(c.balanceDue||0) > 0 ? Calc.fmtCash(c.balanceDue) + ' due' : (c.balanceDue||0) < 0 ? Calc.fmtCash(-(c.balanceDue||0)) + ' credit' : Calc.fmtCash(0)}</span></div>
                      ${!c.openEnded ? `<div class="tcm-row"><span class="lbl">Remaining billable value</span><span class="val amber">${Calc.fmtCash(c.cashRemaining)}</span></div>` : ''}
                      `}
                      ${!c.openEnded && c.daysToComplete !== null
                          ? `<div class="tcm-row"><span class="lbl">Est. completion</span><span class="val">${c.daysToComplete}d at ${c.dailyRate.toFixed(1)} trains/day</span></div>`
                          : (!c.openEnded ? `<div class="tcm-row"><span class="lbl">Est. completion</span><span class="val" style="color:#888;">Not enough data yet</span></div>` : '')}
                      ${c.isFree ? '' : `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #2a2a2a;">
                          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Payments over time</div>
                          ${(c.payments && c.payments.length) ? c.payments.slice().sort((a,b) => String(a.date).localeCompare(String(b.date))).map(p =>
                              `<div class="tcm-row" style="font-size:11px;">
                                  <span class="lbl">${p.date || '—'} ${p.note ? ('· ' + p.note) : ''}</span>
                                  <span class="val" style="color:#a78bfa;">${Calc.fmtCash(p.amount)}
                                      <button type="button" class="tcm-sale-del-pay" data-id="${c.id}" data-payid="${p.id}"
                                          style="margin-left:6px;background:transparent;border:none;color:#f66;cursor:pointer;font-size:11px;" title="Remove payment">✕</button>
                                  </span>
                              </div>`
                          ).join('') : '<div style="font-size:11px;color:#666;margin-bottom:6px;">No payments recorded yet.</div>'}
                          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:end;margin-top:6px;">
                              <div>
                                  <div style="font-size:10px;color:#888;margin-bottom:2px;">Amount</div>
                                  <input class="tcm-input tcm-sale-pay-amt" data-id="${c.id}" type="text" inputmode="numeric" placeholder="0" style="width:100%;box-sizing:border-box;font-size:12px;padding:4px 6px;" />
                              </div>
                              <div>
                                  <div style="font-size:10px;color:#888;margin-bottom:2px;">Date</div>
                                  <input class="tcm-input tcm-sale-pay-date" data-id="${c.id}" type="date" value="${today}" style="width:100%;box-sizing:border-box;font-size:12px;padding:4px 6px;" />
                              </div>
                              <button type="button" class="tcm-btn tcm-sale-add-pay" data-id="${c.id}" style="font-size:11px;padding:5px 10px;">+ Pay</button>
                          </div>
                          <div style="margin-top:4px;">
                              <input class="tcm-input tcm-sale-pay-note" data-id="${c.id}" type="text" placeholder="Note (optional)" style="width:100%;box-sizing:border-box;font-size:11px;padding:3px 6px;" />
                          </div>
                          ${(c.pricePerTrain > 0) ? `<div style="font-size:10px;color:#666;margin-top:2px;">${Calc.fmtCash(c.pricePerTrain)}/train — amount ÷ price = trains covered</div>` : ''}
                      </div>`}
                      <div class="tcm-row" style="margin-top:4px;">
                          <span class="lbl">Daily trains</span>
                          <div style="display:flex;align-items:center;gap:6px;">
                              <input type="number" min="0" max="${_rawBudget}" value="${c.dailyReservation || 0}"
                                  class="tcm-input tcm-sale-reservation" data-id="${c.id}"
                                  style="width:55px;padding:3px 6px;font-size:12px;" />
                              <span style="font-size:11px;color:#888;">trains/day</span>
                          </div>
                          ${c.isFree ? '' : `<div class="tcm-row" style="margin-top:4px;">
                              <span class="lbl">Free trains</span>
                              <div style="display:flex;align-items:center;gap:6px;">
                                  <input type="number" min="0" value="${c.freeTrains || c.freeAllowance || 0}"
                                      class="tcm-input tcm-sale-free-trains" data-id="${c.id}"
                                      style="width:55px;padding:3px 6px;font-size:12px;" title="First N delivered trains are complimentary" />
                                  <span style="font-size:11px;color:#7eb8ff;">complimentary (not billed)</span>
                              </div>
                          </div>`}
                      </div>
                      ${c.notes ? `<div style="font-size:12px;color:#9ca3af;margin-top:6px;font-style:italic;">"${c.notes}"</div>` : ''}
                      <div style="font-size:11px;color:#4b5563;margin-top:6px;">Trains counted from: <strong style="color:#888;">${c.startDate}</strong> · all trains to this employee since that date count toward this contract.</div>
                  </div></div>`;
              });


              if (activeContracts.length > 0) {
                  html += `<div class="tcm-section-label" style="margin-top:4px;">7-Day Schedule</div>
                  <div class="tcm-notice" style="font-size:11px;">How trains split between buyers and regular rotation each day. Adjust daily reservations above to change the balance.</div>`;

                  const _sim = Storage.simulateBuyerSchedule(state, { horizon: 7 });
                  const days = _sim.days.map((row, d) => {
                      const dayDate = new Date(row.date + 'T12:00:00Z');
                      const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
                      const buyerAllocs = row.allocs.map(a => ({
                          name: (employees[a.id] ? null : null) || a.name,
                          trains: a.trains,
                          contractId: a.id
                      })).map(a => {
                          // Prefer live employee name when we can resolve buyer from contract
                          const c = activeContracts.find(x => x.id === a.contractId);
                          const nm = c ? (employees[c.buyerEmpId]?.name || c.buyerName || a.name) : a.name;
                          return { name: nm, trains: a.trains, contractId: a.contractId };
                      });
                      return {
                          dayLabel,
                          dayIso: row.date,
                          buyerAllocs,
                          usedByBuyers: row.usedByBuyers,
                          rotationTrains: row.rotationTrains,
                          isToday: d === 0
                      };
                  });

                  html += `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
                      <thead><tr>
                          <th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Day</th>
                          <th style="text-align:center;padding:5px 4px;color:#f59e0b;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Buyers</th>
                          <th style="text-align:center;padding:5px 4px;color:#7eb8ff;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Rotation</th>
                          <th style="text-align:left;padding:5px 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2a2a2a;">Breakdown</th>
                      </tr></thead>
                      <tbody>
                          ${days.map(d => `<tr style="border-bottom:1px solid #111827;${d.isToday ? 'background:rgba(126,184,255,0.04);' : ''}">
                              <td style="padding:6px 8px 6px 0;color:${d.isToday ? '#7eb8ff' : '#ddd'};font-weight:${d.isToday ? '700' : '600'};white-space:nowrap;font-size:12px;">${d.dayLabel}${d.isToday ? ' ◀' : ''}</td>
                              <td style="text-align:center;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#f59e0b;font-weight:700;">${d.usedByBuyers}</td>
                              <td style="text-align:center;padding:6px 4px;font-family:'JetBrains Mono',monospace;color:#7eb8ff;font-weight:700;">${d.rotationTrains}</td>
                              <td style="padding:6px 4px;font-size:11px;color:#9ca3af;">
                                  ${d.buyerAllocs.map(b => `<span style="color:#f59e0b;">${b.name}×${b.trains}</span>`).join(' ')}
                                  ${d.buyerAllocs.length > 0 && d.rotationTrains > 0 ? ' + ' : ''}
                                  ${d.rotationTrains > 0 ? `<span style="color:#7eb8ff;">Rotation×${d.rotationTrains}</span>` : ''}
                              </td>
                          </tr>`).join('')}
                      </tbody>
                  </table></div>`;
              }


              html += `<div class="tcm-section-label" style="margin-top:8px;">Add Contract</div>
              <div class="tcm-card"><div class="tcm-card-body">
                  <div style="margin-bottom:8px;">
                      <div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">Employee</div>
                      <select class="tcm-input" id="sale-emp" style="width:100%;">
                          <option value="">— Select employee —</option>
                          ${empOptions}
                      </select>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
              <div>
                  <div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">Total trains <span style="color:#666;font-weight:400;">(fixed deals)</span></div>
                  <input class="tcm-input" id="sale-trains" type="number" min="1" placeholder="e.g. 20" style="width:100%;box-sizing:border-box;"/>
                  <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:#ccc;cursor:pointer;">
                      <input type="checkbox" id="sale-open-ended" style="accent-color:#7eb8ff;cursor:pointer;" />
                      Open-ended / long-term (no fixed total)
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:#7eb8ff;cursor:pointer;">
                      <input type="checkbox" id="sale-is-free" style="accent-color:#7eb8ff;cursor:pointer;" />
                      Fully free (entire contract complimentary)
                  </label>
                  <div style="margin-top:6px;">
                      <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">Free trains allowance <span style="color:#666;">(first N free, then paid)</span></div>
                      <input class="tcm-input" id="sale-free-trains" type="number" min="0" placeholder="e.g. 50" style="width:100%;box-sizing:border-box;" />
                      <div style="font-size:10px;color:#666;margin-top:2px;">Not charged on the balance sheet. Extra trains after this use the price below.</div>
                  </div>
              </div>
             <div>
                  <div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">Pricing method</div>
                  <div style="display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                      <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:#9ca3af;">
                          <input type="radio" name="sale-price-mode" id="sale-price-mode-per" value="per_train" checked style="accent-color:#7eb8ff;"/> Per train
                      </label>
                      <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:#f59e0b;">
                          <input type="radio" name="sale-price-mode" id="sale-price-mode-total" value="total" style="accent-color:#f59e0b;"/> Total contract
                      </label>
                  </div>
                  <div id="sale-price-per-wrap">
                      <input class="tcm-input" id="sale-price" type="text" inputmode="numeric" placeholder="e.g. 400,000 per train" style="width:100%;box-sizing:border-box;"/>
                  </div>
                  <div id="sale-price-total-wrap" style="display:none;">
                      <input class="tcm-input" id="sale-total-value" type="text" inputmode="numeric" placeholder="e.g. 8,000,000 total" style="width:100%;box-sizing:border-box;"/>
                      <div id="sale-total-calc" style="font-size:10px;color:#f59e0b;margin-top:3px;min-height:14px;"></div>
                  </div>
              </div>
          </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                     <div style="margin-bottom:8px;">
                      <div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">Daily trains <span style="color:#4b5563;font-weight:400;">(optional)</span></div>
                      <input class="tcm-input" id="sale-reservation" type="number" min="0" placeholder="Leave blank to not reserve" style="width:100%;box-sizing:border-box;"/>
                      <div style="font-size:11px;color:#4b5563;margin-top:3px;">If set, this many trains will be reserved for this buyer each day from the start date, only while the contract still has trains left.</div>
                      <div id="sale-avail-hint" style="font-size:11px;color:#7eb8ff;margin-top:4px;"></div>
                  </div>
                      <div>
                          <div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">Start date</div>
                          <input class="tcm-input" id="sale-startdate" type="date" value="${today}" style="width:100%;box-sizing:border-box;"/>
                      </div>
                  </div>
                  <div style="margin-bottom:10px;">
                      <div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">Notes (optional)</div>
                      <input class="tcm-input" id="sale-notes" type="text" placeholder="e.g. weekly payments, friend deal, open-ended" style="width:100%;box-sizing:border-box;"/>
                  </div>
                  <div style="margin-bottom:10px;padding:8px;background:rgba(126,184,255,0.05);border:1px solid rgba(126,184,255,0.15);border-radius:4px;">
                      <div style="font-size:12px;color:#9ca3af;margin-bottom:6px;font-weight:600;">Initial payment (optional)</div>
                      <div style="font-size:10px;color:#666;margin-bottom:6px;">You can add more payments anytime on the active contract card.</div>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#ddd;cursor:pointer;margin-bottom:6px;">
                          <input type="radio" name="sale-pay-status" id="sale-pay-unpaid" value="unpaid" checked style="cursor:pointer;"/>
                          Not paid yet
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#7eb8ff;cursor:pointer;margin-bottom:6px;">
                          <input type="radio" name="sale-pay-status" id="sale-pay-full" value="full" style="cursor:pointer;"/>
                          Already paid in full
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#f59e0b;cursor:pointer;">
                          <input type="radio" name="sale-pay-status" id="sale-pay-partial" value="partial" style="cursor:pointer;"/>
                          Partially paid
                      </label>
                      <div id="sale-partial-wrap" style="display:none;margin-top:8px;">
                          <div style="font-size:12px;color:#9ca3af;margin-bottom:3px;">Amount already paid ($)</div>
                          <input class="tcm-input" id="sale-partial-amount" type="text" inputmode="numeric" placeholder="e.g. 1,000,000" style="width:100%;box-sizing:border-box;"/>
                      </div>
                  </div>
                  <button class="tcm-btn green" id="sale-add" style="width:100%;">Add Contract</button>
              </div></div>`;


              if (archivedContracts.length) {
      html += `<div class="tcm-section-label" style="margin-top:8px;">Archived (${archivedContracts.length})</div>`;
      archivedContracts.forEach(c => {
          const empName = employees[c.buyerEmpId]?.name || c.buyerName;
          const isComplete = !c.openEnded && (c.totalTrains || 0) > 0 && c.done >= c.totalTrains;
          const hasPartial = c.done > 0 && (c.openEnded || c.done < (c.totalTrains || 0));
          const borderColor = isComplete ? 'rgba(126,184,255,0.4)' : hasPartial ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';
          const textColor   = isComplete ? '#7eb8ff' : hasPartial ? '#f59e0b' : '#ef4444';
          const statusLabel = isComplete ? '✓ Paid in full' : hasPartial ? (c.openEnded ? `${c.done} trains delivered` : `${c.done}/${c.totalTrains} trains`) : '0 trains done';
          html += `<div style="padding:8px 12px;margin-bottom:5px;background:#0a0e14;border:1px solid ${borderColor};border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                  <span style="font-size:13px;color:${textColor};font-weight:700;">${empName}</span>
                  <span style="font-size:12px;color:#888;margin-left:8px;">${statusLabel} · ${Calc.fmtCash(c.cashEarned)} earned</span>
              </div>
             <div style="display:flex;gap:4px;">
                  <button class="tcm-sale-restore" data-id="${c.id}"
                      style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);color:#7eb8ff;border-radius:3px;padding:1px 6px;cursor:pointer;font-size:11px;">↺ Restore</button>
                  <button class="tcm-sale-delete" data-id="${c.id}"
                      style="background:none;border:1px solid ${borderColor};color:${textColor};border-radius:3px;padding:1px 6px;cursor:pointer;font-size:11px;">✕</button>
              </div>
          </div>`;
      });
  }

              return html;
          },

          _attachTrainSalesHandlers(state) {
              const _tsPositions = CompanyData.positions(state.typeName);
              const _tsStars = state.profile?.rating || 0;
              let _tsTrainerBonus = 0;
              for (const _tsEmp of Object.values(state.employees || {})) {
                  const _tsRes = PosNorm.resolve(_tsEmp.position, _tsPositions);
                  if (_tsRes?.data?.special === 'trainer') {
                      const _tsEff = _tsEmp.effectiveness?.working_stats || 0;
                      if (_tsEff >= TCM.EE_TIER_4) _tsTrainerBonus += 3;
                      else if (_tsEff >= TCM.EE_TIER_3) _tsTrainerBonus += 2;
                      else if (_tsEff >= TCM.EE_TIER_2) _tsTrainerBonus += 1;
                  }
              }
              const _tsDailyBudget = Math.min(20, _tsStars) + _tsTrainerBonus;

              
              const _refreshSaleAvailHint = () => {
                  const el = document.getElementById('sale-avail-hint');
                  if (!el) return;
                  const day = document.getElementById('sale-startdate')?.value || new Date().toISOString().slice(0, 10);
                  const want = parseInt(document.getElementById('sale-reservation')?.value || '0', 10) || 0;
                  const avail = Storage.freeTrainsOnDate(day, state, {});
                  const ok = want <= 0 || want <= avail.free;
                  el.style.color = ok ? '#7eb8ff' : '#f88';
                  const who = (avail.allocs || []).map(a => `${a.name}×${a.trains}`).join(' + ') || 'none';
                  el.textContent = `${day}: budget ${avail.base}/day · reserved ${avail.reserved} (${who}) · free ${avail.free}` +
                      (want > 0 ? (ok ? ` · reservation ${want} OK` : ` · need ${want} but only ${avail.free} free`) : '');
              };
              document.getElementById('sale-startdate')?.addEventListener('change', _refreshSaleAvailHint);
              document.getElementById('sale-reservation')?.addEventListener('input', _refreshSaleAvailHint);
              _refreshSaleAvailHint();

              const priceInput = document.getElementById('sale-price');
              priceInput?.addEventListener('input', () => {
                  const raw = priceInput.value.replace(/[^0-9]/g, '');
                  const cursor = priceInput.selectionStart;
                  const oldLen = priceInput.value.length;
                  priceInput.value = raw ? parseInt(raw).toLocaleString('en-US') : '';
                  const newLen = priceInput.value.length;
                  priceInput.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
              });


              document.querySelectorAll('input[name="sale-price-mode"]').forEach(radio => {
                  radio.addEventListener('change', () => {
                      const isTotal = radio.value === 'total';
                      const perWrap   = document.getElementById('sale-price-per-wrap');
                      const totalWrap = document.getElementById('sale-price-total-wrap');
                      if (perWrap)   perWrap.style.display   = isTotal ? 'none' : '';
                      if (totalWrap) totalWrap.style.display = isTotal ? '' : 'none';
                  });
              });


              const _tcvRecalc = () => {
                  const trains    = parseInt(document.getElementById('sale-trains')?.value || '0');
                  const totalEl   = document.getElementById('sale-total-value');
                  const calcEl    = document.getElementById('sale-total-calc');
                  if (!totalEl || !calcEl) return;
                  const totalVal  = parseInt((totalEl.value || '').replace(/,/g, '')) || 0;
                  if (trains > 0 && totalVal > 0) {
                      const perTrain = Math.round(totalVal / trains);
                      calcEl.textContent = `= $${perTrain.toLocaleString()} per train`;
                  } else if (totalVal > 0) {
                      calcEl.textContent = 'Enter total trains above to see per-train price';
                  } else {
                      calcEl.textContent = '';
                  }
              };
              document.getElementById('sale-total-value')?.addEventListener('input', (e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const cursor = e.target.selectionStart;
                  const oldLen = e.target.value.length;
                  e.target.value = raw ? parseInt(raw).toLocaleString('en-US') : '';
                  const newLen = e.target.value.length;
                  e.target.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
                  _tcvRecalc();
              });
              document.getElementById('sale-trains')?.addEventListener('input', _tcvRecalc);


              document.querySelectorAll('input[name="sale-pay-status"]').forEach(radio => {
                  radio.addEventListener('change', () => {
                      const wrap = document.getElementById('sale-partial-wrap');
                      if (wrap) wrap.style.display = radio.value === 'partial' ? 'block' : 'none';
                  });
              });

              document.getElementById('sale-partial-amount')?.addEventListener('input', () => {
                  const el = document.getElementById('sale-partial-amount');
                  const raw = el.value.replace(/[^0-9]/g, '');
                  el.value = raw ? parseInt(raw).toLocaleString('en-US') : '';
              });
              document.getElementById('sale-add')?.addEventListener('click', () => {
                  const empId      = document.getElementById('sale-emp')?.value;
                  const trains     = parseInt(document.getElementById('sale-trains')?.value || '0');
                  const _priceMode = document.querySelector('input[name="sale-price-mode"]:checked')?.value || 'per_train';
                  let price;
                  if (_priceMode === 'total') {
                      const totalVal = parseInt((document.getElementById('sale-total-value')?.value || '0').replace(/,/g, ''));
                      price = trains > 0 && totalVal > 0 ? Math.round(totalVal / trains) : 0;
                  } else {
                      price = parseInt((document.getElementById('sale-price')?.value || '0').replace(/,/g, ''));
                  }
                  let reservation = parseInt(document.getElementById('sale-reservation')?.value || '0', 10) || 0;
                  const startDate  = document.getElementById('sale-startdate')?.value || new Date().toISOString().slice(0, 10);
                  const notes      = document.getElementById('sale-notes')?.value?.trim() || '';

                 if (!empId)           { alert('Select an employee.'); return; }
                  const openEnded = !!document.getElementById('sale-open-ended')?.checked;
                  const isFree = !!document.getElementById('sale-is-free')?.checked;
                  const freeTrains = Math.max(0, parseInt(document.getElementById('sale-free-trains')?.value || '0', 10) || 0);
                  if (!openEnded && (!trains || trains < 1)) { alert('Enter total trains, or check Open-ended.'); return; }
                  if (!isFree && (!price || price < 1) && freeTrains < 1) { alert('Enter price per train, free allowance, or mark Fully free.'); return; }
                  if (!isFree && (!price || price < 1) && freeTrains > 0 && openEnded) {
                      // open-ended with only free allowance still needs a future price if they continue after free
                      // allow 0 price only when fully free
                  }
                  if (isFree) price = 0;
                  else if ((!price || price < 1) && freeTrains > 0 && !openEnded && trains > 0 && freeTrains >= trains) {
                      // fixed deal fully covered by free allowance
                      price = 0;
                  } else if (!isFree && (!price || price < 1)) {
                      alert('Enter price per train for paid trains after the free allowance.');
                      return;
                  }
                  // Open-ended deals need a daily reservation so the schedule can place them
                  if (openEnded && reservation < 1) {
                      alert('Open-ended contracts need Daily trains set (e.g. 3/day) so the 7-day schedule can reserve them.');
                      return;
                  }
                  // Fixed deal with no daily rate → default to delivering the full total on the start day
                  if (!openEnded && reservation < 1 && trains > 0) {
                      reservation = trains;
                  }
                  if (reservation > 0) {
                      const _avail = Storage.freeTrainsOnDate(startDate, state, {});
                      if (reservation > _avail.free) {
                          alert(
                              `Cannot reserve ${reservation} trains/day on ${startDate}.\n` +
                              `Daily budget: ${_avail.base} (${_avail.stars}★ + ${_avail.trainerBonus} trainer).\n` +
                              `Already reserved that day: ${_avail.reserved}.\n` +
                              `Free that day: ${_avail.free}.\n` +
                              `Maximum you can reserve: ${_avail.free}.`
                          );
                          return;
                      }
                      // Fixed contracts: ensure enough free capacity across the delivery window
                      if (!openEnded && trains > 0) {
                          let left = trains;
                          let day = startDate;
                          let guard = 0;
                          while (left > 0 && guard < 5000) {
                              const info = Storage.freeTrainsOnDate(day, state, {});
                              const can = Math.min(reservation, info.free, left);
                              if (can < 1) {
                                  alert(
                                      `Not enough free trains to deliver this contract.\n` +
                                      `Stuck on ${day} with ${info.free} free (need ${Math.min(reservation, left)}/day).\n` +
                                      `Reduce daily reservation, pick a later start date, or lower total trains.`
                                  );
                                  return;
                              }
                              left -= can;
                              day = Storage.addDaysIso(day, 1);
                              guard++;
                          }
                      }
                  }

                  const _payStatus = document.querySelector('input[name="sale-pay-status"]:checked')?.value || 'unpaid';
                  const _partialAmt = _payStatus === 'partial'
                      ? parseInt((document.getElementById('sale-partial-amount')?.value || '0').replace(/,/g,'')) || 0
                      : 0;
                  const _totalForFull = openEnded ? 0 : (trains * price);
                  const _prepaid = _payStatus === 'full'
                      ? (_totalForFull || _partialAmt || 0)
                      : _partialAmt;
                  // For open-ended "paid in full" at start doesn't make sense without a total — treat as partial amount if given
                  const _initPay = (_payStatus === 'full' && openEnded)
                      ? (_partialAmt || 0)
                      : _prepaid;

                  const payments = [];
                  if (_initPay > 0) {
                      payments.push({
                          id: 'p_' + Date.now(),
                          amount: _initPay,
                          date: startDate,
                          note: _payStatus === 'full' && !openEnded ? 'Paid in full at start' : 'Initial payment',
                          ts: Date.now()
                      });
                  }

                  const sales = Storage.getTrainSales();
                  const fullyFree = isFree || ((!openEnded && trains > 0 && freeTrains >= trains) || (isFree));
                  sales.push({
                      id: Date.now().toString(),
                      buyerName: state.employees[empId]?.name || empId,
                      buyerEmpId: empId,
                      openEnded: openEnded,
                      isFree: !!fullyFree,
                      freeTrains: fullyFree ? 0 : freeTrains,
                      totalTrains: openEnded ? 0 : trains,
                      pricePerTrain: fullyFree ? 0 : price,
                      dailyReservation: reservation,
                      startDate,
                      notes: fullyFree && !notes ? 'Complimentary / free trains'
                          : (freeTrains > 0 && !notes ? (freeTrains + ' free trains, then paid') : notes),
                      payStatus: fullyFree ? 'free' : _payStatus,
                      prepaidAmount: fullyFree ? 0 : _initPay,
                      payments: fullyFree ? [] : payments,
                      active: true,
                      updatedAt: Date.now()
                  });
                  Storage.saveTrainSales(sales);
                  this._renderTab('calc');
              });

              document.querySelectorAll('.tcm-sale-reservation').forEach(input => {
                  input.addEventListener('change', () => {
                      const id  = input.dataset.id;
                      const val = Math.max(0, parseInt(input.value) || 0);
                      const sales0 = Storage.getTrainSales();
                      const existing = sales0.find(s => s.id === id);
                      const day = (existing && existing.startDate) || new Date().toISOString().slice(0, 10);
                      // Probe free capacity excluding this contract, then check if `val` fits
                      const probe = Object.assign({}, existing || {}, { dailyReservation: 0, id });
                      // freeTrainsOnDate with excludeId is cleaner
                      const avail = Storage.freeTrainsOnDate(day, state, { excludeId: id });
                      if (val > 0 && val > avail.free) {
                          const _maxAllowed = avail.free;
                          alert(
                              `Cannot set ${val} trains/day on ${day}.\n` +
                              `Daily budget: ${avail.base}. Other contracts that day: ${avail.reserved}.\n` +
                              `Maximum: ${_maxAllowed}.`
                          );
                          input.value = _maxAllowed;
                          return;
                      }
                      const sales = Storage.getTrainSales();
                      const idx = sales.findIndex(s => s.id === id);
                      if (idx >= 0) { sales[idx].dailyReservation = val; sales[idx].updatedAt = Date.now(); Storage.saveTrainSales(sales); }
                      this._renderTab('calc');
                  });
              });

              document.querySelectorAll('.tcm-sale-free-trains').forEach(input => {
                  input.addEventListener('change', () => {
                      const id = input.dataset.id;
                      const val = Math.max(0, parseInt(input.value, 10) || 0);
                      const sales = Storage.getTrainSales();
                      const idx = sales.findIndex(s => s.id === id);
                      if (idx < 0) return;
                      sales[idx].freeTrains = val;
                      // If free covers full fixed total, treat as fully free
                      if (!sales[idx].openEnded && (Number(sales[idx].totalTrains) || 0) > 0
                          && val >= (Number(sales[idx].totalTrains) || 0)) {
                          sales[idx].isFree = true;
                          sales[idx].pricePerTrain = 0;
                          sales[idx].payStatus = 'free';
                      } else if (sales[idx].isFree && val > 0) {
                          // switching from fully-free flag to allowance mode needs a price — leave isFree if no price
                          if ((Number(sales[idx].pricePerTrain) || 0) > 0) {
                              sales[idx].isFree = false;
                          }
                      }
                      sales[idx].updatedAt = Date.now();
                      Storage.saveTrainSales(sales);
                      this._renderTab('calc');
                  });
              });

              document.querySelectorAll('.tcm-sale-edit').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const cId = btn.dataset.id;
                      const editorId = `tcm-contract-edit-${cId}`;
                      document.getElementById(editorId)?.remove();
                      const sales = Storage.getTrainSales();
                      const c = sales.find(s => s.id === cId);
                      if (!c) return;
                      const card = btn.closest('.tcm-card');
                      if (!card) return;
                      const editorHtml = `<div id="${editorId}" style="background:#111827;border:1px solid rgba(245,158,11,0.4);border-radius:6px;padding:14px;margin-top:8px;">
                          <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:10px;">✎ Edit Contract — ${c.buyerName}</div>
                          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                              <div>
                                  <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Total trains</div>
                                  <input type="number" id="${editorId}-trains" value="${c.openEnded ? '' : (c.totalTrains || '')}" min="1"
                                      ${c.openEnded ? 'disabled' : ''}
                                      style="width:100%;box-sizing:border-box;background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:4px 8px;font-size:13px;"/>
                                  <label style="display:flex;align-items:center;gap:5px;margin-top:5px;font-size:11px;color:#ccc;cursor:pointer;">
                                      <input type="checkbox" id="${editorId}-open" ${c.openEnded ? 'checked' : ''} style="accent-color:#7eb8ff;" />
                                      Open-ended (no fixed total)
                                  </label>
                              </div>
                              <div>
                                  <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Price per train ($)</div>
                                  <input type="text" inputmode="numeric" id="${editorId}-price" value="${Number(c.pricePerTrain).toLocaleString('en-US')}"
                                      style="width:100%;box-sizing:border-box;background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:4px 8px;font-size:13px;"/>
                              </div>
                              <div>
                                  <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Daily trains (reservation)</div>
                                  <input type="number" id="${editorId}-reservation" value="${c.dailyReservation || 0}" min="0"
                                      style="width:100%;box-sizing:border-box;background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:4px 8px;font-size:13px;"/>
                              </div>
                              <div>
                                  <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Start date</div>
                                  <input type="date" id="${editorId}-startdate" value="${c.startDate || ''}"
                                      style="width:100%;box-sizing:border-box;background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:4px 8px;font-size:13px;"/>
                              </div>
                          </div>
                          <div style="margin-bottom:10px;">
                              <div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">Notes</div>
                              <input type="text" id="${editorId}-notes" value="${(c.notes || '').replace(/"/g,'&quot;')}" placeholder="Optional notes"
                                  style="width:100%;box-sizing:border-box;background:#0d1117;border:1px solid #374151;border-radius:4px;color:#ddd;padding:4px 8px;font-size:13px;"/>
                          </div>
                          <div id="${editorId}-summary" style="font-size:11px;color:#9ca3af;margin-bottom:10px;padding:6px 8px;background:#0a0e14;border-radius:4px;min-height:18px;"></div>
                          <div style="display:flex;gap:6px;">
                              <button id="${editorId}-save" class="tcm-btn green" style="font-size:12px;">✓ Save Changes</button>
                              <button id="${editorId}-cancel" class="tcm-btn" style="font-size:12px;">Cancel</button>
                          </div>
                      </div>`;
                      card.insertAdjacentHTML('beforeend', editorHtml);

                      const _updateSummary = () => {
                          const trains = parseInt(document.getElementById(`${editorId}-trains`)?.value) || 0;
                          const price  = parseInt((document.getElementById(`${editorId}-price`)?.value || '').replace(/,/g,'')) || 0;
                          const el     = document.getElementById(`${editorId}-summary`);
                          if (el && trains > 0 && price > 0) el.textContent = `Total contract value: ${Calc.fmtCash(trains * price)}`;
                      };

                      document.getElementById(`${editorId}-price`)?.addEventListener('input', function() {
                          const raw = this.value.replace(/[^0-9]/g,'');
                          const cursor = this.selectionStart, oldLen = this.value.length;
                          this.value = raw ? Number(raw).toLocaleString('en-US') : '';
                          const newLen = this.value.length;
                          this.setSelectionRange(cursor + (newLen - oldLen), cursor + (newLen - oldLen));
                          _updateSummary();
                      });
                      document.getElementById(`${editorId}-trains`)?.addEventListener('input', _updateSummary);
                      document.getElementById(`${editorId}-open`)?.addEventListener('change', (e) => {
                          const te = document.getElementById(`${editorId}-trains`);
                          if (te) te.disabled = !!e.target.checked;
                          _updateSummary();
                      });
                      _updateSummary();

                      document.getElementById(`${editorId}-cancel`)?.addEventListener('click', () => {
                          document.getElementById(editorId)?.remove();
                      });

                      document.getElementById(`${editorId}-save`)?.addEventListener('click', () => {
                          const newTrains = parseInt(document.getElementById(`${editorId}-trains`)?.value) || 0;
                          const newPrice  = parseInt((document.getElementById(`${editorId}-price`)?.value || '').replace(/,/g,'')) || 0;
                          const newRes    = parseInt(document.getElementById(`${editorId}-reservation`)?.value) || 0;
                          const newDate   = document.getElementById(`${editorId}-startdate`)?.value || c.startDate;
                          const newNotes  = document.getElementById(`${editorId}-notes`)?.value?.trim() || '';
                          const openEnded = !!document.getElementById(`${editorId}-open`)?.checked;
                          if (!openEnded && (!newTrains || newTrains < 1)) { alert('Total trains required unless open-ended.'); return; }
                          if (!newPrice) { alert('Price per train is required.'); return; }
                          if (newRes > 0) {
                              const avail = Storage.freeTrainsOnDate(newDate, state, { excludeId: cId });
                              if (newRes > avail.free) {
                                  alert(
                                      `Cannot reserve ${newRes}/day on ${newDate}.\n` +
                                      `Free that day: ${avail.free} (budget ${avail.base}, others ${avail.reserved}).`
                                  );
                                  return;
                              }
                          }
                          const updatedSales = Storage.getTrainSales();
                          const idx = updatedSales.findIndex(s => s.id === cId);
                          if (idx >= 0) {
                              updatedSales[idx].openEnded        = openEnded;
                              updatedSales[idx].totalTrains      = openEnded ? 0 : newTrains;
                              updatedSales[idx].pricePerTrain    = newPrice;
                              updatedSales[idx].dailyReservation = newRes;
                              updatedSales[idx].startDate        = newDate;
                              updatedSales[idx].notes            = newNotes;
                              updatedSales[idx].updatedAt        = Date.now();
                              Storage.saveTrainSales(updatedSales);
                          }
                          this._renderTab('calc');
                      });
                  });
              });
              
              document.getElementById('sale-open-ended')?.addEventListener('change', (e) => {
                  const trainsEl = document.getElementById('sale-trains');
                  if (trainsEl) {
                      trainsEl.disabled = !!e.target.checked;
                      trainsEl.placeholder = e.target.checked ? 'n/a — open-ended' : 'e.g. 20';
                  }
                  const fullLbl = document.getElementById('sale-pay-full')?.parentElement;
                  if (fullLbl && e.target.checked) {
                      fullLbl.style.opacity = '0.45';
                  } else if (fullLbl) {
                      fullLbl.style.opacity = '';
                  }
              });

              document.querySelectorAll('.tcm-sale-add-pay').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const id = btn.dataset.id;
                      const amtEl = document.querySelector(`.tcm-sale-pay-amt[data-id="${id}"]`);
                      const dateEl = document.querySelector(`.tcm-sale-pay-date[data-id="${id}"]`);
                      const noteEl = document.querySelector(`.tcm-sale-pay-note[data-id="${id}"]`);
                      const amount = parseInt(String(amtEl?.value || '').replace(/,/g, ''), 10) || 0;
                      if (amount < 1) { alert('Enter a payment amount.'); return; }
                      const date = dateEl?.value || new Date().toISOString().slice(0, 10);
                      const note = (noteEl?.value || '').trim();
                      const sales = Storage.getTrainSales();
                      const idx = sales.findIndex(s => s.id === id);
                      if (idx < 0) return;
                      const c = sales[idx];
                      const payments = Storage.getContractPayments(c);
                      payments.push({ id: 'p_' + Date.now(), amount, date, note, ts: Date.now() });
                      sales[idx].payments = payments;
                      sales[idx].prepaidAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                      sales[idx].updatedAt = Date.now();
                      Storage.saveTrainSales(sales);
                      this._renderTab('calc');
                  });
              });

              document.querySelectorAll('.tcm-sale-del-pay').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const id = btn.dataset.id;
                      const payId = btn.dataset.payid;
                      if (!confirm('Remove this payment entry?')) return;
                      const sales = Storage.getTrainSales();
                      const idx = sales.findIndex(s => s.id === id);
                      if (idx < 0) return;
                      let payments = Storage.getContractPayments(sales[idx]).filter(p => String(p.id) !== String(payId));
                      sales[idx].payments = payments;
                      sales[idx].prepaidAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                      sales[idx].updatedAt = Date.now();
                      Storage.saveTrainSales(sales);
                      this._renderTab('calc');
                  });
              });

              document.querySelectorAll('.tcm-sale-paid').forEach(btn => {
      btn.addEventListener('click', () => {
          const sales = Storage.getTrainSales();
          const c = sales.find(s => s.id === btn.dataset.id);
          if (!c) return;
          const _pLog = Storage.getTrainedLog();
          const _seenPaid = new Set();
  const _done = (_pLog[c.buyerEmpId] || []).filter(e => {
      if (!e.ts) return false;
      if (e.date < c.startDate) return false;
      const _kP = e._logId || e.ts;
      if (_seenPaid.has(_kP)) return false;
      _seenPaid.add(_kP);
      return true;
  }).length;
          const _earned = _done * c.pricePerTrain;
          if (!confirm(`Mark ${c.buyerName}'s contract as completed?\n${_done} trains · ${Calc.fmtCash(_earned)} total\nThis will archive the contract and record it in Finance.`)) return;
          Storage.savePaidContract({
              id: c.id,
              buyerName: c.buyerName,
              buyerEmpId: c.buyerEmpId,
              totalTrains: _done,
              pricePerTrain: c.pricePerTrain,
              totalEarned: _earned,
                          startDate: c.startDate,
                          paidAt: new Date().toISOString().slice(0, 10),
                          notes: c.notes || ''
                      });
                      const idx = sales.findIndex(s => s.id === btn.dataset.id);
                      if (idx >= 0) { sales[idx].active = false; sales[idx].updatedAt = Date.now(); Storage.saveTrainSales(sales); }
                      this._renderTab('calc');
                  });
              });

              document.querySelectorAll('.tcm-sale-sync').forEach(btn => {
                  btn.addEventListener('click', async () => {
                      const _gcfg = GoogleSync.getCfg();
                      if (!_gcfg.webAppUrl) { alert('Set your Apps Script URL in Settings → Google Sheets Sync first.'); return; }
                      btn.disabled = true; btn.textContent = '↑ Syncing...';
                      const _sr = await GoogleSync.syncAll(UI.state);
                      btn.disabled = false;
                      btn.textContent = _sr?.allOk ? '✓ Done' : '⚠ Failed';
                      setTimeout(() => { btn.textContent = '↑ Sheet'; }, 2000);
                  });
              });
              document.querySelectorAll('.tcm-sale-export').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const sales = Storage.getTrainSales();
                      const c = sales.find(s => s.id === btn.dataset.id);
                      if (!c) return;
                      const log = Storage.getTrainedLog();
                      const entries = (log[c.buyerEmpId] || []).filter(e => e.date >= c.startDate);
                      const perDay = {};
                      for (const e of entries) {
                          perDay[e.date] = (perDay[e.date] || 0) + 1;
                      }
                      const rows = [['Employee', 'Date', 'Trains', 'Used Train Value']];
                      Object.entries(perDay)
                          .sort(([a],[b]) => a.localeCompare(b))
                          .forEach(([date, count]) => {
                              rows.push([c.buyerName, date, count, count * c.pricePerTrain]);
                          });
                      rows.push(['TOTAL', '', entries.length, entries.length * c.pricePerTrain]);
                      exportCsv(rows, `tcm_sale_${c.buyerName.replace(/\s+/g,'_')}_${c.startDate}.csv`);
                  });
              });

              document.querySelectorAll('.tcm-sale-restore').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const sales = Storage.getTrainSales();
                      const idx = sales.findIndex(s => s.id === btn.dataset.id);
                      if (idx >= 0) { sales[idx].active = true; sales[idx].updatedAt = Date.now(); Storage.saveTrainSales(sales); }
                      this._renderTab('calc');
                  });
              });
              document.querySelectorAll('.tcm-sale-archive').forEach(btn => {
                  btn.addEventListener('click', () => {
                      const sales = Storage.getTrainSales();
                      const idx = sales.findIndex(s => s.id === btn.dataset.id);
                      if (idx >= 0) { sales[idx].active = false; Storage.saveTrainSales(sales); }
                      this._renderTab('calc');
                  });
              });

              document.querySelectorAll('.tcm-sale-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
          if (!confirm('Remove this contract? It will be removed from Google Sheets on the next sync.')) return;
          const delId = btn.dataset.id;
          const sales = Storage.getTrainSales();
          const idx = sales.findIndex(s => s.id === delId);
          if (idx >= 0) { sales[idx].active = false; sales[idx].deleted = true; sales[idx].updatedAt = Date.now(); Storage.saveTrainSales(sales); }

          Storage.set('paid_contracts', Storage.getPaidContracts().filter(c => c.id !== delId));
          const _gcDel = GoogleSync.getCfg();
          if (_gcDel.webAppUrl) GoogleSync.syncAll(UI.state).catch(() => {});
          this._renderTab('calc');
      });
  });
          },


          _openSettingsPage() {
              // Remember last real tab/category only when entering settings from elsewhere
              if (this._currentTab !== 'settings' && this._currentCat !== 'settings') {
                  this._settingsReturnTab = this._currentTab || 'overview';
                  this._settingsReturnCat = this._currentCat || 'management';
              } else {
                  this._settingsReturnTab = this._settingsReturnTab || 'overview';
                  this._settingsReturnCat = this._settingsReturnCat || 'management';
              }
              this._currentTab = 'settings';
              this._currentCat = 'settings';
              // Clear category + sub-tab highlights so Settings is a dedicated page
              document.querySelectorAll('.tcm-cat').forEach(c => c.classList.remove('active'));
              const sub = document.getElementById('tcm-sub-tabs');
              if (sub) sub.innerHTML = '';
              const tabsBar = document.getElementById('tcm-tabs');
              if (tabsBar) tabsBar.style.display = 'none';
              this._renderSettings();
          },

          _leaveSettingsPage() {
              const tabsBar = document.getElementById('tcm-tabs');
              if (tabsBar) tabsBar.style.display = '';
              const cat = this._settingsReturnCat || 'management';
              let tab = this._settingsReturnTab || 'overview';
              if (!tab || tab === 'settings') tab = 'overview';
              this._currentCat = cat === 'settings' ? 'management' : cat;
              this._currentTab = tab;
              document.querySelectorAll('.tcm-cat').forEach(c => c.classList.toggle('active', c.dataset.cat === this._currentCat));
              if (typeof this._renderSubTabs === 'function') this._renderSubTabs(this._currentCat, tab);
              this._renderTab(tab);
          },

          _renderSettings() {
      this._currentTab = 'settings';
      this._currentCat = 'settings';
      // Keep chrome in settings mode (no leftover category highlight)
      document.querySelectorAll('.tcm-cat').forEach(c => c.classList.remove('active'));
      const _subTabs = document.getElementById('tcm-sub-tabs');
      if (_subTabs) _subTabs.innerHTML = '';
      const _tabsBar = document.getElementById('tcm-tabs');
      if (_tabsBar) _tabsBar.style.display = 'none';
      const body = document.getElementById('tcm-body');
      const s = Storage.getSettings();
              const stocks = s.stocks || {};
              body.innerHTML = `
                  <div class="tcm-section-label">API Key</div>
                  <div class="tcm-notice" style="line-height:1.6;">
                      A <strong>custom key</strong> is recommended — no full access needed.<br>
<a href="https://www.torn.com/preferences.php#tab=api?step=addNewKey&company=search,snapshot,companies,employees,profile,detailed,applications,news,stock&user=hof,basic,log&logIds=104&title=TCM"
                     target="_blank" rel="noopener"
                     style="display:inline-block;margin:4px 0 2px;background:rgba(126,184,255,0.12);
                     border:1px solid rgba(126,184,255,0.3);color:#7eb8ff;border-radius:4px;
                     padding:3px 10px;font-size:11px;font-weight:700;text-decoration:none;">
                     ⚡ Create Custom TCM Key →
                  </a>
                  <div style="font-size:10px;color:#888;margin-top:2px;">company · applications,detailed,employees,news,profile,stock &nbsp;|&nbsp; user · log, hof</div>
                      Stored locally via GM_setValue — only ever sent to api.torn.com.
                  </div>
<input class="tcm-input" id="tcm-key-input" type="password" placeholder="Enter API key..." style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
                  <button class="tcm-btn green" id="tcm-key-save" style="margin-bottom:12px;">Save Key & Reload</button>
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">API Rate Limit</div>
                  <div class="tcm-notice" style="font-size:11px;">
                      Torn caps each account at 100 API calls/minute — shared across every script and tool using this key. Lower this if you run other tools alongside TCM. Applies immediately to every TCM API call (benchmark fetches, snapshots, everything).
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                      <input type="number" id="tcm-rate-limit" min="10" max="100"
                          value="${Math.max(10, Math.min(100, parseInt(s.apiRateLimit) || 60))}"
                          style="width:64px;background:#0d1117;border:1px solid #374151;border-radius:3px;
                          color:#ddd;padding:4px 6px;font-size:12px;text-align:center;font-family:'JetBrains Mono',monospace;" />
                      <span style="font-size:11px;color:#9ca3af;">calls / minute (10–100)</span>
                      <button class="tcm-btn" id="tcm-rate-limit-save">Save</button>
                  </div>
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Page Restriction</div>
                  <div class="tcm-notice" style="font-size:11px;">
                      Controls which pages TCM loads on. "Company Only" limits it to companies.php and jobs.php. Reload the page after changing.
                  </div>
                  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;">
                      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ddd;">
                          <input type="radio" name="tcm-page-restrict" value="everywhere" ${(s.pageRestriction||'everywhere')==='everywhere'?'checked':''} style="accent-color:#7eb8ff;" />
                          Everywhere (default)
                      </label>
                      <label style="display:flex;align-items:center;gap=6px;cursor:pointer;font-size:12px;color:#ddd;">
                          <input type="radio" name="tcm-page-restrict" value="company_only" ${(s.pageRestriction||'everywhere')==='company_only'?'checked':''} style="accent-color:#7eb8ff;" />
                          Company Pages Only
                      </label>
                  </div>
                  <button class="tcm-btn" id="tcm-page-restrict-save" style="margin-bottom:12px;">Save Page Setting</button>
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Director Stock Holdings</div>
                  <div class="tcm-notice">
                      These stocks affect advertising and sales recommendations. Check which ones you hold.
                      <br><strong>TGP</strong> — amplifies advertising effectiveness (higher ad budget = better ROI)
                      <br><strong>TCP</strong> — gives a sales boost to company revenue
                      <br><strong>SYS</strong> — protects company vault from hack attacks
                  </div>
                  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                      ${['TGP','TCP','SYS'].map(stock => `
                          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ddd;">
                              <input type="checkbox" id="stock-${stock}" ${stocks[stock] ? 'checked' : ''}
                                  style="accent-color:#7eb8ff;width:14px;height:14px;" />
                              ${stock}
                          </label>
`).join('')}
                  </div>
                  <button class="tcm-btn" id="tcm-stocks-save" style="margin-bottom:12px;">Save Stock Holdings</button>
                  ${(() => {
                      const _lsType = this.state?.typeName;
                      const _lsSvc = _lsType && TCM.STOCK_PRICES[_lsType] !== undefined && Object.keys(TCM.STOCK_PRICES[_lsType]).length === 0;
                      if (_lsSvc) return '';
                      return `
                          <hr class="tcm-divider">
                          <div class="tcm-section-label">Low Stock Notification</div>
                          <div class="tcm-notice" style="font-size:11px;">
                              Shows a dismissible banner when any item's stock is projected to run out within this many days.
                          </div>
                          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                              <input type="number" id="tcm-low-stock-threshold" min="0.5" max="14" step="0.5"
                                  value="${s.lowStockThresholdDays ?? 1}"
                                  style="width:64px;background:#0d1117;border:1px solid #374151;border-radius:3px;
                                  color:#ddd;padding:4px 6px;font-size:12px;text-align:center;font-family:'JetBrains Mono',monospace;" />
                              <span style="font-size:11px;color:#9ca3af;">days left to trigger notification</span>
                              <button class="tcm-btn" id="tcm-low-stock-threshold-save">Save</button>
                          </div>
                      `;
                  })()}
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Icon Position</div>
                  <div class="tcm-row">
                      <span class="lbl">Current mode</span>
                      <span class="val ${s.iconYLocked ? 'green' : 'amber'}">${s.iconYLocked ? '✦ Manual — drag enabled' : '⚙ Auto-positioned'}</span>
                  </div>
                  <div style="font-size:12px;color:#c9d1d9;margin:6px 0 10px;">
                      ${s.iconYLocked
                          ? 'Icon stays exactly where you drag it. Drag it now to reposition.'
                          : 'Icon auto-positions on load to avoid other script icons. Drag is disabled in this mode.'}
                  </div>
                  ${s.iconYLocked
                      ? `<button class="tcm-btn" id="tcm-icon-toggle" style="margin-bottom:12px;">Switch to Auto-Position</button>`
                      : `<button class="tcm-btn green" id="tcm-icon-toggle" style="margin-bottom:12px;">Enable Manual Drag</button>`}
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Panel Behaviour</div>
                  <div style="padding:8px 0;">
                      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#ddd;">
                          <input type="checkbox" id="tcm-persist-open" ${s.persistOpen ? 'checked' : ''}
                              style="accent-color:#7eb8ff;width:14px;height:14px;" />
                          Re-open panel automatically on every page load
                      </label>
                      <div style="font-size:11px;color:#888;margin-top:4px;padding-left:22px;">Off by default — panel starts closed on each Torn page load.</div>
                  </div>
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Finance History</div>
  <div class="tcm-row">
      <span class="lbl">Stored snapshots</span>
      <span class="val">${Storage.getSnapshots().length}</span>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;margin-bottom:12px;">
      <button class="tcm-btn green" id="tcm-export-snapshots">↓ Export Finance Data</button>
      <label class="tcm-btn" style="cursor:pointer;">
          ↑ Import Finance Data
          <input type="file" id="tcm-import-snapshots" accept=".json" style="display:none;"/>
      </label>
      <button class="tcm-btn red" id="tcm-clear-snapshots">✕ Clear History</button>
  </div>

<hr class="tcm-divider">
                  <div class="tcm-section-label">Import from Tornstats</div>
                  <a class="tcm-btn" href="https://tornstats.com/company" target="_blank" style="display:inline-block;margin-bottom:8px;text-decoration:none;">↗ Open Tornstats Company Page</a>                  ${(() => {
                      const _tsStage = Storage.get('tornstats_staging', null);
                      if (!_tsStage || !_tsStage.rows || !_tsStage.rows.length) return '';
                      return `<div class="tcm-notice" style="font-size:11px;border-color:#7eb8ff;">
                          ✓ ${_tsStage.rows.length} rows captured from Tornstats (${new Date(_tsStage.capturedAt).toLocaleString()}).
                      </div>
                      <button class="tcm-btn green" id="tcm-tornstats-auto-import" style="margin-bottom:6px;">↑ Import Captured Data</button>`;
                  })()}
                  <div class="tcm-notice" style="font-size:11px;">
                      Click "Open Company on Tornstats" above, then click the green "Send Finance Data to TCM" button that appears on that page. Come back here and an import button will appear below. You can still paste manually if you prefer.
                  </div>
                  <textarea id="tcm-tornstats-paste" class="tcm-input" rows="5"
                      placeholder="Paste Tornstats table data here (date format must be DD/MM/YY)..."
                      style="width:100%;box-sizing:border-box;font-size:11px;font-family:'JetBrains Mono',monospace;resize:vertical;margin-bottom:6px;"></textarea>
                  <button class="tcm-btn green" id="tcm-tornstats-import">↑ Import</button>
                  <div id="tcm-tornstats-result" style="font-size:11px;margin-top:4px;"></div>
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Training Log & Rotation Data</div>
  <div class="tcm-row">
      <span class="lbl">Total logged trains</span>
      <span class="val">${Object.values(Storage.getTrainedLog()).reduce((sum, arr) => sum + arr.filter(e => e.ts).length, 0)}</span>
  </div>
  <div class="tcm-row">
      <span class="lbl">Rotation start date</span>
      <span class="val">${Storage.getRotation().startDate || '—'}</span>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;margin-bottom:8px;">
      <button class="tcm-btn green" id="tcm-export-rotation">↓ Export Rotation Data</button>
      <label class="tcm-btn" style="cursor:pointer;" id="tcm-import-rotation-label">
          ↑ Import Rotation Data
          <input type="file" id="tcm-import-rotation" accept=".json"
              style="display:none;"/>
      </label>
  </div>
  <button class="tcm-btn red" id="tcm-clear-log" style="margin-top:0;margin-bottom:6px;">Clear Training Log</button>
  <button class="tcm-btn red" id="tcm-clear-debt" style="margin-top:0;margin-bottom:12px;">Clear Debt / Rotation</button>
  <hr class="tcm-divider">
                  <div class="tcm-section-label">JSONBin Data Sync</div>
                  <div class="tcm-notice" style="font-size:11px;line-height:1.55;margin-bottom:8px;">
                      Live two-way sync for <strong>all settings</strong>, <strong>train logs</strong>, <strong>contracts</strong>,
                      <strong>rotation</strong>, and <strong>finance snapshots</strong> across browsers / Torn PDA.<br>
                      Create a free bin at <a href="https://jsonbin.io" target="_blank" rel="noopener" style="color:#7eb8ff;">jsonbin.io</a>
                      (paste the Bin ID + Master Key below). API keys and secrets are <strong>never</strong> uploaded.
                  </div>
                  ${(() => {
                      const _jb = JsonBinSync.getCfg();
                      const _ls = _jb.lastSync ? new Date(_jb.lastSync).toLocaleString() : 'never';
                      return `
                  <label style="font-size:11px;color:#aaa;display:block;margin-bottom:3px;">JSONBin Bin ID</label>
                  <input class="tcm-input" id="tcm-jsonbin-id" type="text" placeholder="e.g. 65f0a1b2c3d4..."
                      value="${(_jb.binId || '').replace(/"/g, '&quot;')}"
                      style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
                  <label style="font-size:11px;color:#aaa;display:block;margin-bottom:3px;">JSONBin Master Key</label>
                  <input class="tcm-input" id="tcm-jsonbin-key" type="password" placeholder="X-Master-Key"
                      value="${(_jb.masterKey || '').replace(/"/g, '&quot;')}"
                      style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ddd;margin-bottom:10px;">
                      <input type="checkbox" id="tcm-jsonbin-enabled" ${_jb.enabled ? 'checked' : ''}
                          style="accent-color:#7eb8ff;width:14px;height:14px;" />
                      Auto-sync on refresh (when configured)
                  </label>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                      <button class="tcm-btn green" id="tcm-jsonbin-save">Save</button>
                      <button class="tcm-btn" id="tcm-jsonbin-now">⇄ Sync Now</button>
                      <button class="tcm-btn" id="tcm-jsonbin-pull">↓ Pull only</button>
                      <button class="tcm-btn" id="tcm-jsonbin-push">↑ Push only</button>
                  </div>
                  <div style="font-size:11px;color:#888;margin-bottom:4px;">Last sync:
                      <span style="color:${_jb.lastSyncOk ? '#7eb8ff' : (_jb.lastSync ? '#fc6' : '#888')};">${_ls}${_jb.lastSync ? (_jb.lastSyncOk ? ' ✓' : ' ⚠ failed') : ''}</span>
                      ${_jb.lastError ? `<span style="color:#f88;"> — ${_jb.lastError.replace(/</g,'&lt;').slice(0,120)}</span>` : ''}
                  </div>`;
                  })()}
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Google Sheets Auto-Sync</div>

                  ${(() => {
                      const _ssc = Storage.getSettings().syncSheets || { finance:true, trains:true, contracts:true, tax:true, stock:true };
                      const _mkChk = (key, label) => `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:#ddd;white-space:nowrap;">
                          <input type="checkbox" class="tcm-sync-sheet-chk" data-key="${key}" ${_ssc[key]!==false?'checked':''} style="accent-color:#7eb8ff;width:13px;height:13px;"/> ${label}</label>`;
                      return `<div style="padding:8px 10px;background:#111827;border:1px solid #2a2a2a;border-radius:5px;margin-bottom:8px;">
                          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Sheets to Sync</div>
                          <div style="display:flex;gap:12px;flex-wrap:wrap;">
                              ${_mkChk('finance','Finance')}
                              ${_mkChk('trains','Trains')}
                              ${_mkChk('contracts','Contracts')}
                              ${_mkChk('tax','Tax Collections')}
                              ${_mkChk('stock','Stock Performance')}
                              ${_mkChk('eeranking','EE Ranking')}
                          </div>
                          <button id="tcm-sync-sheets-save" class="tcm-btn" style="margin-top:8px;font-size:11px;padding:3px 10px;">Save Selection</button>
                      </div>`;
                  })()}
                  ${(() => {
                      const _gc = GoogleSync.getCfg();
                      const _ls = _gc.lastSync ? new Date(_gc.lastSync).toLocaleTimeString() : 'Never';
                      return `
                      <div class="tcm-notice" style="font-size:11px;">
                          <strong style="color:#7eb8ff;">No API keys needed.</strong> 1) Create a Google Sheet. 2) Go to <strong>Extensions → Apps Script</strong>. 3) Delete all code, paste the snippet below, click Save. 4) Click <strong>Deploy → New deployment → Web App</strong> — set "Execute as: Me" and "Who has access: Anyone" — click Deploy and authorise. 5) Copy the Web App URL and paste it below.
                      </div>
  <textarea id="tcm-gsync-script-box" readonly style="background:#0a0e14;border:1px solid #2a2a2a;border-radius:4px;padding:6px 8px;margin-bottom:8px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#9ca3af;width:100%;box-sizing:border-box;resize:none;height:56px;"></textarea><button id="tcm-gsync-copy-btn" style="background:rgba(126,184,255,0.08);border:1px solid rgba(126,184,255,0.2);color:#7eb8ff;border-radius:3px;padding:3px 8px;cursor:pointer;font-size:11px;margin-bottom:8px;">Copy Script</button>
  <label style="font-size:12px;color:#9ca3af;margin-bottom:3px;display:block;">Apps Script Web App URL</label>
  <input class="tcm-input" id="tcm-gsync-url" type="text" placeholder="https://script.google.com/macros/s/..." value="${_gc.webAppUrl || _gc.url || ''}" style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
  <label style="font-size:12px;color:#9ca3af;margin-bottom:3px;display:block;">Google Sheet URL <span style="color:#4b5563;">(for Open Sheet button)</span></label>
  <input class="tcm-input" id="tcm-gsync-sheeturl" type="text" placeholder="https://docs.google.com/spreadsheets/d/..." value="${_gc.sheetUrl || ''}" style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
  <div style="margin-top:8px;font-size:12px;color:#9ca3af;">
      Train sheet sort:
      <label><input type="radio" name="tcm-train-sort" value="latest" ${Storage.get('train_sheet_sort','latest')==='latest'?'checked':''}> Latest first</label>
      <label style="margin-left:10px;"><input type="radio" name="tcm-train-sort" value="user" ${Storage.get('train_sheet_sort','latest')==='user'?'checked':''}> By employee</label>
  </div>
                          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ddd;">
                              <input type="checkbox" id="tcm-gsync-enabled" ${_gc.enabled ? 'checked' : ''} style="accent-color:#7eb8ff;width:14px;height:14px;" />
                              Auto-sync on every refresh
                          </label>
                      </div>
                      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                          <button class="tcm-btn green" id="tcm-gsync-save">Save</button>
                          <button class="tcm-btn" id="tcm-gsync-now">↑ Sync Now</button>
                      </div>
                      <div style="font-size:11px;color:#888;">Last sync: <span style="color:${_gc.lastSyncOk ? '#7eb8ff' : '#f59e0b'};">${_ls}${_gc.lastSync ? (_gc.lastSyncOk ? ' ✓' : ' ⚠ failed') : ''}</span></div>`;
                  })()}
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Google Sheets — Sheet Colors</div>

                      <div style="display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px;">
                      <div><div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">↑ Profit up</div>
                          <input type="color" id="tcm-fin-good-color" value="${Storage.getSettings().finGoodColor || '#b6d7a8'}" style="width:50px;height:28px;border:1px solid #374151;border-radius:3px;cursor:pointer;padding:2px;" /></div>
                      <div><div style="font-size:11px;color:#9ca3af;margin-bottom:3px;">↓ Profit down</div>
                          <input type="color" id="tcm-fin-bad-color" value="${Storage.getSettings().finBadColor || '#ea9999'}" style="width:50px;height:28px;border:1px solid #374151;border-radius:3px;cursor:pointer;padding:2px;" /></div>
                  </div>
                  </div>
                  <button class="tcm-btn" id="tcm-fin-colors-save" style="margin-bottom:12px;">Save Sheet Colors</button>
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Discord Reports</div>
                  <div class="tcm-notice" style="font-size:11px;line-height:1.55;margin-bottom:8px;">
                      Optional Discord webhooks. <strong>Permanent log</strong> appends a new message each post.
                      <strong>Daily data panel</strong> edits one message in place (live panel).
                      Auto-post runs once per day at/after <strong>18:15 TCT</strong> when enabled and company data is loaded.
                  </div>
                  ${(() => {
                      const _dc = Discord.getCfg();
                      const _o = Discord.getOpts();
                      const _m = Discord.getMeta();
                      const esc = (u) => String(u || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
                      const last = _m.lastPostDateTCT
                          ? ('Last post: <strong style="color:#7eb8ff;">' + _m.lastPostDateTCT + '</strong> TCT')
                          : 'No posts yet';
                      const panelNote = _m.panelMessageId
                          ? ('Panel msg: <code style="color:#aaa;font-size:10px;">' + String(_m.panelMessageId).slice(0, 14) + '…</code>')
                          : 'Panel message: not created yet';
                      const badge = (ok) => ok
                          ? '<span style="color:#6f6;font-size:10px;">✓ valid</span>'
                          : '<span style="color:#888;font-size:10px;">not set</span>';
                      return `
                  <label style="font-size:11px;color:#aaa;display:block;margin-bottom:3px;">Permanent log webhook ${badge(Discord.isValidWebhook(_dc.logWebhook))}</label>
                  <input class="tcm-input" id="tcm-discord-log-hook" type="password" placeholder="https://discord.com/api/webhooks/..."
                      value="${esc(_dc.logWebhook)}" style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
                  <label style="font-size:11px;color:#aaa;display:block;margin-bottom:3px;">Daily data panel webhook ${badge(Discord.isValidWebhook(_dc.panelWebhook))}</label>
                  <input class="tcm-input" id="tcm-discord-panel-hook" type="password" placeholder="https://discord.com/api/webhooks/..."
                      value="${esc(_dc.panelWebhook)}" style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
                  <label style="font-size:11px;color:#aaa;display:block;margin-bottom:3px;">Weekly panel webhook (optional) ${badge(Discord.isValidWebhook(_dc.weeklyWebhook))}</label>
                  <input class="tcm-input" id="tcm-discord-weekly-hook" type="password" placeholder="https://discord.com/api/webhooks/..."
                      value="${esc(_dc.weeklyWebhook)}" style="width:100%;box-sizing:border-box;margin-bottom:10px;" />
                  <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin:4px 0 8px;">Report options</div>
                  <div style="display:flex;flex-wrap:wrap;gap:10px 14px;margin-bottom:10px;font-size:12px;color:#ddd;">
                      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="tcm-d-opt-metrics" ${_o.dailyMetrics?'checked':''} style="accent-color:#7eb8ff;"> Daily metrics</label>
                      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="tcm-d-opt-trains" ${_o.unusedTrains?'checked':''} style="accent-color:#7eb8ff;"> Unused trains</label>
                      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="tcm-d-opt-alerts" ${_o.employeeAlerts?'checked':''} style="accent-color:#7eb8ff;"> Employee alerts</label>
                      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="tcm-d-opt-stars" ${_o.starChange?'checked':''} style="accent-color:#7eb8ff;"> Star changes</label>
                      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="tcm-d-opt-stock" ${_o.stockAlert?'checked':''} style="accent-color:#7eb8ff;"> Stock alerts</label>
                      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="tcm-d-opt-auto" ${_o.autoPost!==false?'checked':''} style="accent-color:#7eb8ff;"> Auto-post after 18:15 TCT</label>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;color:#ddd;">
                      <label for="tcm-d-stock-days" style="color:#aaa;">Stock alert ≤ days</label>
                      <input type="number" id="tcm-d-stock-days" min="0.5" max="30" step="0.5" value="${Number(_o.stockAlertDays)||3}"
                          style="width:64px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#ddd;padding:3px 6px;" />
                  </div>
                  <div style="font-size:11px;color:#888;margin-bottom:8px;">${last} · ${panelNote}</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                      <button class="tcm-btn green" id="tcm-discord-save">Save Discord</button>
                      <button class="tcm-btn" id="tcm-discord-post">Post / Update Now</button>
                      <button class="tcm-btn" id="tcm-discord-reset-panel">Reset Panel Msg ID</button>
                  </div>
                  <div id="tcm-discord-status" style="font-size:11px;color:#888;min-height:16px;margin-bottom:4px;"></div>`;
                  })()}
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Full Data Backup</div>
                  <div class="tcm-notice" style="font-size:11px;">Exports ALL TCM data — settings, training log, finance history, rotation state, contracts, tax config, and API key. Safe to restore even after deleting and reinstalling the script. Keep the file somewhere safe.</div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                      <button class="tcm-btn green" id="tcm-full-backup-btn">↓ Backup All Data</button>
                      <label class="tcm-btn" style="cursor:pointer;">↑ Restore from Backup<input type="file" id="tcm-full-restore-input" accept=".json" style="display:none;"/></label>
                  </div>
                  <hr class="tcm-divider">
                  <div class="tcm-section-label">Data</div>
                  ${(() => {
                      const _keys = ['snapshots','trained_log','benchmark_cache_v2','bench_rosters_same_0',
                          'bench_rosters_same_1','bench_rosters_above_0','bench_rosters_above_1',
                          'bench_rosters_top_0','bench_rosters_top_1','tax_collection','train_sales'];
                      let _totalBytes = 0;
                      const _breakdown = [];
                      for (const _k of _keys) {
                          const _raw = GM_getValue(TCM.NS + _k, null);
                          if (_raw) { const _b = _raw.length; _totalBytes += _b; if (_b > 2000) _breakdown.push(`${_k}: ${(_b/1024).toFixed(0)}KB`); }
                      }
                      const _kb = (_totalBytes/1024).toFixed(0);
                      const _color = _totalBytes > 5e6 ? '#ef4444' : _totalBytes > 2e6 ? '#f59e0b' : '#7eb8ff';
                      const _warn = _totalBytes > 3e6
                          ? `<div class="tcm-warn-box" style="margin-top:4px;">⚠ Storage is getting large (${_kb} KB). Consider clearing the Benchmark cache (Settings → Benchmark tab → Clear Cache) or the Training Log.</div>`
                          : '';
                      return `<div class="tcm-row"><span class="lbl">Storage used (approx.)</span><span class="val" style="color:${_color};">${_kb} KB <span style="font-size:10px;color:#4b5563;">/ ~10,000 KB limit</span></span></div>
                      <div style="font-size:10px;color:#4b5563;padding:3px 0 4px;">${_breakdown.join(' · ') || 'All keys are small'}</div>${_warn}`;
                  })()}
                  <div class="tcm-row"><span class="lbl">Version</span><span class="val">${TCM.VERSION}</span></div>
                  <hr class="tcm-divider">
                  <button class="tcm-btn" id="tcm-back-btn">← Back</button>
              `;
  document.getElementById('tcm-back-btn')?.addEventListener('click', () => {
                  this._leaveSettingsPage();
              });
              document.getElementById('tcm-key-save').addEventListener('click', () => {
                  const k = document.getElementById('tcm-key-input').value.trim();
if (k) { Storage.setApiKey(k); document.getElementById('tcm-body').innerHTML = '<div class="tcm-loading"><span class="tcm-spin"></span>Verifying new key...</div>'; App.refresh(); }
              });
              document.getElementById('tcm-export-snapshots')?.addEventListener('click', () => {
                  const allSnaps = Storage.getSnapshots();
                  const exportData = {
                      version:    TCM.VERSION,
                      exportedAt: new Date().toISOString(),
                      snapshots:  allSnaps
                  };
                  exportJson(exportData, `tcm_finance_history_${allSnaps.length}days_${new Date().toISOString().slice(0,10)}.json`);
              });
              document.getElementById('tcm-persist-open')?.addEventListener('change', (e) => {
                  const s2 = Storage.getSettings();
                  s2.persistOpen = e.target.checked;
                  Storage.saveSettings(s2);
              });
              document.getElementById('tcm-clear-snapshots')?.addEventListener('click', () => {
                  if (!confirm(`Delete all ${Storage.getSnapshots().length} stored finance snapshots? This cannot be undone.`)) return;
                  Storage.set('snapshots', []);
try { localStorage.removeItem('TCM_snapshots_mirror'); } catch(e) {}
      GM_setValue('TCM_low_stock_cache', '');
      const _rotC = Storage.getRotation();
                  this._renderSettings();
              });
              document.getElementById('tcm-import-snapshots')?.addEventListener('change', (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
      try {
          let raw = ev.target.result;

          if (typeof raw === 'string') {
              const _t = raw.trim();
              if (_t.startsWith('"') && _t.endsWith('"')) {
                  raw = _t.slice(1, -1).replace(/""/g, '"');
              }
          }
          const data = JSON.parse(raw);
                          if (!Array.isArray(data.snapshots)) {
                              alert('Invalid file — missing snapshots array.');
                              return;
                          }
                          const today3 = new Date().toISOString().slice(0, 10);

                          const importSnaps = data.snapshots.filter(s => s.date !== today3);
                          const existing = Storage.getSnapshots();
                          const overlapDates = importSnaps.filter(s => existing.find(e => e.date === s.date)).length;
                          const overwriteMsg = overlapDates > 0 ? `\n⚠ ${overlapDates} date(s) overlap — imported values will replace stored ones.` : '';
                          if (!confirm(`Import ${importSnaps.length} snapshots from ${data.exportedAt || 'unknown date'}? (Today's entry skipped — loaded live from API)${overwriteMsg}`)) return;
                          const merged = [...existing];
                          for (const snap of importSnaps) {
                              const idx2 = merged.findIndex(s => s.date === snap.date);
                              if (idx2 >= 0) merged[idx2] = snap; else merged.push(snap);
                          }

                          const seen = new Map();
                          for (const s of merged) seen.set(s.date, s);
                          const deduped = [...seen.values()];
                          if (deduped.length > 365) deduped.splice(0, deduped.length - 365);
                          Storage.set('snapshots', deduped);
                          try { localStorage.setItem('TCM_snapshots_mirror', JSON.stringify(deduped)); } catch(e) {}
                          alert(`Done. ${added} added, ${updated} updated. Total: ${deduped.length} snapshots.`);
                          document.getElementById('tcm-tornstats-paste').value = '';
                          const _gsCfgTs = GoogleSync.getCfg();
                          if (_gsCfgTs.enabled && _gsCfgTs.webAppUrl) {
                              GoogleSync.syncAll(UI.state).catch(() => {});
                          }
                          this._renderSettings();
                      } catch (err) {
                          alert('Failed to parse file: ' + err.message);
                      }
                  };
                  reader.readAsText(file);
              });
              document.getElementById('tcm-export-rotation')?.addEventListener('click', () => {
                  const exportData = {
                      version:    TCM.VERSION,
                      exportedAt: new Date().toISOString(),
                      rotation:   Storage.getRotation(),
                      trainedLog: Storage.getTrainedLog(),
                      processedLogIds: Storage.getProcessedLogIds()
                  };
                  exportJson(exportData, `tcm_rotation_${new Date().toISOString().slice(0,10)}.json`);
              });
              document.getElementById('tcm-import-rotation')?.addEventListener('change', (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                      try {
                          let _raw = ev.target.result;

                          if (typeof _raw === 'string') {
                              const _t = _raw.trim();
                              if (_t.startsWith('"') && _t.endsWith('"')) {
                                  _raw = _t.slice(1, -1).replace(/""/g, '"');
                              }
                          }
                          const data = JSON.parse(_raw);
                          if (!Array.isArray(data.snapshots)) {
                              alert('Invalid export file — missing rotation or trainedLog fields.');
                              return;
                          }
                          if (!confirm(`Import rotation data from ${data.exportedAt || 'unknown date'}?\nThis will overwrite your current rotation state and training log.`)) return;
                          Storage.saveRotation(data.rotation);
                          Storage.set('trained_log', data.trainedLog);
                          if (data.processedLogIds) Storage.saveProcessedLogIds(data.processedLogIds);
                          alert('Import successful. Refreshing...');
                          App.refresh();
                      } catch (err) {
                          alert('Failed to parse file: ' + err.message);
                      }
                  };
                  reader.readAsText(file);
              });
document.getElementById('tcm-rate-limit-save')?.addEventListener('click', () => {
                  const s2r = Storage.getSettings();
                  const _rl = Math.max(10, Math.min(100, parseInt(document.getElementById('tcm-rate-limit')?.value) || 60));
                  document.getElementById('tcm-rate-limit').value = _rl;
                  s2r.apiRateLimit = _rl;
                  Storage.saveSettings(s2r);
                  const btn = document.getElementById('tcm-rate-limit-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save'; }, 1500); }
              });
              document.getElementById('tcm-page-restrict-save')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  const sel = document.querySelector('input[name="tcm-page-restrict"]:checked');
                  if (sel) {
                      s2.pageRestriction = sel.value;
                      Storage.saveSettings(s2);
                      const btn = document.getElementById('tcm-page-restrict-save');
                      if (btn) { btn.textContent = '✓ Saved — reload to apply'; setTimeout(() => { btn.textContent = 'Save Page Setting'; }, 2500); }
                  }
              });
document.getElementById('tcm-stocks-save').addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  s2.stocks = {
                      TGP: document.getElementById('stock-TGP')?.checked || false,
                      TCP: document.getElementById('stock-TCP')?.checked || false,
                      SYS: document.getElementById('stock-SYS')?.checked || false,
                  };
                  Storage.saveSettings(s2);
                  const btn = document.getElementById('tcm-stocks-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save Stock Holdings'; }, 1500); }
              });
              document.getElementById('tcm-low-stock-threshold-save')?.addEventListener('click', () => {
                  const s2t = Storage.getSettings();
                  const _lst = Math.max(0.5, Math.min(14, parseFloat(document.getElementById('tcm-low-stock-threshold')?.value) || 1));
                  document.getElementById('tcm-low-stock-threshold').value = _lst;
                  s2t.lowStockThresholdDays = _lst;
                  Storage.saveSettings(s2t);
                  const btn = document.getElementById('tcm-low-stock-threshold-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save'; }, 1500); }
              });
              document.getElementById('tcm-icon-toggle')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  s2.iconYLocked = !s2.iconYLocked;
                  Storage.saveSettings(s2);
                  if (!s2.iconYLocked) {

                      this._repositionIconIfNeeded();
                  }
                  this._renderSettings();
              });
document.getElementById('tcm-clear-log').addEventListener('click', () => {
                  if (confirm('Clear training log and re-fetch full training history from the Torn API (up to 2 years back, paginated)? This may take longer than a normal refresh. Debt and rotation state are preserved.')) {
                      Storage.set('trained_log', {});
                      Storage.saveProcessedLogIds([]);
                      GM_setValue(TCM.NS + 'recalc_rot_start', 'true');
                      App.rebuildFullTrainingHistory().catch(e => console.error('[TCM]', e));
                  }
              });
              document.getElementById('tcm-clear-debt')?.addEventListener('click', () => {
                  if (confirm('Clear all debt and rotation state? This resets the fairness tracking cycle to today. Your training logs are kept and the API will re-feed debt on the next refresh. This cannot be undone.')) {
                      const _activeIds = Object.keys(UI.state?.employees || {}).filter(id =>
                          (UI.state?.employees?.[id]?.position !== 'Director') &&
                          String(id) !== String(UI.state?.directorId || '')
                      );
                      Storage.resetRotation(_activeIds);
                      this._renderSettings();
                  }
              });

  {
      const _gsb = document.getElementById('tcm-gsync-script-box');
      if (_gsb) _gsb.value = "function doPost(e){const ss=SpreadsheetApp.getActiveSpreadsheet(),data=JSON.parse(e.postData.contents);(data.deleteSheets||[]).forEach(function(n){var _ds=ss.getSheetByName(n);if(_ds)try{ss.deleteSheet(_ds)}catch(e){}});data.sheets.forEach(s=>{const isPerf=s.appendMode===true;let sh=ss.getSheetByName(s.name)||ss.insertSheet(s.name);if(!isPerf){sh.clearContents();sh.clearFormats();try{const f=sh.getFilter();if(f)f.remove()}catch(ex){}}if(s.rows&&s.rows.length){const nr=s.rows.length,nc=s.rows[0].length;if(isPerf){let existRows=sh.getLastRow();if(existRows<1){sh.getRange(1,1,1,nc).setValues([s.rows[0]]);const hdrBg=s.rowColors&&s.rowColors[0]?s.rowColors[0]:'#1a1a2e',hdrFg=s.rowTextColors&&s.rowTextColors[0]?s.rowTextColors[0]:'#7eb8ff';sh.getRange(1,1,1,nc).setFontWeight('bold').setBackground(hdrBg).setFontColor(hdrFg);existRows=1;}const dataRows=s.rows.slice(1);if(dataRows.length>0){const existData=existRows>1?sh.getRange(2,1,existRows-1,nc).getValues():[];const existDates=new Set(existData.map(r=>String(r[0])));const newRows=dataRows.filter(r=>!existDates.has(String(r[0])));if(newRows.length>0){sh.getRange(existRows+1,1,newRows.length,nc).setValues(newRows);}}}else{sh.getRange(1,1,nr,nc).setValues(s.rows);if(s.rowColors){for(let i=0;i<nr;i++){const bg=s.rowColors[i];if(bg)sh.getRange(i+1,1,1,nc).setBackground(bg)}}if(s.rowTextColors){for(let i=0;i<nr;i++){const fg=s.rowTextColors[i];if(fg)sh.getRange(i+1,1,1,nc).setFontColor(fg)}}const hdrBg=s.rowColors&&s.rowColors[0]?s.rowColors[0]:'#2a2a2a',hdrFg=s.rowTextColors&&s.rowTextColors[0]?s.rowTextColors[0]:'#ddd';sh.getRange(1,1,1,nc).setFontWeight('bold').setBackground(hdrBg).setFontColor(hdrFg);if(s.name==='Trains'&&nr>1)sh.getRange(1,1,nr,nc).createFilter();}sh.autoResizeColumns(1,nc);for(let c=1;c<=nc;c++)if(sh.getColumnWidth(c)<100)sh.setColumnWidth(c,100);}});return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON)}";}
  document.getElementById('tcm-gsync-copy-btn')?.addEventListener('click', function() {
      const _sboxEl = document.getElementById('tcm-gsync-script-box');
      const text = _sboxEl ? (_sboxEl.value || _sboxEl.textContent || '') : '';
      const btn = this;
      function fallback() {
                      const ta = document.createElement('textarea');
                      ta.value = text;
                      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;width:1px;height:1px;';
                      document.body.appendChild(ta);
                      ta.focus(); ta.select();
                      let ok = false;
                      try { ok = document.execCommand('copy'); } catch(e) {}
                      document.body.removeChild(ta);
                      btn.textContent = ok ? '✓ Copied!' : '✗ Failed — select manually';
                      setTimeout(() => { btn.textContent = 'Copy Script'; }, ok ? 1500 : 2500);
                  }
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(text)
                          .then(() => { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = 'Copy Script'; }, 1500); })
                          .catch(fallback);
                  } else {
                      fallback();
                  }
              });
              document.getElementById('tcm-sync-sheets-save')?.addEventListener('click', () => {
                  const s2 = Storage.getSettings();
                  s2.syncSheets = {};
                  document.querySelectorAll('.tcm-sync-sheet-chk').forEach(cb => {
                      s2.syncSheets[cb.dataset.key] = cb.checked;
                  });
                  Storage.saveSettings(s2);
                  const btn = document.getElementById('tcm-sync-sheets-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save Selection'; }, 1500); }
              });
              
              
              document.getElementById('tcm-discord-save')?.addEventListener('click', () => {
                  const cfg = Discord.getCfg();
                  cfg.logWebhook = (document.getElementById('tcm-discord-log-hook')?.value || '').trim();
                  cfg.panelWebhook = (document.getElementById('tcm-discord-panel-hook')?.value || '').trim();
                  cfg.weeklyWebhook = (document.getElementById('tcm-discord-weekly-hook')?.value || '').trim();
                  Discord.saveCfg(cfg);
                  Discord.saveOpts({
                      dailyMetrics: !!document.getElementById('tcm-d-opt-metrics')?.checked,
                      unusedTrains: !!document.getElementById('tcm-d-opt-trains')?.checked,
                      employeeAlerts: !!document.getElementById('tcm-d-opt-alerts')?.checked,
                      starChange: !!document.getElementById('tcm-d-opt-stars')?.checked,
                      stockAlert: !!document.getElementById('tcm-d-opt-stock')?.checked,
                      autoPost: !!document.getElementById('tcm-d-opt-auto')?.checked,
                      stockAlertDays: parseFloat(document.getElementById('tcm-d-stock-days')?.value) || 3
                  });
                  const st = document.getElementById('tcm-discord-status');
                  if (st) { st.style.color = '#7eb8ff'; st.textContent = 'Discord settings saved.'; }
                  const btn = document.getElementById('tcm-discord-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save Discord'; }, 1500); }
              });
              document.getElementById('tcm-discord-post')?.addEventListener('click', async () => {
                  const btn = document.getElementById('tcm-discord-post');
                  const st = document.getElementById('tcm-discord-status');
                  // persist fields first
                  const cfg = Discord.getCfg();
                  cfg.logWebhook = (document.getElementById('tcm-discord-log-hook')?.value || '').trim();
                  cfg.panelWebhook = (document.getElementById('tcm-discord-panel-hook')?.value || '').trim();
                  cfg.weeklyWebhook = (document.getElementById('tcm-discord-weekly-hook')?.value || '').trim();
                  Discord.saveCfg(cfg);
                  Discord.saveOpts({
                      dailyMetrics: !!document.getElementById('tcm-d-opt-metrics')?.checked,
                      unusedTrains: !!document.getElementById('tcm-d-opt-trains')?.checked,
                      employeeAlerts: !!document.getElementById('tcm-d-opt-alerts')?.checked,
                      starChange: !!document.getElementById('tcm-d-opt-stars')?.checked,
                      stockAlert: !!document.getElementById('tcm-d-opt-stock')?.checked,
                      autoPost: !!document.getElementById('tcm-d-opt-auto')?.checked,
                      stockAlertDays: parseFloat(document.getElementById('tcm-d-stock-days')?.value) || 3
                  });
                  if (btn) { btn.disabled = true; btn.textContent = '…posting'; }
                  if (st) { st.style.color = '#aaa'; st.textContent = 'Posting to Discord…'; }
                  try {
                      if (!UI.state) throw new Error('Load company data first (open TCM on a company page and refresh).');
                      const res = await Discord.runReports(UI.state, true);
                      if (st) {
                          st.style.color = '#7eb8ff';
                          st.textContent = 'Posted' +
                              (res.results?.log ? ' · log' : '') +
                              (res.results?.panel ? ' · panel' : '') +
                              (res.errors?.length ? (' · warnings: ' + res.errors.join('; ')) : '');
                      }
                      if (btn) { btn.textContent = '✓ Done'; }
                  } catch (e) {
                      if (st) { st.style.color = '#f88'; st.textContent = 'Failed: ' + (e.message || e); }
                      if (btn) { btn.textContent = '✗ Failed'; }
                  } finally {
                      setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = 'Post / Update Now'; } }, 2000);
                  }
              });
              document.getElementById('tcm-discord-reset-panel')?.addEventListener('click', () => {
                  Discord.saveMeta({ panelMessageId: null });
                  const st = document.getElementById('tcm-discord-status');
                  if (st) { st.style.color = '#aaa'; st.textContent = 'Panel message id cleared — next post creates a new panel message.'; }
              });

              document.getElementById('tcm-jsonbin-save')?.addEventListener('click', () => {
                  const cfg = JsonBinSync.getCfg();
                  cfg.binId = (document.getElementById('tcm-jsonbin-id')?.value || '').trim();
                  cfg.masterKey = (document.getElementById('tcm-jsonbin-key')?.value || '').trim();
                  cfg.enabled = !!document.getElementById('tcm-jsonbin-enabled')?.checked;
                  JsonBinSync.saveCfg(cfg);
                  const btn = document.getElementById('tcm-jsonbin-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save'; }, 1500); }
              });
              document.getElementById('tcm-jsonbin-now')?.addEventListener('click', async () => {
                  const btn = document.getElementById('tcm-jsonbin-now');
                  if (btn) { btn.textContent = '…syncing'; btn.disabled = true; }
                  try {
                      // Persist fields first
                      const cfg = JsonBinSync.getCfg();
                      cfg.binId = (document.getElementById('tcm-jsonbin-id')?.value || '').trim();
                      cfg.masterKey = (document.getElementById('tcm-jsonbin-key')?.value || '').trim();
                      cfg.enabled = !!document.getElementById('tcm-jsonbin-enabled')?.checked;
                      JsonBinSync.saveCfg(cfg);
                      await JsonBinSync.syncBothWays();
                      if (btn) { btn.textContent = '✓ Synced'; }
                      setTimeout(() => this._renderSettings(), 900);
                  } catch (e) {
                      const cfg = JsonBinSync.getCfg();
                      cfg.lastSync = new Date().toISOString();
                      cfg.lastSyncOk = false;
                      cfg.lastError = e.message || String(e);
                      JsonBinSync.saveCfg(cfg);
                      if (btn) { btn.textContent = '✗ Failed'; btn.disabled = false; }
                      alert('JSONBin sync failed: ' + (e.message || e));
                      setTimeout(() => this._renderSettings(), 1200);
                  }
              });
              document.getElementById('tcm-jsonbin-pull')?.addEventListener('click', async () => {
                  const btn = document.getElementById('tcm-jsonbin-pull');
                  if (btn) { btn.textContent = '…pulling'; btn.disabled = true; }
                  try {
                      const cfg = JsonBinSync.getCfg();
                      cfg.binId = (document.getElementById('tcm-jsonbin-id')?.value || '').trim();
                      cfg.masterKey = (document.getElementById('tcm-jsonbin-key')?.value || '').trim();
                      JsonBinSync.saveCfg(cfg);
                      const remote = await JsonBinSync.pull();
                      JsonBinSync.applyRemote(remote);
                      cfg.lastSync = new Date().toISOString();
                      cfg.lastSyncOk = true;
                      cfg.lastError = null;
                      JsonBinSync.saveCfg(cfg);
                      if (btn) { btn.textContent = '✓ Pulled'; }
                      setTimeout(() => this._renderSettings(), 900);
                  } catch (e) {
                      if (btn) { btn.textContent = '✗ Failed'; btn.disabled = false; }
                      alert('JSONBin pull failed: ' + (e.message || e));
                  }
              });
              document.getElementById('tcm-jsonbin-push')?.addEventListener('click', async () => {
                  const btn = document.getElementById('tcm-jsonbin-push');
                  if (btn) { btn.textContent = '…pushing'; btn.disabled = true; }
                  try {
                      const cfg = JsonBinSync.getCfg();
                      cfg.binId = (document.getElementById('tcm-jsonbin-id')?.value || '').trim();
                      cfg.masterKey = (document.getElementById('tcm-jsonbin-key')?.value || '').trim();
                      JsonBinSync.saveCfg(cfg);
                      await JsonBinSync.push();
                      cfg.lastSync = new Date().toISOString();
                      cfg.lastSyncOk = true;
                      cfg.lastError = null;
                      JsonBinSync.saveCfg(cfg);
                      if (btn) { btn.textContent = '✓ Pushed'; }
                      setTimeout(() => this._renderSettings(), 900);
                  } catch (e) {
                      if (btn) { btn.textContent = '✗ Failed'; btn.disabled = false; }
                      alert('JSONBin push failed: ' + (e.message || e));
                  }
              });

              document.getElementById('tcm-gsync-save')?.addEventListener('click', () => {
                  const cfg = GoogleSync.getCfg();
                  cfg.webAppUrl = document.getElementById('tcm-gsync-url')?.value.trim() || '';
                  cfg.sheetUrl  = document.getElementById('tcm-gsync-sheeturl')?.value.trim() || '';
                  cfg.enabled = document.getElementById('tcm-gsync-enabled')?.checked || false;
                  GoogleSync.saveCfg(cfg);
                  const btn = document.getElementById('tcm-gsync-save');
                  if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save'; }, 1500); }
                  this._renderSettings();
              });
              document.getElementById('tcm-gsync-now')?.addEventListener('click', async () => {
                  const btn = document.getElementById('tcm-gsync-now');
                  const url = document.getElementById('tcm-gsync-url')?.value.trim();
                  if (!url) { if (btn) { btn.textContent = '⚠ No URL'; setTimeout(() => { btn.textContent = '↑ Sync Now'; }, 2500); } return; }
                  const cfg = GoogleSync.getCfg(); cfg.webAppUrl = url; GoogleSync.saveCfg(cfg);
                  if (btn) { btn.textContent = '↑ Syncing...'; btn.disabled = true; }
                  const result = await GoogleSync.syncAll(UI.state);
                  if (btn) { btn.disabled = false; }
                  if (result?.allOk) {
                      if (btn) { btn.textContent = '✓ Synced!'; setTimeout(() => { btn.textContent = '↑ Sync Now'; }, 2000); }
                  } else {
          if (btn) { btn.textContent = '⚠ Sync Failed'; btn.style.color = '#f59e0b'; setTimeout(() => { btn.textContent = '↑ Sync Now'; btn.style.color = ''; }, 4000); }
          const _sErrEl = document.createElement('div');
          _sErrEl.style.cssText = 'color:#f59e0b;font-size:11px;margin-top:6px;padding:6px 10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:4px;';
          _sErrEl.textContent = 'Sync failed — check your Web App URL and re-deploy with "Anyone can access" if needed.';
          btn?.parentElement?.appendChild(_sErrEl);
          setTimeout(() => _sErrEl?.remove(), 7000);
      }
      this._renderSettings();
              });

              document.querySelectorAll('input[name="tcm-train-sort"]').forEach(r => {
                  r.addEventListener('change', e => Storage.set('train_sheet_sort', e.target.value));
              });
              document.getElementById('tcm-tornstats-import')?.addEventListener('click', () => {
                  const text  = document.getElementById('tcm-tornstats-paste')?.value || '';
                  const resEl = document.getElementById('tcm-tornstats-result');
                  if (!text.trim()) { if (resEl) resEl.textContent = 'Nothing pasted.'; return; }
                  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
                  const imported = [], skipped = [];
                  for (const line of lines) {
                      const dm = line.match(/(\d{2})\/(\d{2})\/(\d{2})/);
                      if (!dm) continue;
                      if (/weekly|total/i.test(line)) continue;
                      const [, dd, mm, yy] = dm;
                      const isoDate = `20${yy}-${mm}-${dd}`;

                      let amounts = [...line.matchAll(/\$(-?[\d,]+)/g)].map(m => parseInt(m[1].replace(/,/g, '')));
                      if (amounts.length < 2) {
                          amounts = [...line.matchAll(/\b(-?[\d]{1,3}(?:,[\d]{3})+)\b/g)]
                              .map(m => parseInt(m[1].replace(/,/g, '')))
                              .filter(n => !isNaN(n) && Math.abs(n) >= 1000);
                      }
                      if (amounts.length < 2) { skipped.push(isoDate); continue; }

                      const _calcNet = amounts[0] - (amounts[1] || 0) - (amounts[2] || 0);
                      const _netProfit = amounts.length >= 5 ? amounts[4]
                                       : amounts.length === 4 ? amounts[3]
                                       : _calcNet;
                      imported.push({
                          date: isoDate,
                          daily:          amounts[0] || 0,
                          salaries:       amounts[1] || 0,
                          adBudget:       amounts.length >= 4 ? (amounts[2] || 0) : 0,
                          dailyStockCost: amounts.length >= 5 ? (amounts[3] || 0) : 0,
                          netProfit:      _netProfit,
                          popularity: 0, efficiency: 0, environment: 0,
                          ts: new Date(isoDate + 'T12:00:00Z').getTime()
                      });
                  }
                  if (!imported.length) {
                      if (resEl) resEl.innerHTML = '<span style="color:#f59e0b;">No rows found — make sure dates are in DD/MM/YY format and dollar signs are present.</span>';
                      return;
                  }
                  const existing = Storage.getSnapshots();
                  let added = 0, updated = 0;
                  for (const snap of imported) {
                      const idx = existing.findIndex(s => s.date === snap.date);
                      if (idx >= 0) { existing[idx] = { ...existing[idx], ...snap }; updated++; }
                      else { existing.push(snap); added++; }
                  }
                  existing.sort((a, b) => a.date.localeCompare(b.date));
                  if (existing.length > 365) existing.splice(0, existing.length - 365);
                  Storage.set('snapshots', existing);
                  try { localStorage.setItem('TCM_snapshots_mirror', JSON.stringify(existing)); } catch(e) {}
                  if (resEl) resEl.innerHTML = `<span style="color:#7eb8ff;">✓ ${added} new snapshots added, ${updated} updated.</span>${skipped.length ? ` <span style="color:#f59e0b;">${skipped.length} rows skipped.</span>` : ''}`;
document.getElementById('tcm-tornstats-paste').value = '';
              });
              document.getElementById('tcm-tornstats-auto-import')?.addEventListener('click', () => {
                  const _tsStage = Storage.get('tornstats_staging', null);
                  const imported = _tsStage?.rows || [];
                  if (!imported.length) { this._renderSettings(); return; }
                  const existing = Storage.getSnapshots();
                  let added = 0, updated = 0;
                  for (const snap of imported) {
                      const idx = existing.findIndex(s => s.date === snap.date);
                      if (idx >= 0) { existing[idx] = { ...existing[idx], ...snap }; updated++; }
                      else { existing.push(snap); added++; }
                  }
                  existing.sort((a, b) => a.date.localeCompare(b.date));
                  if (existing.length > 365) existing.splice(0, existing.length - 365);
                  Storage.set('snapshots', existing);
                  try { localStorage.setItem('TCM_snapshots_mirror', JSON.stringify(existing)); } catch(e) {}
                  Storage.set('tornstats_staging', null);
                  const resEl = document.getElementById('tcm-tornstats-result');
                  if (resEl) resEl.innerHTML = `<span style="color:#7eb8ff;">✓ ${added} new snapshots added, ${updated} updated.</span>`;
                  this._renderSettings();
              });
              document.getElementById('tcm-fin-colors-save')?.addEventListener('click', () => {
                  const _fcs = Storage.getSettings();
                  _fcs.finGoodColor         = document.getElementById('tcm-fin-good-color')?.value         || '#b6d7a8';
                  _fcs.finBadColor          = document.getElementById('tcm-fin-bad-color')?.value          || '#ea9999';
                  Storage.saveSettings(_fcs);
                  const _fcBtn = document.getElementById('tcm-fin-colors-save');
                  if (_fcBtn) { _fcBtn.textContent = '✓ Saved'; setTimeout(() => { _fcBtn.textContent = 'Save Sheet Colors'; }, 1500); }
              });
              document.getElementById('tcm-full-backup-btn')?.addEventListener('click', () => {
                  const _bkKeys = [
                      'settings','snapshots','trained_log','rotation','train_sales','paid_contracts',
                      'ranking_cache','benchmark_cache_v2','bench_rosters_same_0','bench_rosters_same_1',
                      'bench_rosters_above_0','bench_rosters_above_1','bench_rosters_top_0','bench_rosters_top_1',
                      'wageMultipliers','wageExcluded','overrides','google_sync_cfg','tax_collection',
                      'weekly_template','schedule_config','schedule_overrides','processed_log_ids',
                      'rec_dismissed','rec_snooze','last_company_id','train_sheet_sort'
                  ];
                  const _bkOut = {
                      version: TCM.VERSION,
                      exportedAt: new Date().toISOString(),
                      apiKey: GM_getValue(TCM.NS + 'apiKey', ''),
                      data: {}
                  };
                  _bkKeys.forEach(k => {
                      const _v = GM_getValue(TCM.NS + k, null);
                      if (_v !== null) _bkOut.data[k] = _v;
                  });
                  try {
                      const _lsM = localStorage.getItem('TCM_snapshots_mirror');
                      if (_lsM) _bkOut.snapshots_ls_mirror = _lsM;
                  } catch(e) {}
                  exportJson(_bkOut, `tcm_full_backup_${new Date().toISOString().slice(0,10)}.json`);
              });
              document.getElementById('tcm-full-restore-input')?.addEventListener('change', (ev) => {
                  const _rf = ev.target.files?.[0];
                  if (!_rf) return;
                  const _rdr = new FileReader();
                  _rdr.onload = (re) => {
                      try {
                          let _raw = re.target.result;
                          const _t = _raw.trim();
                          if (_t.startsWith('"') && _t.endsWith('"')) _raw = _t.slice(1,-1).replace(/""/g,'"');
                          const _bk = JSON.parse(_raw);
                          if (!_bk.data || typeof _bk.data !== 'object') { alert('Invalid backup file — missing data object.'); return; }
                          if (!confirm(`Restore TCM backup from ${_bk.exportedAt || 'unknown date'}?\n\nThis will OVERWRITE all current TCM data. Cannot be undone.`)) return;
                          Object.entries(_bk.data).forEach(([k, v]) => { GM_setValue(TCM.NS + k, v); });
                          if (_bk.apiKey) GM_setValue(TCM.NS + 'apiKey', _bk.apiKey);
                          if (_bk.snapshots_ls_mirror) {
                              try { localStorage.setItem('TCM_snapshots_mirror', _bk.snapshots_ls_mirror); } catch(e) {}
                          }
                          alert('Backup restored! Reloading data...');
                          App.refresh().catch(ex => console.error('[TCM]', ex));
                          this._renderSettings();
                      } catch(ex) { alert('Failed to restore: ' + ex.message); }
                  };
                  _rdr.readAsText(_rf);
              });
          },

          showSetup() {
              if (this.container) this.container.style.display = 'flex';
              const body = document.getElementById('tcm-body');
              body.innerHTML = `
                  <div class="tcm-section-label">Welcome to Torn Company Manager v${TCM.VERSION}</div>
                  <div class="tcm-notice" style="line-height:1.7;">
                      A <strong>custom key</strong> is all you need — same link for directors and employees.<br>
                      <span style="color:#aaa;font-size:11px;">Directors get the full dashboard. Employees / non-directors get a <strong>limited public-data view</strong> (whatever Torn returns for your role).</span><br>
<a href="https://www.torn.com/preferences.php#tab=api?step=addNewKey&company=search,snapshot,companies,employees,profile,detailed,applications,news,stock&user=hof,basic,log&logIds=104&title=TCM"
                 target="_blank" rel="noopener"
                 style="display:inline-block;margin-top:6px;background:rgba(126,184,255,0.15);
                 border:1px solid rgba(126,184,255,0.4);color:#7eb8ff;border-radius:5px;
                 padding:6px 14px;font-size:12px;font-weight:700;text-decoration:none;">
                 ⚡ Create Custom TCM Key (one click) →
              </a>
              <div style="font-size:10px;color:#888;margin-top:5px;">
                  Grants: <strong>company</strong> · applications, detailed, employees, news, profile, stock &nbsp;|&nbsp;
                  <strong>user</strong> · log, hof &nbsp;- nothing else.
              </div>
                  </div>
<input class="tcm-input" id="tcm-key-input" type="password" placeholder="Paste API key here..." style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
                  <button class="tcm-btn green" id="tcm-save-key-btn">Save & Load</button>
                  <button class="tcm-btn" id="tcm-full-reset-btn" style="margin-top:8px;font-size:11px;opacity:0.7;">🗑 Full reset (wipe all TCM storage)</button>
              `;
              document.getElementById('tcm-save-key-btn').addEventListener('click', () => {
                  const k = document.getElementById('tcm-key-input').value.trim();
if (k) { Storage.setApiKey(k); document.getElementById('tcm-body').innerHTML = '<div class="tcm-loading"><span class="tcm-spin"></span>Verifying new key...</div>'; App.refresh(); }
              });
              document.getElementById('tcm-full-reset-btn').addEventListener('click', () => {
                  if (confirm('Wipe ALL TCM data for this script (key, settings, everything)?')) Storage.fullReset();
              });
          },

showLimitedAccessHelp(reason) {
              if (this.container) this.container.style.display = 'flex';
              const body = document.getElementById('tcm-body');
              if (!body) return;
              const msg = reason?.msg || 'Access level too low for full company data.';
              body.innerHTML = `
                  <div class="tcm-section-label">Limited access</div>
                  <div class="tcm-notice" style="line-height:1.65;margin-bottom:12px;">
                      Your key could not load full company data (${msg}).
                      <br><br>
                      <strong>Employees / non-directors:</strong> TCM can still run in a
                      <strong>limited public-data view</strong> once a key that can read at least
                      <code>company · profile</code> (and preferably <code>employees</code>) is set.
                      Use the same custom-key link as directors — Torn only returns the fields your role allows.
                      <br><br>
                      <strong>Directors:</strong> paste a company-capable key below (your own or a director key for this company).
                  </div>
                  <div style="margin-bottom:10px;">
                      <a href="https://www.torn.com/preferences.php#tab=api?step=addNewKey&company=applications,detailed,employees,news,profile,stock&user=hof,basic,log&logIds=104&title=TCM"
                         target="_blank" rel="noopener"
                         style="display:inline-block;background:rgba(126,184,255,0.15);border:1px solid rgba(126,184,255,0.4);color:#7eb8ff;border-radius:5px;padding:6px 14px;font-size:12px;font-weight:700;text-decoration:none;">
                         ⚡ Create Custom TCM Key →
                      </a>
                  </div>
                  <input class="tcm-input" id="tcm-company-key-input" type="password" placeholder="Paste API key (personal or company)…" style="width:100%;box-sizing:border-box;margin-bottom:8px;" />
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      <button class="tcm-btn green" id="tcm-company-key-save-btn">Save &amp; Retry</button>
                      <button class="tcm-btn" id="tcm-limited-retry-btn">Retry with current key</button>
                      <button class="tcm-btn" id="tcm-company-key-cancel-btn">Change personal key</button>
                  </div>
              `;
              document.getElementById('tcm-company-key-save-btn')?.addEventListener('click', () => {
                  const k = document.getElementById('tcm-company-key-input')?.value?.trim();
                  if (k) {
                      Storage.setCompanyKey(k);
                      App._refreshInFlight = false;
                      App.refresh();
                  }
              });
              document.getElementById('tcm-limited-retry-btn')?.addEventListener('click', () => {
                  App._refreshInFlight = false;
                  App.refresh();
              });
              document.getElementById('tcm-company-key-cancel-btn')?.addEventListener('click', () => this.showSetup());
          },

          showCompanyKeyNeeded(reason) {
              if (this.container) this.container.style.display = 'flex';
              if (!document.getElementById('tcm-pulse-style')) {
                  GM_addStyle('@keyframes tcmPulse{0%,100%{box-shadow:0 0 0 0 rgba(126,184,255,0.35);}50%{box-shadow:0 0 0 6px rgba(126,184,255,0);}}');
                  const _mark = document.createElement('div');
                  _mark.id = 'tcm-pulse-style';
                  _mark.style.display = 'none';
                  document.body.appendChild(_mark);
              }
              const body = document.getElementById('tcm-body');
              body.innerHTML = `
                  <div style="padding:18px 14px;text-align:center;border:2px solid #f59e0b;border-radius:8px;background:rgba(245,158,11,0.08);animation:tcmPulse 1.6s infinite;">
                      <div style="font-size:32px;margin-bottom:6px;">⚠️</div>
                      <div style="font-size:16px;font-weight:900;color:#f59e0b;letter-spacing:0.5px;margin-bottom:10px;text-transform:uppercase;">Action needed — company key required</div>
                      <div style="font-size:13px;color:#ddd;line-height:1.7;text-align:left;background:rgba(0,0,0,0.25);border-radius:6px;padding:10px 12px;">
Your API key <strong>can't</strong> pull data for this company (${reason?.msg || 'access level too low'}).<br><br>
                          You need a key from <strong>someone employed at (or directing) the company</strong> — paste it below.<br><br>
                          <span style="color:#7eb8ff;">✔ Safe:</span> that key is used <strong>only</strong> to read company data.
                          Its owner gets <strong>no</strong> extra access of their own.
                      </div>
                  </div>
<input class="tcm-input" id="tcm-company-key-input" type="password" placeholder="Paste director's API key here..." style="width:100%;box-sizing:border-box;margin:12px 0 8px;" />
                  <button class="tcm-btn green" id="tcm-company-key-save-btn">Save & Load</button>
                  <button class="tcm-btn" id="tcm-company-key-cancel-btn" style="margin-top:6px;">Change my own API key instead</button>
              `;
              document.getElementById('tcm-company-key-save-btn').addEventListener('click', () => {
                  const k = document.getElementById('tcm-company-key-input').value.trim();
                  if (k) { Storage.setCompanyKey(k); App._refreshInFlight = false; App.refresh(); }
              });
              document.getElementById('tcm-company-key-cancel-btn').addEventListener('click', () => this.showSetup());
          },
                    showError(msg) {
      const wasOpen = this.container && this.container.style.display !== 'none';
      if (this.container && wasOpen) this.container.style.display = 'flex';
      if (this.launcher) this.launcher.classList.add('err');
              this._setStatus('Error — check settings', 'err');
              const body = document.getElementById('tcm-body');
              body.innerHTML = `
                  <div class="tcm-rec high">
                      <div class="rec-title">⚠ ${msg}</div>
                  </div>
                  <div style="display:flex;gap:8px;margin-top:8px;">
                      <button class="tcm-btn" id="tcm-retry-btn">Retry</button>
                      <button class="tcm-btn" id="tcm-rekey-btn">Change API Key</button>
                  </div>
              `;
              document.getElementById('tcm-retry-btn').addEventListener('click', () => App.refresh());
              document.getElementById('tcm-rekey-btn').addEventListener('click', () => this.showSetup());
          },

          setLoading() {
              if (this.launcher) { this.launcher.classList.remove('err'); this.launcher.classList.add('loading'); }
              this._setStatus('Refreshing...', 'warn');


              const body = document.getElementById('tcm-body');
              if (body && body.innerHTML.includes('Initialising')) {
                  body.innerHTML = '<div class="tcm-loading"><span class="tcm-spin"></span>Loading...</div>';
              }
          },


          _attachDrag() {
              const titlebar = document.getElementById('tcm-titlebar');
              const wrap = this.container;
              if (!titlebar || !wrap) return;
              let drag = false, ox = 0, oy = 0;

              titlebar.addEventListener('mousedown', e => {
                  const s = Storage.getSettings();
                  if (s.pinned) return;
                  drag = true;
                  ox = e.clientX - wrap.offsetLeft;
                  oy = e.clientY - wrap.offsetTop;
                  titlebar.style.cursor = 'grabbing';
                  e.preventDefault();
              });
             titlebar.addEventListener('touchstart', e => {
                  if (e.target.closest('.tcm-ctrl-btn')) return;
                  const s = Storage.getSettings();
                  if (s.pinned) return;
                  drag = true;
                  const t = e.touches[0];
                  ox = t.clientX - wrap.offsetLeft;
