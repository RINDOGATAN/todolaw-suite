/**
 * Adopting an existing CLI-kit install that lives outside the default home
 * (~/todo-law). The one-home guard discovers that folder from the containers'
 * working_dir labels; instead of only refusing, the app can point itself at it —
 * the .env, compose project and backups all live there already, so every derived
 * path keeps working unchanged. The chosen home persists in the app's config file.
 * Pure decision/parsing logic here; file and docker I/O stay in main/.
 */

/** Persisted app configuration (userData/config.json). */
export interface DesktopConfig {
	suiteHome?: string
}

/** Parse the config file, tolerating a missing/corrupt file or wrong shapes. */
export function parseConfig(raw: string): DesktopConfig {
	try {
		const v: unknown = JSON.parse(raw)
		if (
			v !== null &&
			typeof v === 'object' &&
			typeof (v as Record<string, unknown>).suiteHome === 'string' &&
			((v as Record<string, unknown>).suiteHome as string).startsWith('/')
		) {
			return { suiteHome: (v as Record<string, unknown>).suiteHome as string }
		}
	} catch {
		// corrupt file → fall through to defaults
	}
	return {}
}

export type AdoptDecision =
	| { ok: true; home: string }
	| { ok: false; code: 'no-foreign' | 'adopt-no-env'; detail: string }

/**
 * Whether the discovered foreign install can be adopted. The .env is the adoption
 * contract: it holds the passwords to that install's databases (store.ts never
 * overwrites it). A folder without one cannot be safely taken over.
 */
export function adoptDecision(foreign: string | null, envExistsThere: boolean): AdoptDecision {
	if (!foreign) return { ok: false, code: 'no-foreign', detail: '' }
	if (!envExistsThere) return { ok: false, code: 'adopt-no-env', detail: foreign }
	return { ok: true, home: foreign }
}
