import { LONG_RUNNING_SERVICES, MIGRATOR_SERVICES } from './types'
import type { EngineProbe, ServiceStatus, SuiteState } from './types'

const MIGRATORS = new Set<string>(MIGRATOR_SERVICES)

/**
 * Derive the suite state from a real engine probe + `docker compose ps` snapshot.
 * Pure and total. Precedence:
 *   1. engine not usable                      -> NO_ENGINE
 *   2. any long-running service failed        -> FAILED   (exited / unhealthy)
 *   3. no services at all                     -> STOPPED
 *   4. all 6 long-running services up         -> RUNNING
 *   5. otherwise (coming up)                  -> STACK_STARTING
 *
 * The migrators are one-shot ("restart: no"): they apply migrations and EXIT — an
 * exited migrator is SUCCESS, so they are excluded from both the failure check and
 * the up count. The dbs have compose healthchecks (healthy); the three apps do not
 * (suite.sh polls them over HTTP instead), so "up" for an app means state=running.
 */
export function deriveSuiteState(engine: EngineProbe, services: ServiceStatus[]): SuiteState {
	if (engine.status !== 'present') return 'NO_ENGINE'

	const longRunning = services.filter((s) => !MIGRATORS.has(s.name))

	const failed = longRunning.some((s) => s.health === 'exited' || s.health === 'unhealthy')
	if (failed) return 'FAILED'

	if (services.length === 0) return 'STOPPED'

	const up = new Set(
		longRunning.filter((s) => s.health === 'healthy' || s.health === 'running').map((s) => s.name)
	)
	const allUp = LONG_RUNNING_SERVICES.every((name) => up.has(name))
	return allUp ? 'RUNNING' : 'STACK_STARTING'
}

/** Is one service up in this snapshot? (per-app card state in the panel) */
export function isServiceUp(services: ServiceStatus[], name: string): boolean {
	return services.some((s) => s.name === name && (s.health === 'healthy' || s.health === 'running'))
}
