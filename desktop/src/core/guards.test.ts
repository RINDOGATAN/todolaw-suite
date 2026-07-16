import { describe, it, expect } from 'vitest'
import { parseLines, findSuiteDataVolumes, checkPreviousInstall, findForeignHome } from './guards'

describe('parseLines', () => {
	it('splits, trims, drops empties and de-duplicates', () => {
		expect(parseLines('/a\n\n /b \n/a\n')).toEqual(['/a', '/b'])
	})
	it('returns [] for empty output', () => {
		expect(parseLines('')).toEqual([])
		expect(parseLines('\n \n')).toEqual([])
	})
})

describe('findSuiteDataVolumes', () => {
	it('matches exactly the three suite data volumes', () => {
		const vols = [
			'todolaw-suite_dpo-data',
			'todolaw-suite_deal-data',
			'todolaw-suite_ais-data',
			'other_dpo-data',
			'todolaw-suite_dpo-data-old',
			'lq-ai-desktop_pgdata'
		]
		expect(findSuiteDataVolumes(vols)).toEqual([
			'todolaw-suite_dpo-data',
			'todolaw-suite_deal-data',
			'todolaw-suite_ais-data'
		])
	})
})

describe('checkPreviousInstall (suite.sh ensure_env guard)', () => {
	it('blocks when old data volumes exist but no .env holds their passwords', () => {
		const res = checkPreviousInstall(['todolaw-suite_dpo-data'], false)
		expect(res.blocked).toBe(true)
		expect(res.volumes).toEqual(['todolaw-suite_dpo-data'])
	})

	it('adopts (does not block) when the .env exists alongside the volumes', () => {
		expect(checkPreviousInstall(['todolaw-suite_deal-data'], true).blocked).toBe(false)
	})

	it('passes a fresh machine (no volumes, no .env)', () => {
		expect(checkPreviousInstall([], false).blocked).toBe(false)
	})

	it('ignores unrelated volumes', () => {
		expect(checkPreviousInstall(['someapp_data', 'pgdata'], false).blocked).toBe(false)
	})
})

describe('findForeignHome (suite.sh check_home guard)', () => {
	const home = '/Users/me/todo-law'

	it('null when no suite containers exist anywhere', () => {
		expect(findForeignHome([], home)).toBeNull()
	})

	it('null when every container was started from our install home', () => {
		expect(findForeignHome([home, home], home)).toBeNull()
	})

	it('returns the other folder when the suite lives elsewhere', () => {
		expect(findForeignHome(['/Users/me/NEL-firm/todolaw-suite'], home)).toBe(
			'/Users/me/NEL-firm/todolaw-suite'
		)
	})

	it('reports the foreign dir even mixed with our own', () => {
		expect(findForeignHome([home, '/opt/elsewhere'], home)).toBe('/opt/elsewhere')
	})

	it('is trailing-slash insensitive and skips blank labels', () => {
		expect(findForeignHome([`${home}/`, ''], home)).toBeNull()
		expect(findForeignHome(['  ', '/other/'], home)).toBe('/other')
	})
})
