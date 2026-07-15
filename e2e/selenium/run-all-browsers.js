import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const browsersArg = process.argv[2] || process.env.BROWSERS || 'chrome,firefox,edge'
const browsers = browsersArg.split(',').map(b => b.trim()).filter(Boolean)

const specFiles = [
  'e2e/selenium/login.test.js',
  'e2e/selenium/menu.test.js',
  'e2e/selenium/dashboard.test.js',
  'e2e/selenium/business.test.js',
  'e2e/selenium/sales.test.js',
  'e2e/selenium/analytics.test.js',
  'e2e/selenium/recommendations.test.js',
  'e2e/selenium/settings-about.test.js',
]

const logsDir = 'e2e/selenium/logs'
mkdirSync(logsDir, { recursive: true })

const results = []

for (const browser of browsers) {
  console.log(`\n=== Running Selenium suite in ${browser} ===\n`)
  const logFile = `${logsDir}/latest-${browser}.log`
  const res = spawnSync(
    'node',
    [
      '--test',
      '--test-reporter=spec',
      '--test-reporter-destination=stdout',
      '--test-reporter=./e2e/selenium/reporters/file-logger.reporter.js',
      `--test-reporter-destination=${logFile}`,
      ...specFiles,
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, BROWSER: browser },
    }
  )
  results.push({ browser, code: res.status, logFile })
}

console.log('\n=== Summary ===')
let anyFailed = false
const summaryLines = [`Combined run — ${new Date().toISOString()}\n`]
for (const { browser, code, logFile } of results) {
  const ok = code === 0
  if (!ok) anyFailed = true
  const line = `${ok ? '✓' : '✗'} ${browser}${ok ? '' : ` (exit code ${code})`} — log: ${logFile}`
  console.log(line)
  summaryLines.push(`${line}\n`)
}
console.log(`\nPer-test status, results, and remarks are in ${logsDir}/latest-<browser>.log`)
console.log(`(full history across every run is appended to ${logsDir}/history.log)`)

writeFileSync(`${logsDir}/last-combined-summary.log`, summaryLines.join(''))

process.exit(anyFailed ? 1 : 0)
