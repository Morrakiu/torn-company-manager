# Torn Company Manager

Tampermonkey / TornPDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.6.0  
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
- Scrapes **public corp-info pages** for employee position text (other companies’ employee stats are not public via API)
- **Refresh Peers** builds average staffing by role vs yours

### Train sync (Web ↔ PDA)
Discord **webhooks are write-only** — they cannot feed data back to PDA.

| Channel | Purpose |
|---------|---------|
| **JSONBin.io** | Two-way store shared by web and PDA |
| **Discord webhook** | Optional notifications / channel log |

See [Train sync setup](#train-sync-setup-web--pda) below.

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
A Discord webhook can **post** messages. It cannot be **read** by the script. PDA and browser would never share the same train counts from a webhook alone.

### JSONBin (required for two-way sync)

1. Create a free account at [jsonbin.io](https://jsonbin.io).
2. Create a bin with body `{}`.
3. Copy **Bin ID** and **Master Key**.
4. In the script panel click **Sync**.
5. Paste Bin ID + Master Key → **Save Sync Settings**.
6. Repeat with the **same** Bin ID and Master Key on **TornPDA**.
7. Click **Sync Now** (or just use **+Train** — it pushes automatically).

On company load the script **pulls**, **merges** (higher train counts win), and **pushes** back.

### Discord webhook (optional)

1. Server settings → Integrations → Webhooks → New webhook.
2. Paste the URL under **Sync**.
3. Each **+Train** (and full log push) can post an embed with a train snapshot.

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
| `Torn_Company_Manager.user.js` | Main userscript |
| `README.md` | This document |
| `INSTALL.md` | Short install notes |

---

## Changelog (recent)

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
