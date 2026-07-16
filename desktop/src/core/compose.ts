import type { ServiceHealth, ServiceStatus } from './types'

/**
 * `docker <base...>` — the shared prefix for every compose call. The compose file is
 * the bundled one (extraResource); --project-directory points at the install home
 * (~/todo-law) so compose reads its .env from there AND labels every container with
 * that working_dir — which is exactly what the one-home guard (suite.sh check_home)
 * keys on. The project name is fixed by the compose file's top-level `name:`.
 */
export function composeBaseArgs(composeFile: string, projectDir: string): string[] {
	return ['compose', '-f', composeFile, '--project-directory', projectDir]
}

export const psArgs = (base: string[]): string[] => [...base, 'ps', '--format', 'json']
export const upArgs = (base: string[]): string[] => [...base, 'up', '-d']
export const pullArgs = (base: string[]): string[] => [...base, 'pull']
/** `stop` (NOT `down`): suite.sh cmd_stop keeps containers + volumes; data survives. */
export const stopArgs = (base: string[]): string[] => [...base, 'stop']

/**
 * One app's encrypted-backup dump: suite.sh cmd_backup's
 * `compose exec -T <db> pg_dump -U <id> -d <id>` — the caller pipes the stdout
 * through gzip + aes-256-cbc (core/backup.ts). -T because there is no TTY.
 */
export function dumpArgs(base: string[], dbService: string, dbId: string): string[] {
	return [...base, 'exec', '-T', dbService, 'pg_dump', '-U', dbId, '-d', dbId]
}

function mapHealth(state: string, health: string): ServiceHealth {
	if (health === 'healthy' || health === 'starting' || health === 'unhealthy') return health
	switch (state) {
		case 'running':
			return 'running'
		case 'exited':
			return 'exited'
		case 'created':
			return 'created'
		default:
			return 'unknown'
	}
}

interface RawPs {
	Service?: string
	Name?: string
	State?: string
	Health?: string
}

function toStatus(row: RawPs): ServiceStatus | null {
	const name = row.Service ?? row.Name
	if (!name || typeof name !== 'string') return null
	const state = typeof row.State === 'string' ? row.State : 'unknown'
	const health = typeof row.Health === 'string' ? row.Health : ''
	return { name, state, health: mapHealth(state, health) }
}

/**
 * Parse `docker compose ps --format json`. Handles BOTH modern JSONL (one object per
 * line) and the older single JSON array. Drops malformed rows rather than throwing —
 * the same defensive-parser discipline as the rest of the core modules.
 */
export function parseComposePs(raw: string): ServiceStatus[] {
	const text = raw.trim()
	if (!text) return []

	// Try whole-string array first.
	try {
		const arr = JSON.parse(text)
		if (Array.isArray(arr)) {
			return arr.map(toStatus).filter((s): s is ServiceStatus => s !== null)
		}
	} catch {
		// fall through to JSONL
	}

	const out: ServiceStatus[] = []
	for (const line of text.split('\n')) {
		const t = line.trim()
		if (!t) continue
		try {
			const row = JSON.parse(t) as RawPs
			const status = toStatus(row)
			if (status) out.push(status)
		} catch {
			// skip malformed line
		}
	}
	return out
}
