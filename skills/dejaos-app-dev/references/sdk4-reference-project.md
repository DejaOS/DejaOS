# SDK 4.0 JavaScript Reference Project

## Purpose

Do not read this source during normal project creation. Query the bundled files under `references/sdk4-reference-project/src/` only after encountering a concrete SDK 4.0 problem or when a specific component usage example would help diagnose or implement that problem.

This is a read-only source snapshot, not a runnable project or a canonical implementation. Its overall structure is deliberately complex because it came from a large product application. Do not use its layering, directory count, event routing, or full lifecycle composition as the default architecture for an ordinary DejaOS app.

## Safety and Authority Boundaries

- Never copy the entire reference tree into a developer's app.
- Never imitate the reference project's overall architecture unless the target app has independently demonstrated comparable complexity. Prefer the smallest structure that satisfies the target requirements.
- Never assume a referenced component method exists in the target project. Verify every function, event, return shape, and cleanup method against the target project's generated `dxmodules/*.js`.
- Re-evaluate device model, SDK support, SKU options, data directory, and installed components for the target app.
- Treat product-specific paths, ports, flags, timeouts, UI dimensions, protocols, and business rules as examples only.
- The snapshot may contain design tradeoffs or known review findings. Prefer the Skill's current rules when they conflict with the snapshot.
- Do not modify this bundled snapshot while developing a user's app.

The snapshot intentionally excludes `resource/`, `dxmodules/`, configuration JSON, `app.dxproj`, Git metadata, temporary files, and device/runtime data. It therefore cannot be built or deployed by itself.

## Problem Lookup Map

| Topic | Start with |
| --- | --- |
| A startup, rollback, or cleanup problem | `src/main.js`, `src/core/lifecycle.js` |
| An event delivery or command-routing problem | `src/core/event_bus.js`, `src/core/events.js`, `src/core/commands.js` |
| A specific component call or cleanup example | Search the matching file under `src/drivers/` |
| SDK 4.0 facial pipeline | `src/drivers/capturer_driver.js`, `ivcore_driver.js`, `display_driver.js`, `face_driver.js` |
| Facial scenes, capture, and feature-library operations | `src/domain/face_domain.js`, `src/services/face_service.js` |
| SQLite, defaults, validation, and repositories | `src/storage/` |
| HTTP boundary and command routing | `src/protocols/http/http_protocol.js` |
| MQTT client, routing, replies, and retries | `src/protocols/mqtt/` |
| UI lifecycle and page cleanup | `src/view/index.js`, `src/view/router/core.js`, `src/view/pages/base_view.js` |
| UI-to-business boundary | `src/view/ui_driver.js`, page `*_store.js` files |
| Capability-gated optional hardware | `src/drivers/os_driver.js`, `src/core/lifecycle.js` |

## Efficient Search

Search narrowly instead of loading the full snapshot:

```text
rg -n "dxFacial\.|getFeaByCap|setStatus" references/sdk4-reference-project/src
rg -n "\.init\(|\.destroy\(|quiesce" references/sdk4-reference-project/src/core references/sdk4-reference-project/src/drivers
rg -n "registerCommand|execute\(|eventBus\.on|eventBus\.fire" references/sdk4-reference-project/src
rg -n "dxStd\.(setTimeout|setInterval|clearTimeout|clearInterval)" references/sdk4-reference-project/src
```

Use the result to solve only the concrete target problem. Implement the smallest target-specific solution, do not reproduce the reference project's surrounding layers, and repeat the normal project-local API audit and device validation loop.
