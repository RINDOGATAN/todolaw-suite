import { describe, it, expect } from 'vitest'
import { renderEnv, parseEnv, envValue, DEFAULT_VERSION } from './env'
import type { SuiteSecrets } from './secrets'

const secrets: SuiteSecrets = {
	DPO_DB_PASSWORD: 'a'.repeat(48),
	DEAL_DB_PASSWORD: 'b'.repeat(48),
	AIS_DB_PASSWORD: 'c'.repeat(48),
	NEXTAUTH_SECRET: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWY=',
	BRIDGE_API_KEY: 'd'.repeat(48),
	BACKUP_PASSPHRASE: 'cGFzc3BocmFzZS1iYXNlNjQtdmFsdWU4',
	WORKSPACE_PASSPHRASE: 'a3f2-9c1b-77de'
}

describe('renderEnv', () => {
	it('emits every key suite.sh ensure_env writes, with the same values', () => {
		const env = parseEnv(renderEnv(secrets))
		expect(env.TODOLAW_VERSION).toBe(DEFAULT_VERSION)
		expect(env.DPO_DB_PASSWORD).toBe(secrets.DPO_DB_PASSWORD)
		expect(env.DEAL_DB_PASSWORD).toBe(secrets.DEAL_DB_PASSWORD)
		expect(env.AIS_DB_PASSWORD).toBe(secrets.AIS_DB_PASSWORD)
		expect(env.NEXTAUTH_SECRET).toBe(secrets.NEXTAUTH_SECRET)
		expect(env.BRIDGE_API_KEY).toBe(secrets.BRIDGE_API_KEY)
		expect(env.BACKUP_PASSPHRASE).toBe(secrets.BACKUP_PASSPHRASE)
		expect(Object.keys(env)).toHaveLength(8)
	})

	it('defaults the version to "latest" and honours a pinned override', () => {
		expect(parseEnv(renderEnv(secrets)).TODOLAW_VERSION).toBe('latest')
		expect(parseEnv(renderEnv(secrets, 'v0.1.4')).TODOLAW_VERSION).toBe('v0.1.4')
	})

	it('keeps base64 padding intact through a parse round-trip (value contains =)', () => {
		const env = parseEnv(renderEnv(secrets))
		expect(env.NEXTAUTH_SECRET!.endsWith('=')).toBe(true)
	})

	it('emits KEY=VALUE lines whose values carry no whitespace (no newline-injection)', () => {
		for (const line of renderEnv(secrets).split('\n')) {
			if (!line || line.startsWith('#')) continue
			expect(line).toMatch(/^[A-Z0-9_]+=\S*$/)
		}
	})

	it('ends with a trailing newline (append-friendly, diff-friendly)', () => {
		expect(renderEnv(secrets).endsWith('\n')).toBe(true)
	})
})

describe('envValue', () => {
	it('reads a single value without evaluating the file (suite.sh env_value)', () => {
		const text = renderEnv(secrets)
		expect(envValue(text, 'BACKUP_PASSPHRASE')).toBe(secrets.BACKUP_PASSPHRASE)
		expect(envValue(text, 'WORKSPACE_PASSPHRASE')).toBe(secrets.WORKSPACE_PASSPHRASE)
		expect(envValue(text, 'TODOLAW_VERSION')).toBe('latest')
	})

	it('returns null for a missing key and does not match key prefixes', () => {
		expect(envValue('DPO_DB_PASSWORD_OLD=x\n', 'DPO_DB_PASSWORD')).toBeNull()
		expect(envValue('', 'NEXTAUTH_SECRET')).toBeNull()
	})

	it('returns the whole remainder even when the value itself contains =', () => {
		expect(envValue('NEXTAUTH_SECRET=abc=\n', 'NEXTAUTH_SECRET')).toBe('abc=')
	})
})

describe('parseEnv', () => {
	it('ignores comments and blank lines', () => {
		expect(parseEnv('# c\n\nA=1\n')).toEqual({ A: '1' })
	})
})
