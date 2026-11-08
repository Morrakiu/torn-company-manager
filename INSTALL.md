# Install TCM

**Version:** 11.0.0-beta · **Author:** Morrakiu

1. Install [Tampermonkey](https://www.tampermonkey.net/) or enable custom scripts in Torn PDA.
2. Open the raw script and choose Install:

https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js

3. Open https://www.torn.com/companies.php
4. Enter a Torn API key. Company data needs company access. Training history needs user log access. Torn PDA may inject a key.
5. Optional, in Settings:
   - **GitHub Gist** — private sync across your devices. Token with gist scope only, same gist id everywhere. The token stays on that device.
   - **Google Sheets** — optional one-way export.
   - **Discord** — optional report webhooks.

### Upgrade from 10.13 or older

Update every device to this URL before editing on more than one device. Open each one online once. The first sync keeps a local backup under `gist_schema_backup_v2` and imports an existing `tcm-data.json` once. Older builds do not read the new per-device journals. See the README for what the sync does and does not guarantee.

If a JSONBin id is still stored, the first online launch copies missing records once and then removes those keys.

### Torn PDA

- Injection time: end of page load.
- The script does not require response headers. Gist sync uses each device's own journal file either way.
