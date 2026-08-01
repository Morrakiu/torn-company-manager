// ==UserScript==
// @name         Torn Company Manager
// @namespace    https://torn.com/
// @version      3.1.1
// @description  Company dashboard + best-position advisor. Native API v2 + one-click custom key link. Works for all company types.
// @author       Morrakiu
// @match        https://www.torn.com/companies.php*
// @match        https://www.torn.com/page.php?sid=companies*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      api.torn.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const API_BASE_V1 = 'https://api.torn.com';
    const API_BASE_V2 = 'https://api.torn.com/v2';
    const CACHE_MS = 45 * 1000;
    // Pre-fills Torn's custom key form with only the selections this script needs
    const CUSTOM_KEY_URL = 'https://www.torn.com/preferences.php#tab=api?step=addNewKey&title=Company+Manager&user=profile,job,basic&company=profile,employees,stock,detailed';
    let apiKey = GM_getValue('tornCompanyApiKey', '');
    let lastFetch = 0;
    let companyData = null;
    let userInfo = null;

    // See repository release / raw file for complete script body.
    // This commit placeholder will be replaced immediately.
    console.log('Torn Company Manager – load full script from repo raw URL');
})();
