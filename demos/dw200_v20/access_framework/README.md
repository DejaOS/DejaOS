# Access Control Application Framework

## 1. Overview

This project serves as a foundational boilerplate/framework for developing access control applications, particularly for embedded devices. It provides a clean, well-structured, and event-driven architecture designed to be easily extended with specific business logic.

The primary goal of this framework is to handle the low-level setup for UI, device hardware (NFC, barcode scanner), and network communication (MQTT, NTP), allowing developers to focus on implementing the core features of their access control system without reinventing the wheel. It is intentionally lightweight on business logic, providing only the structural foundation.

### 1.1. Device Compatibility

While this application is specifically tailored for the **DW200 V20** device, the core JavaScript code is highly portable and can be adapted to run on other `dejaos`-based devices. To port this framework to a new device, you will primarily need to:

- **Adapt the UI**: Adjust the screen layouts and components in the `src/view/` directory to match the target device's screen resolution and hardware capabilities.
- **Update Modules**: Ensure the correct `dxmodules` for the target hardware are used.

## 2. Key Features

- **Modular & Layered Architecture**: A clear separation of concerns into distinct layers (Controller, Worker, Service, View), making the codebase easy to understand, maintain, and scale.
- **Extensible by Design**: The core business logic is decoupled from the input/output and service layers. You can easily add complex access rules and behaviors in the `worker` directory without refactoring the entire application.
- **Event-Driven**: Utilizes a central event bus (`dxEventBus`) for communication between different layers, promoting loose coupling and flexible integration of new features.
- **Abstracted Services**: Provides a clean service layer to interact with databases, configuration files, and hardware modules, hiding the low-level implementation details.

## 3. Project Structure

The application is organized into a classic layered architecture. For a detailed explanation of each layer's responsibilities, please refer to the `README.md` file located within each directory.

- `src/`
  - `controller/`: **Input Layer** - Handles all external inputs (UI interactions, MQTT messages, device hardware events). Its sole job is to receive input and delegate it to the appropriate worker.
  - `worker/`: **Business Logic Layer** - This is the heart of your application. It contains the core logic for processing events, making decisions, and managing application state. **This is the primary directory you will modify and extend.**
  - `service/`: **Service Layer** - Provides foundational, reusable services like database access (`sqlite.js`), configuration management (`config.js`), and hardware communication (`ble.js`).
  - `view/`: **Presentation Layer** - Manages all UI components, screens, and visual elements.
  - `utils/`: **Utilities** - Contains generic, stateless helper functions (e.g., date formatting, string manipulation) that can be used across the application.

## 4. How to Use and Customize

This framework is a starting point. To build your application, you should focus on implementing your specific business logic within the **`src/worker/`** directory.

### Example Workflow:

Imagine you want to implement a rule where a valid barcode scan opens a door.

1.  **Input**: A barcode is scanned. The event is captured by the hardware listener in `src/controller/deviceController.js`.
2.  **Delegation**: The `deviceController` does no processing itself. It simply fires an event containing the barcode data, which is listened for in `src/worker/deviceWorker.js`.
3.  **Business Logic (Your Part)**: Inside `deviceWorker.js`, you would implement the logic:
    - Is the barcode format valid?
    - Does this barcode correspond to a valid user? (You might call `sqlite.js` from the `service` layer to check the database).
    - Does the user have permission to enter at this time?
    - If all checks pass, fire an event to open the door and another to update the UI with a "Success" message.
4.  **Action/Feedback**: Other modules (like `uiController.js` or another part of `deviceController.js`) listen for the "open door" and "show success" events and act accordingly.

By following this pattern, your complex business logic remains cleanly separated from the underlying hardware and UI code.
