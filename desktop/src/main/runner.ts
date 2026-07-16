import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { dockerSearchPath } from '../core/dockerPath'

export interface RunResult {
	code: number
	stdout: string
	stderr: string
}

/**
 * Env for spawning `docker`. A Finder-launched macOS app inherits a minimal PATH that
 * omits /usr/local/bin (where Docker Desktop's CLI lives), so a bare spawn ENOENTs even
 * with Docker installed. Augment PATH with the known docker bin dirs.
 */
function dockerSpawnEnv(extra?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	return { ...process.env, ...extra, PATH: dockerSearchPath(process.env.PATH) }
}

/** Spawn `docker <args>` with the fixed PATH; callers wire the streams themselves. */
export function spawnDocker(args: string[], env?: NodeJS.ProcessEnv): ChildProcessWithoutNullStreams {
	return spawn('docker', args, { env: dockerSpawnEnv(env) })
}

/** Run `docker <args>` to completion, capturing output. Never throws on non-zero. */
export function runDocker(args: string[], env?: NodeJS.ProcessEnv): Promise<RunResult> {
	return new Promise((resolve) => {
		const child = spawnDocker(args, env)
		let stdout = ''
		let stderr = ''
		child.stdout.on('data', (d) => (stdout += d.toString()))
		child.stderr.on('data', (d) => (stderr += d.toString()))
		child.on('error', (err) => resolve({ code: 127, stdout, stderr: stderr + String(err) }))
		child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
	})
}

/**
 * Run `docker <args>` to completion, streaming every output line to a callback —
 * used for `pull` / `up -d` progress in the wizard's install step and the Update
 * button. Resolves with the exit code (and the tail of stderr for error reporting);
 * never throws on non-zero or spawn failure.
 */
export function runDockerStreaming(
	args: string[],
	onLine: (line: string) => void,
	env?: NodeJS.ProcessEnv
): Promise<{ code: number; stderrTail: string }> {
	return new Promise((resolve) => {
		const child = spawnDocker(args, env)
		let stderrTail = ''
		const pump = (buf: Buffer): void =>
			buf
				.toString()
				.split('\n')
				.forEach((l) => l.trim() && onLine(l))
		child.stdout.on('data', pump)
		child.stderr.on('data', (d: Buffer) => {
			stderrTail = (stderrTail + d.toString()).slice(-2000)
			pump(d)
		})
		child.on('error', (err) => resolve({ code: 127, stderrTail: stderrTail + String(err) }))
		child.on('close', (code) => resolve({ code: code ?? 1, stderrTail }))
	})
}
