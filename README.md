# Torn Company Manager

Tampermonkey userscript for [Torn.com](https://www.torn.com) company management.

**Author:** Morrakiu  
**Version:** 3.1.1

## Features

- Company dashboard (income, bank, employees, stock)
- Best-position advisor based on working stats
- Director status detection
- Native **API v2** endpoints (with v1 fallback)
- One-click **Create Custom Key** (minimal permissions)
- Works for all company types

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Open the raw script: [Torn_Company_Manager.user.js](https://raw.githubusercontent.com/Morrakiu/torn-company-manager/main/Torn_Company_Manager.user.js)
3. Tampermonkey should prompt to install
4. Visit **Companies** on Torn (`companies.php`)
5. Paste your API key, or click **Create Custom Key**

## API key permissions

| Section | Selections |
|---------|------------|
| user | `profile`, `job`, `basic` |
| company | `profile`, `employees`, `stock`, `detailed` |

Full employee stats and stock require a **Director** key.

## License

Use freely for personal Torn gameplay.
