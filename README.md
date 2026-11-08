# TCM

Tampermonkey and Torn PDA userscript for company directors on [Torn](https://www.torn.com).

**Version:** 11.1.0-beta  
**Author:** Morrakiu  
**Install / updates:** [Torn_Company_Manager.user.js](./Torn_Company_Manager.user.js) on branch `Morrakiu-TCM-Beta`

https://raw.githubusercontent.com/Morrakiu/torn-company-manager/Morrakiu-TCM-Beta/Torn_Company_Manager.user.js

The script name is `TCM`. There is no active Alpha release.

## What it does

Decision support only. It does not train, restock, or message for you.

- Company, finance, stock, and employee effectiveness from the Torn API
- Training log import from `/v2/user/log` type 6263, promotion and rotation planning
- Optional Discord reports and a one-way Google Sheets export
- Private GitHub Gist sync between your own browsers and Torn PDA

## API key

Use a Torn API key that can read your company. Training history also needs user log access (a full-access key, or a custom key that includes user → log). A key that is too limited still shows company data and a warning for the training log.

The key stays in this device's script storage. It is not written to the gist.

## Gist sync

Sync is a private gist with one journal file per device, `tcm-j-<deviceId>.json`, plus a one-time baseline file `tcm-b-<deviceId>.json`.

GitHub's update-gist documentation says files you do not mention in a PATCH stay unchanged. The documented success codes are 200, 404, and 422. `If-Match` / HTTP 412 is not documented for that endpoint, and conditional headers on other GitHub PATCH routes have applied the write even when they returned 412. TCM does not send `If-Match`.

Each device appends its own operations and PATCHes only its own files. A Lamport counter plus the list of other journals already seen decides order. The wall clock does not. Merge is a pure function of those files:

- Different fields (two settings, a contract note and a payment, a queue and a pointer) both stay.
- A later edit that has already seen the other device's journal wins.
- Two edits to the same field that have not seen each other both remain listed under Settings. One value is kept so every device converges: higher Lamport counter, then device id. The other value stays in that list until you dismiss it.
- Deletes of an excluded employee, a payment, a join or reset date, or a settings field are operations. They are not capped at 400 and are not unioned back in.
- The calendar day in `lastLogPostDateTCT` keeps the later date.
- Restoring a local snapshot writes new operations after every journal this device has already read, so the restore beats that snapshot of history.

Before the first schema-2 sync, TCM stores `gist_schema_backup_v2` on this device only.

### What this does not guarantee

A gist PATCH is not an atomic commit across devices. TCM reads the gist after its own write and sends the local journal again until a later read contains those bytes. If a racing update drops another device's journal file, TCM puts that file back only when it still has the exact bytes from the read taken before the write. The owner rewrites its journal from local storage on its next sync.

That converges while each device eventually completes a write that is still present on a following read. It does not eliminate a lost update if a device dies after a write that no peer cached and that the server did not keep. Torn PDA is not disabled when response headers are missing; headers are not part of the merge.

### Mixed versions

10.13 and earlier write a single `tcm-data.json` and will not read journals. 11.0.0 imports that file once as a baseline, then ignores later overwrites of it. An old install can still replace `tcm-data.json` without touching journals, so those edits never reach upgraded devices.

Upgrade every device to 11.0.0 before changing data on more than one of them. Open each device once online after the update so it can write its journal. After that, edit as usual.

### JSONBin

JSONBin is not a sync path. If this device still has a bin id and master key from an older install, the first online launch copies records that are not already local, then deletes those keys. A failed copy keeps the keys and retries next launch. Keys are not shown in the page.

### Token

Create a GitHub token with only the gist scope (classic) or fine-grained Gists read/write. Put the same gist id on each device. The token is stored only on that device.

## Contract position training

On a training contract you can set a preferred stat: MAN, INT, or END. Leave it blank and that employee is never moved.

On the company page, choose **Contracts**, then press **Start contract training**. Changing the mode does not train anyone. For each contract that still has trains allotted today, and only while the company still has trains:

1. If a stat is set, the position with the highest training gain for that stat is chosen. Requirements are not used. Equal gains stay on the employee's current position when that position is one of the ties; otherwise the name order decides.
2. The current position dropdown value is saved before anything moves.
3. The script moves, waits until Torn accepts the update, trains one allotment at a time, and counts a train only after Torn shows a confirmation that is not an error.
4. It restores the saved position and waits for that update before the next contract.

If no position has a numeric gain for the stat, the run stops and shows that. It does not guess. A failed move, train, or restore does not count and does not open the next contract while a position is still unrestored. Reload keeps that state until you press Resume. Cancel restores the current employee and stops.

The run is stored only on this device (`contract_stat_run`). The gist cannot lock a live training session. Do not press Start on two devices at once. The preferred stat itself syncs with the contract.

## Tests

From a checkout, with Node, `jsdom`, and `terser`:

```bash
node --check Torn_Company_Manager.user.js
node tools/tcm-log-page-test.js
node tools/tcm-boot-check.js
node tools/tcm-sync-harness.js
node tools/tcm-contract-stat-test.js
node tools/build-min-userscript.js
```

The sync harness is an in-memory two-device gist. It does not call GitHub and does not use a real account.

## Manual checks after install

1. Update from the Beta raw URL in Tampermonkey and in Torn PDA. The panel should open on `companies.php`.
2. Refresh with a key that can read user logs, then with a key that cannot, and confirm the training-log warning.
3. On two devices, change different settings and confirm both stick. Change the same setting on both while offline, sync, and confirm Settings lists the conflict.
4. Remove someone from rotation exclude, delete a contract payment, and confirm the other device does not put them back.
5. During a company switch, Sync Now should say it is waiting, not upload an empty training log.
6. Turn the device clock far ahead, edit on the other device after it has synced, and confirm the later edit still wins.
7. Set JT100's contract to MAN. On the company page select Contracts, press Start, and confirm the move, the allotted trains, and the restore happen before the next employee. Pressing Contracts by itself must not move anyone. A contract with no stat must stay in place.

## License

Personal use. Follow Torn's API and scripting rules.
