import { describe, it, expect } from 'vitest'
import { generateSecrets } from './secrets'

describe('generateSecrets', () => {
	it('mints exactly the .env secret set suite.sh generates', () => {
		const s = generateSecrets()
		expect(Object.keys(s).sort()).toEqual([
			'AIS_DB_PASSWORD',
			'BACKUP_PASSPHRASE',
			'BRIDGE_API_KEY',
			'DEAL_DB_PASSWORD',
			'DPO_DB_PASSWORD',
			'NEXTAUTH_SECRET'
		])
	})

	it('shapes the hex secrets like `openssl rand -hex 24` (48 hex chars)', () => {
		const s = generateSecrets()
		for (const v of [s.DPO_DB_PASSWORD, s.DEAL_DB_PASSWORD, s.AIS_DB_PASSWORD, s.BRIDGE_API_KEY]) {
			expect(v).toMatch(/^[0-9a-f]{48}$/)
		}
	})

	it('shapes NEXTAUTH_SECRET like `openssl rand -base64 32` (44 chars, decodes to 32 bytes)', () => {
		const v = generateSecrets().NEXTAUTH_SECRET
		expect(v).toMatch(/^[A-Za-z0-9+/]{43}=$/)
		expect(Buffer.from(v, 'base64').length).toBe(32)
	})

	it('shapes BACKUP_PASSPHRASE like `openssl rand -base64 24` (32 chars, decodes to 24 bytes)', () => {
		const v = generateSecrets().BACKUP_PASSPHRASE
		expect(v).toMatch(/^[A-Za-z0-9+/]{32}$/)
		expect(Buffer.from(v, 'base64').length).toBe(24)
	})

	it('emits no whitespace in any value (safe as bare KEY=VALUE .env lines)', () => {
		for (const v of Object.values(generateSecrets())) {
			expect(v).not.toMatch(/\s/)
		}
	})

	it('gives each database its own password', () => {
		const s = generateSecrets()
		expect(new Set([s.DPO_DB_PASSWORD, s.DEAL_DB_PASSWORD, s.AIS_DB_PASSWORD]).size).toBe(3)
	})

	it('is deterministic given an injected RNG (for reproducible tests)', () => {
		let n = 0
		const rng = (len: number) => Buffer.alloc(len, ++n)
		let m = 0
		const rng2 = (len: number) => Buffer.alloc(len, ++m)
		expect(generateSecrets(rng)).toEqual(generateSecrets(rng2))
	})

	it('is overwhelmingly likely to differ between real calls', () => {
		expect(generateSecrets().NEXTAUTH_SECRET).not.toBe(generateSecrets().NEXTAUTH_SECRET)
	})
})
