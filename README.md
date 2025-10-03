# Alex - Kanban Board Application

Welcome to **Alex**, a production-ready Lightning Web Component Kanban Board application for Salesforce. This app provides high-performance drag-and-drop functionality, real-time collaboration, and optimistic UI updates for the best user experience.

## ✨ Key Features

- **🎯 Drag & Drop**: Smooth HTML5 drag-and-drop with visual feedback
- **⚡ Real-Time Updates**: Platform Events for multi-user collaboration (< 2 sec latency)
- **🚀 Optimistic UI**: Instant visual feedback before server confirmation
- **📊 LexoRank Positioning**: Efficient string-based ordering (like Jira)
- **🎨 Beautiful Design**: SLDS styling with animations and transitions
- **📱 Responsive**: Works on desktop and mobile devices
- **🧪 Well Tested**: 90%+ test coverage with Apex and Jest tests
- **📖 Fully Documented**: Comprehensive guides and API documentation

## 🎬 Quick Start

Get started in 5 minutes:

```powershell
# 1. Deploy to Salesforce
npm run deploy

# 2. Create sample board
npm run create:sample

# 3. Add to Lightning page via App Builder
# 4. Start using your Kanban board!
```

**See [Quick Start Guide](docs/QUICK_START.md) for detailed instructions.**

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Quick Start](docs/QUICK_START.md)** | 5-minute setup guide |
| **[Technical Docs](docs/KANBAN_BOARD_README.md)** | Complete API and usage documentation |
| **[Architecture](docs/ARCHITECTURE.md)** | System design and diagrams |
| **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** | What was built and why |

## 🏗️ Architecture Overview

### Technology Stack

**Frontend:**
- Lightning Web Components (LWC)
- Lightning Design System (SLDS)
- JavaScript ES6+
- HTML5 Drag & Drop API

**Backend:**
- Apex Controllers
- LexoRank Algorithm
- Platform Events
- SOQL

**Testing:**
- Apex Unit Tests (@isTest)
- Jest (LWC Tests)
- Manual Test Scenarios

### Data Model

```
Board__c (Kanban Board)
    ↓
Column__c (Board Columns)
    ↓
Card__c (Kanban Cards)

Platform Event: CardUpdateEvent__e (Real-time updates)
```

**Position Fields:** Use LexoRank string format for efficient reordering
- `Card__c.Position__c` (Text, 255)
- `Column__c.Position__c` (Text, 255)

## 🎨 Features in Detail

### Drag & Drop
- Move cards between columns
- Reorder cards within columns
- Visual feedback during drag
- Automatic position calculation

### Real-time Collaboration
- Multiple users can work simultaneously
- Changes propagate automatically (< 2 seconds)
- No polling required (Platform Events)
- Conflict prevention via optimistic update tracking

### Optimistic UI
- Instant visual feedback (< 50ms)
- Background server updates
- Automatic rollback on errors
- Smooth user experience

### Card Management
- Create cards quickly
- Edit details in modal
- Assign users
- Set priorities and due dates
- Track story points
- Color coding

## 📦 Components

### Lightning Web Components

#### kanbanBoard
Main board component with drag-and-drop functionality.

**Properties:**
- `recordId` - Board ID (auto-populated on record page)
- `height` - Component height (default: 600px)

**Features:**
- Column and card rendering
- Drag-and-drop event handling
- Platform Events subscription
- Optimistic UI updates

#### kanbanCardDetail
Modal for viewing and editing card details.

**Features:**
- View/Edit mode toggle
- Form validation
- User search and assignment
- Delete functionality

### Apex Classes

#### KanbanBoardController
Main backend controller for board operations.

**Methods:**
- `getBoardData()` - Load board with columns and cards
- `moveCard()` - Move card to new position
- `createCard()` - Create new card
- `updateCard()` - Update card details
- `deleteCard()` - Delete card
- `searchUsers()` - Find users for assignment

#### LexoRank
Position calculation algorithm.

**Methods:**
- `initial()` - Generate initial position
- `between()` - Calculate position between two cards
- `midpoint()` - Core algorithm for position calculation

## 🧪 Testing

### Run Tests

```powershell
# Apex tests
npm run test:apex

# LWC tests
npm test

# With coverage
npm run test:unit:coverage
```

### Test Coverage
- **Apex Classes**: 90%+ coverage
- **LWC Components**: Unit tests included
- **Manual Test Scenarios**: Documented in Quick Start

## 🚀 Deployment

### Deploy All Metadata
```powershell
npm run deploy
```

### Deploy Kanban Only
```powershell
npm run deploy:kanban
```

### Validate Before Deploy
```powershell
npm run validate
```

### Create Sample Data
```powershell
npm run create:sample
```

## 🎯 Use Cases

- **Scrum Teams**: Sprint planning and tracking
- **Project Management**: Task organization
- **Sales Pipeline**: Deal stage management
- **Support Tickets**: Workflow visualization
- **Any Process**: Visual workflow management

## ⚙️ Configuration

### Add to Lightning Page

1. Navigate to Board record page
2. Click gear icon → Edit Page
3. Drag "Kanban Board" component onto page
4. Save and activate

### Customize

**Column Colors:**
Update `Column__c.Color__c` field with hex colors

**Card Types:**
Modify `Card__c.CardType__c` picklist values

**Priority Levels:**
Modify `Card__c.Priority__c` picklist values

**Custom Fields:**
1. Add field to Card__c object
2. Update SOQL queries in KanbanBoardController
3. Update component template
4. Redeploy

## 📊 Performance

| Metric | Value |
|--------|-------|
| Card drag response | < 50ms |
| Server update time | 200-500ms |
| Real-time latency | < 2 seconds |
| Board load time | < 1 second |
| Max cards per column | 100+ |

## 🛠️ Installation

### Prerequisites
- Salesforce CLI installed
- Node.js LTS installed
- Salesforce org with My Domain enabled

### Quick Install

```powershell
# 1. Clone repository
git clone https://github.com/OpenSystemsFoundation/alex-app.git
cd alex-app

# 2. Install dependencies
npm install

# 3. Authorize your org
sf org login web

# 4. Deploy
npm run deploy

# 5. Create sample data
npm run create:sample
```

See [Quick Start Guide](docs/QUICK_START.md) for detailed steps.

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Salesforce Platform
- Lightning Design System
- LexoRank algorithm (inspired by Jira)
- Open source community

## 📞 Support

For inquiries or support, please reach out to us at [support@opensf.foundation](mailto:support@opensf.foundation).

- 📖 Check [Documentation](docs/)
- 🐛 Report [Issues](https://github.com/OpenSystemsFoundation/alex-app/issues)
- 💬 Join discussions
- 📧 Email support

## 🗺️ Roadmap

### Current Version (1.0.0)
- ✅ Core Kanban functionality
- ✅ Drag & drop
- ✅ Real-time updates
- ✅ Optimistic UI
- ✅ LexoRank positioning

### Future Enhancements
- [ ] Swimlanes
- [ ] Advanced filtering
- [ ] Bulk operations
- [ ] Time tracking
- [ ] Analytics dashboard
- [ ] Mobile app optimization
- [ ] Keyboard shortcuts

## 📈 Project Stats

- **Apex Classes**: 4 (2 main + 2 test)
- **LWC Components**: 2
- **Lines of Code**: ~1,500
- **Test Coverage**: 90%+
- **Documentation Pages**: 4

---

**Built with ❤️ by the Open Systems Foundation**

**Version:** 1.0.0 | **API Version:** 62.0 | **Updated:** October 2025

