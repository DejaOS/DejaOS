# dxmodules API Audit

## Authority Order

1. `dxmodules/*.js` generated after installation in the target project
2. Component names and versions in the target project's `app.dxproj`
3. Same-SDK snapshots or examples bundled with this Skill
4. General architecture guidance

Lower-priority material must never override project-local wrappers.

## Post-Installation Check

Run:

```text
dejaos install --project <project>
```

Then:

1. Confirm that every component in `app.dxproj` has a corresponding wrapper.
2. Confirm that every application import from `dxmodules` points to an existing file.
3. Do not modify generated files.

## Per-Call Check

For every wrapper:

1. Identify default and named exports.
2. Find every application call to the module.
3. Confirm exact function, class, and member names.
4. Confirm parameter order, count, types, defaults, and timeout units.
5. Confirm whether each return is synchronous, a Promise, or absent.
6. Every Promise must be awaited, returned to the caller, or have rejection handled explicitly.
7. Confirm return-object fields and error shapes.
8. Confirm event names, callback arguments, and unsubscribe methods.
9. Confirm initialization dependencies, repeated-initialization restrictions, and cleanup methods.
10. Confirm constants come from the correct export; never guess or hard-code their values.

Useful searches:

```text
rg -n "export default|export const|export function|export class" <project>/dxmodules/<module>.js
rg -n "<module>\\.|new <Class>" <project>/src
rg -n "async |await |\\.then\\(|\\.catch\\(" <project>/src
rg -n "from ['\"].*dxmodules/" <project>/src
```

## SDK-Specific Checks

SDK 2.0:

- Worker creation must be supported by the installed `dxEventBus`.
- Check topics, payloads, request/response flows, and timeouts.
- Do not apply 4.0 Promise examples directly to 2.0 wrappers.

SDK 4.0:

- Find and reject all Worker creation.
- Find direct `dxSystemBus` imports; they are prohibited in ordinary apps.
- Find Promises that are not awaited or otherwise handled.
- Find subscriptions without a matching `off` call or cancellation function.
- Find clients, databases, or components without cleanup.

## Common Errors

- An example uses `openDoor()`, but the project wrapper has no such function.
- Code treats a synchronous result from another version as a Promise, or vice versa.
- Default and named exports are mixed up.
- An event name is spelled correctly but does not exist in the installed version.
- Component availability is mistaken for installation of optional physical hardware.
- A Skill snapshot is copied into the project's `dxmodules`.
- A wrapper is modified to make incorrect application code "work."

## Completion Criteria

Claim that the static API audit passed only when there is evidence that:

- Every wrapper file exists.
- Every used export exists.
- Every member call exists.
- Parameters and return shapes were checked.
- Initialization and cleanup were checked.
- SDK-specific architecture checks passed.

Static success is not on-device success. Run `dejaos run` and inspect bounded logs afterward.
