import { describe, it, expect } from 'vitest'
import { snapshot, checkGuards } from './orchestrator'

// Inject a fake runner so these stay pure unit tests (no real docker).
type Result = { code: number; stdout: string; stderr: string }
function fakeRunner(map: Record<string, Result>) {
	return async (args: string[]): Promise<Result> => {
		if (args.includes('info')) return map['info'] ?? { code: 0, stdout: 'Server Version: 27', stderr: '' }
		if (args.includes('volume')) return map['volume'] ?? { code: 0, stdout: '', stderr: '' }
		if (args[0] === 'ps') return map['labels'] ?? { code: 0, stdout: '', stderr: '' }
		if (args.includes('ps')) return map['ps'] ?? { code: 0, stdout: '', stderr: '' }
		return { code: 0, stdout: '', stderr: '' }
	}
}

const base = ['compose', '-f', 'x', '--project-directory', '/Users/me/todo-law']

describe('snapshot', () => {
	it('reports RUNNING when info ok, dbs healthy, apps running, migrators exited', async () => {
		const ps =
			'{"Service":"dpo-db","State":"running","Health":"healthy"}\n' +
			'{"Service":"deal-db","State":"running","Health":"healthy"}\n' +
			'{"Service":"ais-db","State":"running","Health":"healthy"}\n' +
			'{"Service":"dpo-migrator","State":"exited","Health":""}\n' +
			'{"Service":"deal-migrator","State":"exited","Health":""}\n' +
			'{"Service":"ais-migrator","State":"exited","Health":""}\n' +
			'{"Service":"dpocentral","State":"running","Health":""}\n' +
			'{"Service":"dealroom","State":"running","Health":""}\n' +
			'{"Service":"aisentinel","State":"running","Health":""}'
		const runner = fakeRunner({
			info: { code: 0, stdout: 'Server Version: 27.0.3', stderr: '' },
			ps: { code: 0, stdout: ps, stderr: '' }
		})
		const snap = await snapshot(base, runner)
		expect(snap.state).toBe('RUNNING')
		expect(snap.services).toHaveLength(9)
	})

	it('reports NO_ENGINE when docker info fails', async () => {
		const runner = fakeRunner({
			info: { code: 127, stdout: '', stderr: 'not found' }
		})
		const snap = await snapshot(base, runner)
		expect(snap.state).toBe('NO_ENGINE')
		expect(snap.engineMessage).toMatch(/install/i)
	})

	it('reports STOPPED when the engine is up but nothing of ours exists', async () => {
		const runner = fakeRunner({
			info: { code: 0, stdout: 'Server Version: 27.0.3', stderr: '' },
			ps: { code: 0, stdout: '', stderr: '' }
		})
		expect((await snapshot(base, runner)).state).toBe('STOPPED')
	})
})

describe('checkGuards', () => {
	const home = '/Users/me/todo-law'

	it('passes a fresh machine (no containers, no volumes, no .env)', async () => {
		const res = await checkGuards(home, false, fakeRunner({}))
		expect(res).toEqual({ ok: true })
	})

	it('refuses when the suite lives in another folder (one-home guard)', async () => {
		const runner = fakeRunner({
			labels: { code: 0, stdout: '/Users/me/NEL-firm/todolaw-suite\n', stderr: '' }
		})
		const res = await checkGuards(home, true, runner)
		expect(res).toEqual({ ok: false, code: 'other-home', detail: '/Users/me/NEL-firm/todolaw-suite' })
	})

	it('adopts containers started from our own home', async () => {
		const runner = fakeRunner({
			labels: { code: 0, stdout: `${home}\n${home}\n`, stderr: '' }
		})
		expect(await checkGuards(home, true, runner)).toEqual({ ok: true })
	})

	it('blocks on previous-install data volumes when no .env exists', async () => {
		const runner = fakeRunner({
			volume: {
				code: 0,
				stdout: 'todolaw-suite_dpo-data\ntodolaw-suite_deal-data\nunrelated_vol\n',
				stderr: ''
			}
		})
		const res = await checkGuards(home, false, runner)
		expect(res).toEqual({
			ok: false,
			code: 'previous-install',
			detail: 'todolaw-suite_dpo-data, todolaw-suite_deal-data'
		})
	})

	it('does not block on those volumes when the .env exists (adopt)', async () => {
		const runner = fakeRunner({
			volume: { code: 0, stdout: 'todolaw-suite_dpo-data\n', stderr: '' }
		})
		expect(await checkGuards(home, true, runner)).toEqual({ ok: true })
	})

	it('reports the foreign home even when previous-install would also fire', async () => {
		const runner = fakeRunner({
			labels: { code: 0, stdout: '/elsewhere\n', stderr: '' },
			volume: { code: 0, stdout: 'todolaw-suite_dpo-data\n', stderr: '' }
		})
		const res = await checkGuards(home, false, runner)
		expect(res.ok).toBe(false)
		if (!res.ok) expect(res.code).toBe('other-home')
	})
})
