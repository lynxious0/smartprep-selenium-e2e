import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { buildDriver, BASE_URL } from './driver.js'
import { resetApp, registerAndLogin } from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Settings & About [${browserName}]`, () => {
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

  test('toggles dark mode from the Settings page', async (t) => {
    t.diagnostic("Remark: Confirms the dark mode toggle updates the label and applies the 'dark' class to the document.")
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/settings`)

    const lightLabel = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Currently light')]")),
      10000
    )
    assert.ok(await lightLabel.isDisplayed())

    await driver.findElement(By.css('button[aria-label="Toggle dark mode"]')).click()

    const darkLabel = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Currently dark')]")),
      10000
    )
    assert.ok(await darkLabel.isDisplayed())

    const hasDarkClass = await driver.executeScript(
      "return document.documentElement.classList.contains('dark')"
    )
    assert.equal(hasDarkClass, true)
  })

  test('changes font size from the Settings page', async (t) => {
    t.diagnostic('Remark: Confirms selecting the Large font size updates the label and sets the root font-size to 17px.')
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/settings`)

    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Currently medium')]")), 10000)
    await driver.findElement(By.xpath("//button[normalize-space(text())='L']")).click()

    const label = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Currently large')]")),
      10000
    )
    assert.ok(await label.isDisplayed())

    const fontSize = await driver.executeScript('return document.documentElement.style.fontSize')
    assert.equal(fontSize, '17px')
  })

  test('settings persist across a page reload', async (t) => {
    t.diagnostic('Remark: Confirms dark mode stays enabled after a full page reload, proving settings are actually persisted.')
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/settings`)

    await driver.wait(until.elementLocated(By.css('button[aria-label="Toggle dark mode"]')), 10000)
    await driver.findElement(By.css('button[aria-label="Toggle dark mode"]')).click()
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Currently dark')]")), 10000)

    await driver.navigate().refresh()

    const stillDark = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Currently dark')]")),
      10000
    )
    assert.ok(await stillDark.isDisplayed())
  })

  test('shows the About page hero, tech stack, and team sections', async (t) => {
    t.diagnostic('Remark: Confirms the About page renders its hero heading, tech-stack callout, and Development Team section.')
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/about`)

    const heading = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(.,'About SmartPrep')]")),
      10000
    )
    assert.ok(await heading.isDisplayed())

    const techStack = await driver.findElement(By.xpath("//*[contains(text(),'Attention-LSTM + XGBoost')]"))
    assert.ok(await techStack.isDisplayed())

    const team = await driver.findElement(By.xpath("//h2[contains(.,'Development Team')]"))
    assert.ok(await team.isDisplayed())
  })
})
