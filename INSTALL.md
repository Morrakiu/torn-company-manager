# Install — TCM ALPHA

**Version:** 10.9.0-alpha · **Author:** Morrakiu · **Branch:** `Morrakiu-TCM-Alpha`

1. Install [Tampermonkey](https://www.tampermonkey.net/) **or** enable custom scripts in **Torn PDA**.
2. Open the **raw** script on GitHub and choose **Install**:  
   [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js)

**Install / auto-update URL:**  
https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Alpha/Torn_Company_Manager.user.js

3. Go to https://www.torn.com/companies.php (or any Torn page).
4. Enter your API key, or use **Create Custom TCM Key**.  
   Directors get the full dashboard; employees can use a **limited public-data view** with the same key flow.
5. Optional — **Settings**:
   - **JSONBin** — web ↔ PDA + multi-device Discord log claims (same Bin ID + Master Key everywhere). PDA needs HTTP **PUT** (GMforPDA **2.3+**).
   - **Discord** — log + live panel webhooks; auto-post after 18:15 TCT.
   - **Google Sheets** — optional one-way export.

### Torn PDA tips
- Injection time: **End**
- Use the same JSONBin credentials as desktop if you want shared trains / Discord claims.

### Updating
Tampermonkey checks `@updateURL` on this branch. After uploading a new full script to GitHub, use **Tampermonkey → Check for userscript updates** (or reinstall from the raw URL).
