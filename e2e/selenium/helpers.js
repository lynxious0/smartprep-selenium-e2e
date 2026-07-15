import { By, until } from 'selenium-webdriver'
import { BASE_URL } from './driver.js'

/** Navigates to the app and wipes localStorage so each test starts clean. */
export async function resetApp(driver) {
  await driver.get(BASE_URL)
  await driver.executeScript('window.localStorage.clear()')
}

/** A collision-proof email for tests that need to register a fresh account. */
export function uniqueEmail(prefix = 'qa') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`
}

/**
 * Drives the real registration form end to end and waits for the app to
 * redirect to /business, confirming the account was actually created
 * (not just that the form accepted input).
 */
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

/** Signs out via the sidebar logout button and waits for the login screen. */
export async function logout(driver) {
  await driver.wait(until.elementLocated(By.css('button[title="Sign out"]')), 10000)
  await driver.findElement(By.css('button[title="Sign out"]')).click()
  await driver.wait(until.urlContains('/login'), 10000)
}
