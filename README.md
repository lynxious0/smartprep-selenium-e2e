# SmartPrep — Selenium E2E suite (Chrome, Firefox, Edge)

## What's included

- `e2e/selenium/driver.js` — builds a WebDriver for `chrome`, `firefox`, or
  `edge` based on a `BROWSER` env var. Uses selenium-webdriver's built-in
  Selenium Manager, so it auto-downloads the matching driver binary — you
  just need the browsers themselves installed.
- `e2e/selenium/helpers.js` — shared flows: reset app state (clears
  `localStorage`), register + auto-login a fresh test account, sign out.
- `e2e/selenium/login.test.js` (4 tests) — invalid login rejected,
  successful registration lands on `/business`, duplicate email rejected,
  logout + re-login reaches `/dashboard`.
- `e2e/selenium/menu.test.js` (4 tests) — empty state, adding an item
  through the real form and seeing it appear, the required-name field
  blocking submission, deleting an item after confirming.
- `e2e/selenium/run-all-browsers.js` — runs the suite once per browser and
  prints a combined pass/fail summary.

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