# DejaOS CLI Workflow

## Command contract

- npm package: `dejaos-cli`
- executable: `dejaos`
- requirement: Node.js 18+
- project selector: append `--project <absolute-project-directory>` to commands when not running from the project root

Check and install:

```text
dejaos --version
npm install -g dejaos-cli
dejaos --version
```

Only install after the user approves the global npm installation.

## Create a project

Use:

```text
dejaos new <model> [name] [directory] [sdk]
```

Example:

```text
dejaos new DW200_V20 my_project C:\Work\dejaos\my_project 2.0
```

The command fetches the current device-model metadata, creates `app.dxproj`, installs default SDK components, and prepares `dxmodules/`. It fails if `app.dxproj` already exists. The generated project keeps the selected device model in `model`; `mainModel` may identify the main model used for SDK and component downloads. Preserve both fields.

After creation, verify at least:

- `app.dxproj` exists and contains the requested `model`.
- `src/`, `resource/`, and `dxmodules/` are present as expected.
- Required components are named in `app.dxproj` and their wrappers exist in `dxmodules/`.

Use `dejaos edit --project <project>` to edit model, SDK, or component selections interactively. After a deliberate manual `app.dxproj` change, run `dejaos install --project <project>`.

## Install the UI font

Create `<project>/resource/font/` and save exactly one selected font as `<project>/resource/font/font.ttf`.

Use the Chinese font for a Chinese conversation, Chinese UI, or broader CJK coverage:

```text
https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_cn.ttf
```

Use the smaller English font only for an English conversation with English-only UI:

```text
https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_en.ttf
```

Download in binary mode with an available HTTP tool, then verify the file exists and has a non-zero size. Application code should reference:

```text
/app/code/resource/font/font.ttf
```

Do not use the GitHub HTML `blob` page as the download URL.

## Run on a USB device

First ask the user to confirm that the correct device is connected by USB. Once confirmed:

```text
dejaos run --project <project>
```

`run` connects to the USB device, syncs changed files, and starts the app. The CLI checks the project model against the connected device model; treat a mismatch as a blocker and do not bypass it.

For the first deployment, recovery from stale incremental state, or a resource/deletion issue:

```text
dejaos sync --all --project <project>
dejaos start --project <project>
```

Do not default to `--all` after every small edit; incremental `run` is the normal loop.

## Inspect logs

Use:

```text
dejaos logs --project <project>
```

Logs can be a long-running stream. Capture only a bounded startup window using the execution environment's timeout or background-process controls, then stop the log command cleanly. Inspect for:

- syntax or module-load errors
- missing resources or fonts
- incorrect relative imports
- uncaught exceptions or worker failures
- device, UART, network, SQLite, MQTT, or HTTP initialization failures
- repeated watchdog resets or restart loops

Record the command outcome and the relevant log excerpt. A successful `run` plus a clean startup sample is device-backed smoke validation, not full functional validation.

## Repeat after changes

For every material source, configuration, or resource change:

1. Run available syntax or static checks.
2. Run `dejaos run --project <project>` when the correct USB device remains confirmed.
3. Capture and inspect a bounded `dejaos logs --project <project>` startup sample.
4. Fix obvious errors and repeat.
5. If no device is available, explicitly mark device execution and logs as pending.
