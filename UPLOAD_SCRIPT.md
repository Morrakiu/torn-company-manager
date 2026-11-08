# Publishing TCM

The release branch is `Morrakiu-TCM-Beta`. Install and auto-update use:

https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js

Current release: **11.1.2-beta**. Contract training stays manual: one press, one move, train, or restore. 11.1.2 also removes timer-triggered Update, train, withdraw, deposit, and price-submit clicks from the other company controls. 11.1.0's automatic contract runner should not be used. The gist journal format is still schema 2. The userscript and `Torn_Company_Manager.min.user.js` are both committed. Rebuild the minified file with `node tools/build-min-userscript.js` after changing the source (requires `terser`).

There is no active Alpha branch. Historical backups, including `Morrakiu-TCM-Alpha-backup-1031` and `Morrakiu-TCM-Beta-backup-1105`, are not release channels.
