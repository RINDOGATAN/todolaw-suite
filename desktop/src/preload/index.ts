import { contextBridge, ipcRenderer } from 'electron'

/** Typed bridge the renderer uses; no Node/Electron exposed beyond these calls. */
const api = {
	isFirstRun: (): Promise<boolean> => ipcRenderer.invoke('config:isFirstRun'),
	probeEngine: (): Promise<unknown> => ipcRenderer.invoke('engine:probe'),
	openDockerDownload: (): Promise<void> => ipcRenderer.invoke('engine:openDockerDownload'),
	openApp: (service: string): Promise<void> => ipcRenderer.invoke('app:open', service),
	status: (): Promise<unknown> => ipcRenderer.invoke('suite:status'),
	home: (): Promise<string> => ipcRenderer.invoke('suite:home'),
	install: (): Promise<unknown> => ipcRenderer.invoke('suite:install'),
	start: (): Promise<unknown> => ipcRenderer.invoke('suite:start'),
	stop: (): Promise<unknown> => ipcRenderer.invoke('suite:stop'),
	update: (): Promise<unknown> => ipcRenderer.invoke('suite:update'),
	backup: (): Promise<unknown> => ipcRenderer.invoke('suite:backup'),
	onProgress: (cb: (line: string) => void): void => {
		ipcRenderer.on('suite:progress', (_e, line: string) => cb(line))
	}
}

contextBridge.exposeInMainWorld('todolaw', api)
export type TodolawBridge = typeof api
