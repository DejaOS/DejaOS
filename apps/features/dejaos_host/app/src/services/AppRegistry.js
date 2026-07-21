import std from '../../dxmodules/dxStd.js'
import log from '../../dxmodules/dxLogger.js'

const INSTALL_ROOT = '/app/data/dejaos_host/apps'
const REMOTE_ICON = '/app/code/resource/icon/apps.png'

let remoteCatalog = {}
let installed = {}

function safeName(value, label) {
    const name = String(value || '')
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error(label + ' is invalid')
    return name
}

function colorValue(value) {
    if (typeof value === 'number') return value
    const text = String(value || '')
    if (/^#[0-9a-fA-F]{6}$/.test(text)) return parseInt(text.slice(1), 16)
    return 0x17796e
}

function directoryNames(rootPath) {
    if (!std.exist(rootPath)) return []
    const result = std.readdir(rootPath)
    if (!result || result[1] !== 0 || !Array.isArray(result[0])) return []
    return result[0].filter(function filterName(name) {
        return name !== '.' && name !== '..' && /^[a-zA-Z0-9._-]+$/.test(name)
    })
}

function readInstalledPackage(rootPath) {
    const manifestPath = rootPath + '/manifest.json'
    if (!std.exist(manifestPath)) return null
    const manifest = JSON.parse(std.loadFile(manifestPath))
    if (manifest.format !== 'dejaos-host-mini-app' || manifest.formatVersion !== 1) {
        throw new Error('unsupported mini app package: ' + manifestPath)
    }
    const id = safeName(manifest.id, 'app id')
    const entry = safeName(manifest.entry || 'app.js', 'entry')
    const icon = safeName(manifest.icon || 'icon.png', 'icon')
    const entryPath = rootPath + '/' + entry
    const iconPath = rootPath + '/' + icon
    if (!std.exist(entryPath)) throw new Error('mini app entry not found: ' + entryPath)
    if (!std.exist(iconPath)) throw new Error('mini app icon not found: ' + iconPath)
    return {
        id,
        name: String(manifest.name || id),
        version: String(manifest.version || '0.0.0'),
        owner: String(manifest.owner || 'My Apps'),
        desc: String(manifest.description || ''),
        color: colorValue(manifest.color),
        icon: iconPath,
        entryPath,
        rootPath,
        manifest,
        installed: true,
        source: 'installed'
    }
}

function scanInstalled() {
    const result = {}
    directoryNames(INSTALL_ROOT).forEach(function loadPackage(directory) {
        try {
            const app = readInstalledPackage(INSTALL_ROOT + '/' + directory)
            if (app && app.id === directory) result[app.id] = app
            else if (app) log.error('mini app directory and manifest id mismatch', directory, app.id)
        } catch (e) {
            log.error('load installed mini app failed', directory, e)
        }
    })
    return result
}

function normalizeRemoteApp(item) {
    const id = safeName(item && item.id, 'remote app id')
    return {
        id,
        name: String(item.name || id),
        version: String(item.version || '0.0.0'),
        owner: item.visibility === 'official' ? 'Official' : 'My Apps',
        desc: String(item.description || ''),
        color: colorValue(item.color),
        icon: REMOTE_ICON,
        downloadUrl: String(item.downloadUrl || ''),
        installed: false,
        source: 'remote'
    }
}

function init() {
    try {
        refresh()
        log.info('mini app registry initialized', 'remote=0', 'installed=' + Object.keys(installed).length)
    } catch (e) {
        installed = {}
        log.error('mini app registry initialization failed', e)
    }
}

function refresh() {
    installed = scanInstalled()
}

function setRemoteCatalog(items) {
    const next = {}
    if (Array.isArray(items)) {
        items.forEach(function addRemote(item) {
            try {
                const app = normalizeRemoteApp(item)
                next[app.id] = app
            } catch (e) {
                log.error('ignore invalid remote mini app', e)
            }
        })
    }
    remoteCatalog = next
    log.info('remote mini app catalog updated', Object.keys(remoteCatalog).length)
}

function list() {
    const merged = {}
    Object.keys(remoteCatalog).forEach(function addRemote(id) { merged[id] = remoteCatalog[id] })
    Object.keys(installed).forEach(function addInstalled(id) { merged[id] = installed[id] })
    return Object.keys(merged).map(function toApp(id) { return merged[id] })
}

function availableList() {
    return Object.keys(remoteCatalog).filter(function notInstalled(id) {
        return !installed[id]
    }).map(function toApp(id) { return remoteCatalog[id] })
}

function installedList() {
    return Object.keys(installed).map(function toApp(id) { return installed[id] })
}

function get(id) {
    return installed[id] || remoteCatalog[id] || null
}

function isInstalled(id) {
    return !!installed[id]
}

function removeIfExists(path) {
    if (std.exist(path)) {
        const result = std.remove(path)
        if (result !== 0) throw new Error('remove file failed: ' + path + ', code=' + result)
    }
}

function uninstall(id) {
    const app = installed[id]
    if (!app) return false
    const manifest = app.manifest
    try {
        removeIfExists(app.rootPath + '/manifest.json')
        removeIfExists(app.rootPath + '/' + safeName(manifest.entry || 'app.js', 'entry'))
        removeIfExists(app.rootPath + '/' + safeName(manifest.icon || 'icon.png', 'icon'))
        const result = std.rmdir(app.rootPath)
        if (result !== 0) log.error('remove mini app directory failed', app.rootPath, result)
        refresh()
        log.info('mini app uninstalled without host restart', id)
        return true
    } catch (e) {
        log.error('uninstall mini app failed', id, e)
        throw e
    }
}

export default { init, refresh, setRemoteCatalog, list, availableList, installedList, get, isInstalled, uninstall }
