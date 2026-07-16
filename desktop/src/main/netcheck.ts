import { createConnection } from 'node:net'

/**
 * Port pre-flight probe (suite.sh port_in_use, which uses /dev/tcp): something is
 * using the port iff a loopback TCP connect succeeds. Errors and timeouts both read
 * as "free" — the honest failure then surfaces later as a FAILED stack state.
 */
export function isPortInUse(port: number, host = '127.0.0.1', timeoutMs = 750): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = createConnection({ port, host, timeout: timeoutMs })
		const done = (inUse: boolean): void => {
			socket.destroy()
			resolve(inUse)
		}
		socket.once('connect', () => done(true))
		socket.once('timeout', () => done(false))
		socket.once('error', () => done(false))
	})
}
