# Torn Company Manager

Tampermonkey / TornPDA userscript for **company directors** on [Torn.com](https://www.torn.com).

**Author:** Morrakiu  
**Version:** 3.7.2  
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
- Scrapes **public corp-info pages** for employee position text (other companies’ employee stats are not public via API)
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

The **Create Custom Key** button pre-fills Torn’s key form with these selections.

You must be the **Director** for full employee working stats, stock, and detailed company fields.

---

## Train sync setup (Web ↔ PDA)

1. Create a free account at [jsonbin.io](https://jsonbin.io).
2. **Create Bin** — JSONBin rejects a blank body. Use this starter JSON:

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
4. Copy **Bin ID** + **Master Key** into the script **Sync** dialog (web and PDA).
5. Save → **Sync Now**.

Train logs and Discord settings merge both ways (higher train counts win; options/meta merge).

---

## Discord tab

1. Create a webhook: Discord channel → Edit → Integrations → Webhooks.
2. Paste URL on the **Discord** tab.
3. Enable the reports you want.
4. Optionally enable **Auto-post at 18:00 TCT**.
5. **Save Discord Settings** (pushes to JSONBin if configured).
6. **Post Now** sends immediately.

Auto-post runs while the companies page is open (or TornPDA keeps the script alive) and only once per TCT day.

---

## Peer comparison workflow

1. Open [Job List](https://www.torn.com/joblist.php) for your company type.
2. Click into individual **company corp-info** pages so positions can be scraped from public page text.
3. Return to companies dashboard → **Peers** tab → **Refresh Peers**.

---

## Privacy

- API key, webhook URL, JSONBin credentials, and train log are stored only in the browser (Tampermonkey / PDA storage).
- JSONBin holds train counts and Discord settings you choose to sync — treat the Master Key as a secret.
- No data is sent anywhere else except Torn API, Discord (if configured), and JSONBin (if configured).

---

## Changelog

### 3.7.2
- Streamlined internals: unified `loadJson` / `getEmpList` / `showToast` helpers
- Removed redundant `posStr` / `gmXhr` wrappers
- Cleaner peer filter and Discord options reader
- No user-facing behaviour changes

### 3.7.1
- Streamlined HTTP helpers (`xhrJson` + `rawGet`)
- Fixed train-log pull nesting / Discord tab wiring
- JSONBin starter payload guidance

### 3.7.0
- Discord tab with report checkboxes and 18:00 TCT auto-post
- Discord settings synced via JSONBin
- Tabs: Training / Employees / Peers / Discord

### Earlier
- Smart Training, peer scrape, API v2, director detection, custom key helper
