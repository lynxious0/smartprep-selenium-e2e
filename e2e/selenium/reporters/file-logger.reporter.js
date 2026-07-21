import { mkdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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
  const real = err.cause ?? err
  return real?.message || String(real)
}

export default async function* fileLoggerReporter(source) {
  const runStartedAt = Date.now()
  const historyLines = []
  const counts = { pass: 0, fail: 0, skip: 0, todo: 0 }
  const failureSummaries = []
  let pendingLeaf = null

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

  try {
    appendFileSync(HISTORY_FILE, historyLines.join(''))
  } catch (err) {
    console.error(`[file-logger.reporter] could not write ${HISTORY_FILE}:`, err.message)
  }
}
