# Morrakiu's Company Manager

Tampermonkey / Torn PDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.25.2  
**Install / updates:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) — Tampermonkey auto-updates from GitHub branch **`Morrakiu-TCM-Beta`** — **full v3.25.2** userscript (raw install via Tampermonkey / PDA)

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
| **Peers** | API-only peer list + role mix; benchmark filters |
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
- **Peer role-mix targets** — when Peers data exists, assignment biases toward high-earning peer staffing ratios (scaled to your headcount); falls back to soft-cap spread otherwise
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
| **JSONBin.io** | Two-way: trains, metrics, Discord settings/meta, peer lists |
| **Google Sheets** | Optional **one-way export** via Apps Script web app (Finance, Trains, Metrics, Peers, Stock, TornStats import) |

---

## Install

See [INSTALL.md](./INSTALL.md).

**Raw auto-update URL:**
https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js

---

## JSONBin starter

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

---

## Changelog (high level)

### 3.25.x
- Training contracts (sales tracking, progress, daily reservation, JSONBin)
- Train Calculator + best-role recommendation
- Daily training plan with reservations / settling / exclude
- Best Position Advisor uses **peer role-mix** targets (API only)
- Opt-in role-share pool **removed** (v3.25.2)

### 3.20.0
- Peer **benchmark filters** (10★ / same / above / top + same size)  
- Income rank; position aliases; salary-ratio warn; EE promotion path  

### 3.19.x
- API peer roles via `employees` selection  
- Inactive employee alerts; scraping removed for compliance  

### 3.11.x – 3.18.x
- Mobile layout; finance/stock/EE/train modes; Metrics tab; Director/Employee view  
- Discord permanent / daily / weekly / 4-week panels; multi-device claims  
- Greedy role recommendations; weekly metrics history  

---

## License / support

Personal use. Comply with Torn rules. Issues and updates via this repository.
