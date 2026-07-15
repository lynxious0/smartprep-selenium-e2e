import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { buildDriver, BASE_URL } from './driver.js'
import {
  resetApp, registerAndLogin, seedAppData, sampleBusiness, sampleMenuItem,
} from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Dashboard [${browserName}]`, () => {
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

  test('greets the logged-in user by first name', async (t) => {
    t.diagnostic('Remark: Confirms the dashboard header greets the logged-in user with their first name.')
    await registerAndLogin(driver, { name: 'Jasmine Reyes' })
    await driver.get(`${BASE_URL}/dashboard`)

    const heading = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(.,'Jasmine')]")),
      10000
    )
    assert.ok(await heading.isDisplayed(), 'expected the dashboard greeting to include the user\'s first name')
  })

  test('shows a setup prompt linking to the business profile when nothing is configured yet', async (t) => {
    t.diagnostic('Remark: Confirms a user with no business profile sees a setup banner that links to /business.')
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/dashboard`)

    const banner = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Complete your setup to get recommendations')]")),
      10000
    )
    assert.ok(await banner.isDisplayed())

    const setupLink = await driver.findElement(By.xpath("//a[contains(.,'Set Up Now')]"))
    assert.ok((await setupLink.getAttribute('href')).includes('/business'))
  })

  test('shows live stats and today\'s recommendations once a business profile and menu exist', async (t) => {
    t.diagnostic("Remark: Confirms the dashboard reflects seeded menu-item counts and surfaces a Today's Recommendations section once setup is complete.")
    await registerAndLogin(driver)
    await seedAppData(driver, {
      business: sampleBusiness(),
      menuItems: [sampleMenuItem({ name: 'Sinigang' }), sampleMenuItem({ name: 'Pancit Canton', id: 'pc-1' })],
    })
    await driver.get(`${BASE_URL}/dashboard`)

    await driver.wait(until.elementLocated(By.xpath("//p[contains(text(),'Menu Items')]")), 10000)
    const menuItemsStat = await driver.findElement(
      By.xpath("//p[contains(text(),'Menu Items')]/following-sibling::p")
    )
    assert.equal(await menuItemsStat.getText(), '2')

    const recsHeading = await driver.findElements(By.xpath("//h2[contains(.,\"Today's Recommendations\")]"))
    assert.ok(recsHeading.length > 0, 'expected a recommendations section once setup is complete')

    const recRow = await driver.findElements(By.xpath("//p[normalize-space(text())='Sinigang']"))
    assert.ok(recRow.length > 0, 'expected the seeded menu item to appear in the recommendations list')
  })

  test('prompts to record sales when no sales history exists yet', async (t) => {
    t.diagnostic('Remark: Confirms a configured account with no sales yet is prompted to record sales via a link to /sales.')
    await registerAndLogin(driver)
    await seedAppData(driver, { business: sampleBusiness(), menuItems: [sampleMenuItem()] })
    await driver.get(`${BASE_URL}/dashboard`)

    const emptyState = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'No sales recorded yet')]")),
      10000
    )
    assert.ok(await emptyState.isDisplayed())

    const recordSalesLink = await driver.findElement(By.xpath("//a[contains(.,'Record Sales')]"))
    assert.ok((await recordSalesLink.getAttribute('href')).includes('/sales'))
  })
})
