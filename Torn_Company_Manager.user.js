// ==UserScript==
// @name         Torn Company Manager
// @namespace    https://torn.com/
// @version      3.6.0
// @description  Director dashboard: smart training (Discord/JSONBin sync), best positions, peers, API v2.
// @author       Morrakiu
// @match        https://www.torn.com/companies.php*
// @match        https://www.torn.com/page.php?sid=companies*
// @match        https://www.torn.com/joblist.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      api.torn.com
// @connect      discord.com
// @connect      discordapp.com
// @connect      api.jsonbin.io
// @run-at       document-idle
// ==/UserScript==

/*
  Full source is available in the repository releases / project workspace as Torn_Company_Manager.user.js (v3.6.0, ~92KB).
  GitHub MCP push payload limits prevented embedding the complete body in this automated commit.

  Please install from the local project artifact, or download the complete file from:
  https://github.com/Morrakiu/torn-company-manager (after a full upload)

  README.md and INSTALL.md on this branch are up to date for v3.6.0 features:
  - Tabs (Training / Employees / Peers)
  - Smart Training + train log
  - JSONBin web↔PDA sync + optional Discord webhook
  - Peer role-mix via public page scrape
  - API v2, Create Custom Key, director checks
*/

(function () {
  'use strict';
  if (typeof GM_addStyle === 'function') {
    GM_addStyle('#tcm-missing{position:fixed;bottom:16px;right:16px;background:#2a1515;color:#fcc;padding:12px 14px;border-radius:8px;z-index:99999;max-width:360px;font:13px Arial;border:1px solid #a53a3a}');
  }
  var el = document.createElement('div');
  el.id = 'tcm-missing';
  el.innerHTML = '<strong>Company Manager</strong><br>This GitHub copy is a stub due to upload size limits.<br>Install the full v3.6.0 .user.js from the project artifact or ask the maintainer to re-upload the complete file.';
  document.documentElement.appendChild(el);
})();
