import { renderWizard } from './wizard'
import { renderPanel } from './panel'
import { t } from '../core/i18n'
import type { Locale } from '../core/i18n'
import type { TodolawBridge } from '../preload'

declare global {
	interface Window {
		todolaw: TodolawBridge
	}
}

const root = document.getElementById('root')!

const LOCALE_KEY = 'todolaw.locale'

export function getLocale(): Locale {
	return localStorage.getItem(LOCALE_KEY) === 'es' ? 'es' : 'en'
}

let view: 'wizard' | 'panel' = 'wizard'

function render(): void {
	const locale = getLocale()
	root.innerHTML = ''

	const header = document.createElement('header')
	header.className = 'appbar'
	header.innerHTML = `
		<h1>${t('app.title', locale)}</h1>
		<div class="langs">
			<button id="lang-en" class="lang ${locale === 'en' ? 'active' : ''}">EN</button>
			<button id="lang-es" class="lang ${locale === 'es' ? 'active' : ''}">ES</button>
		</div>
	`
	root.appendChild(header)

	const body = document.createElement('div')
	root.appendChild(body)

	const setLocale = (next: Locale): void => {
		localStorage.setItem(LOCALE_KEY, next)
		render() // re-render the current view in the new language
	}
	header.querySelector('#lang-en')!.addEventListener('click', () => setLocale('en'))
	header.querySelector('#lang-es')!.addEventListener('click', () => setLocale('es'))

	if (view === 'wizard') {
		renderWizard(body, locale, () => {
			view = 'panel'
			render()
		})
	} else {
		renderPanel(body, locale)
	}
}

async function main(): Promise<void> {
	const firstRun = await window.todolaw.isFirstRun()
	view = firstRun ? 'wizard' : 'panel'
	render()
}

main()
