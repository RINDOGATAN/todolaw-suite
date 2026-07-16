import { describe, it, expect } from 'vitest'
import { deriveSuiteState, isServiceUp } from './state'
import { APP_SERVICES, DB_SERVICES, MIGRATOR_SERVICES } from './types'
import type { EngineProbe, ServiceStatus } from './types'

const present: EngineProbe = { status: 'present', version: '27.0.3' }

function allUp(): ServiceStatus[] {
	return [
		...DB_SERVICES.map((name) => ({ name, state: 'running', health: 'healthy' as const })),
		// The apps carry no compose healthcheck — running is their up state.
		...APP_SERVICES.map((name) => ({ name, state: 'running', health: 'running' as const }))
	]
}

function exitedMigrators(): ServiceStatus[] {
	return MIGRATOR_SERVICES.map((name) => ({ name, state: 'exited', health: 'exited' as const }))
}

describe('deriveSuiteState', () => {
	it('NO_ENGINE when the engine is absent (regardless of stale service data)', () => {
		expect(deriveSuiteState({ status: 'absent' }, [])).toBe('NO_ENGINE')
	})

	it('NO_ENGINE when the engine errors (daemon down)', () => {
		expect(deriveSuiteState({ status: 'error', message: 'daemon down' }, [])).toBe('NO_ENGINE')
	})

	it('STOPPED when the engine is up but no services exist', () => {
		expect(deriveSuiteState(present, [])).toBe('STOPPED')
	})

	it('RUNNING when all six long-running services are up', () => {
		expect(deriveSuiteState(present, allUp())).toBe('RUNNING')
	})

	it('RUNNING even with the one-shot migrators exited (their success state)', () => {
		expect(deriveSuiteState(present, [...allUp(), ...exitedMigrators()])).toBe('RUNNING')
	})

	it('STACK_STARTING while a database is still starting', () => {
		const services = allUp()
		services[0] = { name: 'dpo-db', state: 'running', health: 'starting' }
		expect(deriveSuiteState(present, services)).toBe('STACK_STARTING')
	})

	it('STACK_STARTING when only some services have come up yet', () => {
		expect(deriveSuiteState(present, allUp().slice(0, 3))).toBe('STACK_STARTING')
	})

	it('STACK_STARTING when only the migrators exist so far (first boot)', () => {
		expect(deriveSuiteState(present, exitedMigrators())).toBe('STACK_STARTING')
	})

	it('FAILED when an app has exited', () => {
		const services = [...allUp(), ...exitedMigrators()]
		services[3] = { name: 'dpocentral', state: 'exited', health: 'exited' }
		expect(deriveSuiteState(present, services)).toBe('FAILED')
	})

	it('FAILED when a database is unhealthy', () => {
		const services = allUp()
		services[1] = { name: 'deal-db', state: 'running', health: 'unhealthy' }
		expect(deriveSuiteState(present, services)).toBe('FAILED')
	})

	it('never FAILED because of an exited migrator alone', () => {
		const services = [...allUp(), ...exitedMigrators()]
		expect(deriveSuiteState(present, services)).toBe('RUNNING')
	})
})

describe('isServiceUp', () => {
	it('true for running apps and healthy dbs, false otherwise', () => {
		const services = allUp()
		expect(isServiceUp(services, 'dealroom')).toBe(true)
		expect(isServiceUp(services, 'dpo-db')).toBe(true)
		expect(isServiceUp(services, 'missing')).toBe(false)
		expect(isServiceUp([{ name: 'dealroom', state: 'exited', health: 'exited' }], 'dealroom')).toBe(false)
	})
})
