# Alex - A Kanban App

Welcome to **Alex**, an open-source Lightning Web Component application for managing workflows visually using a kanban board. This app provides real-time updates, a Redux-like global state management, and leverages Salesforce platform events for seamless synchronisation across users.

## Features

- **Dynamic Kanban Board**: Columns and cards are generated dynamically, adapting to your configuration in real-time.
- **Real-Time Synchronization**: Uses platform events and a subscriber LWC to enable real-time updates across all users viewing the board.
- **Global State Management**: Inspired by Redux, the state of the app is managed globally by a `store` component, dispatching actions through a `service` component to interact with backend controllers.
- **Drag-and-Drop Functionality**: Cards can be easily moved across columns using native HTML5 drag-and-drop events.
- **SLDS Styling**: Designed with Salesforce Lightning Design System (SLDS) to seamlessly fit into Salesforce.
- **Lightning Components Integration**: Leverages standard Lightning components.
- **GraphQL Adapter**: Implements the new GraphQL wire adapter to dynamically retrieve configured fields from custom metadata for the edit modal.
- **Backend with FFLib-Inspired Layering**: A robust backend structure following the FFLib Domain Driven Design pattern

## Components Overview

### Frontend Components (LWC)

- **Board Component** (`kanbanBoard`): Handles the rendering of columns and cards. This is where all event handling occurs, including drag-and-drop interactions.
- **Subscriber Component** (`kanbanSubscriber`): Listens for platform events and updates the board in real time.
- **Store Component** (`kanbanStore`): Manages the global state, dispatching actions to keep the board updated.
- **Service Component** (`kanbanService`): Handles communication between the `kanbanStore` and backend `controller` to synchronize changes.
- **Edit Modal**: Uses a Lightning card edit modal, integrated with the new GraphQL wire adapter for dynamic field configuration based on custom metadata.

### Backend Architecture (FFLib-Inspired)

- **Selector**: Handles queries to fetch relevant kanban data.
- **Repository**: Manages all DML operations (e.g., insert, update, delete) for kanban objects.
- **Domain**: Contains the business logic, including firing platform events for real-time updates.
- **Trigger Handler**: Ensures triggers run efficiently and according to business requirements.
- **Service Layer**: Bridges the interaction between selectors and repositories, ensuring clean separation of concerns.
- **Controller**: Interfaces directly with the LWC components, providing methods to execute necessary backend logic.

## Getting Started

### Prerequisites

- **Salesforce CLI**: Make sure you have the latest version of the Salesforce CLI installed. Use the `sf` commands for interacting with your Salesforce org.
- **Scratch Org**: We recommend setting up a scratch org for development purposes.

### Installation

1. **Clone the Repository**:

    ```sh
    git clone https://github.com/OpenSystemsFoundation/alex.git
    cd alex
    ```

2. **Deploy to Salesforce**:

    ```sh
    sf project deploy start --target-org <username/alias>
    ```

3. **Assign the Permission Set**:
    ```sh
    sf org assign-permset --name AlexAdmin --target-org <username/alias>
    ```

### Usage

1. Open your Salesforce org and navigate to the Alex Console or Alex App.
2. Create a Board record, from there you can create columns and cards according to your needs.
3. Drag and drop cards to different columns.
4. Enjoy!

## Installation

1. Install Node.js LTS
2. Install Python 3.12
3. Install Yarn

```sh
npm install -g yarn
```

4. Install Pip

```sh
python -m ensurepip --upgrade
```

5. Install Virtual Environment

```sh
pip install pipenv
pipenv install
python -m venv venv
pip install -r requirements.txt
```

6. Install Node.js Dependencies

```sh
yarn install
```

## Testing

1. **Apex Tests**: The app if fully covered with Apex Tests.
2. **Jest Tests**: A minimal implementation of LWC Jest Tests.
3. **Selenium Tests with Pytest-BDD**: In-Development is a Selenium Pytest-BDD test suite for end-to-end testing.

## Contributing

We welcome contributions! If you'd like to enhance the Alex App, please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

This app is offered through the Open Systems Foundation. For inquiries or support, please reach out to us at [support@opensf.foundation](mailto:support@opensf.foundation).

## Coming Soon

Alex - A Kanban Board, will soon be available on the AppExchange as a managed package!
