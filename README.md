# Torn Company Manager

Tampermonkey userscript for [Torn.com](https://www.torn.com) company management.

## Features

- Company dashboard (income, bank, employees, stock)
- Best-position advisor based on working stats
- Director status detection
- Native **API v2** endpoints (with v1 fallback)
- One-click **Create Custom Key** link (minimal permissions)
- Works for all company types with built-in position data for common types

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Open [`Torn_Company_Manager.user.js`](./Torn_Company_Manager.user.js) raw and install
3. Visit **Companies** on Torn (`companies.php`)
4. Paste your API key, or use **Create Custom Key**

## API key

Needs **Limited Access** or a custom key with:

| Section | Selections |
|---------|------------|
| user | `profile`, `job`, `basic` |
| company | `profile`, `employees`, `stock`, `detailed` |

Full employee stats and stock data require a **Director** key.

## Author

Morrakiu
