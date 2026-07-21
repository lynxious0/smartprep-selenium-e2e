import { By, until } from 'selenium-webdriver'
import { BASE_URL } from './driver.js'

export async function resetApp(driver) {
  await driver.get(BASE_URL)
  await driver.executeScript('window.localStorage.clear()')
}

export function uniqueEmail(prefix = 'qa') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`
}

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

export async function logout(driver) {
  await driver.wait(until.elementLocated(By.css('button[title="Sign out"]')), 10000)
  await driver.findElement(By.css('button[title="Sign out"]')).click()
  await driver.wait(until.urlContains('/login'), 10000)
}

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

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

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
