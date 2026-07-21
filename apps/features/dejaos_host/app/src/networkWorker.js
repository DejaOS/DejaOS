import network from '../dxmodules/dxNetwork.js'
import http from '../dxmodules/dxHttpClient.js'
import bus from '../dxmodules/dxEventBus.js'
import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import common from '../dxmodules/dxCommonUtils.js'
import EventTopics from './constants/EventTopics.js'
import ServiceConfig from './services/ServiceConfig.js'

let initialized = false
let pendingNetworkType = 0
let pendingPollTicks = 0
let lastConnected = false

const DOWNLOAD_ROOT = '/app/data/dejaos_host/downloads'
const INSTALL_ROOT = '/app/data/dejaos_host/apps'

function serviceBase(address) {
    let base = String(address || '').trim()
    if (!base) throw new Error('app service address is empty')
    if (base.indexOf('://') < 0) base = 'http://' + base
    while (base.endsWith('/')) base = base.slice(0, -1)
    return base
}

function apiUrl(address, path) {
    const base = serviceBase(address)
    return base.endsWith('/api') ? base + path : base + '/api' + path
}

function absoluteDownloadUrl(address, value) {
    const url = String(value || '')
    if (url.indexOf('://') >= 0) return url
    let base = serviceBase(address)
    if (base.endsWith('/api')) base = base.slice(0, -4)
    return base + (url.startsWith('/') ? url : '/' + url)
}

function safeName(value, label) {
    const name = String(value || '')
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error(label + ' is invalid')
    return name
}

function parseHttpJson(response, label) {
    if (!response) throw new Error(label + ' returned no response')
    if (response.code !== 0) throw new Error(label + ' native request failed: ' + (response.message || response.code))
    if (response.status < 200 || response.status >= 300) throw new Error(label + ' http status: ' + response.status)
    const payload = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
    if (!payload) throw new Error(label + ' response is empty')
    return payload
}

function miniAppServiceGetJson(request) {
    const path = String(request && request.path || '').trim()
    if (!/^\/[a-zA-Z0-9/_?&=.,%+-]+$/.test(path) || path.indexOf('..') >= 0) {
        throw new Error('mini app service path is invalid')
    }
    const config = ServiceConfig.load()
    const url = apiUrl(config.address, path)
    const timeout = Math.max(1000, Math.min(Number(request && request.timeout) || 10000, 15000))
    const startedAt = Date.now()
    log.info('mini app service request started', url, 'timeout=' + timeout)
    const response = http.request({
        url,
        method: 'GET',
        timeout,
        headers: { Accept: 'application/json' }
    })
    log.info(
        'mini app service request finished',
        'elapsed=' + (Date.now() - startedAt) + 'ms',
        'code=' + (response && response.code),
        'status=' + (response && response.status),
        'message=' + (response && response.message || '')
    )
    return parseHttpJson(response, 'mini app service api')
}

function checkDownloadResult(response) {
    if (!response) throw new Error('download returned no response')
    if (response.code !== 0) throw new Error('download native request failed: ' + (response.message || response.code))
    if (response.status < 200 || response.status >= 300) throw new Error('download http status: ' + response.status)
}

function removeIfExists(path) {
    if (std.exist(path)) std.remove(path)
}

function unpackDownloadedPackage(appId, packagePath) {
    const appPackage = JSON.parse(std.loadFile(packagePath))
    if (!appPackage || appPackage.format !== 'dejaos-host-mini-app' || appPackage.formatVersion !== 1) {
        throw new Error('unsupported downloaded mini app package')
    }
    const manifest = appPackage.manifest || {}
    const id = safeName(manifest.id, 'manifest app id')
    if (id !== appId) throw new Error('downloaded app id mismatch: ' + id)
    const entry = safeName(manifest.entry || 'app.js', 'manifest entry')
    const icon = safeName(manifest.icon || 'icon.png', 'manifest icon')
    const code = appPackage.files && appPackage.files[entry]
    if (typeof code !== 'string' || !code) throw new Error('downloaded app.js is missing')
    const resources = Array.isArray(appPackage.resources) ? appPackage.resources : []
    const iconResource = resources.find(function findIcon(item) { return item && item.path === icon })
    if (!iconResource || iconResource.encoding !== 'base64' || typeof iconResource.content !== 'string') {
        throw new Error('downloaded icon resource is missing')
    }

    const targetRoot = INSTALL_ROOT + '/' + id
    const manifestPath = targetRoot + '/manifest.json'
    const entryPath = targetRoot + '/' + entry
    const iconPath = targetRoot + '/' + icon
    removeIfExists(manifestPath)
    std.saveFile(entryPath, code, false)
    std.ensurePathExists(iconPath)
    if (!common.fs.base64ToFile(iconPath, iconResource.content)) throw new Error('save downloaded icon failed')
    const runtimeManifest = {
        format: appPackage.format,
        formatVersion: appPackage.formatVersion,
        id,
        name: String(manifest.name || id),
        version: String(manifest.version || '0.0.0'),
        entry,
        icon,
        color: String(manifest.color || '#17796e'),
        owner: String(manifest.owner || 'My Apps'),
        description: String(manifest.description || '')
    }
    std.saveFile(manifestPath, JSON.stringify(runtimeManifest), true)
    return runtimeManifest
}

function handleCatalogRequest() {
    try {
        const config = ServiceConfig.load()
        const response = http.get(apiUrl(config.address, '/device/apps'), 8000)
        const payload = parseHttpJson(response, 'app catalog')
        if (!Array.isArray(payload.items)) throw new Error('app catalog items is invalid')
        bus.fire(EventTopics.APP_CATALOG_UPDATED, { items: payload.items })
        log.info('remote app catalog downloaded', payload.items.length)
    } catch (e) {
        log.error('download remote app catalog failed', e)
        bus.fire(EventTopics.APP_CATALOG_FAILED, { message: e.message || String(e) })
    }
}

function handleInstallRequest(request) {
    let tempPath = ''
    const appId = request && request.id
    try {
        const id = safeName(appId, 'install app id')
        const config = ServiceConfig.load()
        const downloadUrl = request.downloadUrl
            ? absoluteDownloadUrl(config.address, request.downloadUrl)
            : apiUrl(config.address, '/device/apps/' + id + '/download')
        tempPath = DOWNLOAD_ROOT + '/' + id + '.dxapp.json'
        std.ensurePathExists(tempPath)
        removeIfExists(tempPath)
        log.info('mini app download started', id, downloadUrl)
        const response = http.download(downloadUrl, tempPath, 30000)
        checkDownloadResult(response)
        const manifest = unpackDownloadedPackage(id, tempPath)
        removeIfExists(tempPath)
        bus.fire(EventTopics.APP_INSTALL_RESULT, { ok: true, id, version: manifest.version })
        log.info('mini app downloaded and installed', id, manifest.version)
    } catch (e) {
        if (tempPath) removeIfExists(tempPath)
        log.error('download and install mini app failed', appId, e)
        bus.fire(EventTopics.APP_INSTALL_RESULT, { ok: false, id: appId, message: e.message || String(e) })
    }
}

function timeApiUrl(address) {
    let base = String(address || '').trim()
    if (!base) throw new Error('app service address is empty')
    if (base.indexOf('://') < 0) base = 'http://' + base
    while (base.endsWith('/')) base = base.slice(0, -1)
    return base.endsWith('/api') ? base + '/time' : base + '/api/time'
}

function syncDisplayTime() {
    try {
        const config = ServiceConfig.load()
        const response = http.get(timeApiUrl(config.address), 5000)
        const payload = parseHttpJson(response, 'time api')
        if (!payload || typeof payload.displayTime !== 'string') {
            throw new Error('time api response is invalid')
        }
        bus.fire(EventTopics.SYSTEM_TIME_UPDATED, {
            displayTime: payload.displayTime,
            epochMs: payload.epochMs,
            timeZone: payload.timeZone
        })
        log.info('display time synchronized', payload.displayTime)
    } catch (e) {
        log.error('sync display time failed', e)
    }
}

function currentStatus() {
    const status = {
        connected: false,
        type: 0,
        status: 0,
        params: null
    }
    try {
        status.connected = network.isConnected()
        status.type = network.getType()
        status.status = network.getStatus()
        if (status.connected) {
            status.params = network.getNetParam()
        }
    } catch (e) {
        log.error('read network status failed', e)
    }
    return status
}

function publishStatus() {
    try {
        const status = currentStatus()
        bus.fire(EventTopics.NETWORK_STATUS_CHANGED, status)
        if (status.connected && !lastConnected) syncDisplayTime()
        lastConnected = status.connected
        if (pendingNetworkType && status.connected && status.type === pendingNetworkType) {
            pendingNetworkType = 0
            pendingPollTicks = 0
        }
    } catch (e) {
        log.error('publish network status failed', e)
    }
}

function handleStatusRequest() {
    publishStatus()
}

function handleConnect(request) {
    try {
        if (!request || !request.type) {
            throw new Error('network request type is required')
        }

        if (request.type === 'ethernet') {
            pendingNetworkType = network.NET_TYPE.ETH
            if (request.dhcp) {
                network.connectEthWithDHCP()
            } else {
                network.connectEth(request.staticConfig)
            }
        } else if (request.type === 'wifi') {
            pendingNetworkType = network.NET_TYPE.WIFI
            if (request.dhcp) {
                network.connectWifiWithDHCP(request.ssid, request.psk || '')
            } else {
                network.connectWifi(request.ssid, request.psk || '', request.staticConfig)
            }
        } else {
            throw new Error('unsupported network type: ' + request.type)
        }
        pendingPollTicks = 0

        bus.fire(EventTopics.NETWORK_CONNECT_RESULT, {
            ok: true,
            type: request.type,
            pending: true,
            message: 'Connection request submitted. Waiting for network.'
        })
    } catch (e) {
        pendingNetworkType = 0
        pendingPollTicks = 0
        log.error('network connect failed', e)
        bus.fire(EventTopics.NETWORK_CONNECT_RESULT, {
            ok: false,
            type: request && request.type,
            message: e.message || String(e)
        })
    }
}

try {
    network.init()
    initialized = true
    network.setCallbacks({
        onStatusChange: function onStatusChange() {
            publishStatus()
        }
    })

    bus.on(EventTopics.NETWORK_CONNECT, handleConnect)
    bus.on(EventTopics.NETWORK_STATUS_REQUEST, handleStatusRequest)
    bus.on(EventTopics.APP_CATALOG_REQUEST, handleCatalogRequest)
    bus.on(EventTopics.APP_INSTALL_REQUEST, handleInstallRequest)

    std.setTimeout(function registerMiniAppHttpRpc() {
        try {
            if (!bus.rpc) throw new Error('network rpc is not ready')
            bus.rpc.register('miniAppServiceGetJson', miniAppServiceGetJson)
            log.info('mini app service rpc initialized')
        } catch (e) {
            log.error('mini app service rpc initialization failed', e)
        }
    }, 100)

    std.setInterval(function networkLoop() {
        try {
            network.loop()
            if (pendingNetworkType) {
                pendingPollTicks += 1
                if (pendingPollTicks % 10 === 0) publishStatus()
                if (pendingPollTicks >= 600) {
                    pendingNetworkType = 0
                    pendingPollTicks = 0
                }
            }
        } catch (e) {
            log.error('network loop failed', e)
        }
    }, 100)

    log.info('network worker initialized')
} catch (e) {
    log.error('network worker initialization failed', e)
    if (initialized) {
        try {
            network.deinit()
        } catch (deinitError) {
            log.error('network deinit failed', deinitError)
        }
    }
}
