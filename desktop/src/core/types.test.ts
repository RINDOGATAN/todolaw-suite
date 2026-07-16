import { describe, it, expect } from 'vitest'
import {
	APPS,
	APP_SERVICES,
	DB_SERVICES,
	MIGRATOR_SERVICES,
	LONG_RUNNING_SERVICES,
	PROJECT_NAME,
	appUrl
} from './types'

describe('core constants', () => {
	it('lists the three apps with the fixed suite ports 8485/8486/8487', () => {
		expect(APPS.map((a) => [a.service, a.port])).toEqual([
			['dpocentral', 8485],
			['dealroom', 8486],
			['aisentinel', 8487]
		])
	})

	it('pairs each app with its database service + Postgres id (suite.sh app_db_*)', () => {
		expect(APPS.map((a) => [a.dbService, a.dbId])).toEqual([
			['dpo-db', 'dpocentral'],
			['deal-db', 'dealroom'],
			['ais-db', 'aisentinel']
		])
	})

	it('uses the fixed compose project name from docker-compose.yml `name:`', () => {
		expect(PROJECT_NAME).toBe('todolaw-suite')
	})

	it('separates one-shot migrators from long-running services', () => {
		expect(MIGRATOR_SERVICES).toEqual(['dpo-migrator', 'deal-migrator', 'ais-migrator'])
		expect(LONG_RUNNING_SERVICES).toEqual([...DB_SERVICES, ...APP_SERVICES])
		for (const m of MIGRATOR_SERVICES) {
			expect(LONG_RUNNING_SERVICES).not.toContain(m)
		}
	})

	it('builds localhost URLs from the app ports', () => {
		expect(APPS.map(appUrl)).toEqual([
			'http://localhost:8485',
			'http://localhost:8486',
			'http://localhost:8487'
		])
	})
})
