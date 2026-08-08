import { describe, it, expect } from 'vitest'
import { parseConfig, adoptDecision } from './adopt'

describe('parseConfig', () => {
	it('accepts a valid config with an absolute suiteHome', () => {
		expect(parseConfig('{"suiteHome":"/Users/x/NEL/todolaw-suite"}')).toEqual({
			suiteHome: '/Users/x/NEL/todolaw-suite'
		})
	})
	it('ignores extra keys', () => {
		expect(parseConfig('{"suiteHome":"/a","future":1}')).toEqual({ suiteHome: '/a' })
	})
	it('rejects a relative suiteHome', () => {
		expect(parseConfig('{"suiteHome":"todo-law"}')).toEqual({})
	})
	it('rejects wrong types', () => {
		expect(parseConfig('{"suiteHome":42}')).toEqual({})
		expect(parseConfig('["\\/a"]')).toEqual({})
		expect(parseConfig('null')).toEqual({})
	})
	it('tolerates a corrupt file', () => {
		expect(parseConfig('not json {')).toEqual({})
		expect(parseConfig('')).toEqual({})
	})
})

describe('adoptDecision', () => {
	it('adopts a foreign home that has a .env', () => {
		expect(adoptDecision('/Users/x/kit', true)).toEqual({ ok: true, home: '/Users/x/kit' })
	})
	it('refuses when there is nothing to adopt', () => {
		expect(adoptDecision(null, false)).toEqual({ ok: false, code: 'no-foreign', detail: '' })
	})
	it('refuses a foreign home without a .env (passwords would be lost)', () => {
		expect(adoptDecision('/Users/x/kit', false)).toEqual({
			ok: false,
			code: 'adopt-no-env',
			detail: '/Users/x/kit'
		})
	})
})
