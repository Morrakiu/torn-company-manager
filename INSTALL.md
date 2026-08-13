# Install — Morrakiu's Company Manager

**Version:** 3.25.0 · **Author:** Morrakiu

1. Install [Tampermonkey](https://www.tampermonkey.net/) **or** enable custom scripts in **Torn PDA**.
2. Open the **raw** script on GitHub: [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) and choose **Install**.  
   The **complete v3.25.0** userscript is on the **`Morrakiu-TCM-Beta`** branch (not a stub).

**Install / auto-update URL:**
https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js
3. Go to https://www.torn.com/companies.php
4. Enter your API key (or **Create Custom Key**).  
   On Torn PDA, the app may inject the key automatically.
5. Optional — **Data Sync** in the panel:
   - **JSONBin** — web ↔ PDA (trains, metrics, Discord, peers, role share, **contracts**). Same Bin ID + Master Key on every device. Needs HTTP **PUT** (GMforPDA **2.3+** on PDA).
   - **Google Sheets** — optional one-way export (Apps Script web app URL).
   - **TornStats** — open finance on tornstats.com with the script installed, then **Import TornStats stage**.

### Torn PDA tips
- Injection time: **End**
- Prefer GMforPDA 2.3+ for JSONBin PUT support
