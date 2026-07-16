import { describe, it, expect } from 'vitest'
import { STRINGS, LOCALES, t } from './i18n'
import type { StringKey } from './i18n'

const keys = Object.keys(STRINGS) as StringKey[]

describe('string table', () => {
	it('covers every key in both English and Castilian Spanish, non-empty', () => {
		for (const key of keys) {
			for (const locale of LOCALES) {
				expect(STRINGS[key][locale], `${key}.${locale}`).toBeTruthy()
			}
		}
	})

	it('keeps matching {placeholders} across the two locales of each key', () => {
		const names = (s: string): string[] => (s.match(/\{[a-z]+\}/gi) ?? []).sort()
		for (const key of keys) {
			expect(names(STRINGS[key].es), key).toEqual(names(STRINGS[key].en))
		}
	})
})

describe('Castilian (Peninsular) Spanish', () => {
	const allEs = keys.map((k) => STRINGS[k].es).join('\n')

	it('says "ordenador" (never the Latin American "computadora")', () => {
		expect(allEs).toMatch(/ordenador/)
		expect(allEs.toLowerCase()).not.toMatch(/computador/)
	})

	it('says "copia de seguridad" (never "respaldo")', () => {
		expect(allEs).toMatch(/copia de seguridad/i)
		expect(allEs.toLowerCase()).not.toMatch(/respald/)
	})

	it('keeps the firm as "despacho" in the Dealroom blurb', () => {
		expect(STRINGS['blurb.dealroom'].es).toMatch(/despacho/)
	})

	it('uses "archivo de ajustes"/"aplicación" phrasing, not "aplicativo"', () => {
		expect(allEs.toLowerCase()).not.toMatch(/aplicativo/)
	})
})

describe('t', () => {
	it('returns the raw string for the requested locale', () => {
		expect(t('panel.stop', 'en')).toBe('Stop')
		expect(t('panel.stop', 'es')).toBe('Parar')
	})

	it('fills every occurrence of a {placeholder}', () => {
		expect(t('error.generic', 'en', { detail: 'boom' })).toBe('Something went wrong: boom')
		expect(t('error.otherHome', 'es', { detail: '/otra/carpeta' })).toContain('/otra/carpeta')
	})

	it('fills multiple distinct placeholders', () => {
		const out = t('error.previousInstall', 'en', { home: '/Users/x/todo-law', detail: 'vol-a, vol-b' })
		expect(out).toContain('/Users/x/todo-law')
		expect(out).toContain('vol-a, vol-b')
	})
})
