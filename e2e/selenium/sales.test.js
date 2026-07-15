import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { buildDriver, BASE_URL } from './driver.js'
import {
  resetApp, registerAndLogin, seedAppData, sampleMenuItem, sampleSalesRecord, todayStr,
} from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Sales Recording [${browserName}]`, () => {
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

  test('shows the empty state when there are no menu items yet', async () => {
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/sales`)

    const empty = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'No menu items yet')]")),
      10000
    )
    assert.ok(await empty.isDisplayed())
  })

  test('saves a sales entry for a menu item and shows the confirmation', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, { menuItems: [sampleMenuItem({ name: 'Lumpia' })] })
    await driver.get(`${BASE_URL}/sales`)

    const row = await driver.wait(
      until.elementLocated(By.xpath("//p[normalize-space(text())='Lumpia']/ancestor::tr")),
      10000
    )
    const qtyInputs = await row.findElements(By.css('input[type="number"]'))
    // Column order is Prepared, Sold, Unsold.
    await qtyInputs[0].sendKeys('20')
    await qtyInputs[1].sendKeys('18')

    await driver.findElement(By.xpath("//button[@type='submit' and contains(.,'Save Entry')]")).click()

    const flash = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(),'Saved 1 record(s) for ${todayStr()}.')]`)),
      10000
    )
    assert.ok(await flash.isDisplayed())
  })

  test('shows an error if the entry is saved without any quantities filled in', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, { menuItems: [sampleMenuItem({ name: 'Lumpia' })] })
    await driver.get(`${BASE_URL}/sales`)

    await driver.wait(until.elementLocated(By.xpath("//p[normalize-space(text())='Lumpia']")), 10000)
    await driver.findElement(By.xpath("//button[@type='submit' and contains(.,'Save Entry')]")).click()

    const error = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Enter sales for at least one item.')]")),
      10000
    )
    assert.ok(await error.isDisplayed())
  })

  test('shows a previously recorded sale under the History tab', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, {
      menuItems: [sampleMenuItem({ name: 'Lumpia' })],
      salesRecords: [sampleSalesRecord({ menuItemName: 'Lumpia', preparedQty: 20, soldQty: 18, unsoldQty: 2 })],
    })
    await driver.get(`${BASE_URL}/sales`)

    await driver.findElement(By.xpath("//button[normalize-space(text())='History']")).click()

    const record = await driver.wait(
      until.elementLocated(By.xpath("//p[normalize-space(text())='Lumpia']")),
      10000
    )
    assert.ok(await record.isDisplayed())

    const detailLine = await driver.findElement(
      By.xpath("//p[normalize-space(text())='Lumpia']/following-sibling::p")
    )
    const detailText = await detailLine.getText()
    assert.ok(detailText.includes('Prepared: 20'))
    assert.ok(detailText.includes('18'))
  })
})
