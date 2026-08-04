# Device Model and SKU Capabilities

Use this matrix to constrain application requirements before selecting components or writing hardware-facing code.

## Contents

- Decision rules
- VF105_V12
- VF114_V12
- VF203_V12
- VF202_V12

## Decision rules

1. Normalize model spelling to the project/CLI identifier, including `VF202_V12`.
2. Treat standard features as available for that model.
3. Treat selectable features as unavailable until the user confirms the actual device SKU selection.
4. Treat service options as unavailable until the user confirms that the service is enabled for the deployment.
5. Do not implement a feature absent from both the standard and optional lists for the selected model.
6. After deciding the hardware capability, still verify that its component is installed in `app.dxproj`/`dxmodules/` and that all calls match the generated wrapper API.
7. Use `/data` as the default runtime data root for model names beginning with `VF`; use `/app/data` for other model families unless target-project or device documentation defines another path.

## VF105_V12

Standard:

- Wi-Fi
- Ethernet
- Wiegand
- one output
- two inputs
- speaker
- infrared fill light
- white fill light
- 800 x 1280 screen
- binocular camera

Selectable hardware:

- option 1: fingerprint, barcode/QR scanning, or neither
- option 2: temperature measurement, 4G, or neither
- option 3: card reader or none
  - card type: IC only, or IC and ID
  - `VF105_V12` uses the non-under-screen card-reader form
  - under-screen card reading belongs to the VF205 variant; do not assume it for `VF105_V12`
- option 4: RS232 or RS485
- option 5: microphone or none

Optional services:

- video intercom
- cloud credential service

## VF114_V12

Standard:

- Wi-Fi
- Ethernet
- one output
- two inputs
- Wiegand
- speaker
- RS485
- white fill light
- infrared fill light
- 720 x 1280 screen
- binocular camera

Selectable hardware:

- option 1: fingerprint or barcode/QR scanning
- option 2: microphone or none

Optional services:

- video intercom
- cloud credential service

## VF203_V12

Standard:

- Ethernet
- two outputs
- two inputs
- speaker
- RS485
- Wiegand
- infrared fill light
- 600 x 1024 screen
- binocular camera

Selectable hardware:

- option 1: Wi-Fi, 4G, or neither
- option 2: microphone or none

Optional services:

- video intercom
- cloud credential service

## VF202_V12

Standard:

- Ethernet
- Bluetooth
- one output
- two inputs
- speaker
- RS485
- Wiegand
- white fill light
- infrared fill light
- 480 x 854 screen
- binocular camera

Selectable hardware:

- option 1: 4G or none
- option 2: microphone or none

Optional services:

- video intercom
- cloud credential service

Wi-Fi is not supported by this SKU definition. Do not add Wi-Fi configuration, connection, status, or recovery flows for `VF202_V12`.
