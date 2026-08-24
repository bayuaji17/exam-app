#!/usr/bin/env node
/**
 * Run the E2E suite against a freshly built production server.
 *
 *   pnpm run test:e2e [-- <playwright args...>]
 *
 * Sequence: build -> free port 3000 -> start `pnpm start` -> playwright test
 * -> stop the server (always). The server lifecycle is owned by this script,
 * so the suite can never silently attach to a dev server or any other
 * process squatting on port 3000.
 */
import { spawn, spawnSync, execFileSync } from "node:child_process"
import { appendFileSync, mkdirSync } from "node:fs"

const PORT = 3000
const HEALTH_URL = "http://localhost:3000/login"
const SERVER_LOG = ".next/e2e-server.log"
// pnpm strips the first `--` separator, but direct `node scripts/run-e2e.mjs -- x`
// invocations leave it behind — drop stray separators defensively.
const args = process.argv.slice(2).filter((arg) => arg !== "--")

const log = (message) => console.log(`[e2e] ${message}`)
const fail = (message) => {
  console.error(`[e2e] ${message}`)
  process.exit(1)
}

const sh = (command) => {
  try {
    return execFileSync("sh", ["-c", command], { encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

const sleepSync = (ms) => execFileSync("sleep", [String(ms / 1000)], { stdio: "ignore" })

/**
 * Everything listening on the port, plus their descendants.
 *
 * `lsof` is the primary source; `ss -tlnp` is the fallback for environments
 * where lsof yields nothing (it is absent from macOS, but there `lsof` works
 * and `ss` does not exist — hence try-both).
 */
function portProcesses(port) {
  const pids = new Set()
  for (const pid of sh(`lsof -ti :${port} -sTCP:LISTEN`).split(/\s+/)) {
    if (pid) pids.add(pid)
  }
  const ssOut = sh(`ss -tlnp "sport = :${port}"`)
  for (const line of ssOut.split("\n")) {
    if (line.includes(`:${port}`)) {
      for (const match of line.matchAll(/pid=(\d+)/g)) {
        pids.add(match[1])
      }
    }
  }
  const all = new Set()
  const queue = [...pids]
  while (queue.length > 0) {
    const pid = queue.shift()
    if (!pid || all.has(pid)) continue
    all.add(pid)
    queue.push(...sh(`pgrep -P ${pid}`).split(/\s+/).filter(Boolean))
  }
  return [...all]
}

/** Free the port, printing what was killed. */
function freePort(port) {
  const pids = portProcesses(port)
  if (pids.length === 0) return
  log(`port :${port} is occupied — freeing it:`)
  for (const pid of pids) {
    const command = sh(`ps -o command= -p ${pid}`).split("\n")[0] || `PID ${pid}`
    log(`  killing ${command}`)
    try {
      process.kill(Number(pid), "SIGTERM")
    } catch {
      /* already gone */
    }
  }
  const deadline = Date.now() + 4000
  while (Date.now() < deadline && portProcesses(port).length > 0) {
    sleepSync(200)
  }
  for (const pid of portProcesses(port)) {
    try {
      process.kill(Number(pid), "SIGKILL")
    } catch {
      /* already gone */
    }
  }
}

function runSync(command, argsList, label) {
  log(`running: ${label}`)
  const result = spawnSync(command, argsList, { stdio: "inherit", shell: false })
  if (result.status !== 0) {
    fail(`${label} failed (exit ${result.status})`)
  }
}

/** Spawn `pnpm start` detached, log its output, wait until it serves /login. */
async function startServer() {
  mkdirSync(".next", { recursive: true })

  log("starting production server: pnpm start")
  const server = spawn("pnpm", ["start"], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  server.stdout.on("data", (chunk) => appendFileSync(SERVER_LOG, chunk))
  server.stderr.on("data", (chunk) => appendFileSync(SERVER_LOG, chunk))
  server.on("error", (error) => fail(`pnpm start failed to launch: ${error.message}`))

  const serverLogTail = () =>
    execFileSync("sh", ["-c", `tail -n 20 ${SERVER_LOG}`], { encoding: "utf8" })

  // The spawned process must survive its first seconds — an immediate exit
  // (e.g. EADDRINUSE while a foreign process holds the port) means the health
  // poll below would silently answer against that foreign process instead.
  await new Promise((resolve) => setTimeout(resolve, 2000))
  if (server.exitCode !== null) {
    fail(`pnpm start exited immediately (code ${server.exitCode}). Server log:\n${serverLogTail()}`)
  }

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      fail(`pnpm start exited during startup (code ${server.exitCode}). Server log:\n${serverLogTail()}`)
    }
    try {
      const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) })
      if (response.ok) {
        log("production server is up")
        return server
      }
    } catch {
      /* not ready yet */
    }
    sleepSync(1000)
  }
  fail(`production server did not come up within 120s. Server log:\n${serverLogTail()}`)
}

/**
 * Stop the server this script spawned (its whole process group) and anything
 * else left on the port.
 */
function stopServer(server) {
  log("stopping the production server")
  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM")
    } catch {
      /* already gone */
    }
    sleepSync(1000)
  }
  freePort(PORT)
  const left = portProcesses(PORT)
  log(left.length === 0 ? "port :3000 is free" : `WARNING: still listening: ${left.join(", ")}`)
}

function runPlaywright() {
  log(`running: playwright test${args.length > 0 ? ` ${args.join(" ")}` : ""}`)
  const result = spawnSync("pnpm", ["exec", "playwright", "test", ...args], {
    stdio: "inherit",
  })
  return result.status ?? 1
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log("E2E must run against a production build — this script enforces it.")
  runSync("pnpm", ["run", "build"], "pnpm run build")
  freePort(PORT)
  const server = await startServer()
  const status = runPlaywright()
  stopServer(server)
  process.exit(status)
}

main()