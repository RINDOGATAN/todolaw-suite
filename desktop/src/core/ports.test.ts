import { describe, it, expect } from 'vitest'
import { portsToProbe, busyPorts } from './ports'

describe('portsToProbe (suite.sh check_ports)', () => {
	it('probes all three suite ports when nothing of ours is running', () => {
		expect(portsToProbe([]).map((a) => a.port)).toEqual([8485, 8486, 8487])
	})

	it('skips ports owned by our own running services (compose handles those)', () => {
		expect(portsToProbe(['dpocentral', 'aisentinel']).map((a) => a.port)).toEqual([8486])
	})

	it('probes nothing when all three apps are already running', () => {
		expect(portsToProbe(['dpocentral', 'dealroom', 'aisentinel'])).toEqual([])
	})

	it('ignores non-app services in the running list (dbs, migrators)', () => {
		expect(portsToProbe(['dpo-db', 'deal-migrator']).map((a) => a.port)).toEqual([
			8485, 8486, 8487
		])
	})
})

describe('busyPorts', () => {
	it('keeps only the ports something else already answers on', () => {
		expect(
			busyPorts([
				{ port: 8485, inUse: false },
				{ port: 8486, inUse: true },
				{ port: 8487, inUse: true }
			])
		).toEqual([8486, 8487])
	})

	it('empty when everything is free', () => {
		expect(busyPorts([{ port: 8485, inUse: false }])).toEqual([])
	})
})
