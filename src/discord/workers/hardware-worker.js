const { parentPort, workerData } = require('worker_threads')
const os = require('os')
const { execFile } = require('child_process')

let lastHardware = null
let lastHardwareTime = 0
const HARDWARE_CACHE_MS = 4000
const POLL_INTERVAL_MS = 4000

let lastCpuSample = sampleCpu()
let cpuNamePromise = null
let gpuQueryPromise = null
let cpuTempPromise = null

function postHardwareStats(stats) {
	if (!parentPort) return
	parentPort.postMessage({ type: 'hardwareStats', data: stats })
}

function postHardwareError(err) {
	if (!parentPort) return
	parentPort.postMessage({
		type: 'hardwareError',
		error: err && err.message ? String(err.message) : String(err),
	})
}

function sampleCpu() {
	const cores = os.cpus()
	let idle = 0
	let total = 0
	for (const c of cores) {
		for (const t of Object.values(c.times)) total += t
		idle += c.times.idle
	}
	return { idle, total, time: Date.now() }
}

function getCpuLoadPct() {
	const next = sampleCpu()
	const idleDiff = next.idle - lastCpuSample.idle
	const totalDiff = next.total - lastCpuSample.total
	lastCpuSample = next

	if (totalDiff <= 0) return 0

	return Math.max(
		0,
		Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)),
	)
}

function cleanName(name) {
	if (!name || typeof name !== 'string') return null
	return (
		name
			.replace(/\s+/g, ' ')
			.replace(/\bIntel\(R\)\s+/gi, '')
			.replace(/\bAMD\s+/gi, '')
			.replace(/\bRyzen\s+/gi, '')
			.replace(/\bXeon\(R\)\s+/gi, '')
			.replace(/\bCore\(TM\)\s+/gi, '')
			.replace(/\bCPU\b/gi, '')
			.replace(/\bProcessor\b/gi, '')
			.replace(/\bNVIDIA\s+GeForce\s+/gi, '')
			.replace(/\bGeForce\s+/gi, '')
			.replace(/\bRadeon\s+/gi, '')
			.trim() || null
	)
}

function execFileAsync(file, args, opts = {}) {
	return new Promise((resolve, reject) => {
		execFile(file, args, opts, (err, stdout, stderr) => {
			if (err) reject(Object.assign(err, { stdout, stderr }))
			else resolve({ stdout, stderr })
		})
	})
}

async function getCpuName() {
	if (workerData && workerData.cpuName)
		return cleanName(workerData.cpuName) || 'CPU'
	if (!cpuNamePromise) {
		cpuNamePromise = (async () => {
			if (process.platform === 'win32') {
				try {
					const { stdout } = await execFileAsync(
						'wmic',
						['cpu', 'get', 'Name', '/value'],
						{ windowsHide: true },
					)
					const m = String(stdout || '').match(/Name=(.+)/i)
					if (m && m[1]) return cleanName(m[1]) || 'CPU'
				} catch {}
				try {
					const { stdout } = await execFileAsync(
						'powershell.exe',
						[
							'-NoProfile',
							'-Command',
							'(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)',
						],
						{ windowsHide: true },
					)
					const v = String(stdout || '')
						.trim()
						.split(/\r?\n/)
						.filter(Boolean)[0]
					if (v) return cleanName(v) || 'CPU'
				} catch {}
			}
			return cleanName(os.cpus()?.[0]?.model) || 'CPU'
		})()
	}
	return cpuNamePromise
}

async function getGpuStats() {
	if (process.platform !== 'win32') return []
	if (gpuQueryPromise) return gpuQueryPromise
	gpuQueryPromise = (async () => {
		const smi =
			workerData && workerData.nvidiaSmiPath
				? workerData.nvidiaSmiPath
				: 'nvidia-smi'
		const args = [
			'--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total',
			'--format=csv,noheader,nounits',
		]
		try {
			const { stdout } = await execFileAsync(smi, args, {
				windowsHide: true,
				maxBuffer: 1024 * 64,
			})
			const lines = String(stdout || '')
				.trim()
				.split(/\r?\n/)
				.filter(Boolean)
			return lines.map((line, idx) => {
				const parts = line.split(',').map(s => s.trim())
				const name = cleanName(parts[0]) || `GPU ${idx + 1}`
				const temp = Number(parts[1])
				const load = Number(parts[2])
				const used = Number(parts[3])
				const total = Number(parts[4])
				return {
					index: idx,
					name,
					model: name,
					vendor: name.toLowerCase().includes('nvidia') ? 'NVIDIA' : null,
					temp: Number.isFinite(temp) ? Math.round(temp) : null,
					load: Number.isFinite(load) ? Math.round(load) : null,
					memory: Number.isFinite(total)
						? {
								used: Number.isFinite(used) ? Math.round(used) : null,
								total: Math.round(total),
							}
						: null,
				}
			})
		} catch {
			return []
		} finally {
			gpuQueryPromise = null
		}
	})()
	return gpuQueryPromise
}

async function getCpuTemperature() {
	if (cpuTempPromise) return cpuTempPromise
	cpuTempPromise = (async () => {
		if (process.platform !== 'win32') return null
		try {
			const cmd =
				'powershell.exe -NoProfile -Command "Get-CimInstance -Namespace root/WMI -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -ExpandProperty CurrentTemperature"'
			const { stdout } = await execFileAsync(cmd, [], { windowsHide: true })
			const ktenth = String(stdout || '').trim()
			const num = Number(ktenth)
			if (Number.isFinite(num)) {
				const tempC = Math.round(num / 10 - 273.15)
				return tempC >= 0 ? tempC : null
			}
			return null
		} catch {
			return null
		} finally {
			cpuTempPromise = null
		}
	})()
	return cpuTempPromise
}

function bytesToGb(v) {
	return v / 1024 / 1024 / 1024
}

async function readHardware() {
	try {
		const [cpuName, cpuTemp, gpu] = await Promise.all([
			getCpuName(),
			getCpuTemperature(),
			getGpuStats(),
		])
		const cpuLoad = getCpuLoadPct()
		const total = os.totalmem()
		const free = os.freemem()
		const used = total - free
		return {
			cpu: {
				name: cpuName,
				load: cpuLoad,
				temp: cpuTemp,
			},
			gpu,
			memory: {
				used,
				total,
				percent: Math.round((used / total) * 100),
				usedGb: bytesToGb(used),
				totalGb: bytesToGb(total),
			},
			timestamp: Date.now(),
		}
	} catch (e) {
		postHardwareError(e)
		return {
			cpu: null,
			gpu: [],
			error: e.message || 'Failed to read hardware',
			timestamp: Date.now(),
		}
	}
}

async function calcHardwareStats() {
	const now = Date.now()
	if (lastHardware && now - lastHardwareTime < HARDWARE_CACHE_MS) {
		postHardwareStats(lastHardware)
		return lastHardware
	}
	const stats = await readHardware()
	lastHardware = stats
	lastHardwareTime = now
	postHardwareStats(stats)
	return stats
}

if (!parentPort) process.exit(1)

parentPort.on('message', msg => {
	if (msg === 'getHardwareStats') calcHardwareStats()
})

setInterval(() => {
	calcHardwareStats()
}, POLL_INTERVAL_MS)
