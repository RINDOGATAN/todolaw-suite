/**
 * All user-facing strings, English + Castilian (Peninsular) Spanish. A plain table
 * keeps this testable (i18n.test.ts asserts both locales cover every key, and that
 * the Spanish stays Castilian: "ordenador", "copia de seguridad" — never the Latin
 * American "computadora" / "respaldo"). {name} placeholders are filled by t().
 */
export type Locale = 'en' | 'es'

export const LOCALES: readonly Locale[] = ['en', 'es']

interface Entry {
	en: string
	es: string
}

export const STRINGS = {
	// --- app chrome ---------------------------------------------------------
	'app.title': { en: 'TODO.LAW Suite', es: 'Suite TODO.LAW' },

	// --- wizard: welcome ------------------------------------------------------
	'welcome.title': { en: 'Welcome to the TODO.LAW Suite', es: 'Bienvenido a la suite TODO.LAW' },
	'welcome.body': {
		en: 'Three legal tools — DPO Central, Dealroom and AI Sentinel — installed and run entirely on this computer. Your data lives here, in local databases; nothing is sent to any cloud.',
		es: 'Tres herramientas jurídicas — DPO Central, Dealroom y AI Sentinel — instaladas y ejecutadas íntegramente en este ordenador. Tus datos viven aquí, en bases de datos locales; nada se envía a ninguna nube.'
	},
	'welcome.next': { en: 'Get started', es: 'Empezar' },

	// --- wizard: docker step --------------------------------------------------
	'docker.title': { en: 'Docker Desktop', es: 'Docker Desktop' },
	'docker.body': {
		en: 'The suite runs inside Docker Desktop, a free program that keeps everything in its own compartment on this computer.',
		es: 'La suite se ejecuta dentro de Docker Desktop, un programa gratuito que lo mantiene todo en su propio compartimento en este ordenador.'
	},
	'docker.firstOpen': {
		en: "The first time you open Docker Desktop it asks you to accept its licence agreement, and on a Mac to enter your computer's password. That is normal — accept both, leave Docker open, and this step turns green by itself as soon as Docker answers.",
		es: 'La primera vez que abras Docker Desktop te pedirá aceptar su acuerdo de licencia y, en un Mac, introducir la contraseña de tu ordenador. Es normal: acepta ambas cosas, deja Docker abierto y este paso se pondrá verde por sí solo en cuanto Docker responda.'
	},
	'docker.download': { en: 'Download Docker Desktop', es: 'Descargar Docker Desktop' },
	'docker.checking': { en: 'Checking for Docker…', es: 'Comprobando Docker…' },
	'docker.absent': {
		en: 'Docker is not installed on this computer.',
		es: 'Docker no está instalado en este ordenador.'
	},
	'docker.notRunning': {
		en: 'Docker is installed but not running. Open the Docker Desktop application (the whale icon) and wait until it says it is running.',
		es: 'Docker está instalado pero no en marcha. Abre la aplicación Docker Desktop (el icono de la ballena) y espera a que indique que está en funcionamiento.'
	},
	'docker.ready': { en: 'Docker is running.', es: 'Docker está en marcha.' },

	// --- wizard: install step ---------------------------------------------------
	'install.title': { en: 'Install the suite', es: 'Instalar la suite' },
	'install.body': {
		en: 'The first install downloads the three apps (a few minutes) and starts them. Your passwords and keys are generated on this computer and kept in a private settings file.',
		es: 'La primera instalación descarga las tres aplicaciones (unos minutos) y las arranca. Tus contraseñas y claves se generan en este ordenador y se guardan en un archivo de ajustes privado.'
	},
	'install.button': { en: 'Install and start', es: 'Instalar y arrancar' },
	'install.working': {
		en: 'Installing… the first run can take a few minutes.',
		es: 'Instalando… la primera vez puede tardar unos minutos.'
	},
	'install.done': { en: 'The suite is installed and starting.', es: 'La suite está instalada y arrancando.' },

	// --- common ----------------------------------------------------------------
	'common.continue': { en: 'Continue', es: 'Continuar' },
	'common.back': { en: 'Back', es: 'Atrás' },

	// --- panel -------------------------------------------------------------------
	'panel.status': { en: 'Status', es: 'Estado' },
	'panel.start': { en: 'Start', es: 'Arrancar' },
	'panel.stop': { en: 'Stop', es: 'Parar' },
	'panel.backup': { en: 'Back up', es: 'Copia de seguridad' },
	'panel.update': { en: 'Update', es: 'Actualizar' },
	'panel.working': { en: 'Working…', es: 'En ello…' },
	'panel.open': { en: 'Open', es: 'Abrir' },
	'app.running': { en: 'Running', es: 'En marcha' },
	'app.stopped': { en: 'Stopped', es: 'Parada' },

	// --- suite states -------------------------------------------------------------
	'state.RUNNING': { en: 'Running', es: 'En marcha' },
	'state.STOPPED': { en: 'Stopped', es: 'Parada' },
	'state.STACK_STARTING': { en: 'Starting…', es: 'Arrancando…' },
	'state.NO_ENGINE': { en: 'Docker is not running', es: 'Docker no está en marcha' },
	'state.FAILED': { en: 'Something went wrong', es: 'Algo ha ido mal' },

	// --- app blurbs (suite.sh app_blurb) --------------------------------------------
	'blurb.dpocentral': {
		en: 'Privacy-programme management (GDPR records, DPIAs…)',
		es: 'Gestión del programa de privacidad (registros RGPD, EIPD…)'
	},
	'blurb.dealroom': {
		en: 'Deal and contract negotiation rooms for your firm',
		es: 'Salas de negociación de contratos y operaciones para tu despacho'
	},
	'blurb.aisentinel': {
		en: 'AI-governance register and assessments',
		es: 'Registro y evaluaciones de gobernanza de IA'
	},

	// --- action results ---------------------------------------------------------------
	'stop.done': {
		en: 'Everything stopped. Your data is kept.',
		es: 'Todo parado. Tus datos se conservan.'
	},
	'update.done': { en: 'Updated and running.', es: 'Actualizada y en marcha.' },
	'backup.done': {
		en: 'Encrypted backups written to {dir}. They are encrypted with the BACKUP_PASSPHRASE in your settings file — keep a copy of that file somewhere safe.',
		es: 'Copias de seguridad cifradas guardadas en {dir}. Están cifradas con la BACKUP_PASSPHRASE de tu archivo de ajustes; guarda una copia de ese archivo en un lugar seguro.'
	},
	'backup.ok': { en: '{app}: backup written', es: '{app}: copia de seguridad guardada' },
	'backup.skipped': {
		en: '{app}: its database is not running — skipped. Start the suite first.',
		es: '{app}: su base de datos no está en marcha; omitida. Arranca antes la suite.'
	},
	'backup.failed': { en: '{app}: backup failed.', es: '{app}: la copia de seguridad ha fallado.' },

	// --- guard / error messages ----------------------------------------------------------
	'error.previousInstall': {
		en: 'Found data from a previous installation, but no settings file (.env) in {home}. That file holds the passwords to the old data; without it the old databases cannot be opened. Put your saved .env back in {home} and try again — or, if that old data does not matter, remove the Docker volumes ({detail}) and try again.',
		es: 'Se han encontrado datos de una instalación anterior, pero no hay archivo de ajustes (.env) en {home}. Ese archivo contiene las contraseñas de esos datos; sin él, las bases de datos antiguas no se pueden abrir. Vuelve a colocar tu .env guardado en {home} e inténtalo de nuevo; o, si esos datos antiguos no importan, elimina los volúmenes de Docker ({detail}) e inténtalo de nuevo.'
	},
	'error.otherHome': {
		en: 'The suite already lives in another folder on this computer: {detail}. One computer runs one copy of the suite, from one folder — use that one. (Moving the install? Stop and remove the old folder’s containers first.)',
		es: 'La suite ya vive en otra carpeta de este ordenador: {detail}. Un ordenador ejecuta una sola copia de la suite, desde una sola carpeta; usa esa. (¿Quieres mover la instalación? Antes para y elimina los contenedores de la carpeta antigua.)'
	},
	'error.portsBusy': {
		en: 'Another program on this computer is already using port(s) {detail}. The suite needs ports 8485, 8486 and 8487, and it refuses to fight over them. Quit the other program and try again.',
		es: 'Otro programa de este ordenador ya está usando el puerto o puertos {detail}. La suite necesita los puertos 8485, 8486 y 8487, y se niega a pelear por ellos. Cierra el otro programa e inténtalo de nuevo.'
	},
	'error.noEngine': {
		en: "Docker isn't running. Start Docker Desktop and try again.",
		es: 'Docker no está en marcha. Abre Docker Desktop e inténtalo de nuevo.'
	},
	'error.notInstalled': {
		en: 'The suite is not installed yet — run the setup first.',
		es: 'La suite todavía no está instalada; completa antes la configuración.'
	},
	'error.noPassphrase': {
		en: 'No BACKUP_PASSPHRASE in the settings file — cannot encrypt a backup.',
		es: 'No hay BACKUP_PASSPHRASE en el archivo de ajustes; no se puede cifrar la copia de seguridad.'
	},
	'error.generic': { en: 'Something went wrong: {detail}', es: 'Algo ha ido mal: {detail}' }
} satisfies Record<string, Entry>

export type StringKey = keyof typeof STRINGS

/** Look up a string in a locale, filling {name} placeholders from params. */
export function t(key: StringKey, locale: Locale, params?: Record<string, string>): string {
	let text: string = STRINGS[key][locale]
	if (params) {
		for (const [name, value] of Object.entries(params)) {
			text = text.split(`{${name}}`).join(value)
		}
	}
	return text
}
