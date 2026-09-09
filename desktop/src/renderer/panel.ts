/**
 * Done panel: one card per app (name, blurb, running state, Open) + the suite-wide
 * actions — Stop, Start, Back up (encrypted, suite.sh-compatible), Update. State is
 * a 5-second `docker compose ps` snapshot poll, same cadence as the reference.
 */
import { APPS, appUrl } from '../core/types'
import { isServiceUp } from '../core/state'
import { t } from '../core/i18n'
import type { Locale, StringKey } from '../core/i18n'
import type { ServiceStatus, SuiteState } from '../core/types'
import { errorText } from './wizard'

interface Snapshot {
	state: SuiteState
	services: ServiceStatus[]
	engineMessage?: string
}

interface BackupOutcome {
	service: string
	status: 'ok' | 'skipped' | 'failed'
	file?: string
}

type ActionResult = { ok: boolean; code?: string; detail?: string; results?: BackupOutcome[]; dir?: string }

let tickTimer: number | undefined

export function renderPanel(root: HTMLElement, locale: Locale): void {
	if (tickTimer !== undefined) clearInterval(tickTimer)

	root.innerHTML = `
		<p>${t('panel.status', locale)}: <span class="state" id="state">…</span></p>
		<div class="cards">
			${APPS.map(
				(app) => `
				<section class="card" id="card-${app.service}">
					<h3>${app.title}</h3>
					<p class="blurb">${t(`blurb.${app.service}` as StringKey, locale)}</p>
					<p class="appstate stopped" id="state-${app.service}">${t('app.stopped', locale)}</p>
					<p class="addr">${appUrl(app)}</p>
					<button id="open-${app.service}" disabled>${t('panel.open', locale)}</button>
				</section>`
			).join('')}
		</div>
		<div class="step actions">
			<button id="start" class="secondary">${t('panel.start', locale)}</button>
			<button id="stop" class="secondary">${t('panel.stop', locale)}</button>
			<button id="backup" class="secondary">${t('panel.backup', locale)}</button>
			<button id="update" class="secondary">${t('panel.update', locale)}</button>
		</div>
		<p id="msg"></p>
		<pre id="progress" class="progress" style="display:none"></pre>
	`

	const stateEl = root.querySelector('#state') as HTMLElement
	const msgEl = root.querySelector('#msg') as HTMLElement
	const progressEl = root.querySelector('#progress') as HTMLElement
	const buttons = ['start', 'stop', 'backup', 'update'].map(
		(id) => root.querySelector(`#${id}`) as HTMLButtonElement
	)

	const MAX_LINES = 400
	window.todolaw.onProgress((line) => {
		const lines = (progressEl.textContent + line + '\n').split('\n')
		if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES)
		progressEl.textContent = lines.join('\n')
		progressEl.scrollTop = progressEl.scrollHeight
	})

	const apply = (snap: Snapshot): void => {
		stateEl.textContent = t(`state.${snap.state}` as StringKey, locale)
		for (const app of APPS) {
			const up = isServiceUp(snap.services, app.service)
			const cardState = root.querySelector(`#state-${app.service}`) as HTMLElement
			const open = root.querySelector(`#open-${app.service}`) as HTMLButtonElement
			cardState.textContent = up ? t('app.running', locale) : t('app.stopped', locale)
			cardState.className = `appstate ${up ? 'running' : 'stopped'}`
			open.disabled = !up
		}
	}

	const tick = async (): Promise<void> => {
		const snap = (await window.todolaw.status()) as Snapshot
		if (snap) apply(snap)
	}

	for (const app of APPS) {
		root
			.querySelector(`#open-${app.service}`)!
			.addEventListener('click', () => window.todolaw.openApp(app.service))
	}

	const runAction = async (
		action: () => Promise<unknown>,
		doneText: (res: ActionResult) => string,
		showProgress: boolean
	): Promise<void> => {
		buttons.forEach((b) => (b.disabled = true))
		msgEl.className = 'muted'
		msgEl.textContent = t('panel.working', locale)
		if (showProgress) progressEl.style.display = 'block'
		const res = (await action()) as ActionResult
		if (res.ok) {
			msgEl.className = 'ok'
			msgEl.textContent = doneText(res)
		} else {
			msgEl.className = 'bad'
			msgEl.textContent = await errorText(res.code ?? 'generic', res.detail, locale)
		}
		buttons.forEach((b) => (b.disabled = false))
		tick()
	}

	root.querySelector('#start')!.addEventListener('click', () =>
		runAction(() => window.todolaw.start(), () => t('start.done', locale), true)
	)
	root.querySelector('#stop')!.addEventListener('click', () =>
		runAction(() => window.todolaw.stop(), () => t('stop.done', locale), false)
	)
	root.querySelector('#update')!.addEventListener('click', () =>
		runAction(() => window.todolaw.update(), () => t('update.done', locale), true)
	)
	root.querySelector('#backup')!.addEventListener('click', () =>
		runAction(
			() => window.todolaw.backup(),
			(res) => {
				const titles = new Map(APPS.map((a) => [a.service, a.title]))
				const lines = (res.results ?? []).map((r) => {
					const key: StringKey =
						r.status === 'ok' ? 'backup.ok' : r.status === 'skipped' ? 'backup.skipped' : 'backup.failed'
					return t(key, locale, { app: titles.get(r.service) ?? r.service })
				})
				return [...lines, t('backup.done', locale, { dir: res.dir ?? '' })].join(' — ')
			},
			false
		)
	)

	tick()
	tickTimer = window.setInterval(tick, 5000)
}
