# Alex Kanban Board - Quick Start Guide

Welcome to Alex! This guide will help you get started with the Alex Kanban Board application in minutes.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First-Time Setup](#first-time-setup)
- [Creating Your First Board](#creating-your-first-board)
- [Working with Cards](#working-with-cards)
- [Collaborating with Your Team](#collaborating-with-your-team)
- [Tips & Tricks](#tips--tricks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- ✅ **Salesforce Org** (Developer Edition, Sandbox, or Production)
- ✅ **Salesforce CLI** installed ([Download here](https://developer.salesforce.com/tools/sfdxcli))
- ✅ **Node.js** (v18 or higher) - Install from [nodejs.org](https://nodejs.org/) or use your preferred version manager
- ✅ **Git** installed ([Download here](https://git-scm.com/))
- ✅ **Admin privileges** in your Salesforce org

### Verify Your Setup

```bash
# Check Salesforce CLI
sf --version

# Check Node.js
node --version

# Check npm
npm --version

# Check Git
git --version
```

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/OpenSystemsFoundation/alex-app.git
cd alex-app
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:

- Salesforce LWC development tools
- Jest for testing
- Playwright for E2E testing
- ESLint and Prettier for code quality

### Step 3: Authenticate with Salesforce

Choose one of the following authentication methods:

#### Option A: Web Login (Recommended)

```bash
sf org login web --alias my-alex-org --set-default
```

This will open a browser window. Log in with your Salesforce credentials.

#### Option B: JWT-Based Authentication

For CI/CD or automated deployments:

```bash
sf org login jwt --client-id YOUR_CONSUMER_KEY \
  --jwt-key-file path/to/server.key \
  --username your.username@company.com \
  --alias my-alex-org \
  --set-default
```

### Step 4: Deploy to Your Org

```bash
npm run deploy
```

You should see output similar to:

```
Deploying metadata...
Deployment Status: Succeeded
Components Deployed: 47
```

### Step 5: Assign Permission Sets

Assign yourself the admin permission set:

```bash
sf org assign permset --name Alex_Admin
```

For other users, you can assign:

```bash
# For standard users
sf org assign permset --name Alex_User --on-behalf-of user@example.com
```

## First-Time Setup

### Step 1: Open Your Org

```bash
sf org open
```

This opens your Salesforce org in your default browser.

### Step 2: Find Alex in the App Launcher

1. Click the **App Launcher** (grid icon) in the top-left corner
2. Search for "**Alex Kanban Board**"
3. Click to open the application

### Step 3: Create Sample Data (Optional)

To quickly populate your org with sample data for testing:

```bash
npm run create:sample
```

This creates:

- 1 sample board ("Team Sprint Board")
- 3 columns ("To Do", "In Progress", "Done")
- 6 sample cards distributed across columns

## Creating Your First Board

### Method 1: Using the UI

1. **Open Alex** from the App Launcher
2. Click **"New Board"** button
3. Fill in board details:
    - **Name**: "My First Board" (required)
    - **Description**: Optional description
4. Click **"Save"**
5. Your board is created! Now add columns.

### Method 2: Using Apex Script

Create `scripts/apex/CreateMyBoard.apex`:

```apex
OpenSF__Board__c board = new OpenSF__Board__c(
    Name = 'My First Board',
    OpenSF__Description__c = 'Getting started with Alex',
    OpenSF__IsActive__c = true
);
insert board;

List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>{
    new OpenSF__Column__c(
        Name = 'To Do',
        OpenSF__Board__c = board.Id,
        OpenSF__Order__c = 1
    ),
    new OpenSF__Column__c(
        Name = 'In Progress',
        OpenSF__Board__c = board.Id,
        OpenSF__Order__c = 2
    ),
    new OpenSF__Column__c(
        Name = 'Done',
        OpenSF__Board__c = board.Id,
        OpenSF__Order__c = 3
    )
};
insert columns;

System.debug('Board created: ' + board.Id);
```

Run it:

```bash
sf apex run --file scripts/apex/CreateMyBoard.apex
```

## Working with Cards

### Creating a Card

1. **Navigate to your board**
2. **Click "Add Card"** in any column (usually at the bottom)
3. **Fill in card details**:
    - **Title**: Brief description (required)
    - **Description**: Detailed information (optional)
    - **Priority**: High, Medium, Low
    - **Due Date**: Set a deadline
    - **Assigned To**: Assign to a team member
    - **Color**: Choose a color for visual coding
4. **Click "Save"**

### Moving Cards

**Drag and Drop:**

1. Click and hold on a card
2. Drag it to the desired column
3. Drop it in position
4. The card is automatically saved!

**Or use the Edit dialog:**

1. Click on a card to open details
2. Use the **"Move to Column"** dropdown
3. Select destination column
4. Click **"Save"**

### Editing a Card

1. **Click on any card** to open the edit dialog
2. **Modify fields** as needed
3. **Click "Save"** to update
4. Changes are immediately visible to all users!

### Deleting a Card

1. **Click on a card** to open details
2. **Click the "Delete" button** (trash icon)
3. **Confirm deletion** in the dialog
4. Card is permanently removed

> ⚠️ **Warning**: Deleted cards cannot be recovered. Consider archiving important cards instead.

## Collaborating with Your Team

### Inviting Team Members

1. **Add users to Salesforce** (Setup → Users)
2. **Assign permission set**:
    ```bash
    sf org assign permset --name Alex_User --on-behalf-of newuser@company.com
    ```
3. **Share the board**:
    - Click on board settings
    - Add users or groups
    - Set permission level (Read, Edit, Admin)

### Real-Time Collaboration Features

✅ **Live Updates**: See changes instantly as team members work  
✅ **Multi-user Editing**: Multiple people can work simultaneously  
✅ **Visual Indicators**: See who's editing what (coming soon)  
✅ **Conflict Resolution**: Automatic handling of simultaneous edits

### Best Practices for Teams

1. **Set WIP Limits**: Limit work-in-progress per column
2. **Use Colors**: Establish color coding standards (e.g., red = urgent)
3. **Regular Stand-ups**: Review board together daily
4. **Clear Descriptions**: Write detailed card descriptions
5. **Assign Cards**: Always assign cards to specific team members
6. **Set Due Dates**: Keep work on track with deadlines

## Tips & Tricks

### Keyboard Shortcuts

| Shortcut | Action                                   |
| -------- | ---------------------------------------- |
| `N`      | Create new card (when column is focused) |
| `E`      | Edit selected card                       |
| `Delete` | Delete selected card (with confirmation) |
| `Esc`    | Close dialog/cancel action               |
| `Tab`    | Navigate between cards                   |
| `Enter`  | Open card details                        |

### Quick Actions

- **Double-click a card** to open for editing
- **Right-click a card** for context menu (coming soon)
- **Shift+Drag** to duplicate a card (coming soon)

### Power User Features

#### Bulk Operations (Coming Soon)

- Select multiple cards with Ctrl/Cmd+Click
- Perform batch updates
- Move multiple cards at once

#### Custom Fields

Add custom fields via Salesforce Setup:

1. Setup → Object Manager → Card
2. Fields & Relationships → New
3. Create custom field
4. Deploy updated metadata

#### Filtering and Search

- Use the search bar to find cards by title
- Filter by assignee, priority, or due date
- Save favorite filters for quick access

## Troubleshooting

### Cards Not Loading

**Problem**: Board shows loading spinner indefinitely

**Solutions**:

1. **Check permissions**:

    ```bash
    sf org assign permset --name Alex_Admin
    ```

2. **Verify data exists**:

    ```bash
    sf data query --query "SELECT COUNT() FROM OpenSF__Board__c"
    ```

3. **Check browser console** for errors (F12)

4. **Clear cache** and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Drag and Drop Not Working

**Problem**: Cards won't drag between columns

**Solutions**:

1. **Check browser compatibility** (use Chrome, Firefox, or Edge)
2. **Disable browser extensions** that might interfere
3. **Verify edit permissions** on the board
4. **Try refreshing the page**

### Real-Time Updates Not Appearing

**Problem**: Changes from other users aren't showing up

**Solutions**:

1. **Verify Platform Events are enabled**:
    - Setup → Platform Events
    - Check OpenSF**KanbanEvent**e is active

2. **Check streaming API limits**:
    - Setup → System Overview
    - Verify not at limit

3. **Refresh the page** to re-subscribe to events

4. **Check user permissions** for platform events

### Deployment Errors

**Problem**: `npm run deploy` fails

**Solutions**:

1. **Conflict errors**:

    ```bash
    # Force overwrite conflicts
    sf project deploy start --ignore-conflicts
    ```

2. **Missing dependencies**:

    ```bash
    # Reinstall packages
    rm -rf node_modules package-lock.json
    npm install
    ```

3. **Authentication issues**:

    ```bash
    # Re-authenticate
    sf org login web --alias my-org --set-default
    ```

4. **API version mismatch**:
    - Update `sourceApiVersion` in `sfdx-project.json`
    - Redeploy

### Performance Issues

**Problem**: Board is slow with many cards

**Solutions**:

1. **Limit cards per column** (recommend < 50)
2. **Archive completed cards** regularly
3. **Use filtering** to show only relevant cards
4. **Check org limits** (CPU time, queries)

### Getting Help

If you're still stuck:

1. **Check the logs**:

    ```bash
    # Apex logs
    sf apex log tail

    # Browser console
    Press F12 → Console tab
    ```

2. **Run diagnostics**:

    ```bash
    # Validate deployment
    npm run validate

    # Run tests
    npm run test:all
    ```

3. **Community support**:
    - [GitHub Issues](https://github.com/OpenSystemsFoundation/alex-app/issues)
    - [GitHub Discussions](https://github.com/OpenSystemsFoundation/alex-app/discussions)

4. **Report a bug**:
    - Include browser and Salesforce org version
    - Steps to reproduce
    - Screenshots or error messages
    - Console logs

## Next Steps

Now that you're up and running:

1. ✅ **Explore the UI** - Familiarize yourself with all features
2. ✅ **Customize your board** - Add columns that match your workflow
3. ✅ **Invite your team** - Start collaborating!
4. ✅ **Read the architecture docs** - Understand how it works
5. ✅ **Contribute** - Check out [CONTRIBUTING.md](../CONTRIBUTING.md)

## Additional Resources

- 📖 [Architecture Documentation](ARCHITECTURE.md)
- 🤝 [Contributing Guidelines](../CONTRIBUTING.md)
- 🔧 [Development Guide](../AGENTS.md)
- 📝 [API Documentation](API.md) (coming soon)
- 🎥 [Video Tutorials](https://youtube.com/opensystemsfoundation) (coming soon)

## Quick Reference Commands

```bash
# Development
npm run deploy              # Deploy to org
npm run validate           # Validate without deploying
npm test                   # Run unit tests
npm run lint              # Check code quality

# Testing
npm run test:unit         # Jest unit tests
npm run test:e2e          # Playwright E2E tests
npm run test:apex         # Apex tests
npm run test:all          # All tests

# Scratch Org Development
sf org create scratch -f config/project-scratch-def.json -a scratch --set-default
sf project deploy start
sf org assign permset -n Alex_Admin
sf org open
npm run test:e2e:scratch

# Utilities
npm run create:sample     # Create sample data
npm run prettier          # Format code
sf apex run -f scripts/apex/YourScript.apex
```

---

**Welcome to Alex!** 🎉 We hope you enjoy using the Kanban board for your team collaboration.

For questions, feedback, or contributions, visit us at [github.com/OpenSystemsFoundation/alex-app](https://github.com/OpenSystemsFoundation/alex-app)

---

**Document Version**: 2.0  
**Last Updated**: October 5, 2025  
**Maintainer**: Open Systems Foundation
