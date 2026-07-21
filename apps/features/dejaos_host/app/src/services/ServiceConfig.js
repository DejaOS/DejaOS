import std from '../../dxmodules/dxStd.js'
import log from '../../dxmodules/dxLogger.js'

const CONFIG_FILE = '/app/data/dejaos_host/app-service.json'
const DEFAULT_CONFIG = { address: 'http://192.168.50.30:8080' }

function load() {
    try {
        if (!std.exist(CONFIG_FILE)) return { address: DEFAULT_CONFIG.address }
        const saved = JSON.parse(std.loadFile(CONFIG_FILE))
        if (saved && typeof saved.address === 'string' && saved.address) return saved
    } catch (e) {
        log.error('load app service config failed', e)
    }
    return { address: DEFAULT_CONFIG.address }
}

function save(config) {
    try {
        std.saveFile(CONFIG_FILE, JSON.stringify(config))
        return true
    } catch (e) {
        log.error('save app service config failed', e)
        return false
    }
}

export default { load, save }
