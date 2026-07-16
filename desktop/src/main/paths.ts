import { app } from 'electron'
import { join } from 'node:path'
import { homedir } from 'node:os'

/**
 * Canonical install home — the SAME folder the CLI kit (suite.sh) uses, so the
 * desktop app and the kit share one install: the .env lives here, compose runs with
 * --project-directory pointing here, and backups land in backups/ under it. If a
 * CLI-kit .env already exists we adopt it (store.ts never overwrites).
 */
export const suiteHome = (): string => join(homedir(), 'todo-law')

/** The chmod-600 .env docker compose reads from the project directory. */
export const envPath = (): string => join(suiteHome(), '.env')

/** Where encrypted backups land (suite.sh writes backups/ next to its .env too). */
export const backupsDir = (): string => join(suiteHome(), 'backups')

/**
 * The suite compose file. Bundled into the app at build time under resources/
 * (prepack:compose copies ../docker-compose.yml). In dev (electron-vite) it is read
 * from the repo root.
 */
export const composeFilePath = (): string =>
	app.isPackaged
		? join(process.resourcesPath, 'docker-compose.yml')
		: join(app.getAppPath(), '..', 'docker-compose.yml')
