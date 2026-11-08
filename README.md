# TCM

Tampermonkey and Torn PDA userscript for company directors on [Torn](https://www.torn.com).

**Version:** 11.1.1-beta  
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

On the company page, choose **Contracts**. Changing the mode does not move or train anyone. The step button then names the single next action, for example **Move JT100 to Guard**, **Submit move for JT100**, **Train JT100 (1/2)**, or **Restore JT100 to Cleaner**. Each press does at most that one action. Finishing it only changes the label. It does not click Torn again. Presses while a click is still waiting are ignored and are not queued.

11.1.0 ran every remaining step by itself after one press. Do not use that build for company training. That build also looked the button up before the bar was on the page, so the press could do nothing and show no status. 11.1.1 binds the button on the bar and writes a reason next to it when a step cannot run.

The position with the highest training gain for the preferred stat is chosen. Requirements are not used. Equal gains stay on the current position when it is one of the ties. The dropdown value is saved before a move. If the employee is already there, that press does not move them and does not train them. A contract with no stat is trained in place, still one train per press.

A train counts only after Torn shows a confirmation that is not an error. If no position has a numeric gain, the status says so and nothing is moved. Cancel, a failed step, or a reload never moves or trains by itself. If someone is away from the saved position, the button offers the restore press. Do not run the steps on two devices at once. The preferred stat syncs with the contract. The in-progress step does not. Torn's published scripting rule says a non-API request must be directly and manually initiated by the user. This button is built so one press makes at most one such request. That is not a staff review, and it does not clear the rest of the script. Quick Train's restore and Stat Rotation still press Torn's Update from a timer after an earlier click.

## Tests

From a checkout, with Node, `jsdom`, and `terser`:

```bash
node --check Torn_Company_Manager.user.js
node tools/tcm-log-page-test.js
node tools/tcm-boot-check.js
node tools/tcm-sync-harness.js
node tools/tcm-contract-stat-test.js
node tools/tcm-contract-start-dom-test.js
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
7. Set a contract to MAN. On the company page select Contracts and read the step button. Each press should do only the labeled action: move, submit that move, one train, or restore. Spam and reload must not continue. 11.1.0 should be updated before using this, because that build tried to run the sequence by itself and its Start press could do nothing.

## License

Personal use. Follow Torn's API and scripting rules.
