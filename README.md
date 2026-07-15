# SmartPrep — Selenium E2E suite (Chrome, Firefox, Edge)

## What's included

- `e2e/selenium/driver.js` — builds a WebDriver for `chrome`, `firefox`, or
  `edge` based on a `BROWSER` env var. Uses selenium-webdriver's built-in
  Selenium Manager, so it auto-downloads the matching driver binary — you
  just need the browsers themselves installed.
- `e2e/selenium/helpers.js` — shared flows: reset app state (clears
  `localStorage`), register + auto-login a fresh test account, sign out,
  and `seedAppData` — writes a business profile / menu items / sales
  records straight into the same `localStorage` keys `AppContext` reads
  (`smartprep_<uid>_business` / `_menu` / `_sales`), so pages that need
  existing data don't have to be driven there field-by-field through the
  UI just to set up a test.
- `e2e/selenium/login.test.js` (4 tests) — invalid login rejected,
  successful registration lands on `/business`, duplicate email rejected,
  logout + re-login reaches `/dashboard`.
- `e2e/selenium/menu.test.js` (4 tests) — empty state, adding an item
  through the real form and seeing it appear, the required-name field
  blocking submission, deleting an item after confirming.
- `e2e/selenium/dashboard.test.js` (4 tests) — greets the user by name,
  shows the setup prompt before a profile/menu exist, shows live stats
  and today's recommendations once they do, prompts to record sales
  when there's no sales history yet.
- `e2e/selenium/business.test.js` (4 tests) — creation form on a new
  account, saving a profile through the real form, the required-name
  field blocking submission, editing a seeded profile via Edit Profile.
- `e2e/selenium/sales.test.js` (4 tests) — empty state with no menu
  items, saving a sales entry and seeing the confirmation, the
  at-least-one-item validation error, a seeded record showing up under
  the History tab.
- `e2e/selenium/analytics.test.js` (4 tests) — empty chart states with
  zeroed totals, correct summary totals once records exist, Today's
  Summary appearing for a same-day record, totals recalculating when
  filtering to one menu item via the dropdown.
- `e2e/selenium/recommendations.test.js` (4 tests) — empty state with no
  menu items, a recommendation card with a baseline-confidence badge per
  item, the Attention-LSTM + XGBoost engine explainer, manually
  overriding the day's weather.
- `e2e/selenium/settings-about.test.js` (4 tests) — toggling dark mode,
  changing font size, settings persisting across a reload, the About
  page's hero/tech-stack/team sections.
- `e2e/selenium/run-all-browsers.js` — runs all eight spec files once per
  browser and prints a combined pass/fail summary.
- `e2e/selenium/reporters/file-logger.reporter.js` — a custom
  `node:test` reporter that writes a plain-text log of every test's
  status and result, plus a short remark, to `e2e/selenium/logs/`.

Between them, the suite now touches every route in `App.jsx` (`/login`,
`/register`, `/dashboard`, `/business`, `/menu`, `/sales`, `/analytics`,
`/recommendations`, `/settings`, `/about`). The FastAPI backend
(`backend/main.py`) and the ML models' prediction *accuracy* are still out
of scope — this suite drives the frontend against `predictLocalFallback`
and asserts on UI behavior, not on model correctness.

## One-time setup

1. **Have Chrome, Firefox, and Edge actually installed** on the machine
   you're running these on — Selenium Manager fetches driver binaries for
   you, but not the browsers themselves.

2. **Move these files into your project:**
   - `e2e/selenium/` (the whole folder) → your project's `smartprep/`
   - Merge the `scripts` and `devDependencies` shown in
     `package.json.additions.txt` into your real `smartprep/package.json`

3. **Install the new dev dependencies** from inside `smartprep/`:
   ```
   npm install --save-dev selenium-webdriver@^4.46.0 cross-env@^10.1.0
   ```

## Running it

1. **Start the app** in one terminal:
   ```
   npm run dev
   ```
   (defaults to `http://localhost:5173`; override with `BASE_URL` if
   yours runs elsewhere)

2. **In another terminal**, run against one browser:
   ```
   npm run test:e2e:chrome
   npm run test:e2e:firefox
   npm run test:e2e:edge
   ```
   or all three back-to-back with a combined summary:
   ```
   npm run test:e2e:all
   ```

Note: the app calls `/api/...` for live weather and prediction data and
falls back to fixed local defaults when that call fails. The suite doesn't
require the FastAPI backend to be running — assertions are written against
the fallback behavior so they pass either way — but if you do run the
backend alongside `npm run dev`, the same tests still hold.

## Logging

Every run — whether via `npm run test:e2e:chrome`/`:firefox`/`:edge` or
`npm run test:e2e:all` — now also writes a plain-text log through
`e2e/selenium/reporters/file-logger.reporter.js`, in addition to the
normal console output. Nothing about running the tests changes; the log
is just written alongside it.

- **`e2e/selenium/logs/latest-<browser>.log`** — the full detail of the
  most recent run for that browser: a timestamp, `PASS`/`FAIL`/`SKIP`
  and duration for every test, that test's remark (see below), and the
  assertion error message for any failure. Overwritten on every run.
- **`e2e/selenium/logs/history.log`** — the same detail, appended
  across every run and every browser, so older runs aren't lost when
  "latest" gets overwritten.
- **`e2e/selenium/logs/last-combined-summary.log`** — written only by
  `test:e2e:all`: a one-line-per-browser pass/fail summary with a
  pointer to each browser's detailed log.

A `latest-chrome.log` entry looks like:

```
[2026-07-15T11:07:50.300Z] [PASS] registers a new account and lands on the business setup page (842ms)
    Remark: Confirms a brand-new account can complete registration and is redirected straight into the /business setup flow.
[2026-07-15T11:07:50.301Z] [FAIL] rejects registering an email that is already taken (1.20s)
    Remark: Confirms the registration form blocks a duplicate email with 'Email already registered.' so accounts stay unique.
    Error: expected the invalid-credentials error to be visible

------------------------------------------------------------------------------
Summary — 2026-07-15T11:07:50.319Z — browser: chrome
Total: 32   Passed: 31   Failed: 1   Skipped: 0
Duration: 45.30s
Failures:
  - rejects registering an email that is already taken — expected the invalid-credentials error to be visible
------------------------------------------------------------------------------
```

**Remarks**: every `test(...)` in the suite calls
`t.diagnostic('Remark: ...')` as its first line — a short, plain-English
note on what that specific test is actually checking and why it
matters. The reporter picks these up automatically and prints them
under the matching test's result. To add a remark to a new test, just
add the `t` parameter and the diagnostic call:

```js
test('does the thing', async (t) => {
  t.diagnostic('Remark: Explain in one sentence what this verifies.')
  // ...rest of the test
})
```

The `e2e/selenium/logs/` folder is created automatically the first time
any run happens, so no manual setup is needed.
