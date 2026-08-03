# Torn Company Manager

Tampermonkey / TornPDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.7.1  
**Install:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) (raw install via Tampermonkey)

---

## Features

### Company overview
- Stars, type, headcount, daily/weekly income, bank
- Popularity, efficiency, advertising budget (when API provides them)
- Stock levels and approximate **days of stock left** (when sales data exists)
- Director vs employee detection

### Tabs

| Tab | Contents |
|-----|----------|
| **Training** | Smart Training queue — who to train first, fair share by tenure, local train log |
| **Employees** | Recommendations + best-position advisor (work-stat efficiency per role) |
| **Peers** | Compare your role mix to **10★** companies of the same type |
| **Discord** | Webhook reports + 18:00 TCT auto-post |

### Smart Training
- Estimates trains/day from star rating (+ trainer if staffed)
- Prioritises low WS efficiency / effectiveness and under-trained staff
- **+Train** logs a train after you use it in-game (does not spend trains)
- **Fair Δ** = expected share of logged trains by days employed − actual

### Best position advisor
- Built-in position requirements for common company types
- Efficiency formula aligned with Torn working-stat rules
- Flags staff who should move roles

### 10★ peer role-mix
- Caches company IDs while you browse the **Job List**
- Scrapes **public corp-info pages** for employee position text
- **Refresh Peers** builds average staffing by role vs yours

### Discord reports
- Dedicated **Discord** tab (webhook + checkboxes)
- Optional daily auto-post at **18:00 TCT** while the companies page is open
- Report types: Unused Trains · Daily Metrics · Employee Alerts · Star Up/Down
- Webhook URL and options sync through **JSONBin** with the train log

### Train sync (Web ↔ PDA)
Discord **webhooks are write-only** — they cannot feed data back to PDA.

| Channel | Purpose |
|---------|---------|
| **JSONBin.io** | Two-way store shared by web and PDA |
| **Discord webhook** | Optional scheduled / manual reports |

---

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or use TornPDA script support).
2. Open [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) and install.
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

## Train sync setup (Web ↔ PDA)

### Why not Discord alone?
A Discord webhook can **post** messages. It cannot be **read** by the script.

### JSONBin (required for two-way sync)

JSONBin rejects a blank body (`Bin cannot be blank`). Use a real starter object.

1. Create a free account at [jsonbin.io](https://jsonbin.io).
2. **Create Bin** and paste this JSON:

```json
{
  "version": 2,
  "updated": 0,
  "company_id": null,
  "company_name": null,
  "trains": {},
  "discord": {
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

3. Name the bin (e.g. `CompanyManagerTrains`) and create it.
4. Copy **Bin ID** and **Master Key**.
5. In the script panel click **Sync** → paste → **Save Sync Settings**.
6. Same Bin ID + Key on **TornPDA**.
7. **Sync Now** (or **+Train** / Discord **Save** push automatically).

---

## Peer comparison workflow

1. Open **Job List** for your company type.
2. Open individual **corp info** pages.
3. Toast confirms positions were scraped.
4. **Companies** → **Peers** → **Refresh Peers**.

---

## Privacy / ToS notes

| Item | Behaviour |
|------|-----------|
| Torn API key | Local browser storage only |
| Train log / Discord settings | Local + optional JSONBin + optional Discord post |
| Peer scrapes | Public Torn pages you open |

Comply with [Torn’s API ToS](https://www.torn.com/api.html) and scripting rules.

---

## Changelog (recent)

### 3.7.1
- Streamlined HTTP helpers (`xhrJson`), peer fetch URL list, position-name cache
- Fixed JSONBin pull structure

### 3.7.0
- Discord tab with selectable report types
- Auto-post at 18:00 TCT
- Discord settings synced via JSONBin

### 3.6.x
- JSONBin train sync, starter JSON fix, tabs, Smart Training, peer scrape
