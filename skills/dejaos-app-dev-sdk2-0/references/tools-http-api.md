# DejaOS Tools HTTP API

Use this development-time API contract to discover supported device models, SDKs, and components. This reference is self-contained; do not depend on a local DejaOS CLI source checkout.

Prefer the installed `dejaos` CLI for normal project creation and component management. Use these endpoints when inspecting availability, diagnosing CLI metadata requests, or implementing equivalent development tooling.

## Contents

- Base URL and response shape
- Resolve model to component list
- Component version history
- Download a component
- Portable query example
- Validation rules

## Base URL and response shape

Base URL:

```text
http://tools.dxiot.com
```

Successful list responses use:

```json
{
  "code": 1,
  "data": {
    "content": []
  }
}
```

Require `code === 1` and an array at `data.content`. Treat any other shape as a failed request. URL-encode all query parameter values.

## Resolve model to component list

The lookup is a chain. A device model does not directly select the component list:

```text
deviceModel
  -> mainDeviceModel
  -> SDK selected by sdkName
  -> SDK id
  -> latest component list
```

### 1. Load device models

```http
GET http://tools.dxiot.com/dxdop/webadmin/componentDeviceModel/findAllFlat?page=1&size=100
```

Relevant fields in each `data.content` item:

- `deviceModel`: selected device/sub-model stored in `app.dxproj.model`
- `mainDeviceModel`: main model used for SDK lookup

Find the requested `deviceModel`, matching exactly first and then case-insensitively. Set:

```text
mainModel = mainDeviceModel || deviceModel
```

Preserve both `model` and `mainModel` in `app.dxproj`.

### 2. Load SDKs for the main model

```http
GET http://tools.dxiot.com/dxdop/webadmin/sdk/findAll?page=1&size=100&deviceModel=<mainModel>
```

Relevant fields:

- `id`: SDK identifier used by component queries
- `sdkName`: SDK name/version, such as the requested SDK 2.0 variant

Select the SDK by normalized `sdkName`, then retain its `id` as `sdkId`.

### 3. Load all latest components for the SDK

```http
GET http://tools.dxiot.com/dxdop/webadmin/sdkComponent/findPageLatest?page=1&size=1000&sdkId=<sdkId>
```

Each `data.content` item describes one component. Relevant fields:

- `componentName`
- `version`

This is the endpoint for the available latest component list corresponding to the selected device model and SDK. The device relationship is indirect through `mainModel -> SDK -> sdkId`.

If a response reaches the requested page size, request subsequent pages instead of assuming the first page is complete.

## Component version history

Load available versions of one component:

```http
GET http://tools.dxiot.com/dxdop/webadmin/sdkComponent/findVersions?page=1&size=1000&sdkId=<sdkId>&componentName=<componentName>
```

Load only the latest version:

```http
GET http://tools.dxiot.com/dxdop/webadmin/sdkComponent/findVersions?page=1&size=1&sdkId=<sdkId>&componentName=<componentName>
```

## Download a component

```http
GET http://tools.dxiot.com/dxdop/webadmin/component/download?componentName=<componentName>&deviceModel=<downloadModel>&version=<version>
```

Use `mainModel || model` as `downloadModel`. Write downloads only through the normal project installation workflow; do not manually patch generated `dxmodules/`.

## Portable query example

With `curl`:

```text
curl "http://tools.dxiot.com/dxdop/webadmin/componentDeviceModel/findAllFlat?page=1&size=100"
```

Then query SDKs with the resolved `mainModel`, select the requested `sdkName`, and query `findPageLatest` with that SDK's `id`.

## Validation rules

- Do not use `model` for SDK/component lookup when `mainModel` is present.
- Do not assume the model-list endpoint is itself the component-list endpoint.
- Do not hard-code a component list when the current server response can be queried.
- After installation, treat project-local `dxmodules/*.js` as the authoritative callable API for the downloaded component versions.
- If the service is unavailable, report discovery as blocked; do not invent models, SDK IDs, component versions, or APIs.
