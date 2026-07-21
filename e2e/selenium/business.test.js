import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { buildDriver, BASE_URL } from './driver.js'
import { resetApp, registerAndLogin, seedAppData, sampleBusiness } from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Business Profile [${browserName}]`, () => {
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

  test('shows the profile creation form for a brand-new account', async (t) => {
    t.diagnostic('Remark: Confirms a brand-new account is presented with the business profile creation form and a Save Profile button.')
    await registerAndLogin(driver) // registration itself lands on /business
    await driver.wait(until.elementLocated(By.css('input[placeholder="e.g. Aling Nena\'s Carinderia"]')), 10000)

    const nameInput = await driver.findElement(By.css('input[placeholder="e.g. Aling Nena\'s Carinderia"]'))
    assert.ok(await nameInput.isDisplayed())
    const saveButton = await driver.findElement(By.xpath("//button[@type='submit' and contains(.,'Save Profile')]"))
    assert.ok(await saveButton.isDisplayed())
  })

  test('saves a new business profile through the form and shows the confirmation', async (t) => {
    t.diagnostic("Remark: Confirms filling out and submitting the profile form persists the data and shows a 'Business profile saved!' confirmation.")
    await registerAndLogin(driver)
    await driver.wait(until.elementLocated(By.css('input[placeholder="e.g. Aling Nena\'s Carinderia"]')), 10000)

    await driver.findElement(By.css('input[placeholder="e.g. Aling Nena\'s Carinderia"]')).sendKeys('QA Test Eatery')
    await driver.findElement(By.css('input[placeholder="50"]')).sendKeys('75')
    await driver.findElement(By.xpath("//button[@type='submit' and contains(.,'Save Profile')]")).click()

    const flash = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(),'Business profile saved!')]")),
      10000
    )
    assert.ok(await flash.isDisplayed())

    const heading = await driver.wait(
      until.elementLocated(By.xpath("//h2[normalize-space(text())='QA Test Eatery']")),
      10000
    )
    assert.ok(await heading.isDisplayed())
  })

  test('requires a business name before the profile can be saved', async (t) => {
    t.diagnostic('Remark: Confirms the required-name validation blocks saving a business profile with an empty name.')
    await registerAndLogin(driver)
    await driver.wait(until.elementLocated(By.css('input[placeholder="e.g. Aling Nena\'s Carinderia"]')), 10000)

    await driver.findElement(By.xpath("//button[@type='submit' and contains(.,'Save Profile')]")).click()

    const nameInput = await driver.findElement(By.css('input[placeholder="e.g. Aling Nena\'s Carinderia"]'))
    assert.equal(await nameInput.getAttribute('value'), '')
    const savedHeading = await driver.findElements(By.xpath("//*[contains(text(),'Business profile saved!')]"))
    assert.equal(savedHeading.length, 0, 'should not have shown the saved confirmation')
  })

  test('shows an existing profile read-only, and lets it be edited via Edit Profile', async (t) => {
    t.diagnostic('Remark: Confirms a seeded profile renders read-only first, and Edit Profile reopens the form pre-filled with the existing values.')
    await registerAndLogin(driver)
    await seedAppData(driver, { business: sampleBusiness({ name: 'Seeded Turo-Turo' }) })
    await driver.get(`${BASE_URL}/business`)

    const readOnlyHeading = await driver.wait(
      until.elementLocated(By.xpath("//h2[normalize-space(text())='Seeded Turo-Turo']")),
      10000
    )
    assert.ok(await readOnlyHeading.isDisplayed())

    await driver.findElement(By.xpath("//button[contains(.,'Edit Profile')]")).click()

    const nameInput = await driver.wait(
      until.elementLocated(By.css('input[placeholder="e.g. Aling Nena\'s Carinderia"]')),
      10000
    )
    assert.equal(await nameInput.getAttribute('value'), 'Seeded Turo-Turo')
  })
})
