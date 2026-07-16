/**
 * The two install-safety guards ported from suite.sh, as pure functions. The caller
 * (main/orchestrator.ts) runs the read-only docker commands and passes us the output.
 */

/** Data volumes a previous install would have left behind (suite.sh ensure_env). */
export const DATA_VOLUME_RE = /^todolaw-suite_(dpo|deal|ais)-data$/

/** Split raw line-oriented docker output into unique, non-empty, trimmed lines. */
export function parseLines(raw: string): string[] {
	const seen = new Set<string>()
	for (const line of raw.split('\n')) {
		const t = line.trim()
		if (t) seen.add(t)
	}
	return [...seen]
}

/** The suite data volumes present in a `docker volume ls -q` listing. */
export function findSuiteDataVolumes(volumeNames: string[]): string[] {
	return volumeNames.filter((v) => DATA_VOLUME_RE.test(v))
}

export interface PreviousInstallCheck {
	blocked: boolean
	volumes: string[]
}

/**
 * Previous-install guard (suite.sh ensure_env): data volumes from an earlier install
 * exist but there is no .env. The .env holds the passwords to that data — newly
 * generated random passwords would NOT open the old databases — so block with a clear
 * message instead of silently stranding the data. An existing .env adopts the install.
 */
export function checkPreviousInstall(volumeNames: string[], envExists: boolean): PreviousInstallCheck {
	const volumes = findSuiteDataVolumes(volumeNames)
	return { blocked: volumes.length > 0 && !envExists, volumes }
}

/** Trailing-slash-insensitive path comparison (labels never need more than that). */
const normalize = (p: string): string => (p.length > 1 ? p.replace(/\/+$/, '') : p)

/**
 * One-home guard (suite.sh check_home): one computer runs ONE copy of the suite, from
 * ONE folder. Given the com.docker.compose.project.working_dir labels of every
 * container in project "todolaw-suite", return the first directory that is NOT our
 * install home — the caller must refuse and point the user at that folder. For M1
 * this is refuse-only (same as suite.sh); adopt-or-migrate is a later refinement.
 */
export function findForeignHome(workingDirs: string[], home: string): string | null {
	const ours = normalize(home)
	for (const dir of workingDirs) {
		const d = normalize(dir.trim())
		if (d && d !== ours) return d
	}
	return null
}
