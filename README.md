# Morrakiu's Company Manager

Tampermonkey / Torn PDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.24.1  
**Install / updates:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) — Tampermonkey auto-updates from GitHub branch **`Morrakiu-TCM-Beta`** — **full v3.24.1** userscript (raw install via Tampermonkey / PDA)

---

## Features

### Company overview
- Stars, type, headcount, daily/weekly income
- Popularity, efficiency, work environment, advertising budget (when the API provides them)
- **Metrics** tab — weekly history (up to 4 ISO weeks) vs previous week
- **Finance** — daily payroll, profit after wages, margin %, today vs average day, **salary-ratio warning** (≥60% payroll/income)
- **Stock** — days left, critical/watch, suggested order qty (~7 days when sales data exists)
- Director vs employee detection; **Director / Employee view** toggle

### Tabs

| Tab | Contents |
|-----|----------|
| **Training** | Smart Training queue (**Fair share** / **Star push**), train log |
| **Employees** | Recommendations, best-position advisor (greedy company-wide assignment), role-fit dropdowns, inactive alerts, **EE promotion path** |
| **Peers** | API-only peer list + role mix; benchmark filters; opt-in role share |
| **Metrics** | Week-over-week company metrics |
| **Discord** | Permanent log + daily panel + weekly panel webhooks · 18:00 TCT auto-post |

### Smart Training
- Estimates trains/day from star rating (+ trainer if staffed)
- **Fair share** — low WS efficiency / effectiveness and tenure fairness
- **Star push** — staff closest under the next EE tier
- **+Train** logs a train after you use it in-game (does not spend trains)

### Best position advisor
- Position requirements for common company types
- **Role-fit scoring** + greedy assignment (anti-stacking; priority roles first)
- Per-employee effectiveness vs every role; explicit **→ Role** move suggestions
- Inactive employees: warn ≥3d, replace threshold ≥7d (`last_action` from API)
- EE promotion hints toward tiers 50 / 100 / 150 / 200

### Peers / Benchmark (API only — no page scraping)
Compliant with Torn scripting rules: **Torn API only** for peer data.

1. **`company/{typeId}/companies`** — list companies of your type (rating, income, capacity)
2. **Filter** — 10★ only · same ★ (higher $) · above ★ · top (8★+ higher $); optional **same size**
3. **`company/{id}?selections=employees`** — public employee **positions** for role-mix averages
4. **Income rank** among listed companies of your type
5. Weekly list refresh gated around **Sunday 18:00 TCT**; shared via JSONBin when Data Sync is on
6. **Opt-in role share** — directors may publish anonymized role counts to Data Sync for denser averages

YATA is used only as a fallback ID list if Torn’s companies list fails.

### Discord reports
- **Permanent log** — append each daily run  
- **Daily data panel** — edit the same message daily  
- **Weekly panel** — Sundays 18:00 TCT (week-over-week + staffing/company changes)  
- **4-week trend** — updated on the **first Sunday of the month** (panel + optional permanent log)  
- Multi-device dedupe via JSONBin claims  
- Report types: Unused Trains · Daily Metrics · Employee Alerts · Star Up/Down  

### Data Sync (Web ↔ PDA) + Google Sheets
| Channel | Purpose |
|---------|---------|
| **JSONBin.io** | Two-way: trains, metrics, Discord settings/meta, peer lists, role shares |
| **Google Sheets** | Optional **one-way export** via Apps Script web app (Finance, Trains, Metrics, Peers, Stock, TornStats import) |
| **Discord webhooks** | Optional reporting |

Configure both under **Data Sync** in the panel. Use either or both.

### TornStats helper
- Script also runs on **tornstats.com** while **you** view a page
- Detects company finance tables, stages rows, copy/stage badge
- **Import TornStats stage** in Data Sync merges into local finance history (last ~120 days)

Compliant: no background loads of pages you are not viewing.

---

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) **or** Torn PDA custom scripts.
2. Open the **raw** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) from this repository → **Install**.  
   The full **v3.24.1** userscript is on the **`Morrakiu-TCM-Beta`** branch (development / default publish branch).
3. Visit [companies.php](https://www.torn.com/companies.php).
4. Enter a Torn API key (or **Create Custom Key**). On Torn PDA, the key can auto-fill via `###PDA-APIKEY###` when the app injects it.

**Raw install / auto-update URL:**  
https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js

### Pages
- `companies.php` / `page.php?sid=companies*` — dashboard  
- `joblist.php` — matched for convenience (no scraping)  
- `tornstats.com` — finance helper only  

### Torn PDA
- Enable custom user scripts; injection time **End**
- Prefer **GMforPDA 2.3+** (HTTP **PUT** / **PATCH** for JSONBin writes and Discord panel edits)
- Web and PDA do **not** share local storage — use **JSONBin** to align devices

---

## API key

**Recommended custom key:**

- **User:** `profile`, `job`, `basic`  
- **Company:** `profile`, `employees`, `stock`, `detailed`  

Use **Create Custom Key** in the panel for a pre-filled Torn form.

- Full employee stats and stock need a **Director** key.  
- Key is stored only via `GM_setValue` (browser / PDA storage).  
- Native **API v2** preferred, with safe fallbacks.

---

## Data Sync setup

### JSONBin (two-way Web ↔ PDA)

JSONBin rejects a blank body. Create a bin with:

```json
{
  "version": 5,
  "updated": 0,
  "company_id": null,
  "company_name": null,
  "trains": {},
  "metrics": { "weeks": {} },
  "peers": {},
  "roleShares": {},
  "discord": {
    "logWebhook": "",
    "panelWebhook": "",
    "weeklyWebhook": "",
    "opts": {},
    "meta": {}
  }
}
```

1. [jsonbin.io](https://jsonbin.io) → create bin → copy **Bin ID** + **Master Key**  
2. Panel → **Data Sync** → paste → **Save settings** → **JSONBin Sync Now**  
3. Same Bin ID + key on every device (web + PDA)

### Google Sheets (optional export)

1. New Google Sheet → **Extensions → Apps Script**  
2. Data Sync → **Copy Apps Script** → paste `doPost` → **Deploy → Web app**  
   - Execute as: **Me** · Who has access: **Anyone** (or anyone with the link)  
3. Paste the `/exec` URL → Save → **Export to Sheets**

### TornStats import

1. Open company finance on tornstats.com with the script installed  
2. Use the TCM badge (Copy / Stage)  
3. On Torn → **Data Sync → Import TornStats stage**

---

## Privacy / compliance

| Item | Behaviour |
|------|-----------|
| Torn API key | Local storage only |
| Train / metrics / peers | Local + optional JSONBin |
| Peer data | **Torn API only** (no joblist/corpinfo scraping) |
| TornStats | Only the page you are actively viewing |
| Sheets / Discord | Only if you configure them |

Comply with [Torn’s API terms](https://www.torn.com/api.html) and [scripting rules](https://www.torn.com/rules.php). Do not share API keys.

---

## Files

| File | Description |
|------|-------------|
| `Torn_Company_Manager.user.js` | **Full** v3.24.1 userscript on `Morrakiu-TCM-Beta` |
| `README.md` | This document |
| `INSTALL.md` | Short install notes |

---

## Changelog

### 3.24.x
- Smart Training: daily plan, settling-in, exclude, trainer EE capacity, trains→tier simulation
- Train Calculator + best-role recommendation for targets
- Script renamed **Morrakiu's Company Manager**; auto-update from `Morrakiu-TCM-Beta`

### 3.22.0
- Universal position tables for **all 39** Torn company types

### 3.21.1
- **Torn PDA hardening:** prefer `PDA_httpGet/Post/Put/Patch` when available; clearer JSONBin PUT errors  
- `###PDA-APIKEY###` support; broader `@match`; PDA notes in Data Sync / key help  

### 3.21.0
- **Google Sheets** optional export (Apps Script web app) alongside JSONBin  
- **TornStats** finance helper (viewing tornstats.com only) + import into finance history  
- Data Sync panel unified for JSONBin + Sheets + TornStats  

### 3.20.0
- Peer **benchmark filters** (10★ / same / above / top + same size)  
- Income rank; position aliases; salary-ratio warn; EE promotion path  

### 3.19.x
- API peer roles via `employees` selection; **opt-in role-share** pool via JSONBin  
- Inactive employee alerts; scraping removed for compliance  

### 3.11.x – 3.18.x
- Mobile layout; finance/stock/EE/train modes; Metrics tab; Director/Employee view  
- Discord permanent / daily / weekly / 4-week panels; multi-device claims  
- Greedy role recommendations; weekly metrics history  

---

## License / support

Personal use. Comply with Torn rules. Issues and updates via this repository.
