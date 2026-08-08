import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parseConfig, type DesktopConfig } from '../core/adopt'

/**
 * The app's own tiny config (NOT the install's .env): today just the adopted
 * install home. Lives in Electron's per-user data dir, so it survives app updates
 * and never travels with the install folder itself.
 */
const configPath = (): string => join(app.getPath('userData'), 'config.json')

export function loadConfig(): DesktopConfig {
	try {
		return parseConfig(readFileSync(configPath(), 'utf8'))
	} catch {
		return {} // no file yet
	}
}

export function saveConfig(cfg: DesktopConfig): void {
	mkdirSync(app.getPath('userData'), { recursive: true })
	writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + '\n')
}
