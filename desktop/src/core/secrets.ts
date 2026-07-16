import { randomBytes } from 'node:crypto'

/**
 * The secrets suite.sh's ensure_env generates into ~/todo-law/.env — same names,
 * same shapes (openssl rand -hex 24 / -base64 32 / -base64 24), minted here with
 * node crypto instead of openssl. Generated ONCE and never overwritten: new random
 * passwords would not open the existing databases (see store.ts ensureEnvFile).
 */
export interface SuiteSecrets {
	DPO_DB_PASSWORD: string
	DEAL_DB_PASSWORD: string
	AIS_DB_PASSWORD: string
	/** Session signing secret shared by the three apps. */
	NEXTAUTH_SECRET: string
	/** Same key on DPO Central + AI Sentinel turns on the cross-app bridge. */
	BRIDGE_API_KEY: string
	/** Encrypts backup files (openssl aes-256-cbc -pbkdf2 compatible — core/backup.ts). */
	BACKUP_PASSPHRASE: string
}

/** Injectable RNG so tests can be deterministic; defaults to crypto.randomBytes. */
export type Rng = (n: number) => Buffer

/** `openssl rand -hex N` equivalent: N random bytes as lowercase hex (2N chars). */
const hex = (bytes: number, rng: Rng): string => rng(bytes).toString('hex')

/** `openssl rand -base64 N` equivalent: N random bytes as standard base64 (padded). */
const b64 = (bytes: number, rng: Rng): string => rng(bytes).toString('base64')

export function generateSecrets(rng: Rng = randomBytes): SuiteSecrets {
	return {
		DPO_DB_PASSWORD: hex(24, rng),
		DEAL_DB_PASSWORD: hex(24, rng),
		AIS_DB_PASSWORD: hex(24, rng),
		NEXTAUTH_SECRET: b64(32, rng),
		BRIDGE_API_KEY: hex(24, rng),
		BACKUP_PASSPHRASE: b64(24, rng)
	}
}
