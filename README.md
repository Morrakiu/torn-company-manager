# Torn Company Manager

Tampermonkey / TornPDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.9.0  
**Install:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) — full script on this branch (raw install via Tampermonkey)

---

## Features

### Company overview
- Stars, type, headcount, daily/weekly income, bank
- Popularity, efficiency, work environment, advertising budget (when API provides them)
- **Weekly Metrics** table — efficiency, environment, avg employee effectiveness, popularity vs last ISO week
- Stock levels and approximate **days of stock left** (when sales data exists)
- Director vs employee detection

### Tabs

| Tab | Contents |
|-----|----------|
| **Training** | Smart Training queue — who to train first, fair share by tenure, local train log |
| **Employees** | Metric-aware recommendations + best-position advisor (work-stat efficiency per role) |
| **Peers** | Compare your role mix to **10★** companies of the same type |
| **Discord** | Dual webhooks: permanent log + live data panel · 18:00 TCT auto-post |

### Smart Training
- Estimates trains/day from star rating (+ trainer if staffed)
- Prioritises low WS efficiency / effectiveness and under-trained staff
- **+Train** logs a train after you use it in-game (does not spend trains)
- **Fair Δ** = expected share of logged trains by days employed − actual

### Best position advisor & recommendations
- Built-in position requirements for common company types
- Efficiency formula aligned with Torn working-stat rules
- Flags staff who should move roles
- Recommendations also use **week-over-week metric deltas** (efficiency / environment / effectiveness / popularity) and live low-effectiveness staff

### Weekly metrics history
- Snapshots company efficiency, work environment, avg (and per-role) employee effectiveness, popularity
- Kept for 12 ISO weeks; compared to the previous week on the dashboard
- Synced through **Data Sync** so web and PDA share the same history

### 10★ peer role-mix
- Caches company IDs while you browse the **Job List**
- Scrapes **public corp-info pages** for employee position text (other companies’ employee stats are not public via API)
- **Refresh Peers** builds average staffing by role vs yours

### Discord reports
- Dedicated **Discord** tab with **two optional webhooks**:
  - **Permanent log** — appends a new message each run (history channel)
  - **Data panel** — posts once, then **edits the same message** daily (live dashboard)
- Optional daily auto-post at **18:00 TCT** while the companies page is open
- **Multi-device log dedupe**: with Data Sync, only one client posts the permanent log per TCT day (JSONBin claim)
- Report types: Unused Trains · Daily Metrics · Employee Alerts · Star Up/Down
- Both webhook URLs, options, and the panel message id sync through **JSONBin**
- **Reset Panel Message** clears the stored message id if you deleted the Discord message

### Data Sync (Web ↔ PDA)
JSONBin is the shared store for **trains**, **weekly metrics**, **Discord settings**, and the **daily log claim**.

| Channel | Purpose |
|---------|---------|
| **JSONBin.io** | Two-way store: trains + metrics + Discord settings/meta |
| **Discord webhooks** | Optional permanent log + live data panel |

See [Data Sync setup](#data-sync-setup-web--pda) below.

---

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or use TornPDA script support).
2. Open the **raw** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) from this repository and choose **Install** in Tampermonkey.  
   The full **v3.9.0** userscript lives on the `main` branch of this repo.
3. Visit [companies.php](https://www.torn.com/companies.php).
4. Enter a Torn API key (or use **Create Custom Key**).

### Pages the script runs on
- `companies.php` / `page.php?sid=companies*` — dashboard
- `joblist.php` — caches peer company IDs; scrapes positions on corp-info views

---

## API key

**Recommended:** Limited custom key with:

- **User:** `profile`, `job`, `basic`
- **Company:** `profile`, `employees`, `stock`, `detailed`

Use **Create Custom Key** in the panel to open Torn’s key form pre-filled with these selections.

- Full employee stats and stock need a **Director** key on the company account.
- Key is stored only in the browser (`GM_setValue`).

Native **API v2** is preferred, with safe fallbacks.

---

## Data Sync setup (Web ↔ PDA)

### Why not Discord alone?
A Discord webhook can **post** (and edit) messages. It cannot be **read** by the script for shared state. PDA and browser share trains, weekly metrics, Discord settings, and the daily log claim through JSONBin.

### JSONBin (required for two-way Data Sync)

JSONBin rejects a blank body (`Bin cannot be blank`). Use a real starter object.

1. Create a free account at [jsonbin.io](https://jsonbin.io).
2. **Create Bin** and paste this JSON (do not leave the editor empty):

```json
{
  "version": 3,
  "updated": 0,
  "company_id": null,
  "company_name": null,
  "trains": {},
  "metrics": { "weeks": {} },
  "discord": {
    "logWebhook": "",
    "panelWebhook": "",
    "webhook": "",
    "opts": {
      "unusedTrains": false,
      "dailyMetrics": false,
      "employeeAlerts": false,
      "starChange": false,
      "autoPost": true
    },
    "meta": {}
  }
}
```

3. Give the bin a name (e.g. `CompanyManagerData`) and create it.
4. Copy **Bin ID** (from the bin URL / details) and **Master Key** (API Keys page).
5. In the script panel click **Data Sync** → paste Bin ID + Master Key → **Save Data Sync**.
6. Repeat with the **same** Bin ID and Master Key on **TornPDA**.
7. Click **Sync Now** (or use **+Train** / Discord Save — they push automatically).

On company load the script **pulls**, **merges** (higher train counts win; prunes departed staff), and **pushes** back.

### Discord webhooks (optional)

1. Server settings → Integrations → Webhooks → New webhook (create one or two).
2. Paste **Permanent log** and/or **Data panel** URLs on the Discord tab.
3. Data panel uses Discord’s webhook message edit API so one message stays current.
4. With **Data Sync**, only one device posts the permanent log each TCT day.

---

## Peer comparison workflow

1. Open **Job List** for your company type.
2. Open individual **corp info** pages (employee positions must be visible on the page).
3. A toast confirms positions were scraped.
4. Back on **Companies** → **Peers** tab → **Refresh Peers**.

Position averages use scraped public text, not private API employee data.

---

## Privacy / ToS notes

| Item | Behaviour |
|------|-----------|
| Torn API key | Local browser storage only |
| Train log | Local + optional JSONBin + optional Discord post |
| Peer scrapes | Public Torn pages you open |
| Data sharing | None, unless you configure JSONBin/Discord |

Comply with [Torn’s API ToS](https://www.torn.com/api.html) and scripting rules. Do not share API keys.

---

## Files

| File | Description |
|------|-------------|
| `Torn_Company_Manager.user.js` | **Full** v3.9.0 userscript (main branch) |
| `README.md` | This document |
| `INSTALL.md` | Short install notes |

---

## Changelog

### 3.9.0
- Weekly metrics log: company efficiency, work environment, avg employee effectiveness (+ popularity)
- Week-over-week comparison table on the dashboard
- Position / staffing recommendations react to metric deltas and low live effectiveness
- Metrics synced via Data Sync (JSONBin `metrics.weeks`)

### 3.8.2
- Multi-device permanent log dedupe via JSONBin claim (`lastLogPostDateTCT` + short-lived `logClaimId`)
- Requires **Data Sync** so web and PDA share the daily log lock; panel updates remain edit-in-place

### 3.8.1
- Prune train log (local + JSONBin) for employees who left the company when roster is loaded/synced

### 3.8.0
- Dual Discord webhooks: **permanent log** (append) + **data panel** (edit same message daily)
- Panel message id stored in JSONBin meta; **Reset Panel Message** control
- JSONBin discord payload version 3 (`logWebhook` / `panelWebhook`)

### 3.7.2
- Streamlined internals: unified `loadJson` / `getEmpList` / `showToast` helpers
- Removed redundant `posStr` / `gmXhr` wrappers
- Cleaner peer filter and Discord options reader
- No user-facing behaviour changes

### 3.7.1
- Streamlined HTTP helpers, peer fetch, position name cache; fixed JSONBin pull structure

### 3.7.0
- Discord tab with selectable report types
- Auto-post at 18:00 TCT
- Discord settings synced via JSONBin

### 3.6.0
- Train log sync via JSONBin (web ↔ PDA)
- Optional Discord webhook notifications
- **Sync** settings panel

### 3.5.x
- Tabs: Training / Employees / Peers
- Recommendations moved to Employees tab
- **Refresh Peers** moved into Peers tab

### 3.4.0
- Smart Training advisor
- Stock days, richer employee columns

### 3.3.0
- Peer role-mix from public page scrape

### 3.2.x
- Peer ID cache from job list
- Light-grey table text readability

### 3.1.x
- API v2, director checks, Create Custom Key
- Generic (all company types), companies pages only
