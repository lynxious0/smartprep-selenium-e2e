import { By, until } from 'selenium-webdriver'
import { BASE_URL } from './driver.js'

/** Navigates to the app and wipes localStorage so each test starts clean. */
export async function resetApp(driver) {
  await driver.get(BASE_URL)
  await driver.executeScript('window.localStorage.clear()')
}

/** A collision-proof email for tests that need to register a fresh account. */
export function uniqueEmail(prefix = 'qa') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`
}

/**
 * Drives the real registration form end to end and waits for the app to
 * redirect to /business, confirming the account was actually created
 * (not just that the form accepted input).
 */
export async function registerAndLogin(driver, { name = 'QA Bot', email, password = 'secret1' } = {}) {
  const finalEmail = email || uniqueEmail()

  await driver.get(`${BASE_URL}/register`)
  await driver.wait(until.elementLocated(By.css('input[placeholder="Juan dela Cruz"]')), 10000)

  await driver.findElement(By.css('input[placeholder="Juan dela Cruz"]')).sendKeys(name)
  await driver.findElement(By.css('input[placeholder="you@example.com"]')).sendKeys(finalEmail)
  await driver.findElement(By.css('input[placeholder="Min. 6 characters"]')).sendKeys(password)
  await driver.findElement(By.css('input[placeholder="Re-enter password"]')).sendKeys(password)
  await driver.findElement(By.css('button[type="submit"]')).click()

  await driver.wait(until.urlContains('/business'), 10000)
  return { email: finalEmail, password }
}

/** Signs out via the sidebar logout button and waits for the login screen. */
export async function logout(driver) {
  await driver.wait(until.elementLocated(By.css('button[title="Sign out"]')), 10000)
  await driver.findElement(By.css('button[title="Sign out"]')).click()
  await driver.wait(until.urlContains('/login'), 10000)
}

/**
 * Seeds the currently logged-in user's business profile, menu items, and/or
 * sales records directly into localStorage, using the exact keys and shapes
 * AppContext reads/writes (smartprep_<uid>_business / _menu / _sales).
 *
 * This mirrors what registerAndLogin does for auth: it drives the app
 * through its own real data layer (localStorage), not a mock, so the
 * pages under test read this data exactly as they would in normal use.
 *
 * Must be called only after a user is logged in (registerAndLogin), and
 * should be followed by driver.get(...) to a target route — that fresh
 * navigation is what makes AppContext re-read localStorage and pick up
 * the seeded data.
 */
export async function seedAppData(driver, { business = null, menuItems = [], salesRecords = [] } = {}) {
  await driver.executeScript(
    (biz, menu, sales) => {
      const stored = window.localStorage.getItem('smartprep_user')
      if (!stored) throw new Error('seedAppData: no logged-in user found in localStorage')
      const uid = JSON.parse(stored).id
      if (biz) window.localStorage.setItem(`smartprep_${uid}_business`, JSON.stringify(biz))
      window.localStorage.setItem(`smartprep_${uid}_menu`, JSON.stringify(menu))
      window.localStorage.setItem(`smartprep_${uid}_sales`, JSON.stringify(sales))
    },
    business,
    menuItems,
    salesRecords
  )
}

/** A reasonable default business profile for tests that need one seeded. */
export function sampleBusiness(overrides = {}) {
  return {
    name: 'Aling QA Carinderia',
    type: 'Carinderia',
    location: 'Manila',
    dailyCustomers: 60,
    openTime: '07:00',
    closeTime: '19:00',
    description: 'Seeded by the automated test suite.',
    imageUrl: '',
    ...overrides,
  }
}

/** A menu item with the same shape MenuManagement.jsx saves via addMenuItem. */
export function sampleMenuItem(overrides = {}) {
  return {
    id: `${Date.now()}${Math.floor(Math.random() * 100000)}`,
    name: 'Adobo sa Puti',
    category: 'Viand',
    unit: 'serving',
    basePrice: 85,
    popularity: 0.5,
    imageUrl: '',
    ...overrides,
  }
}

/** Today's date as YYYY-MM-DD, matching how the app keys sales records. */
export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/** A sales record with the same shape addSalesRecords produces. */
export function sampleSalesRecord(overrides = {}) {
  return {
    id: `${Date.now()}${Math.floor(Math.random() * 100000)}`,
    menuItemId: 'seed-item',
    menuItemName: 'Adobo sa Puti',
    date: todayStr(),
    weather: 'sunny',
    preparedQty: 20,
    soldQty: 15,
    unsoldQty: 5,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}
