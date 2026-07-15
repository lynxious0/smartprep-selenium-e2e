import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { buildDriver, BASE_URL } from './driver.js'
import { resetApp, registerAndLogin, uniqueEmail, logout } from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Auth flows [${browserName}]`, () => {
  let driver

  before(async () => {
    driver = await buildDriver(browserName)
  })

  after(async () => {
    await driver.quit()
  })

  beforeEach(async () => {
    await resetApp(driver)
  })

  test('rejects a login attempt with credentials that do not exist', async (t) => {
    t.diagnostic("Remark: Confirms an unknown email/password pair shows the 'Invalid email or password.' error and keeps the user on /login instead of authenticating them.")
    await driver.get(`${BASE_URL}/login`)
    await driver.wait(until.elementLocated(By.css('input[type="email"]')), 10000)

    await driver.findElement(By.css('input[type="email"]')).sendKeys('nobody@example.com')
    await driver.findElement(By.css('input[type="password"]')).sendKeys('whatever1')
    await driver.findElement(By.css('button[type="submit"]')).click()

    const errorBox = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Invalid email or password.')]")),
      10000
    )
    assert.ok(await errorBox.isDisplayed(), 'expected the invalid-credentials error to be visible')
    assert.ok((await driver.getCurrentUrl()).includes('/login'), 'should stay on the login page')
  })

  test('registers a new account and lands on the business setup page', async (t) => {
    t.diagnostic('Remark: Confirms a brand-new account can complete registration and is redirected straight into the /business setup flow.')
    await registerAndLogin(driver)
    assert.ok((await driver.getCurrentUrl()).includes('/business'))
  })

  test('rejects registering an email that is already taken', async (t) => {
    t.diagnostic("Remark: Confirms the registration form blocks a duplicate email with 'Email already registered.' so accounts stay unique.")
    const { email } = await registerAndLogin(driver)
    await logout(driver)

    await driver.get(`${BASE_URL}/register`)
    await driver.wait(until.elementLocated(By.css('input[placeholder="Juan dela Cruz"]')), 10000)
    await driver.findElement(By.css('input[placeholder="Juan dela Cruz"]')).sendKeys('Someone Else')
    await driver.findElement(By.css('input[placeholder="you@example.com"]')).sendKeys(email)
    await driver.findElement(By.css('input[placeholder="Min. 6 characters"]')).sendKeys('secret2')
    await driver.findElement(By.css('input[placeholder="Re-enter password"]')).sendKeys('secret2')
    await driver.findElement(By.css('button[type="submit"]')).click()

    const errorBox = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Email already registered.')]")),
      10000
    )
    assert.ok(await errorBox.isDisplayed())
  })

  test('logs back in with a freshly created account and reaches the dashboard', async (t) => {
    t.diagnostic('Remark: Confirms logout followed by a fresh login round-trips correctly and lands the user on /dashboard.')
    const email = uniqueEmail()
    await registerAndLogin(driver, { email })
    await logout(driver)

    await driver.get(`${BASE_URL}/login`)
    await driver.wait(until.elementLocated(By.css('input[type="email"]')), 10000)
    await driver.findElement(By.css('input[type="email"]')).sendKeys(email)
    await driver.findElement(By.css('input[type="password"]')).sendKeys('secret1')
    await driver.findElement(By.css('button[type="submit"]')).click()

    await driver.wait(until.urlContains('/dashboard'), 10000)
    const dashboardHeading = await driver.findElements(By.xpath("//*[contains(text(),'Dashboard')]"))
    assert.ok(dashboardHeading.length > 0, 'expected to land on the dashboard after login')
  })
})
