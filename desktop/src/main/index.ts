import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { createWriteStream, mkdirSync, rmSync } from 'node:fs'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { once } from 'node:events'
import { composeBaseArgs, upArgs, pullArgs, stopArgs, dumpArgs } from '../core/compose'
import { parseEngineProbe } from '../core/engine'
import { portsToProbe, busyPorts } from '../core/ports'
import { createBackupCipher, backupFileName } from '../core/backup'
import { isServiceUp } from '../core/state'
import { APPS, DOCKER_DOWNLOAD_URL, appUrl, type AppInfo } from '../core/types'
import { composeFilePath, suiteHome, backupsDir } from './paths'
import { envExists, ensureEnvFile, readEnvValue } from './store'
import { snapshot, checkGuards, type StackSnapshot } from './orchestrator'
import { runDocker, runDockerStreaming, spawnDocker } from './runner'
import { isPortInUse } from './netcheck'

let win: BrowserWindow | null = null

/** Compose base args: the bundled compose file, run FROM the canonical install home. */
const base = (): string[] => composeBaseArgs(composeFilePath(), suiteHome())

/** Uniform result shape for mutating IPC calls; `code` maps to an i18n error key. */
type ActionResult = { ok: true } | { ok: false; code: string; detail?: string }

const fail = (code: string, detail?: string): ActionResult => ({ ok: false, code, detail })

function createWindow(): void {
	win = new BrowserWindow({
		width: 1100,
		height: 760,
		webPreferences: {
			preload: join(__dirname, '../preload/index.mjs'),
			// contextIsolation stays on (Electron default) — the security boundary.
			// sandbox is false because electron-vite emits an ESM preload (.mjs), which
			// sandboxed preloads cannot load. contextIsolation (on) is the real boundary.
			sandbox: false
		}
	})
	if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
	else win.loadFile(join(__dirname, '../renderer/index.html'))
}

const progress = (line: string): void => {
	win?.webContents.send('suite:progress', line)
}

/**
 * The suite.sh pre-flight, in suite.sh's order: engine answering → one-home +
 * previous-install guards → ports free. EVERY mutating action runs through this
 * (ports optional — stop needs no free ports), so this app can never reconfigure,
 * stop or back up a suite that lives in another folder (check_home), and never
 * strands old data behind fresh passwords (ensure_env).
 */
async function preflight(checkPortsToo: boolean): Promise<ActionResult> {
	const info = await runDocker(['info'])
	const engine = parseEngineProbe(info.code, info.stdout, info.stderr)
	if (engine.status !== 'present') return fail('no-engine')

	const guard = await checkGuards(suiteHome(), envExists())
	if (!guard.ok) return fail(guard.code, guard.detail)

	if (checkPortsToo) {
		const snap = await snapshot(base())
		const running = snap.services.filter((s) => isServiceUp(snap.services, s.name)).map((s) => s.name)
		const probes = portsToProbe(running)
		const results = await Promise.all(
			probes.map(async (a) => ({ port: a.port, inUse: await isPortInUse(a.port) }))
		)
		const busy = busyPorts(results)
		if (busy.length > 0) return fail('ports-busy', busy.join(', '))
	}

	return { ok: true }
}

/** `pull` then `up -d`, both streamed to the renderer — install and update share it. */
async function pullAndUp(): Promise<ActionResult> {
	const pull = await runDockerStreaming(pullArgs(base()), progress, process.env)
	if (pull.code !== 0) return fail('generic', pull.stderrTail.trim() || 'docker compose pull failed')
	const up = await runDockerStreaming(upArgs(base()), progress, process.env)
	if (up.code !== 0) return fail('generic', up.stderrTail.trim() || 'docker compose up failed')
	return { ok: true }
}

interface BackupOutcome {
	service: string
	status: 'ok' | 'skipped' | 'failed'
	file?: string
}

/**
 * One app's encrypted backup, exactly suite.sh cmd_backup's pipeline:
 *   compose exec -T <db> pg_dump -U <id> -d <id> | gzip | aes-256-cbc(pbkdf2, BACKUP_PASSPHRASE)
 * streamed straight to ~/todo-law/backups/<app>-<stamp>.sql.gz.enc (mode 600).
 */
async function backupApp(dbApp: AppInfo, passphrase: string, stamp: Date): Promise<BackupOutcome> {
	const file = join(backupsDir(), backupFileName(dbApp.service, stamp))
	try {
		mkdirSync(backupsDir(), { recursive: true })
		const child = spawnDocker(dumpArgs(base(), dbApp.dbService, dbApp.dbId))
		const { header, cipher } = createBackupCipher(passphrase)
		const out = createWriteStream(file, { mode: 0o600 })
		out.write(header)
		child.stderr.on('data', () => {}) // drain so a chatty pg_dump can't block
		const [, closed] = await Promise.all([
			pipeline(child.stdout, createGzip(), cipher, out),
			once(child, 'close')
		])
		const code = (closed as [number | null])[0]
		if (code !== 0) throw new Error(`pg_dump exited ${code}`)
		return { service: dbApp.service, status: 'ok', file }
	} catch {
		rmSync(file, { force: true })
		return { service: dbApp.service, status: 'failed' }
	}
}

// --- IPC ------------------------------------------------------------------

ipcMain.handle('config:isFirstRun', () => !envExists())

ipcMain.handle('engine:probe', async () => {
	const info = await runDocker(['info'])
	return parseEngineProbe(info.code, info.stdout, info.stderr)
})

ipcMain.handle('engine:openDockerDownload', () => shell.openExternal(DOCKER_DOWNLOAD_URL))

ipcMain.handle('app:open', (_e, service: string) => {
	const target = APPS.find((a) => a.service === service)
	if (target) shell.openExternal(appUrl(target))
})

ipcMain.handle('suite:status', (): Promise<StackSnapshot> => snapshot(base()))

ipcMain.handle('suite:home', () => suiteHome())

ipcMain.handle('suite:install', async (): Promise<ActionResult> => {
	try {
		const pre = await preflight(true)
		if (!pre.ok) return pre
		// Settings are generated once and NEVER overwritten; an existing CLI-kit
		// .env is adopted as-is (the guards above already vetted the install).
		ensureEnvFile()
		return await pullAndUp()
	} catch (err) {
		return fail('generic', String(err))
	}
})

ipcMain.handle('suite:start', async (): Promise<ActionResult> => {
	try {
		if (!envExists()) return fail('not-installed')
		const pre = await preflight(true)
		if (!pre.ok) return pre
		const up = await runDockerStreaming(upArgs(base()), progress, process.env)
		if (up.code !== 0) return fail('generic', up.stderrTail.trim() || 'docker compose up failed')
		return { ok: true }
	} catch (err) {
		return fail('generic', String(err))
	}
})

ipcMain.handle('suite:stop', async (): Promise<ActionResult> => {
	try {
		if (!envExists()) return fail('not-installed')
		const pre = await preflight(false)
		if (!pre.ok) return pre
		const res = await runDocker(stopArgs(base()))
		if (res.code !== 0) return fail('generic', res.stderr.trim() || 'docker compose stop failed')
		return { ok: true }
	} catch (err) {
		return fail('generic', String(err))
	}
})

ipcMain.handle('suite:update', async (): Promise<ActionResult> => {
	try {
		if (!envExists()) return fail('not-installed')
		const pre = await preflight(true)
		if (!pre.ok) return pre
		return await pullAndUp()
	} catch (err) {
		return fail('generic', String(err))
	}
})

ipcMain.handle(
	'suite:backup',
	async (): Promise<ActionResult | { ok: true; results: BackupOutcome[]; dir: string }> => {
		try {
			if (!envExists()) return fail('not-installed')
			const pre = await preflight(false)
			if (!pre.ok) return pre
			const passphrase = readEnvValue('BACKUP_PASSPHRASE')
			if (!passphrase) return fail('no-passphrase')
			const snap = await snapshot(base())
			const stamp = new Date()
			const results: BackupOutcome[] = []
			for (const suiteApp of APPS) {
				if (!isServiceUp(snap.services, suiteApp.dbService)) {
					results.push({ service: suiteApp.service, status: 'skipped' })
					continue
				}
				results.push(await backupApp(suiteApp, passphrase, stamp))
			}
			return { ok: true, results, dir: backupsDir() }
		} catch (err) {
			return fail('generic', String(err))
		}
	}
)

app.whenReady().then(() => {
	createWindow()
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
