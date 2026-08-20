# TCM ALPHA

Tampermonkey / Torn PDA userscript for **Torn.com** company management.

**Author:** Morrakiu  
**Version:** 10.9.0-alpha  
**Branch:** [`Morrakiu-TCM-Alpha`](https://github.com/Morrakiu/torn-company-manager/tree/Morrakiu-TCM-Alpha)  
**Install / updates:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) — auto-updates from this branch via `@updateURL`

> **Alpha** is the active development line (forked from the public company manager, rebranded, and extended).  
> **Beta** (`Morrakiu-TCM-Beta`) remains the separate Morrakiu TCM line.

---

## Features

### Dashboard
- Floating panel on Torn pages (muted dark UI)
- **Management** — Overview, Finance, Stock  
- **Expansion** — Advice, Optimize, Projections, Benchmark  
- **Training** — Rotation, Contracts (train sales)  
- **Multi-Co** — Proxy keys, compare, history, EE performance  
- **Settings** — dedicated page (gear toggles back to previous tab)

### Training & contracts
- Daily train budget: `min(20, stars) + trainer EE bonuses`
- Rotation modes: priority / rotational / **contract + rotational**
- **Train sales contracts**
  - Fixed totals or **open-ended** long-term deals  
  - Payments over time (not only upfront)  
  - Daily reservations with **date-aware** capacity (start date, remaining trains)  
  - 7-day schedule shared with free/reserved math  

### Discord reports
- Permanent **log** webhook + editable **live panel** webhook  
- Auto-post after **18:15 TCT**  
- Report types: Unused trains · Daily metrics · Employee alerts · Star change · Stock  
- **Employee alerts:** addiction + inactivity only (no hospital/jail)  
- Trains/day uses the same budget as the Training tab  
- **Multi-device log dedupe** via JSONBin claims (one permanent log post per TCT day)

### Data sync
| Channel | Purpose |
|---------|---------|
| **JSONBin.io** | Two-way settings + trains + contracts + Discord meta |
| **Google Sheets** | Optional one-way export |

### API access
- Same **custom key** link for directors and employees  
- **Progressive company selections** — falls back when the key cannot read full director data  
- **Limited / non-director view** — public data only; director-only tabs hidden  

### Benchmark
- Ranking + employee stats by position (working stats)  
- Cache with roster rehydration  

---

## Install

See [INSTALL.md](./INSTALL.md).

**Raw auto-update URL:**  
https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Alpha/Torn_Company_Manager.user.js

---

## JSONBin (multi-device / Discord claims)

Create a bin with any non-empty JSON object, then paste **Bin ID** + **Master Key** in **Settings → JSONBin**. Use the same bin on every device so Discord permanent-log claims and train data stay shared.

---

## Changelog (Alpha)

### 10.9.0-alpha
- Discord trains/day uses company budget (`stars + trainer EE`)
- Employee alerts: addiction + inactivity only
- Multi-device Discord permanent-log claims (JSONBin)
- GreasyFork remote version polling removed (GitHub `@updateURL` only)
- Train contract schedule: open-ended deals, payments over time, date-aware reservations
- Limited non-director view + progressive company API selections
- Short-lived schedule simulation cache (7-day / free-capacity checks)

### 10.7.x-alpha
- Discord panels + Settings as a dedicated page  
- Contract open-ended + payment log foundations  
- UI muted palette aligned with Morrakiu TCM  

---

## Efficiency notes (10.9.0)

- API refresh is **rate-limited** and **single-flight** (`_refreshInFlight`)
- Hourly background refresh only when an API key is set  
- Benchmark / ranking results are **cached**  
- Buyer schedule simulation is **TTL-cached** (~2.5s) and cleared when contracts change  
- License checks are no-ops (always granted)  
- GreasyFork network update checks are disabled  

Large roster + benchmark loads remain the heaviest path; avoid reloading benchmark unnecessarily.

---

## License / support

MIT. Comply with Torn rules. Issues and updates via this repository.
