# Torn Company Manager

Tampermonkey userscript for [Torn.com](https://www.torn.com) company management.

**Author:** Morrakiu  
**Version:** 3.1.1  
**Repo:** https://github.com/Morrakiu/torn-company-manager

## Features

- Company dashboard (income, bank, employees, stock)
- Best-position advisor based on working stats
- Director status detection
- Native **API v2** endpoints (with v1 fallback)
- One-click **Create Custom Key** (minimal permissions)
- Works for all company types

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Open the raw script: https://raw.githubusercontent.com/Morrakiu/torn-company-manager/main/Torn_Company_Manager.user.js
3. Confirm install in Tampermonkey
4. Visit **Companies** on Torn (`companies.php`)
5. Paste your API key, or click **Create Custom Key**

## API key

| Section | Selections |
|---------|------------|
| user | `profile`, `job`, `basic` |
| company | `profile`, `employees`, `stock`, `detailed` |

Full employee/stock data requires a **Director** key.

## License

Use freely for personal Torn gameplay.
