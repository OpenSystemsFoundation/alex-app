# Alex App

A Salesforce Lightning Web Component (LWC) application that provides a Kanban board experience for managing tasks and workflows.

## Features

- **Kanban Board Management**: Create and manage multiple Kanban boards with customizable columns
- **Card Management**: Add, edit, and move cards between columns
- **Lightning Web Components**: Modern, performant UI built with Salesforce's LWC framework
- **Apex Backend**: Robust server-side logic for data persistence and business rules
- **Trigger Handlers**: Automated processes for maintaining data integrity
- **LexoRank Algorithm**: Intelligent card ordering within columns

## Architecture

This application follows Salesforce best practices with:

- Separation of concerns between UI (LWC) and business logic (Apex)
- Trigger framework for automated processes
- Data Transfer Objects (DTOs) for clean API contracts
- Selector pattern for data access abstraction

## Prerequisites

- Salesforce CLI (sfdx)
- Node.js and npm
- Access to a Salesforce org or scratch org

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/OpenSystemsFoundation/alex-app.git
    cd alex-app
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a scratch org:

    ```bash
    sfdx force:org:create -f config/project-scratch-def.json -a alex-app
    ```

4. Push the source to your org:

    ```bash
    sfdx force:source:push -u alex-app
    ```

5. Assign permission sets (optional):
    ```bash
    python scripts/python/assign_permission_set.py
    ```

## Usage

### Development

1. Start the local development server:

    ```bash
    sfdx force:org:open -u alex-app
    ```

2. Run tests:
    ```bash
    npm test
    ```

### Deployment

1. Deploy to production:

    ```bash
    npm run deploy
    ```

2. Create test data:
    ```bash
    python scripts/python/create_test_data.py
    ```

## Project Structure

```
force-app/main/default/
├── applications/          # Lightning Applications
├── aura/                  # Aura Components (if any)
├── classes/               # Apex Classes
│   ├── *Controller.cls    # Controller classes
│   ├── *DTO.cls          # Data Transfer Objects
│   ├── *Selector.cls     # Data selector classes
│   ├── *TriggerHandler.cls # Trigger handlers
│   └── tests/            # Apex test classes
├── lwc/                   # Lightning Web Components
├── objects/               # Custom Objects
├── triggers/              # Apex Triggers
└── layouts/               # Page Layouts
```

## Scripts

- `scripts/apex/`: Apex scripts for data management
- `scripts/python/`: Python utilities for org setup and test data
- `scripts/sf/`: Salesforce CLI command references

## Testing

Run the test suite:

```bash
npm test
```

Run specific tests:

```bash
sfdx force:apex:test:run -n TestClassName
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -am 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## License

This project is licensed under the terms specified in the LICENSE file.

## Support

For support and questions, please open an issue on the GitHub repository.
