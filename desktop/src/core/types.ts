/** Where users download Docker Desktop from (same link suite.sh prints). */
export const DOCKER_DOWNLOAD_URL = 'https://www.docker.com/products/docker-desktop/'

/**
 * Fixed compose project name — set by the top-level `name:` in docker-compose.yml.
 * One computer runs ONE copy of the suite; the one-home guard (core/guards.ts)
 * enforces that, exactly like suite.sh check_home.
 */
export const PROJECT_NAME = 'todolaw-suite'

/** One of the three user-facing apps in docker-compose.yml. */
export interface AppInfo {
	/** compose service name */
	service: string
	title: string
	/** loopback host port the compose file publishes */
	port: number
	/** compose service name of this app's Postgres */
	dbService: string
	/** Postgres user AND database name (suite.sh app_db_id) */
	dbId: string
}

/** The three apps, mirroring suite.sh's APPS + app_* tables. */
export const APPS: readonly AppInfo[] = [
	{ service: 'dpocentral', title: 'DPO Central', port: 8485, dbService: 'dpo-db', dbId: 'dpocentral' },
	{ service: 'dealroom', title: 'Dealroom', port: 8486, dbService: 'deal-db', dbId: 'dealroom' },
	{ service: 'aisentinel', title: 'AI Sentinel', port: 8487, dbService: 'ais-db', dbId: 'aisentinel' }
] as const

export const APP_SERVICES = APPS.map((a) => a.service)
export const DB_SERVICES = APPS.map((a) => a.dbService)

/**
 * One-shot services ("restart: no" in the compose): they apply migrations and EXIT.
 * An exited migrator is its success state, so state derivation must never read it
 * as a failure — see core/state.ts.
 */
export const MIGRATOR_SERVICES = ['dpo-migrator', 'deal-migrator', 'ais-migrator'] as const

/** Every service that should stay up once the suite is running. */
export const LONG_RUNNING_SERVICES = [...DB_SERVICES, ...APP_SERVICES] as const

export const appUrl = (app: AppInfo): string => `http://localhost:${app.port}`

export type EngineStatus = 'absent' | 'present' | 'error'

export interface EngineProbe {
	status: EngineStatus
	version?: string
	message?: string
}

export type ServiceHealth =
	| 'healthy'
	| 'starting'
	| 'unhealthy'
	| 'running'
	| 'exited'
	| 'created'
	| 'unknown'

export interface ServiceStatus {
	name: string
	state: string
	health: ServiceHealth
}

export type SuiteState =
	| 'NO_ENGINE'
	| 'STACK_STARTING'
	| 'RUNNING'
	| 'STOPPED'
	| 'FAILED'
