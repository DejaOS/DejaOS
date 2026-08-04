# Device Models and SKU Capabilities

## Decision Rules

1. The developer must confirm the exact device model.
2. Standard features may be treated as present on that model.
3. Treat optional hardware as unavailable until the developer confirms that it is installed on the physical device.
4. Treat optional services as unavailable until the developer confirms that they are enabled for the deployment.
5. Do not implement a requested feature unless it is standard or a confirmed option.
6. The main model is only an SDK/component query key; a submodel must not automatically inherit its main model's SKU.
7. After confirming hardware capabilities, still validate the selected SDK's component list, `app.dxproj`, and `dxmodules/`.
8. Mark models not listed here as "SKU not bundled" and ask the developer before using hardware-specific features.

## VF105_V12

Standard configuration:

- Wi-Fi, Ethernet, Wiegand
- One output and two inputs
- Speaker
- Infrared and white illumination
- 800x1280 display
- Binocular camera

Optional hardware:

- Option 1: fingerprint, barcode scanner, or none
- Option 2: temperature measurement, 4G, or none
- Option 3: card reader or none
  - Card type: IC only, or IC+ID
  - VF105 uses a non-under-display card reader
  - Under-display card reading is a VF205 form factor and must not be inferred for VF105
- Option 4: RS232 or RS485
- Option 5: microphone or none

Optional services:

- Video intercom
- Cloud credential service

## VF114_V12

Standard configuration:

- Wi-Fi and Ethernet
- One output and two inputs
- Wiegand, speaker, and RS485
- White and infrared illumination
- 720x1280 display
- Binocular camera

Optional hardware:

- Option 1: fingerprint or barcode scanner
- Option 2: microphone or none

Optional services:

- Video intercom
- Cloud credential service

## VF203_V12

Standard configuration:

- Ethernet
- Two outputs and two inputs
- Speaker, RS485, and Wiegand
- Infrared illumination
- 600x1024 display
- Binocular camera

Optional hardware:

- Option 1: Wi-Fi, 4G, or none
- Option 2: microphone or none

Optional services:

- Video intercom
- Cloud credential service

## VF202_v12

Standard configuration:

- Ethernet and Bluetooth
- One output and two inputs
- Speaker, RS485, and Wiegand
- White and infrared illumination
- 480x854 display
- Binocular camera

Optional hardware:

- Option 1: 4G or none
- Option 2: microphone or none

Optional services:

- Video intercom
- Cloud credential service

This SKU definition does not support Wi-Fi. Do not generate Wi-Fi configuration, connection, status, or recovery logic.
