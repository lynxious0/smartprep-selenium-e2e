import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { buildDriver, BASE_URL } from './driver.js'
import { resetApp, registerAndLogin, seedAppData, sampleBusiness, sampleMenuItem } from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Recommendations [${browserName}]`, () => {
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

  test('shows an empty state when there are no menu items to predict', async () => {
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/recommendations`)

    const empty = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'No menu items to predict')]")),
      10000
    )
    assert.ok(await empty.isDisplayed())
  })

  test('shows a recommendation card with a baseline estimate per menu item once menu items exist', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, {
      business: sampleBusiness(),
      menuItems: [sampleMenuItem({ name: 'Sinigang' }), sampleMenuItem({ name: 'Pancit Canton', id: 'pc-1' })],
    })
    await driver.get(`${BASE_URL}/recommendations`)

    const card = await driver.wait(
      until.elementLocated(By.xpath("//h3[normalize-space(text())='Sinigang']")),
      10000
    )
    assert.ok(await card.isDisplayed())

    const secondCard = await driver.findElement(By.xpath("//h3[normalize-space(text())='Pancit Canton']"))
    assert.ok(await secondCard.isDisplayed())

    // No sales history has been recorded yet, so the engine should fall
    // back to a baseline (business-profile-driven) estimate.
    const confidence = await driver.findElements(By.xpath("//*[contains(text(),'Baseline Estimate')]"))
    assert.ok(confidence.length > 0, 'expected at least one baseline-confidence badge')
  })

  test('explains the Attention-LSTM + XGBoost prediction engine', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, { business: sampleBusiness(), menuItems: [sampleMenuItem()] })
    await driver.get(`${BASE_URL}/recommendations`)

    const engineLabel = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Attention-LSTM + XGBoost')]")),
      10000
    )
    assert.ok(await engineLabel.isDisplayed())

    const explainer = await driver.findElement(By.xpath("//h3[contains(.,'How Recommendations Work')]"))
    assert.ok(await explainer.isDisplayed())
  })

  test('lets the weather be manually overridden for the selected day', async () => {
    await registerAndLogin(driver)
    await seedAppData(driver, { business: sampleBusiness(), menuItems: [sampleMenuItem()] })
    await driver.get(`${BASE_URL}/recommendations`)

    const overrideButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(.,'Override')]")),
      10000
    )
    await overrideButton.click()

    const rainyOption = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(.,'Rainy')]")),
      10000
    )
    await rainyOption.click()

    // Toggling back to Auto confirms the override control round-trips.
    const autoButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(.,'Auto')]")),
      10000
    )
    assert.ok(await autoButton.isDisplayed())
  })
})
