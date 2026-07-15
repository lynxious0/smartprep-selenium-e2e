import { mkdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// e2e/selenium/logs — created up front so both this reporter's own
// history file AND the --test-reporter-destination file (the "latest
// run" log) always have somewhere to land, even on a first-ever run.
const __dirname = dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = join(__dirname, '..', 'logs')
const HISTORY_FILE = join(LOGS_DIR, 'history.log')
mkdirSync(LOGS_DIR, { recursive: true })

const BROWSER = process.env.BROWSER || 'chrome'

function nowIso() {
  return new Date().toISOString()
}

function fmtDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return 'n/a'
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
}

function errorMessage(details) {
  const err = details?.error
  if (!err) return 'Unknown error'
  // node:test wraps the real assertion error in `.cause` for failures
  // raised inside the test body.
  const real = err.cause ?? err
  return real?.message || String(real)
}

/**
 * Custom node:test reporter.
 *
 * Consumes the test-runner's event stream and produces a plain-text log
 * with one line per test: timestamp, PASS/FAIL/SKIP status, duration,
 * any `t.diagnostic('Remark: ...')` messages logged from inside the
 * test, and (for failures) the assertion error message.
 *
 * node:test emits a leaf test's `test:diagnostic` event(s) AFTER its
 * `test:pass`/`test:fail` event (diagnostics are buffered internally and
 * flushed once the test finishes), so this reporter holds the most
 * recently completed leaf test back and only writes it out once the
 * next event confirms no more diagnostics are coming for it.
 *
 * Wire it up alongside the default console reporter with two
 * --test-reporter / --test-reporter-destination pairs — see
 * package.json.additions.txt. Whatever this generator yields is written
 * to the destination given for THIS reporter (the "latest run" file,
 * overwritten each run). It also keeps its own rolling
 * e2e/selenium/logs/history.log across every run, browser included, so
 * older runs aren't lost when the "latest" file gets overwritten.
 */
export default async function* fileLoggerReporter(source) {
  const runStartedAt = Date.now()
  const historyLines = []
  const counts = { pass: 0, fail: 0, skip: 0, todo: 0 }
  const failureSummaries = []
  let pendingLeaf = null // { name, status, duration, errorMsg, remarks: [] }

  const write = function* (line) {
    historyLines.push(line)
    yield line
  }

  function* flushPending() {
    if (!pendingLeaf) return
    const { name, status, duration, errorMsg, remarks } = pendingLeaf
    yield* write(`[${nowIso()}] [${status}] ${name} (${duration})\n`)
    for (const remark of remarks) yield* write(`    ${remark}\n`)
    if (errorMsg) yield* write(`    Error: ${errorMsg}\n`)
    pendingLeaf = null
  }

  yield* write(`\n${'='.repeat(78)}\n`)
  yield* write(`Selenium E2E run started ${nowIso()} — browser: ${BROWSER}\n`)
  yield* write(`${'='.repeat(78)}\n\n`)

  for await (const event of source) {
    switch (event.type) {
      case 'test:diagnostic': {
        const message = (event.data?.message ?? '').trim()
        const isLeafTest = event.data?.nesting >= 1
        if (isLeafTest && pendingLeaf && /^remark:/i.test(message)) {
          pendingLeaf.remarks.push(message)
        } else {
          // Not attributable to the pending test (e.g. the runner's own
          // end-of-run tallies at nesting 0) — log it plainly.
          yield* write(`[${nowIso()}] [INFO] ${message}\n`)
        }
        break
      }

      case 'test:pass':
      case 'test:fail': {
        yield* flushPending()

        const { name, nesting, details, skip, todo } = event.data
        const isLeafTest = nesting >= 1

        if (!isLeafTest) {
          // nesting 0 is the enclosing describe() block rolling up its
          // children — log it as a suite header/footer, not a test.
          const suiteStatus = event.type === 'test:pass' ? 'PASSED' : 'FAILED'
          yield* write(`[${nowIso()}] [SUITE ${suiteStatus}] ${name} (${fmtDuration(details?.duration_ms)})\n\n`)
          break
        }

        let status = event.type === 'test:pass' ? 'PASS' : 'FAIL'
        if (skip) status = 'SKIP'
        else if (todo) status = 'TODO'

        if (status === 'PASS') counts.pass++
        else if (status === 'FAIL') counts.fail++
        else if (status === 'SKIP') counts.skip++
        else counts.todo++

        const errorMsg = status === 'FAIL' ? errorMessage(details) : null
        if (errorMsg) failureSummaries.push(`${name} — ${errorMsg}`)

        pendingLeaf = { name, status, duration: fmtDuration(details?.duration_ms), errorMsg, remarks: [] }
        break
      }

      default:
        break
    }
  }

  yield* flushPending()

  const totalMs = Date.now() - runStartedAt
  const total = counts.pass + counts.fail + counts.skip + counts.todo

  yield* write(`\n${'-'.repeat(78)}\n`)
  yield* write(`Summary — ${nowIso()} — browser: ${BROWSER}\n`)
  yield* write(
    `Total: ${total}   Passed: ${counts.pass}   Failed: ${counts.fail}   Skipped: ${counts.skip}\n`
  )
  yield* write(`Duration: ${fmtDuration(totalMs)}\n`)
  if (failureSummaries.length) {
    yield* write('Failures:\n')
    for (const f of failureSummaries) yield* write(`  - ${f}\n`)
  }
  yield* write(`${'-'.repeat(78)}\n`)

  // Persist this run to the rolling history file regardless of what the
  // "latest run" destination file gets used for.
  try {
    appendFileSync(HISTORY_FILE, historyLines.join(''))
  } catch (err) {
    // Never let logging itself fail the test run.
    console.error(`[file-logger.reporter] could not write ${HISTORY_FILE}:`, err.message)
  }
}
