import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { envPath, suiteHome, backupsDir } from './paths'
import { renderEnv, envValue } from '../core/env'
import { generateSecrets } from '../core/secrets'

export function envExists(): boolean {
	return existsSync(envPath())
}

/**
 * Settings (.env): generated ONCE, NEVER overwritten — the suite.sh ensure_env
 * contract. If ~/todo-law/.env already exists (a CLI-kit install, or an earlier run
 * of this app) we keep it and adopt that install: regenerating would mint new random
 * passwords that cannot open the existing databases. The previous-install guard
 * (volumes-without-.env) runs BEFORE this, in the orchestrator.
 */
export function ensureEnvFile(): { created: boolean } {
	mkdirSync(suiteHome(), { recursive: true })
	mkdirSync(backupsDir(), { recursive: true })
	const path = envPath()
	if (existsSync(path)) return { created: false }
	writeFileSync(path, renderEnv(generateSecrets()), { mode: 0o600 })
	chmodSync(path, 0o600) // belt-and-suspenders if the umask interfered
	return { created: true }
}

/** Read one value out of the install's .env (suite.sh env_value). */
export function readEnvValue(key: string): string | null {
	if (!envExists()) return null
	return envValue(readFileSync(envPath(), 'utf8'), key)
}
