import { Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import firefox from 'selenium-webdriver/firefox.js'
import edge from 'selenium-webdriver/edge.js'

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

const HEADLESS = process.env.HEADLESS !== 'false'

export async function buildDriver(name = process.env.BROWSER || 'chrome') {
  const browser = name.toLowerCase()

  if (browser === 'chrome') {
    const options = new chrome.Options()
    if (HEADLESS) options.addArguments('--headless=new')
    options.addArguments('--window-size=1440,1000')
    return new Builder().forBrowser('chrome').setChromeOptions(options).build()
  }

  if (browser === 'firefox') {
    const options = new firefox.Options()
    if (HEADLESS) options.addArguments('-headless')
    options.windowSize({ width: 1440, height: 1000 })
    return new Builder().forBrowser('firefox').setFirefoxOptions(options).build()
  }

  if (browser === 'edge' || browser === 'msedge') {
    const options = new edge.Options()
    if (HEADLESS) options.addArguments('--headless=new')
    options.addArguments('--window-size=1440,1000')
    return new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(options).build()
  }

  throw new Error(`Unknown BROWSER "${name}". Use one of: chrome, firefox, edge.`)
}
