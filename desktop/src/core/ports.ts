import { APPS } from './types'
import type { AppInfo } from './types'

/**
 * Port pre-flight (suite.sh check_ports): the suite needs 8485/8486/8487 and refuses
 * to fight over them — EXCEPT that a port held by one of our own already-running app
 * services is fine (docker compose handles it). Pure half: which apps' ports still
 * need probing, given the currently running compose services.
 */
export function portsToProbe(runningServices: string[], apps: readonly AppInfo[] = APPS): AppInfo[] {
	const running = new Set(runningServices)
	return apps.filter((app) => !running.has(app.service))
}

/** The busy subset, given probe results. Kept pure so the check logic is testable. */
export function busyPorts(results: { port: number; inUse: boolean }[]): number[] {
	return results.filter((r) => r.inUse).map((r) => r.port)
}
