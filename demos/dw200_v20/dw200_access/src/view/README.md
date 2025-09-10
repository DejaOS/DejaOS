# View Layer

This directory acts as the **Presentation Layer** of the application.

## Responsibilities

- **UI Components**: It contains all the UI components, views, and visual elements that the user interacts with.
- **Displaying Data**: Its primary role is to render the user interface and display data provided by the controllers.
- **Separation of Concerns**: It is responsible only for the "look and feel" of the application and should not contain any business logic. All user interactions and events are passed up to the `../controller` layer for handling.
