import { describe, it, expect } from 'vitest'
import { parseComposePs, composeBaseArgs, psArgs, upArgs, pullArgs, stopArgs, dumpArgs } from './compose'

const base = composeBaseArgs('/res/docker-compose.yml', '/Users/me/todo-law')

describe('composeBaseArgs', () => {
	it('targets the bundled file and the install home as project directory', () => {
		expect(base).toEqual([
			'compose',
			'-f',
			'/res/docker-compose.yml',
			'--project-directory',
			'/Users/me/todo-law'
		])
	})
})

describe('argv builders', () => {
	it('ps requests JSON', () => {
		expect(psArgs(base)).toEqual([...base, 'ps', '--format', 'json'])
	})
	it('up is detached', () => {
		expect(upArgs(base)).toEqual([...base, 'up', '-d'])
	})
	it('pull fetches images (Update = pull && up -d)', () => {
		expect(pullArgs(base)).toEqual([...base, 'pull'])
	})
	it('stop keeps containers and volumes (suite.sh cmd_stop; user data survives)', () => {
		expect(stopArgs(base)).toEqual([...base, 'stop'])
	})
	it('dump runs pg_dump in the db container without a TTY (suite.sh cmd_backup)', () => {
		expect(dumpArgs(base, 'dpo-db', 'dpocentral')).toEqual([
			...base,
			'exec',
			'-T',
			'dpo-db',
			'pg_dump',
			'-U',
			'dpocentral',
			'-d',
			'dpocentral'
		])
	})
})

describe('parseComposePs', () => {
	it('parses JSONL (one object per line — modern docker)', () => {
		const raw =
			'{"Name":"todolaw-suite-dpo-db-1","Service":"dpo-db","State":"running","Health":"healthy"}\n' +
			'{"Name":"todolaw-suite-dpocentral-1","Service":"dpocentral","State":"running","Health":""}'
		const out = parseComposePs(raw)
		expect(out).toEqual([
			{ name: 'dpo-db', state: 'running', health: 'healthy' },
			{ name: 'dpocentral', state: 'running', health: 'running' }
		])
	})

	it('parses a JSON array (older docker) too', () => {
		const raw = JSON.stringify([
			{ Service: 'deal-db', State: 'running', Health: '' },
			{ Service: 'deal-migrator', State: 'exited', Health: '' }
		])
		const out = parseComposePs(raw)
		expect(out).toEqual([
			{ name: 'deal-db', state: 'running', health: 'running' },
			{ name: 'deal-migrator', state: 'exited', health: 'exited' }
		])
	})

	it('maps unhealthy and created states', () => {
		const raw =
			'{"Service":"ais-db","State":"running","Health":"unhealthy"}\n' +
			'{"Service":"aisentinel","State":"created","Health":""}'
		expect(parseComposePs(raw)).toEqual([
			{ name: 'ais-db', state: 'running', health: 'unhealthy' },
			{ name: 'aisentinel', state: 'created', health: 'created' }
		])
	})

	it('returns [] for empty output (stack never started)', () => {
		expect(parseComposePs('')).toEqual([])
		expect(parseComposePs('   \n')).toEqual([])
	})

	it('skips malformed lines rather than throwing (defensive boundary)', () => {
		const raw = 'not json\n{"Service":"dealroom","State":"running","Health":""}'
		expect(parseComposePs(raw)).toEqual([{ name: 'dealroom', state: 'running', health: 'running' }])
	})
})
