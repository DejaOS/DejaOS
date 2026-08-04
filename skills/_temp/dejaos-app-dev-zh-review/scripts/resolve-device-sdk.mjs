#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://tools.dxiot.com'
const REQUEST_TIMEOUT_MS = 30000

function normalizeSdkVersion(value) {
  return String(value || '').trim().replace(/^(sdk|v)/i, '')
}

function printResult(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

function fail(stage, reason, message, details = {}) {
  printResult({
    supported: false,
    stage,
    reason,
    message,
    ...details,
  })
  process.exitCode = 2
}

async function requestJson(baseUrl, pathname) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: 'GET',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    const body = await response.json()
    if (!body || body.code !== 1 || !body.data || !Array.isArray(body.data.content)) {
      throw new Error('Unexpected response structure')
    }
    return body.data.content
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const [, , modelInput, sdkInput] = process.argv
  const sdkVersion = normalizeSdkVersion(sdkInput)
  const baseUrl = String(process.env.DEJAOS_TOOLS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')

  if (!modelInput || !sdkInput) {
    fail(
      'arguments',
      'invalid_arguments',
      'Usage: node resolve-device-sdk.mjs <deviceModel> <2.0|4.0>',
    )
    return
  }

  if (!['2.0', '4.0'].includes(sdkVersion)) {
    fail(
      'arguments',
      'unsupported_sdk',
      `Only SDK 2.0 and 4.0 are supported; received ${sdkInput}`,
      { requestedDeviceModel: modelInput, requestedSdkVersion: sdkInput },
    )
    return
  }

  let stage = 'device_models'

  try {
    const models = await requestJson(
      baseUrl,
      '/dxdop/webadmin/componentDeviceModel/findAllFlat?page=1&size=100',
    )
    const selectedModel = models.find(item => item.deviceModel === modelInput)
      || models.find(
        item => String(item.deviceModel).toLowerCase() === String(modelInput).toLowerCase(),
      )

    if (!selectedModel) {
      fail(
        stage,
        'device_model_not_found',
        `Device model not found: ${modelInput}`,
        {
          requestedDeviceModel: modelInput,
          availableDeviceModels: models
            .map(item => item.deviceModel)
            .filter(Boolean)
            .sort(),
        },
      )
      return
    }

    const deviceModel = selectedModel.deviceModel
    const mainDeviceModel = selectedModel.mainDeviceModel || deviceModel
    const defaultDataRoot = String(mainDeviceModel).toUpperCase().startsWith('VF')
      ? '/data'
      : '/app/data'

    stage = 'sdks'
    const sdks = await requestJson(
      baseUrl,
      `/dxdop/webadmin/sdk/findAll?page=1&size=100&deviceModel=${encodeURIComponent(mainDeviceModel)}`,
    )
    const selectedSdk = sdks.find(item => normalizeSdkVersion(item.sdkName) === sdkVersion)

    if (!selectedSdk) {
      fail(
        stage,
        'sdk_not_found',
        `SDK ${sdkVersion} not found for model ${deviceModel}`,
        {
          requestedDeviceModel: modelInput,
          deviceModel,
          mainDeviceModel,
          sdkVersion,
          defaultDataRoot,
          availableSdkVersions: sdks.map(item => item.sdkName).filter(Boolean).sort(),
        },
      )
      return
    }

    stage = 'components'
    const components = await requestJson(
      baseUrl,
      `/dxdop/webadmin/sdkComponent/findPageLatest?page=1&size=1000&sdkId=${encodeURIComponent(selectedSdk.id)}`,
    )

    if (components.length === 0) {
      fail(
        stage,
        'empty_component_list',
        `Component list is empty for model ${deviceModel}, SDK ${sdkVersion}`,
        {
          requestedDeviceModel: modelInput,
          deviceModel,
          mainDeviceModel,
          sdkVersion,
          sdkId: selectedSdk.id,
          defaultDataRoot,
        },
      )
      return
    }

    printResult({
      supported: true,
      requestedDeviceModel: modelInput,
      deviceModel,
      mainDeviceModel,
      soc: selectedModel.socName || selectedModel.soc || null,
      deviceModelType: selectedModel.deviceModelType || null,
      subModel: Boolean(selectedModel.subModel),
      sdkVersion,
      sdkName: selectedSdk.sdkName,
      sdkId: selectedSdk.id,
      componentCount: components.length,
      components: components.map(item => ({
        componentName: item.componentName,
        version: item.version,
        id: item.id || null,
      })),
      defaultDataRoot,
    })
  } catch (error) {
    const message = error && error.name === 'AbortError'
      ? `Request timed out after ${REQUEST_TIMEOUT_MS} ms`
      : (error && error.message ? error.message : String(error))
    fail(stage, 'lookup_error', message, {
      requestedDeviceModel: modelInput,
      sdkVersion,
    })
  }
}

await main()
