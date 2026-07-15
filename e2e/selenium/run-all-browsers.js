import { spawnSync } from 'node:child_process'

const browsersArg = process.argv[2] || process.env.BROWSERS || 'chrome,firefox,edge'
const browsers = browsersArg.split(',').map(b => b.trim()).filter(Boolean)

const results = []

for (const browser of browsers) {
  console.log(`\n=== Running Selenium suite in ${browser} ===\n`)
  const res = spawnSync('node', ['--test', 'e2e/selenium/login.test.js', 'e2e/selenium/menu.test.js'], {
    stdio: 'inherit',
    env: { ...process.env, BROWSER: browser },
  })
  results.push({ browser, code: res.status })
}

console.log('\n=== Summary ===')
let anyFailed = false
for (const { browser, code } of results) {
  const ok = code === 0
  if (!ok) anyFailed = true
  console.log(`${ok ? '✓' : '✗'} ${browser}${ok ? '' : ` (exit code ${code})`}`)
}

process.exit(anyFailed ? 1 : 0)
