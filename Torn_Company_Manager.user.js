// ==UserScript==
// @name         Torn Company Manager
// @namespace    https://torn.com/
// @version      3.7.2
// @description  Director dashboard: smart training, Discord reports (18:00 TCT), peers, JSONBin sync, API v2.
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
  FULL SCRIPT (v3.7.2) is maintained in the project artifact:
  Torn_Company_Manager.user.js (~110 KB).

  GitHub upload of the complete body is limited by the automation channel size.
  Install the complete file from the project deliverable / your local copy,
  not this stub.

  Changelog 3.7.2: streamlined loadJson / getEmpList / showToast; removed
  posStr & gmXhr wrappers; cleaner peer filter & Discord opts reader.
*/

(function () {
  'use strict';
  console.warn('[Torn Company Manager] Stub only — install the full v3.7.2 userscript from the project artifact.');
  if (typeof alert === 'function') {
    // Non-blocking: only log; avoid annoying alerts on every page load
  }
})();
