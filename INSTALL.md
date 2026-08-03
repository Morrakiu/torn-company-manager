# Install — Torn Company Manager

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the raw script: [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) and choose **Install**.
3. Go to https://www.torn.com/companies.php
4. Enter your API key (or **Create Custom Key**).
5. Optional: **Sync** → configure JSONBin for web ↔ PDA train logs.
   - Create a bin with the starter JSON (not blank `{}` — JSONBin rejects empty bodies):
   ```json
   {"version":1,"updated":0,"company_id":null,"company_name":null,"trains":{}}
   ```

Requires a Director key for full employee stats and stock.
