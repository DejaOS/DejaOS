# DejaOS Tools HTTP API

## Contents

- Basic contract
- Query chain
- Device models
- SDKs
- Latest components
- Component versions
- Decision rules
- Bundled script

## Basic Contract

Base URL:

```text
http://tools.dxiot.com
```

A successful response must satisfy:

```text
response.code === 1
response.data.content is an array
```

URL-encode all request parameters. The formal Skill does not depend on any maintainer-local CLI source tree; this file and the bundled script carry the required contract.

## Query Chain

```text
Developer-provided device model
  -> deviceModel
  -> mainDeviceModel (fall back to deviceModel when empty)
  -> SDK list
  -> sdkId matching 2.0 or 4.0
  -> latest component list
```

The main model is only an SDK and component query key. The physical SKU is still determined by `deviceModel`.

## Device Models

```http
GET /dxdop/webadmin/componentDeviceModel/findAllFlat?page=1&size=100
```

Important fields:

- `deviceModel`: canonical device model
- `mainDeviceModel`: main model used for SDK/component queries
- `soc`
- `subModel`: whether this is a submodel

Matching order:

1. Exact equality with the input.
2. If exact matching fails, case-insensitive equality.
3. Use the canonical spelling returned by the server in the project and subsequent output.

## SDKs

```http
GET /dxdop/webadmin/sdk/findAll?page=1&size=100&deviceModel={mainDeviceModel}
```

When matching SDK versions:

1. Remove a leading `sdk` or `v`, case-insensitively.
2. Compare with `2.0` or `4.0`.
3. Reject SDK `3.0` immediately.

Important fields:

- `id`: the `sdkId` for later queries
- `sdkVersion`, `version`, or the actual server version field
- `deviceModel`

## Latest Components

```http
GET /dxdop/webadmin/sdkComponent/findPageLatest?page=1&size=1000&sdkId={sdkId}
```

The returned `content` must be a non-empty array. Record component names, versions, download information, and other identifiers returned by the server.

This endpoint returns every component currently published for the selected SDK. It does not mean `dejaos new` installs them all by default. The CLI selects the SDK's base components and adds `dxUi` when available. See `references/dejaos-cli-workflow.md` for default selection rules.

## Component Versions

Query every version of one component:

```http
GET /dxdop/webadmin/sdkComponent/findVersions?page=1&size=1000&sdkId={sdkId}&componentName={componentName}
```

To query only the latest item, `size` may be set to `1`, but verify the server's ordering semantics.

## Decision Rules

Treat any of the following as "the selected SDK is unsupported according to the current query," and stop creating or modifying code that depends on it:

- The HTTP request fails
- The response structure violates the contract
- The device model is not found
- The target SDK is not found
- The latest component list is empty

Report the exact stage and original error so a maintainer can adjust the data manually later. Never infer a component list from another model or SDK.

For SDK 4.0, explicitly tell the developer: "The current query result indicates that this model does not support SDK 4.0."

## Bundled Script

Run:

```text
node <skill>/scripts/resolve-device-sdk.mjs <deviceModel> <2.0|4.0>
```

On success, it prints JSON containing:

- `supported`
- `deviceModel`
- `mainDeviceModel`
- `soc`
- `subModel`
- `sdkVersion`
- `sdkId`
- `componentCount`
- `components`
- `defaultDataRoot`

On failure, it prints `supported: false`, the stage, reason, and error details, and exits with a nonzero status.
