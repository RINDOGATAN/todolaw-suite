/**
 * First-run wizard: Welcome → Docker → Install. No secrets are typed anywhere —
 * the .env is generated (once) by the main process, mirroring suite.sh ensure_env.
 * The Docker step polls `docker info` every few seconds and turns green by itself
 * when the engine answers; the Install step streams pull/up progress lines.
 * The step survives a locale-toggle re-render (module-level `step`).
 */
import { t } from '../core/i18n'
import type { Locale, StringKey } from '../core/i18n'

interface EngineProbe {
	status: 'absent' | 'present' | 'error'
	version?: string
}

type ActionResult = { ok: boolean; code?: string; detail?: string }

type Step = 'welcome' | 'docker' | 'install'
let step: Step = 'welcome'

let pollTimer: number | undefined

function stopPolling(): void {
	if (pollTimer !== undefined) {
		clearInterval(pollTimer)
		pollTimer = undefined
	}
}

/** Map a main-process error code to its localized message. */
export async function errorText(code: string, detail: string | undefined, locale: Locale): Promise<string> {
	const keys: Record<string, StringKey> = {
		'no-engine': 'error.noEngine',
		'other-home': 'error.otherHome',
		'previous-install': 'error.previousInstall',
		'ports-busy': 'error.portsBusy',
		'not-installed': 'error.notInstalled',
		'no-passphrase': 'error.noPassphrase'
	}
	const key = keys[code] ?? 'error.generic'
	const home = key === 'error.previousInstall' ? await window.todolaw.home() : ''
	return t(key, locale, { detail: detail ?? '', home })
}

export function renderWizard(root: HTMLElement, locale: Locale, onDone: () => void): void {
	stopPolling()
	if (step === 'welcome') renderWelcome(root, locale)
	else if (step === 'docker') renderDocker(root, locale)
	else renderInstall(root, locale, onDone)

	function goto(next: Step): void {
		step = next
		renderWizard(root, locale, onDone)
	}

	function renderWelcome(el: HTMLElement, loc: Locale): void {
		el.innerHTML = `
			<h2>${t('welcome.title', loc)}</h2>
			<p>${t('welcome.body', loc)}</p>
			<div class="step">
				<button id="next">${t('welcome.next', loc)}</button>
			</div>
		`
		el.querySelector('#next')!.addEventListener('click', () => goto('docker'))
	}

	function renderDocker(el: HTMLElement, loc: Locale): void {
		el.innerHTML = `
			<h2>${t('docker.title', loc)}</h2>
			<p>${t('docker.body', loc)}</p>
			<p class="hint">${t('docker.firstOpen', loc)}</p>
			<div class="step">
				<span id="probe" class="probe checking">${t('docker.checking', loc)}</span>
			</div>
			<div class="step">
				<button id="download" class="secondary" style="display:none">${t('docker.download', loc)}</button>
			</div>
			<div class="step">
				<button id="back" class="secondary">${t('common.back', loc)}</button>
				<button id="next" disabled>${t('common.continue', loc)}</button>
			</div>
		`
		const probe = el.querySelector('#probe') as HTMLElement
		const download = el.querySelector('#download') as HTMLButtonElement
		const next = el.querySelector('#next') as HTMLButtonElement

		const tick = async (): Promise<void> => {
			const res = (await window.todolaw.probeEngine()) as EngineProbe
			if (res.status === 'present') {
				probe.className = 'probe ok'
				probe.textContent = `${t('docker.ready', loc)}${res.version ? ` (v${res.version})` : ''}`
				download.style.display = 'none'
				next.disabled = false
			} else if (res.status === 'absent') {
				probe.className = 'probe bad'
				probe.textContent = t('docker.absent', loc)
				download.style.display = 'inline-block'
				next.disabled = true
			} else {
				probe.className = 'probe warn'
				probe.textContent = t('docker.notRunning', loc)
				download.style.display = 'inline-block'
				next.disabled = true
			}
		}
		tick()
		pollTimer = window.setInterval(tick, 3000)

		download.addEventListener('click', () => window.todolaw.openDockerDownload())
		el.querySelector('#back')!.addEventListener('click', () => goto('welcome'))
		next.addEventListener('click', () => goto('install'))
	}

	function renderInstall(el: HTMLElement, loc: Locale, done: () => void): void {
		el.innerHTML = `
			<h2>${t('install.title', loc)}</h2>
			<p>${t('install.body', loc)}</p>
			<div class="step">
				<button id="back" class="secondary">${t('common.back', loc)}</button>
				<button id="go">${t('install.button', loc)}</button>
			</div>
			<p id="status"></p>
			<div id="pp" class="passphrase-box" style="display:none"></div>
			<pre id="progress" class="progress" style="display:none"></pre>
		`
		const status = el.querySelector('#status') as HTMLElement
		const progressEl = el.querySelector('#progress') as HTMLElement
		const go = el.querySelector('#go') as HTMLButtonElement
		const back = el.querySelector('#back') as HTMLButtonElement

		const MAX_LINES = 400
		window.todolaw.onProgress((line) => {
			const lines = (progressEl.textContent + line + '\n').split('\n')
			if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES)
			progressEl.textContent = lines.join('\n')
			progressEl.scrollTop = progressEl.scrollHeight
		})

		back.addEventListener('click', () => goto('docker'))
		go.addEventListener('click', async () => {
			go.disabled = true
			back.disabled = true
			status.className = 'muted'
			status.textContent = t('install.working', loc)
			progressEl.style.display = 'block'
			const res = (await window.todolaw.install()) as ActionResult
			if (res.ok) {
				status.className = 'ok'
				status.textContent = t('install.done', loc)
				// Show the workspace passphrase the install just minted: browsers
				// will ask for it before sign-in, so the operator must see it once.
				const pp = await window.todolaw.passphrase()
				if (pp) {
					const box = el.querySelector('#pp') as HTMLElement
					box.style.display = 'block'
					box.innerHTML = `<strong>${t('install.passphraseTitle', loc)}</strong>
						<code>${pp}</code>
						<span class="muted">${t('install.passphraseNote', loc)}</span>`
				}
				step = 'welcome' // reset for a future fresh install on this machine
				stopPolling()
				done()
			} else {
				status.className = 'bad'
				status.textContent = await errorText(res.code ?? 'generic', res.detail, loc)
				go.disabled = false
				back.disabled = false
			}
		})
	}
}
