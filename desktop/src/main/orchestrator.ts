import { parseEngineProbe } from '../core/engine'
import { parseComposePs, psArgs } from '../core/compose'
import { deriveSuiteState } from '../core/state'
import { checkPreviousInstall, findForeignHome, parseLines } from '../core/guards'
import { PROJECT_NAME } from '../core/types'
import type { SuiteState, ServiceStatus } from '../core/types'
import { runDocker, type RunResult } from './runner'

export interface StackSnapshot {
	state: SuiteState
	services: ServiceStatus[]
	engineMessage?: string
}

type Runner = (args: string[]) => Promise<RunResult>

/** Probe engine + compose ps and derive the snapshot. Runner is injectable for tests. */
export async function snapshot(base: string[], runner: Runner = runDocker): Promise<StackSnapshot> {
	const info = await runner(['info'])
	const engine = parseEngineProbe(info.code, info.stdout, info.stderr)
	if (engine.status !== 'present') {
		return { state: 'NO_ENGINE', services: [], engineMessage: engine.message }
	}
	const ps = await runner(psArgs(base))
	const services = parseComposePs(ps.stdout)
	return { state: deriveSuiteState(engine, services), services }
}

export type GuardResult =
	| { ok: true }
	| { ok: false; code: 'other-home' | 'previous-install'; detail: string }

/**
 * The suite.sh safety guards, in suite.sh's order (check_home runs inside
 * check_docker, before ensure_env's previous-install check):
 *
 * 1. One-home guard — any container in project "todolaw-suite" whose
 *    com.docker.compose.project.working_dir label is NOT our install home means the
 *    suite already lives in another folder (e.g. a source-built production install).
 *    Refuse and point at that folder; every mutating action must pass this first so
 *    this app can never adopt — or stop — someone else's install.
 * 2. Previous-install guard — suite data volumes exist but no .env holds their
 *    passwords: block with a clear choice (restore the saved .env, or remove the
 *    old volumes) instead of stranding the data behind fresh random passwords.
 *
 * Both docker calls are read-only. Pure decision logic lives in core/guards.ts.
 */
export async function checkGuards(
	home: string,
	envExists: boolean,
	runner: Runner = runDocker
): Promise<GuardResult> {
	const labels = await runner([
		'ps',
		'-a',
		'--filter',
		`label=com.docker.compose.project=${PROJECT_NAME}`,
		'--format',
		'{{.Label "com.docker.compose.project.working_dir"}}'
	])
	const foreign = findForeignHome(parseLines(labels.stdout), home)
	if (foreign) return { ok: false, code: 'other-home', detail: foreign }

	if (!envExists) {
		const volumes = await runner(['volume', 'ls', '-q'])
		const previous = checkPreviousInstall(parseLines(volumes.stdout), envExists)
		if (previous.blocked) {
			return { ok: false, code: 'previous-install', detail: previous.volumes.join(', ') }
		}
	}

	return { ok: true }
}
