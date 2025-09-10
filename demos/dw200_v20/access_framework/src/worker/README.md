# Worker Layer

This directory acts as the **Business Logic Layer** of the application.

## Responsibilities

- **Processing Business Logic**: It contains the core business logic and rules of the application. When an event is received by a `../controller`, it is passed to a corresponding worker in this directory for processing.
- **Coordinating Services**: Workers orchestrate calls to various modules in the `../service` layer to access data, manage configurations, or interact with hardware.
- **State Management**: They are responsible for managing the application's state in response to external events and user actions.

### Example Flow

1. An MQTT message arrives at `../controller/mqttController.js`.
2. `mqttController.js` forwards the message to `mqttWorker.js`.
3. `mqttWorker.js` parses the message, determines it's a request to update permissions, and then calls methods in `../service/sqlite.js` to update the database.
