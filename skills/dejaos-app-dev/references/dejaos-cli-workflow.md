# DejaOS CLI Workflow

## Contents

- CLI setup
- Development context
- New projects
- Existing projects
- UI fonts
- USB devices
- Execution and logs

## CLI Setup

Requirements:

- Node.js 18 or later
- npm package: `dejaos-cli`
- Command: `dejaos`

Check:

```text
dejaos --version
```

Do not conclude that the CLI is uninstalled from this command alone. Codex, sandboxed tools, IDE terminals, and user terminals can have different `PATH` values.

If direct execution fails, discover the existing installation before offering to install anything.

Windows:

```text
Get-Command dejaos -All -ErrorAction SilentlyContinue
where.exe dejaos
cmd.exe /d /s /c "dejaos --version"
npm.cmd prefix -g
npm.cmd list -g dejaos-cli --depth=0
<npm-prefix>\dejaos.cmd --version
%APPDATA%\npm\dejaos.cmd --version
```

macOS/Linux:

```text
command -v dejaos
npm prefix -g
npm list -g dejaos-cli --depth=0
<npm-prefix>/bin/dejaos --version
```

If an executable exists, retain and use its absolute path for the task. If the restricted environment returns access denied, request elevated execution or ask the developer to run the absolute-path version command in their normal terminal. Report "installed but not callable from the current execution environment," not "not installed," and do not reinstall merely to repair the current process's `PATH`.

Only when all discovery checks fail, tell the developer that a global npm installation is required. After obtaining permission, run:

```text
npm install -g dejaos-cli
dejaos --version
```

Do not claim installation succeeded if the second version check fails. After locating an existing or newly installed executable, verify it and use its absolute path for subsequent commands in this task.

## Development Context

Before creating or substantially modifying an app, summarize:

```text
Device model:
Main model:
SDK: 2.0 / 4.0
SDK/component query:
Physical SKU:
Default data directory:
Project: new / existing
Project directory:
UI: none / Chinese / English / other
USB: connected / disconnected / unconfirmed
```

The device model must be confirmed. If the SDK is uncertain, explain the architectural differences between 2.0 and 4.0, then explicitly continue with 2.0.

## New Projects

Use the complete command:

```text
dejaos new <deviceModel> <projectName> <projectDirectory> <2.0|4.0>
```

Example:

```text
dejaos new VF105_V12 access_terminal C:\Projects\access_terminal 4.0
```

`new` queries current device and SDK metadata, creates `app.dxproj`, installs base components, and generates `dxmodules/`. It fails if the destination already contains `app.dxproj`.

### Default components for new projects

The HTTP API returns every component currently published for the selected main model and SDK. `dejaos new` does not add all of them; it selects the following default base components.

SDK 2.0:

```text
dxLogger
dxStd
dxOs
dxDriver
dxMap
dxEventBus
dxCommonUtils
```

SDK 4.0:

```text
dxLogger
dxStd
dxOs
dxDriver
dxCommonUtils
dxSystemBus
```

During creation:

1. The CLI requires every default base component to exist in the API's latest component list. Creation stops if any are missing.
2. If `dxUi` exists in the latest component list, the CLI automatically adds it to the new project.
3. Other components such as barcode, facial, MQTT, SQLite, and UART are not automatically added merely because they are available on the server. Select them according to requirements and SKU with `dejaos edit` or `app.dxproj`, then run `dejaos install`.
4. This documents the current `dejaos new` contract. The generated `app.dxproj` and `dxmodules/` remain the final project result.

After creation, check at least:

- `app.dxproj.model` uses the canonical device model returned by the API.
- The main model, SDK ID, and components match the selected values.
- `src/`, `resource/`, and `dxmodules/` were generated.
- Required components exist in both `app.dxproj` and `dxmodules/`.
- Requested features match the physical SKU.

Do not bypass `dejaos new` by assembling a new project manually.

## Existing Projects

1. Read `app.dxproj`; treat its model and components as candidate information.
2. Ask the developer to confirm the physical device model and SDK.
3. Revalidate the main model, SDK, and components through the HTTP API.
4. Check that hardware used by the source matches the physical SKU.
5. Run:

   ```text
   dejaos install --project <project>
   ```

6. Treat the regenerated `dxmodules/*.js` as the final API contract.

Use this command to modify the model, SDK, or components interactively:

```text
dejaos edit --project <project>
```

After intentionally editing `app.dxproj` by hand, run `dejaos install` again. Never modify generated `dxmodules`.

## UI Fonts

Save the font in the project as:

```text
resource/font/font.ttf
```

For Chinese conversation, Chinese UI, or required CJK glyphs, download:

```text
https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_cn.ttf
```

For English conversation and English-only UI, download:

```text
https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_en.ttf
```

Requirements:

- Use the raw file URL, not a GitHub HTML page.
- Download in binary mode.
- Verify the file exists and has a nonzero size.
- Use `/app/code/resource/font/font.ttf` in the app.

## USB Devices

`dejaos connect` only verifies that a device is connected to the computer by USB:

```text
dejaos connect --project <project>
```

It reads `app.dxproj.model` to select a connection protocol, but does not discover, identify, or confirm the device model.

Rules:

- For a new project, confirm the model and create the project before running `connect`.
- Before changing the device, ask the developer to confirm that the correct device is connected.
- If connection fails, report the original CLI error. Do not bypass the check.

## Execution and Logs

For normal incremental development:

```text
dejaos run --project <project>
```

`run` connects, stops the current app, synchronizes changed files, and restarts it.

For first deployment, invalid incremental state, or delete/asset synchronization problems:

```text
dejaos sync --all --project <project>
dejaos start --project <project>
```

Do not use `--all` by default after every small change.

Collect logs with:

```text
dejaos logs --project <project>
```

Logs stream continuously. Use an execution timeout, background process, or terminable session to capture a bounded startup window, then stop the log command. Check for:

- Syntax and module-loading errors
- Missing assets or fonts
- Incorrect relative imports
- Uncaught exceptions and Promise rejections
- Worker errors (2.0 only)
- Device, UART, network, SQLite, MQTT, HTTP, and facial initialization failures
- Watchdog resets or restart loops

After every material change:

1. Audit APIs against `dxmodules`.
2. Run syntax or static checks.
3. When USB is confirmed, run `connect` and `run`.
4. Capture bounded logs.
5. Fix obvious errors and repeat.

A successful start with no obvious errors in startup logs is an on-device smoke test, not acceptance of every business function.
