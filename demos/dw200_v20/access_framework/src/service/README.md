# Service Layer

This directory acts as the **Service Layer** of the application.

## Responsibilities

- **Providing Foundational Services**: It contains modules that offer reusable, foundational services for the upper layers (especially the `../worker` layer). These services encapsulate interactions with external resources and low-level modules.

- **Encapsulating Low-Level Details**: The service layer abstracts away the implementation details of how data is stored, how configurations are managed, or how hardware is accessed. For example, the `worker` layer doesn't need to know if the database is SQLite or another type; it simply calls methods from `sqlite.js`.

- **Not Business Logic**: This layer does not contain high-level business rules. Instead, it provides the stable, foundational building blocks that the `../worker` layer uses to compose complex business logic.

### Modules

- `config.js`: Manages application configuration.
- `sqlite.js`: Handles all database interactions.
- `ble.js`: Provides core Bluetooth communication functions.
- `mqtt.js`: Contains business-agnostic helper functions for MQTT operations.
