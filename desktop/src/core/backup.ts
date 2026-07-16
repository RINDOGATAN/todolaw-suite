import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import type { Cipher } from 'node:crypto'

/**
 * OpenSSL-`enc`-compatible AES-256-CBC encryption for backups, byte-identical to
 * suite.sh cmd_backup's
 *   openssl enc -aes-256-cbc -pbkdf2 -salt -pass pass:$BACKUP_PASSPHRASE
 * so a backup written by this app restores with `./suite.sh restore` and vice versa.
 * OpenSSL's -pbkdf2 default is PBKDF2-HMAC-SHA256, 10000 iterations, deriving
 * key(32)+iv(16) in one 48-byte stretch; the file is "Salted__" + 8-byte salt + ct.
 * Verified against a real `openssl enc` vector in backup.test.ts.
 */
export const OPENSSL_MAGIC = Buffer.from('Salted__', 'ascii')
export const PBKDF2_ITERATIONS = 10_000
export const SALT_BYTES = 8

export interface KeyIv {
	key: Buffer
	iv: Buffer
}

export function deriveKeyIv(passphrase: string, salt: Buffer): KeyIv {
	const stretched = pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 48, 'sha256')
	return { key: stretched.subarray(0, 32), iv: stretched.subarray(32, 48) }
}

/** The "Salted__" + salt file header openssl writes (and expects when decrypting). */
export function opensslHeader(salt: Buffer): Buffer {
	return Buffer.concat([OPENSSL_MAGIC, salt])
}

/**
 * Streaming-friendly pieces for main-process backups: header to write first, and a
 * Cipher to pipe `pg_dump | gzip` output through (avoids buffering a whole dump).
 */
export function createBackupCipher(
	passphrase: string,
	salt: Buffer = randomBytes(SALT_BYTES)
): { header: Buffer; cipher: Cipher } {
	const { key, iv } = deriveKeyIv(passphrase, salt)
	return { header: opensslHeader(salt), cipher: createCipheriv('aes-256-cbc', key, iv) }
}

/** One-shot encrypt (tests + small payloads). Salt injectable for determinism. */
export function encryptBackup(
	plain: Buffer,
	passphrase: string,
	salt: Buffer = randomBytes(SALT_BYTES)
): Buffer {
	const { header, cipher } = createBackupCipher(passphrase, salt)
	return Buffer.concat([header, cipher.update(plain), cipher.final()])
}

/** One-shot decrypt of an openssl-format file (restore path / round-trip tests). */
export function decryptBackup(data: Buffer, passphrase: string): Buffer {
	if (data.length < 16 || !data.subarray(0, 8).equals(OPENSSL_MAGIC)) {
		throw new Error('Not an OpenSSL "Salted__" encrypted file.')
	}
	const salt = data.subarray(8, 16)
	const { key, iv } = deriveKeyIv(passphrase, salt)
	const decipher = createDecipheriv('aes-256-cbc', key, iv)
	return Buffer.concat([decipher.update(data.subarray(16)), decipher.final()])
}

/** suite.sh backup naming: <app>-YYYYMMDD-HHMMSS.sql.gz.enc (local time). */
export function backupFileName(service: string, when: Date): string {
	const p = (n: number, w = 2): string => String(n).padStart(w, '0')
	const stamp =
		`${when.getFullYear()}${p(when.getMonth() + 1)}${p(when.getDate())}` +
		`-${p(when.getHours())}${p(when.getMinutes())}${p(when.getSeconds())}`
	return `${service}-${stamp}.sql.gz.enc`
}
