import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { By, until } from 'selenium-webdriver'
import { buildDriver, BASE_URL } from './driver.js'
import { resetApp, registerAndLogin } from './helpers.js'

const browserName = process.env.BROWSER || 'chrome'

describe(`Menu management [${browserName}]`, () => {
  let driver

  before(async () => {
    driver = await buildDriver(browserName)
  })

  after(async () => {
    await driver.quit()
  })

  beforeEach(async () => {
    await resetApp(driver)
    await registerAndLogin(driver)
    await driver.get(`${BASE_URL}/menu`)
    await driver.wait(until.elementLocated(By.xpath("//h1[contains(.,'Menu Management')]")), 10000)
  })

  test('shows the empty state before any items exist', async (t) => {
    t.diagnostic("Remark: Confirms a brand-new menu shows the 'No menu items yet' empty state instead of a blank or broken list.")
    const empty = await driver.findElements(By.xpath("//*[contains(text(),'No menu items yet')]"))
    assert.ok(empty.length > 0)
  })

  test('adds a new menu item through the form and shows it in the list', async (t) => {
    t.diagnostic("Remark: Confirms the Add Item form saves a real item, shows an 'Item added.' confirmation, and the item appears in the list.")
    await driver.findElement(
      By.xpath("//button[contains(.,'Add First Item') or contains(.,'Add Item')]")
    ).click()
    await driver.wait(until.elementLocated(By.css('input[placeholder="e.g. Adobo sa Puti"]')), 10000)

    await driver.findElement(By.css('input[placeholder="e.g. Adobo sa Puti"]')).sendKeys('Adobo sa Puti')
    await driver.findElement(By.css('input[placeholder="0.00"]')).sendKeys('85')
    await driver.findElement(By.css('button[type="submit"]')).click()

    const flash = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Item added.')]")), 10000)
    assert.ok(await flash.isDisplayed())

    const listedItem = await driver.wait(
      until.elementLocated(By.xpath("//p[normalize-space(text())='Adobo sa Puti']")),
      10000
    )
    assert.ok(await listedItem.isDisplayed())
  })

  test('requires an item name before the form can be submitted', async (t) => {
    t.diagnostic('Remark: Confirms the required-name validation blocks submitting the menu item form with an empty name.')
    await driver.findElement(
      By.xpath("//button[contains(.,'Add First Item') or contains(.,'Add Item')]")
    ).click()
    const nameInput = await driver.wait(
      until.elementLocated(By.css('input[placeholder="e.g. Adobo sa Puti"]')),
      10000
    )
    // Leave the (required) name field empty and try to submit.
    await driver.findElement(By.css('button[type="submit"]')).click()

    // The browser's native HTML5 validation should block the submit, so the
    // modal — and the empty required field — should still be present.
    const stillOpen = await driver.findElements(By.css('input[placeholder="e.g. Adobo sa Puti"]'))
    assert.equal(stillOpen.length, 1, 'form should not have submitted with an empty required name')
    assert.equal(await nameInput.getAttribute('value'), '')
  })

  test('deletes a menu item after confirming', async (t) => {
    t.diagnostic("Remark: Confirms deleting an item requires confirmation ('Delete?' -> 'Yes') and removes it from the list with a 'Deleted.' confirmation.")
    await driver.findElement(
      By.xpath("//button[contains(.,'Add First Item') or contains(.,'Add Item')]")
    ).click()
    await driver.wait(until.elementLocated(By.css('input[placeholder="e.g. Adobo sa Puti"]')), 10000)
    await driver.findElement(By.css('input[placeholder="e.g. Adobo sa Puti"]')).sendKeys('Lumpia')
    await driver.findElement(By.css('button[type="submit"]')).click()
    await driver.wait(until.elementLocated(By.xpath("//p[normalize-space(text())='Lumpia']")), 10000)

    const row = await driver.findElement(
      By.xpath("//p[normalize-space(text())='Lumpia']/ancestor::div[contains(@class,'bg-gray-50')][1]")
    )
    const rowButtons = await row.findElements(By.css('button'))
    // Edit (pencil) is the first icon button, delete (trash) is the second.
    await rowButtons[1].click()

    await driver.wait(until.elementLocated(By.xpath("//span[text()='Delete?']")), 5000)
    const confirmedRow = await driver.findElement(
      By.xpath("//p[normalize-space(text())='Lumpia']/ancestor::div[contains(@class,'bg-gray-50')][1]")
    )
    await confirmedRow.findElement(By.xpath(".//button[text()='Yes']")).click()

    const flash = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Deleted.')]")), 10000)
    assert.ok(await flash.isDisplayed())

    const remaining = await driver.findElements(By.xpath("//p[normalize-space(text())='Lumpia']"))
    assert.equal(remaining.length, 0, 'deleted item should no longer be in the list')
  })
})
