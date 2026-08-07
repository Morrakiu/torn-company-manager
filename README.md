# Torn Company Manager

Tampermonkey / TornPDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.11.2  
**Install:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) — **full v3.11.2** userscript on `main` (raw install via Tampermonkey)

---

## Features

### Company overview
- Stars, type, headcount, daily/weekly income, bank
- Popularity, efficiency, work environment, advertising budget (when API provides them)
- **Weekly Metrics** table — efficiency, environment, avg employee effectiveness, popularity vs last ISO week
- **Finance strip** — daily payroll, profit after wages, margin %, today vs average day (strong / average / weak)
- **Stock smart balance** — days left, critical/watch badges, suggested order qty for ~7 days (when sales data exists)
- Director vs employee detection

### Tabs

| Tab | Contents |
|-----|----------|
| **Training** | Smart Training queue with **Fair share** / **Star push** modes, train log |
| **Employees** | Metric-aware recommendations, best-position advisor, EE breakdown (settled / addiction / inactivity / merits / wage) |
| **Peers** | Compare your role mix to **10★** companies of the same type |
| **Discord** | Permanent log + daily panel + weekly panel webhooks · 18:00 TCT auto-post |

### Smart Training
- Estimates trains/day from star rating (+ trainer if staffed)
- **Fair share** mode — prioritises low WS efficiency / effectiveness and tenure fairness
- **Star push** mode — prioritises staff closest under the next EE tier (100 / 110) to push stars
- **+Train** logs a train after you use it in-game (does not spend trains)
- **Fair Δ** = expected share of logged trains by days employed − actual

### Best position advisor & recommendations
- Built-in position requirements for common company types
- Efficiency formula aligned with Torn working-stat rules
- Flags staff who should move roles
- Employee table shows **settled-in, addiction, inactivity, merits, wage** when the API provides them
- Recommendations also use **week-over-week metric deltas** (efficiency / environment / effectiveness / popularity) and live low-effectiveness staff

### Weekly metrics history
- Snapshots company efficiency, work environment, avg (and per-role) employee effectiveness, popularity, role mix, staffing flags
- **JSONBin keeps the last 4 ISO weeks** (older weeks pruned)
- Compared to the previous week on the dashboard and in the **weekly Discord panel**

### 10★ peer role-mix
- Caches company IDs while you browse the **Job List**
- Scrapes **public corp-info pages** for employee position text (other companies’ employee stats are not public via API)
- **Refresh Peers** builds average staffing by role vs yours

### Discord reports
- Dedicated **Discord** tab with **three optional webhooks**:
  - **Permanent log** — appends a new message each daily run (history channel)
  - **Daily data panel** — edits the same message daily
  - **Weekly panel** — Sundays **18:00 TCT**; week-over-week metrics + company changes that can affect those stats (roles, Manager/Trainer/Marketer, headcount, ad budget, rating, etc.)
  - **4-week trend panel** — separate persistent message on the **daily data panel** webhook; updated only on the **first Sunday of each month**, and also appended to the **permanent log** when set (dashboard always shows the 4-week trend)
- Optional daily auto-post at **18:00 TCT** while the companies page is open
- **Multi-device dedupe** for daily log, weekly panel, and monthly 4-week panel via JSONBin claims
- Daily report types: Unused Trains · Daily Metrics · Employee Alerts · Star Up/Down
- Webhook URLs, options, and panel message ids sync through **JSONBin**

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
   The full **v3.11.2** userscript is on the `main` branch of this repo.
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
  "trains": {},
  "metrics": { "weeks": {} },
  "discord": {
    "logWebhook": "",
    "panelWebhook": "",
    "weeklyWebhook": "",
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
}
```

3. Copy the **Bin ID** from the URL / response.
4. Create a **Master Key** (Access Keys) with read + write on that bin.
5. In the script **Data Sync** / Discord area, paste Bin ID and Master Key. Save.
6. Use the **same** Bin ID + Master Key on every device (browser + PDA).

The script merges train logs, keeps the last **4** metric weeks, and stores Discord webhook URLs, options, and panel message IDs so multi-device runs stay in sync.

### Discord webhooks (optional)

1. In Discord: channel settings → Integrations → Webhooks → New Webhook.
2. Paste URLs into the script’s **Discord** tab:
   - **Permanent log** — history channel (new message each day)
   - **Daily data panel** — single editable message + monthly 4-week trend message
   - **Weekly panel** — Sundays 18:00 TCT week-over-week panel
3. Enable report types and **Auto-post at 18:00 TCT** if desired.
4. Settings sync through JSONBin when Data Sync is configured.

---

## Privacy

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
| `Torn_Company_Manager.user.js` | **Full** v3.11.2 userscript on `main` (install from raw file) |
| `README.md` | This document |
| `INSTALL.md` | Short install notes |

---

## Changelog

### 3.11.2
- Streamlined internals: parallel company API selections, concurrent peer loads (pool of 4)
- Shared helpers (`companyRoster`, `empStats`, `mapPool`, leaner `loadJson`) — same features

### 3.11.1
- Mobile / PDA layout: panel fits narrow viewports, safe-area insets, scrollable body
- Wide tables scroll horizontally inside the panel; drag disabled under 640px width

### 3.11.0
- Stock smart balance: days left, critical/watch, order qty for ~7 days
- Finance strip: payroll, profit after wages, day quality (strong/avg/weak)
- Employee EE breakdown: settled / addiction / inactivity / merits / wage
- Train modes: **Fair share** vs **Star push**
- Daily Discord metrics include payroll, day quality, critical stock

### 3.10.3
- 4-week panel moved to the **daily data panel** webhook (own edit-in-place message)
- Updates only on the **first Sunday of each month**; also posts to **permanent log** when configured
- Manual **Post / Update 4-Week Now** + reset control

### 3.10.2
- 4-week trend chart on the dashboard
- (Superseded) chart was briefly attached to the weekly panel

### 3.10.1
- Metrics history expanded to **4 ISO weeks** in JSONBin (was 2)

### 3.10.0
- Third Discord webhook: **weekly panel** (Sundays 18:00 TCT) with week-over-week metrics + staffing/company changes
- JSONBin metrics pruned for size; snapshot includes role counts, Manager/Trainer/Marketer flags, headcount, ad budget

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
- Dual Discord webhooks (permanent log + daily data panel)
- Data Sync rename (JSONBin holds trains + Discord config, not trains only)
