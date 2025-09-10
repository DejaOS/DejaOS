# Controller Layer

This directory acts as the **Input/IO Layer** of the application.

## Responsibilities

- **Receiving External Inputs**: It contains modules responsible for listening to and receiving all external events and data inputs. This includes:

  - User interactions from the UI (`uiController.js`).
  - Messages from the MQTT broker (`mqttController.js`).
  - Events from hardware and the network, such as NFC card swipes, barcode scans, and network status changes (`deviceController.js`).

- **Delegating to Workers**: Upon receiving an input, the controllers' primary role is to delegate the handling of the actual business logic to the appropriate modules in the `../worker` directory. They do not contain complex business logic themselves.
