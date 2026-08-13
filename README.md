# Morrakiu's Company Manager

Tampermonkey / Torn PDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.25.0  
**Install / updates:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) — Tampermonkey auto-updates from GitHub branch **`Morrakiu-TCM-Beta`** — **full v3.25.0** userscript (raw install via Tampermonkey / PDA)

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
| **Training** | Smart Training queue (**Fair share** / **Star push**), train log, **Train Calculator**, **Training Contracts**, daily plan with reservations, trainer EE bonus, settling-in / exclude |
| **Employees** | Recommendations, best-position advisor (greedy company-wide assignment), role-fit dropdowns, inactive alerts, **EE promotion path** |
| **Peers** | API-only peer list + role mix; benchmark filters; opt-in role share |
| **Metrics** | Week-over-week company metrics |
| **Discord** | Permanent log + daily panel + weekly panel webhooks · 18:00 TCT auto-post |

### Training
- Smart Training: Fair share / Star push modes
- **Train Calculator** — input current + target stats; trains needed; best-role recommendation if current role cannot train a wanted stat
- **Training Contracts** — sales tracking, progress, daily reservation, JSONBin sync
- Daily plan allocation with contract reservations
- Trainer EE bonus table; director trains (+50 primary / +25 secondary)
- Settling-in period and exclude list
- Trains-to-next-efficiency-tier simulation (50 / 100 / 150 / 200)

### Positions & data
- Full position tables for all 39 company types
- Peer benchmarks via Torn API only (company/{type}/companies then company/{id}?selections=employees) — no page scrape
- JSONBin sync (trains, contracts, metrics, peers, role-share)
- Google Sheets Apps Script export
- TornStats finance helper
- PDA-compatible HTTP layer (GM / PDA_http*)

### Company day
- Boundary at **18:00 TCT**

---

## Install

See [INSTALL.md](./INSTALL.md).

**Raw install / update URL (branch `Morrakiu-TCM-Beta`):**  
https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js

---

## Changelog (high level)

### 3.25.0
- Training Contracts (storage, UI, daily plan reservations, JSONBin merge)
- Train Calculator + best-role recommendation
- Daily plan allocation with trainer bonus and tier simulation
- Settling-in / exclude list
- Docs and auto-update pointed at **Morrakiu-TCM-Beta**

### Earlier
- PDA HTTP layer; JSONBin + Sheets; TornStats helper
- API peers/benchmarks; full 39-type positions

---

## License / notes

For Torn directors. Use your own API key. No scraping of peer pages — Torn API only for peer data.
