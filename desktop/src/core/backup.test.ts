import { describe, it, expect } from 'vitest'
import { gzipSync, gunzipSync } from 'node:zlib'
import {
	encryptBackup,
	decryptBackup,
	deriveKeyIv,
	opensslHeader,
	createBackupCipher,
	backupFileName,
	OPENSSL_MAGIC
} from './backup'

const salt = Buffer.from('0102030405060708', 'hex')
const pass = 'test-passphrase'

describe('encryptBackup — openssl enc compatibility', () => {
	it('matches a real `openssl enc -aes-256-cbc -pbkdf2` vector byte-for-byte', () => {
		// Vector produced on this machine (OpenSSL 3.6.3):
		//   printf 'todo.law backup vector\n' \
		//     | openssl enc -aes-256-cbc -pbkdf2 -S 0102030405060708 -pass pass:test-passphrase
		// (-S emits the raw ciphertext without the header; -salt prepends Salted__ + salt,
		//  which opensslHeader reproduces — suite.sh restore expects that headered form.)
		const ct = 'f85e6efdfd8d871b54edbc5fa55f2be89171092bfaf6473e6b2770bb5887efa2'
		const expected = Buffer.concat([opensslHeader(salt), Buffer.from(ct, 'hex')])
		const out = encryptBackup(Buffer.from('todo.law backup vector\n'), pass, salt)
		expect(out.equals(expected)).toBe(true)
	})

	it('writes the Salted__ magic + 8-byte salt header openssl -salt produces', () => {
		const out = encryptBackup(Buffer.from('x'), pass, salt)
		expect(out.subarray(0, 8).equals(OPENSSL_MAGIC)).toBe(true)
		expect(out.subarray(8, 16).equals(salt)).toBe(true)
	})

	it('round-trips a gzipped dump (the actual backup pipeline shape)', () => {
		const dump = Buffer.from('-- PostgreSQL database dump\nCREATE TABLE t (id int);\n')
		const enc = encryptBackup(gzipSync(dump), pass)
		expect(gunzipSync(decryptBackup(enc, pass)).equals(dump)).toBe(true)
	})

	it('salts randomly by default (two encryptions of one plaintext differ)', () => {
		const plain = Buffer.from('same input')
		expect(encryptBackup(plain, pass).equals(encryptBackup(plain, pass))).toBe(false)
	})
})

describe('decryptBackup', () => {
	it('rejects data without the OpenSSL header', () => {
		expect(() => decryptBackup(Buffer.from('garbage-not-salted'), pass)).toThrow(/Salted__/)
	})

	it('fails on a wrong passphrase (CBC padding check)', () => {
		const enc = encryptBackup(Buffer.from('secret'), pass)
		expect(() => decryptBackup(enc, 'wrong-passphrase')).toThrow()
	})
})

describe('deriveKeyIv / createBackupCipher', () => {
	it('derives 32-byte key + 16-byte iv via PBKDF2-SHA256/10000 (openssl -pbkdf2 defaults)', () => {
		const { key, iv } = deriveKeyIv(pass, salt)
		expect(key.length).toBe(32)
		expect(iv.length).toBe(16)
	})

	it('streams to the same bytes as the one-shot encrypt (header + cipher pieces)', () => {
		const plain = Buffer.from('stream me in pieces please')
		const { header, cipher } = createBackupCipher(pass, salt)
		const streamed = Buffer.concat([
			header,
			cipher.update(plain.subarray(0, 7)),
			cipher.update(plain.subarray(7)),
			cipher.final()
		])
		expect(streamed.equals(encryptBackup(plain, pass, salt))).toBe(true)
	})
})

describe('backupFileName', () => {
	it('formats like suite.sh: <app>-YYYYMMDD-HHMMSS.sql.gz.enc', () => {
		const when = new Date(2026, 6, 16, 9, 5, 3) // 2026-07-16 09:05:03 local
		expect(backupFileName('dpocentral', when)).toBe('dpocentral-20260716-090503.sql.gz.enc')
	})
})
