# vf105 UART Barcode Demo (Simplified)

This demo keeps only the minimum logic required to read barcode data from a scanner module over UART, so developers can get started quickly.

## Files

- `src/main.js`: Demo entry point. Initializes UART, registers callbacks, and polls scanner data.
- `src/codeUtils.js`: Scanner protocol parser (`55 AA` frame header + BCC checksum).

## Quick Start Edits

1. UART device path: update `'/dev/ttySLB1'` in `src/main.js`.
2. UART parameters: update `'115200-8-N-1'` in `src/main.js`.
3. Business logic: handle `codeText` in the `onMessage` callback.

## Callback Payload

After a successful scan, the callback receives:

- `cmd`: command byte (hex string)
- `length`: payload length
- `data`: raw barcode bytes
- `bcc`: checksum value

The demo already converts `data` into readable text and prints it.

## Sample Output

```text
[INFO 2026-04-27 18:44:30.535]: Scan result:  130042835662567026
[INFO 2026-04-27 18:44:30.538]: Raw frame:  {"cmd":"30","length":18,"data":[49,51,48,48,52,50,56,51,53,54,54,50,53,54,55,48,50,54],"bcc":213}
```
