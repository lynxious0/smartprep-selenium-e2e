import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { Select } from 'selenium-webdriver/lib/select.js'
import { buildDriver, BASE_URL } from './driver.js'
import {
  resetApp, registerAndLogin, seedAppData, sampleMenuItem, sampleSalesRecord, todayStr,
} from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Analytics [${browserName}]`, () => {
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

  test('shows empty chart states and zeroed totals when there is no sales data yet', async () => {
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/analytics`)

    const emptyStates = await driver.wait(
      until.elementsLocated(By.xpath("//*[contains(text(),'No data for this period.')]")),
      10000
    )
    assert.ok(emptyStates.length > 0)

    const totalSold = await driver.findElement(By.xpath("//p[contains(text(),'Total Sold')]/following-sibling::p"))
    assert.equal(await totalSold.getText(), '0')
  })

  test('shows correct summary totals once sales records exist', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, {
      menuItems: [sampleMenuItem({ name: 'Sinigang', id: 'sinigang' })],
      salesRecords: [
        sampleSalesRecord({ menuItemId: 'sinigang', menuItemName: 'Sinigang', preparedQty: 20, soldQty: 15, unsoldQty: 5 }),
      ],
    })
    await driver.get(`${BASE_URL}/analytics`)

    const totalSold = await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(),'Total Sold')]/following-sibling::p")),
      10000
    )
    assert.equal(await totalSold.getText(), '15')

    const totalUnsold = await driver.findElement(By.xpath("//p[contains(text(),'Total Unsold')]/following-sibling::p"))
    assert.equal(await totalUnsold.getText(), '5')

    const wasteRate = await driver.findElement(By.xpath("//p[contains(text(),'Waste Rate')]/following-sibling::p"))
    assert.equal(await wasteRate.getText(), '25.0%') // 5 / 20 preparedQty, toFixed(1)
  })

  test("shows Today's Summary when a sales record exists for today's date", async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, {
      menuItems: [sampleMenuItem({ name: 'Sinigang', id: 'sinigang' })],
      salesRecords: [sampleSalesRecord({ menuItemId: 'sinigang', menuItemName: 'Sinigang', date: todayStr() })],
    })
    await driver.get(`${BASE_URL}/analytics`)

    const todaySummary = await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(.,\"Today's Summary\")]")),
      10000
    )
    assert.ok(await todaySummary.isDisplayed())

    const itemRow = await driver.findElement(By.xpath("//td[normalize-space(text())='Sinigang']"))
    assert.ok(await itemRow.isDisplayed())
  })

  test('recalculates totals when filtering to a single menu item via the dropdown', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, {
      menuItems: [
        sampleMenuItem({ name: 'Sinigang', id: 'sinigang' }),
        sampleMenuItem({ name: 'Lumpia', id: 'lumpia' }),
      ],
      salesRecords: [
        sampleSalesRecord({ menuItemId: 'sinigang', menuItemName: 'Sinigang', soldQty: 15, preparedQty: 20, unsoldQty: 5 }),
        sampleSalesRecord({ menuItemId: 'lumpia', menuItemName: 'Lumpia', soldQty: 10, preparedQty: 12, unsoldQty: 2 }),
      ],
    })
    await driver.get(`${BASE_URL}/analytics`)

    const totalSoldAll = await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(),'Total Sold')]/following-sibling::p")),
      10000
    )
    assert.equal(await totalSoldAll.getText(), '25')

    const itemDropdown = await driver.findElement(By.xpath("(//select)[1]"))
    await new Select(itemDropdown).selectByVisibleText('Lumpia')

    const totalSoldFiltered = await driver.wait(async () => {
      const el = await driver.findElement(By.xpath("//p[contains(text(),'Total Sold')]/following-sibling::p"))
      const text = await el.getText()
      return text === '10' ? el : null
    }, 10000)
    assert.equal(await totalSoldFiltered.getText(), '10')
  })
})
