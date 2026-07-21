const { parentPort, workerData } = require('worker_threads')
const os = require('os')
const { execFile } = require('child_process')
const fs = require('fs')

let lastHardware = null
let lastHardwareTime = 0
const HARDWARE_CACHE_MS = 4000
const POLL_INTERVAL_MS = 4000

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

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function sampleCpu() {
	const cores = os.cpus()
	if (!cores || cores.length === 0) return { idle: 0, total: 0, time: Date.now() }

	let idle = 0
	let total = 0
	for (const c of cores) {
		for (const t of Object.values(c.times)) total += t
		idle += c.times.idle
	}
	return { idle, total, time: Date.now() }
}

async function getCpuLoadPct() {
	const start = sampleCpu()
	await delay(2000)
	const end = sampleCpu()

	const idleDiff = end.idle - start.idle
	const totalDiff = end.total - start.total

	if (totalDiff <= 0) return 0
	return Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)))
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

async function getCpuNameWindows() {
	try {
		const { stdout } = await execFileAsync('wmic', ['cpu', 'get', 'Name', '/value'], {
			windowsHide: true,
		})
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
			{ windowsHide: true }
		)
		const v = String(stdout || '')
			.trim()
			.split(/\r?\n/)
			.filter(Boolean)[0]
		if (v) return cleanName(v) || 'CPU'
	} catch {}

	return null
}

async function getCpuNameMac() {
	try {
		const { stdout } = await execFileAsync('sysctl', ['-n', 'machdep.cpu.brand_string'])
		const v = String(stdout || '').trim()
		if (v) return cleanName(v) || 'CPU'
	} catch {}
	return null
}

async function getCpuNameLinux() {
	try {
		const data = fs.readFileSync('/proc/cpuinfo', 'utf8')
		const m = data.match(/^model name\s*:\s*(.+)/im)
		if (m && m[1]) return cleanName(m[1]) || 'CPU'
	} catch {}

	try {
		const { stdout } = await execFileAsync('lscpu', [])
		const m = String(stdout || '').match(/^Model name\s*:\s*(.+)/im)
		if (m && m[1]) return cleanName(m[1]) || 'CPU'
	} catch {}

	return null
}

async function getCpuName() {
	if (workerData && workerData.cpuName) return cleanName(workerData.cpuName) || 'CPU'
	if (!cpuNamePromise) {
		cpuNamePromise = (async () => {
			let name = null
			if (process.platform === 'win32') {
				name = await getCpuNameWindows()
			} else if (process.platform === 'darwin') {
				name = await getCpuNameMac()
			} else {
				name = await getCpuNameLinux()
			}
			return name || cleanName(os.cpus()?.[0]?.model) || 'CPU'
		})()
	}
	return cpuNamePromise
}

async function getCpuTempWindows() {
	try {
		const { stdout } = await execFileAsync(
			'powershell.exe',
			[
				'-NoProfile',
				'-Command',
				'Get-CimInstance -Namespace root/WMI -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -ExpandProperty CurrentTemperature',
			],
			{ windowsHide: true, maxBuffer: 1024 * 64 }
		)
		const ktenth = String(stdout || '')
			.trim()
			.split(/\r?\n/)
			.filter(Boolean)[0]
		const num = Number(ktenth)
		if (Number.isFinite(num)) {
			const tempC = Math.round(num / 10 - 273.15)
			if (tempC >= 0 && tempC < 150) return tempC
		}
	} catch {}

	try {
		const { stdout } = await execFileAsync(
			'powershell.exe',
			[
				'-NoProfile',
				'-Command',
				'$t = Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi"; if ($t) { $t.CurrentTemperature }',
			],
			{ windowsHide: true, maxBuffer: 1024 * 64 }
		)
		const num = Number(String(stdout || '').trim())
		if (Number.isFinite(num)) {
			const tempC = Math.round(num / 10 - 273.15)
			if (tempC >= 0 && tempC < 150) return tempC
		}
	} catch {}

	return null
}

async function getCpuTempMac() {
	try {
		const { stdout } = await execFileAsync('osx-cpu-temp', ['-C'], { timeout: 3000 })
		const m = String(stdout || '').match(/([\d.]+)\s*°?C/i)
		if (m) {
			const t = parseFloat(m[1])
			if (Number.isFinite(t) && t > 0 && t < 150) return Math.round(t)
		}
	} catch {}

	try {
		const { stdout } = await execFileAsync('sysctl', ['-n', 'hw.cpufrequency'], { timeout: 2000 })
	} catch {}

	return null
}

async function getCpuTempLinux() {
	try {
		const base = '/sys/class/thermal'
		const entries = fs.readdirSync(base).filter(e => e.startsWith('thermal_zone'))
		for (const zone of entries) {
			try {
				const typeRaw = fs.readFileSync(`${base}/${zone}/type`, 'utf8').trim().toLowerCase()
				if (!typeRaw.includes('cpu') && !typeRaw.includes('x86') && !typeRaw.includes('acpi')) {
					continue
				}
				const tempRaw = Number(fs.readFileSync(`${base}/${zone}/temp`, 'utf8').trim())
				if (Number.isFinite(tempRaw)) {
					const tempC = tempRaw > 1000 ? Math.round(tempRaw / 1000) : tempRaw
					if (tempC > 0 && tempC < 150) return tempC
				}
			} catch {}
		}
	} catch {}

	try {
		const { stdout } = await execFileAsync('sensors', ['-j'], {
			maxBuffer: 1024 * 256,
			timeout: 3000,
		})
		const json = JSON.parse(String(stdout || '{}'))
		for (const chip of Object.values(json)) {
			if (typeof chip !== 'object') continue
			for (const [key, adapter] of Object.entries(chip)) {
				if (typeof adapter !== 'object') continue
				if (!/core|cpu|temp/i.test(key)) continue
				for (const [field, val] of Object.entries(adapter)) {
					if (!field.toLowerCase().includes('input')) continue
					const t = Number(val)
					if (Number.isFinite(t) && t > 0 && t < 150) return Math.round(t)
				}
			}
		}
	} catch {}

	return null
}

async function getCpuTemperature() {
	if (cpuTempPromise) return cpuTempPromise
	cpuTempPromise = (async () => {
		try {
			if (process.platform === 'win32') return await getCpuTempWindows()
			if (process.platform === 'darwin') return await getCpuTempMac()
			return await getCpuTempLinux()
		} catch {
			return null
		} finally {
			cpuTempPromise = null
		}
	})()
	return cpuTempPromise
}

async function getGpuStatsNvidiaSmi() {
	const smi = workerData && workerData.nvidiaSmiPath ? workerData.nvidiaSmiPath : 'nvidia-smi'
	const args = [
		'--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total',
		'--format=csv,noheader,nounits',
	]
	try {
		const { stdout } = await execFileAsync(smi, args, {
			windowsHide: true,
			maxBuffer: 1024 * 64,
			timeout: 5000,
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
				vendor: 'NVIDIA',
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
	}
}

async function getGpuStatsMac() {
	const gpus = []
	const nv = await getGpuStatsNvidiaSmi()
	if (nv.length) return nv

	try {
		const { stdout } = await execFileAsync('system_profiler', ['SPDisplaysDataType', '-json'], {
			maxBuffer: 1024 * 256,
			timeout: 5000,
		})
		const json = JSON.parse(String(stdout || '{}'))
		const displays = json?.SPDisplaysDataType || []
		displays.forEach((d, idx) => {
			const rawName = d?.sppci_model || d?.spdisplays_vendor || `GPU ${idx + 1}`
			gpus.push({
				index: idx,
				name: cleanName(rawName) || `GPU ${idx + 1}`,
				model: cleanName(rawName) || `GPU ${idx + 1}`,
				vendor: null,
				temp: null,
				load: null,
				memory: null,
			})
		})
	} catch {}

	return gpus
}

async function getGpuStatsLinux() {
	const nv = await getGpuStatsNvidiaSmi()
	if (nv.length) return nv

	const gpus = []
	try {
		const drmBase = '/sys/class/drm'
		const cards = fs.readdirSync(drmBase).filter(e => /^card\d+$/.test(e))
		for (const card of cards) {
			const devicePath = `${drmBase}/${card}/device`
			try {
				const vendorRaw = fs.readFileSync(`${devicePath}/vendor`, 'utf8').trim()
				const isAmd = vendorRaw === '0x1002'
				const isIntel = vendorRaw === '0x8086'
				if (!isAmd && !isIntel) continue

				let temp = null
				let load = null
				let name = isAmd ? 'AMD GPU' : 'Intel GPU'

				try {
					const hwmons = fs.readdirSync(`${devicePath}/hwmon`)
					for (const hwmon of hwmons) {
						const t = Number(
							fs.readFileSync(`${devicePath}/hwmon/${hwmon}/temp1_input`, 'utf8').trim()
						)
						if (Number.isFinite(t)) {
							temp = Math.round(t / 1000)
							break
						}
					}
				} catch {}

				try {
					const busy = Number(fs.readFileSync(`${devicePath}/gpu_busy_percent`, 'utf8').trim())
					if (Number.isFinite(busy)) load = Math.round(busy)
				} catch {}

				try {
					const productName = fs.readFileSync(`${devicePath}/product_name`, 'utf8').trim()
					if (productName) name = cleanName(productName) || name
				} catch {}

				gpus.push({
					index: gpus.length,
					name,
					model: name,
					vendor: isAmd ? 'AMD' : 'Intel',
					temp,
					load,
					memory: null,
				})
			} catch {}
		}
	} catch {}

	return gpus
}

async function getGpuStats() {
	if (gpuQueryPromise) return gpuQueryPromise
	gpuQueryPromise = (async () => {
		try {
			if (process.platform === 'win32') return await getGpuStatsNvidiaSmi()
			if (process.platform === 'darwin') return await getGpuStatsMac()
			return await getGpuStatsLinux()
		} catch {
			return []
		} finally {
			gpuQueryPromise = null
		}
	})()
	return gpuQueryPromise
}

function bytesToGb(v) {
	return v / 1024 / 1024 / 1024
}

async function readHardware() {
	try {
		const [cpuName, cpuTemp, gpu, cpuLoad] = await Promise.all([
			getCpuName(),
			getCpuTemperature(),
			getGpuStats(),
			getCpuLoadPct(),
		])
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

calcHardwareStats()
