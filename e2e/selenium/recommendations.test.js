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

  test('shows an empty state when there are no menu items to predict', async (t) => {
    t.diagnostic("Remark: Confirms Recommendations shows a 'No menu items to predict' empty state when the menu is empty.")
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/recommendations`)

    const empty = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'No menu items to predict')]")),
      10000
    )
    assert.ok(await empty.isDisplayed())
  })

  test('shows a recommendation card with a baseline estimate per menu item once menu items exist', async (t) => {
    t.diagnostic('Remark: Confirms each seeded menu item gets its own recommendation card, falling back to a Baseline Estimate badge with no sales history yet.')
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

    const confidence = await driver.findElements(By.xpath("//*[contains(text(),'Baseline Estimate')]"))
    assert.ok(confidence.length > 0, 'expected at least one baseline-confidence badge')
  })

  test('explains the Attention-LSTM + XGBoost prediction engine', async (t) => {
    t.diagnostic("Remark: Confirms the engine name and 'How Recommendations Work' explainer are shown to set user expectations about the prediction model.")
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

  test('lets the weather be manually overridden for the selected day', async (t) => {
    t.diagnostic('Remark: Confirms the weather Override control lets a user pick Rainy and toggle back to Auto.')
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

    const autoButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(.,'Auto')]")),
      10000
    )
    assert.ok(await autoButton.isDisplayed())
  })
})
