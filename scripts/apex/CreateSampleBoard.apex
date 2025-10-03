// Create Sample Kanban Board with Columns and Cards
// Run this in Developer Console or with: sf apex run --file scripts/apex/CreateSampleBoard.apex

// Create Board
Board__c board = new Board__c(
    Name = 'Product Development Sprint 1',
    Description__c = 'Q4 2025 Sprint Board',
    Active__c = true,
    EmailNotifications__c = false,
    SalesforceNotifications__c = true
);
insert board;
System.debug('Board created: ' + board.Id);

// Create Columns with LexoRank positions
List<Column__c> columns = new List<Column__c>();

columns.add(new Column__c(
    ColumnHeader__c = 'Backlog',
    Board__c = board.Id,
    Position__c = '0|h00000:'
));

columns.add(new Column__c(
    ColumnHeader__c = 'To Do',
    Board__c = board.Id,
    Position__c = '0|h40000:'
));

columns.add(new Column__c(
    ColumnHeader__c = 'In Progress',
    Board__c = board.Id,
    Position__c = '0|h80000:'
));

columns.add(new Column__c(
    ColumnHeader__c = 'Code Review',
    Board__c = board.Id,
    Position__c = '0|hc0000:'
));

columns.add(new Column__c(
    ColumnHeader__c = 'Done',
    Board__c = board.Id,
    Position__c = '0|hzzzzz:'
));

insert columns;
System.debug('Columns created: ' + columns.size());

// Create Cards
List<Card__c> cards = new List<Card__c>();

// Backlog Cards
cards.add(new Card__c(
    Subject__c = 'Implement OAuth 2.0 Authentication',
    Description__c = 'Add OAuth 2.0 support for third-party integrations',
    Column__c = columns[0].Id,
    Position__c = '0|h00000:',
    Priority__c = 'High',
    CardType__c = 'Story',
    StoryPoints__c = 8
));

cards.add(new Card__c(
    Subject__c = 'Update API Documentation',
    Description__c = 'Document all REST API endpoints with examples',
    Column__c = columns[0].Id,
    Position__c = '0|h00010:',
    Priority__c = 'Medium',
    CardType__c = 'Task',
    StoryPoints__c = 3
));

// To Do Cards
cards.add(new Card__c(
    Subject__c = 'Fix Login Page CSS',
    Description__c = 'Login button alignment issue on mobile devices',
    Column__c = columns[1].Id,
    Position__c = '0|h00000:',
    Priority__c = 'High',
    CardType__c = 'Bug',
    StoryPoints__c = 2,
    DueDate__c = Date.today().addDays(3)
));

cards.add(new Card__c(
    Subject__c = 'Create User Dashboard',
    Description__c = 'Design and implement user analytics dashboard',
    Column__c = columns[1].Id,
    Position__c = '0|h00010:',
    Priority__c = 'High',
    CardType__c = 'Story',
    StoryPoints__c = 13,
    DueDate__c = Date.today().addDays(7)
));

cards.add(new Card__c(
    Subject__c = 'Write Unit Tests for UserService',
    Description__c = 'Increase code coverage to 90%',
    Column__c = columns[1].Id,
    Position__c = '0|h00020:',
    Priority__c = 'Medium',
    CardType__c = 'Task',
    StoryPoints__c = 5
));

// In Progress Cards
cards.add(new Card__c(
    Subject__c = 'Implement Real-time Notifications',
    Description__c = 'Add WebSocket support for live updates',
    Column__c = columns[2].Id,
    Position__c = '0|h00000:',
    Priority__c = 'High',
    CardType__c = 'Story',
    StoryPoints__c = 8,
    DueDate__c = Date.today().addDays(5)
));

cards.add(new Card__c(
    Subject__c = 'Optimize Database Queries',
    Description__c = 'Reduce page load time by 50%',
    Column__c = columns[2].Id,
    Position__c = '0|h00010:',
    Priority__c = 'Medium',
    CardType__c = 'Task',
    StoryPoints__c = 5
));

// Code Review Cards
cards.add(new Card__c(
    Subject__c = 'Email Template System',
    Description__c = 'Dynamic email templates with merge fields',
    Column__c = columns[3].Id,
    Position__c = '0|h00000:',
    Priority__c = 'Medium',
    CardType__c = 'Story',
    StoryPoints__c = 8
));

// Done Cards
cards.add(new Card__c(
    Subject__c = 'Setup CI/CD Pipeline',
    Description__c = 'Configure GitHub Actions for automated deployment',
    Column__c = columns[4].Id,
    Position__c = '0|h00000:',
    Priority__c = 'High',
    CardType__c = 'Task',
    StoryPoints__c = 5
));

cards.add(new Card__c(
    Subject__c = 'Security Audit',
    Description__c = 'Conduct security review of authentication system',
    Column__c = columns[4].Id,
    Position__c = '0|h00010:',
    Priority__c = 'High',
    CardType__c = 'Task',
    StoryPoints__c = 8
));

insert cards;
System.debug('Cards created: ' + cards.size());

// Create an Epic
Card__c epic = new Card__c(
    Subject__c = 'User Management System',
    Description__c = 'Complete overhaul of user management',
    Column__c = columns[0].Id,
    Position__c = '0|h00005:',
    CardType__c = 'Epic',
    Priority__c = 'High',
    StoryPoints__c = 40
);
insert epic;
System.debug('Epic created: ' + epic.Id);

// Link some cards to the epic
List<Card__c> epicCards = new List<Card__c>();
epicCards.add(new Card__c(
    Id = cards[0].Id,
    Epic__c = epic.Id
));
epicCards.add(new Card__c(
    Id = cards[3].Id,
    Epic__c = epic.Id
));
update epicCards;

System.debug('Sample board created successfully!');
System.debug('Board URL: /lightning/r/Board__c/' + board.Id + '/view');
