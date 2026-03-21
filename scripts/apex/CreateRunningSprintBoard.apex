// Creates a Sprint board with 3 completed sprints + 1 active sprint
// Includes cards across columns, sprint cards, and burndown snapshots
private static String generateLexorank(Integer idx, Integer total) {
    if (total <= 1)
        return '0|hzzzzz:';
    String chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    Integer inc = (Integer) (Math.pow(36, 5) / (total + 1));
    Integer val = inc * (idx + 1);
    String pos = '';
    Integer tmp = val;
    for (Integer i = 0; i < 5; i++) {
        pos = chars.substring(Math.mod(tmp, 36), Math.mod(tmp, 36) + 1) + pos;
        tmp = tmp / 36;
    }
    return '0|h' + pos + ':';
}

// 1. Create Board
OpenSF__Board__c board = new OpenSF__Board__c(
    Name = 'API Platform',
    OpenSF__Status__c = 'Published',
    OpenSF__Type__c = 'Sprint',
    OpenSF__Active__c = true,
    OpenSF__EmailNotifications__c = false,
    OpenSF__SalesforceNotifications__c = false,
    OpenSF__Description__c = 'API Platform development with mature sprint cadence. Multiple sprints completed.'
);
insert board;

// 2. Create Columns
List<String> headers = new List<String>{
    'Backlog',
    'To Do',
    'In Progress',
    'Testing',
    'Review',
    'Done'
};
List<String> colStatuses = new List<String>{
    'Backlog',
    'To Do',
    'In Progress',
    'Testing',
    'Review',
    'Done'
};
List<String> categories = new List<String>{
    'Backlog',
    'To Do',
    'In Progress',
    'Testing',
    'Review',
    'Done'
};

List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
for (Integer i = 0; i < headers.size(); i++) {
    columns.add(
        new OpenSF__Column__c(
            OpenSF__Board__c = board.Id,
            OpenSF__ColumnHeader__c = headers[i],
            OpenSF__Status__c = colStatuses[i],
            OpenSF__Category__c = categories[i],
            OpenSF__LexoRankPosition__c = generateLexorank(i, headers.size())
        )
    );
}
insert columns;

Map<String, OpenSF__Column__c> colMap = new Map<String, OpenSF__Column__c>();
for (OpenSF__Column__c c : columns) {
    colMap.put(c.OpenSF__ColumnHeader__c, c);
}

// 3. Create Sprints (3 completed + 1 active)
Date today = Date.today();

OpenSF__Sprint__c sprint1 = new OpenSF__Sprint__c(
    OpenSF__Board__c = board.Id,
    OpenSF__Status__c = 'Completed',
    OpenSF__SprintNumber__c = 1,
    OpenSF__StartDate__c = today.addDays(-42),
    OpenSF__EndDate__c = today.addDays(-29),
    OpenSF__Goal__c = 'Setup API foundation: auth endpoints, rate limiting, and error handling.',
    OpenSF__TotalStoryPoints__c = 21,
    OpenSF__CompletedStoryPoints__c = 18,
    OpenSF__Velocity__c = 18
);

OpenSF__Sprint__c sprint2 = new OpenSF__Sprint__c(
    OpenSF__Board__c = board.Id,
    OpenSF__Status__c = 'Completed',
    OpenSF__SprintNumber__c = 2,
    OpenSF__StartDate__c = today.addDays(-28),
    OpenSF__EndDate__c = today.addDays(-15),
    OpenSF__Goal__c = 'CRUD endpoints for core resources and pagination.',
    OpenSF__TotalStoryPoints__c = 26,
    OpenSF__CompletedStoryPoints__c = 24,
    OpenSF__Velocity__c = 24
);

OpenSF__Sprint__c sprint3 = new OpenSF__Sprint__c(
    OpenSF__Board__c = board.Id,
    OpenSF__Status__c = 'Completed',
    OpenSF__SprintNumber__c = 3,
    OpenSF__StartDate__c = today.addDays(-14),
    OpenSF__EndDate__c = today.addDays(-1),
    OpenSF__Goal__c = 'Webhook system, API versioning, and developer docs.',
    OpenSF__TotalStoryPoints__c = 29,
    OpenSF__CompletedStoryPoints__c = 26,
    OpenSF__Velocity__c = 26
);

OpenSF__Sprint__c sprint4 = new OpenSF__Sprint__c(
    OpenSF__Board__c = board.Id,
    OpenSF__Status__c = 'Active',
    OpenSF__SprintNumber__c = 4,
    OpenSF__StartDate__c = today,
    OpenSF__EndDate__c = today.addDays(13),
    OpenSF__Goal__c = 'GraphQL layer, caching strategy, and performance monitoring.',
    OpenSF__TotalStoryPoints__c = 28,
    OpenSF__CompletedStoryPoints__c = 5
);

insert new List<OpenSF__Sprint__c>{ sprint1, sprint2, sprint3, sprint4 };

// Set active sprint on board
board.OpenSF__ActiveSprint__c = sprint4.Id;
update board;

// 4. Create ALL cards
List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();

// --- Sprint 1 cards (all Done) ---
String[] s1Subjects = new List<String>{
    'JWT authentication endpoint',
    'API key management',
    'Rate limiter middleware',
    'Global error handler',
    'Health check endpoint'
};
String[] s1Types = new List<String>{
    'Story',
    'Story',
    'Story',
    'Improvement',
    'Task'
};
String[] s1Priorities = new List<String>{
    'High',
    'High',
    'High',
    'Medium',
    'Low'
};
Integer[] s1Points = new List<Integer>{ 5, 5, 5, 3, 1 };
// Card index 4 was not completed in sprint 1 (carried over)
Boolean[] s1Completed = new List<Boolean>{ true, true, true, true, false };

for (Integer i = 0; i < s1Subjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Done').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = s1Subjects[i],
            OpenSF__Status__c = 'Done',
            OpenSF__CardType__c = s1Types[i],
            OpenSF__Priority__c = s1Priorities[i],
            OpenSF__StoryPoints__c = s1Points[i],
            OpenSF__LexoRankPosition__c = generateLexorank(i, s1Subjects.size())
        )
    );
}

// --- Sprint 2 cards (all Done) ---
String[] s2Subjects = new List<String>{
    'Users CRUD endpoints',
    'Projects CRUD endpoints',
    'Cursor-based pagination',
    'Request validation layer',
    'API response envelope',
    'Fix auth token refresh bug'
};
String[] s2Types = new List<String>{
    'Story',
    'Story',
    'Story',
    'Improvement',
    'Task',
    'Bug'
};
String[] s2Priorities = new List<String>{
    'High',
    'High',
    'Medium',
    'Medium',
    'Low',
    'High'
};
Integer[] s2Points = new List<Integer>{ 8, 8, 5, 3, 1, 3 };
Boolean[] s2Completed = new List<Boolean>{
    true,
    true,
    true,
    true,
    true,
    false
};

for (Integer i = 0; i < s2Subjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Done').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = s2Subjects[i],
            OpenSF__Status__c = 'Done',
            OpenSF__CardType__c = s2Types[i],
            OpenSF__Priority__c = s2Priorities[i],
            OpenSF__StoryPoints__c = s2Points[i],
            OpenSF__LexoRankPosition__c = generateLexorank(
                i + s1Subjects.size(),
                s1Subjects.size() + s2Subjects.size()
            )
        )
    );
}

// --- Sprint 3 cards (all Done) ---
String[] s3Subjects = new List<String>{
    'Webhook event system',
    'Webhook retry logic',
    'API versioning headers',
    'OpenAPI spec generation',
    'Developer portal setup',
    'Fix pagination off-by-one'
};
String[] s3Types = new List<String>{
    'Story',
    'Story',
    'Story',
    'Task',
    'Story',
    'Bug'
};
String[] s3Priorities = new List<String>{
    'High',
    'Medium',
    'High',
    'Medium',
    'Medium',
    'High'
};
Integer[] s3Points = new List<Integer>{ 8, 5, 5, 3, 5, 3 };
Boolean[] s3Completed = new List<Boolean>{
    true,
    true,
    true,
    true,
    true,
    false
};

for (Integer i = 0; i < s3Subjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Done').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = s3Subjects[i],
            OpenSF__Status__c = 'Done',
            OpenSF__CardType__c = s3Types[i],
            OpenSF__Priority__c = s3Priorities[i],
            OpenSF__StoryPoints__c = s3Points[i],
            OpenSF__LexoRankPosition__c = generateLexorank(
                i + s1Subjects.size() + s2Subjects.size(),
                s1Subjects.size() + s2Subjects.size() + s3Subjects.size()
            )
        )
    );
}

// --- Sprint 4 (Active) cards - distributed across columns ---
// To Do
String[] s4TodoSubjects = new List<String>{
    'Cache invalidation strategy',
    'Performance dashboard'
};
String[] s4TodoTypes = new List<String>{ 'Spike', 'Story' };
String[] s4TodoPriorities = new List<String>{ 'High', 'Medium' };
Integer[] s4TodoPoints = new List<Integer>{ 3, 5 };

for (Integer i = 0; i < s4TodoSubjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('To Do').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = s4TodoSubjects[i],
            OpenSF__Status__c = 'To Do',
            OpenSF__CardType__c = s4TodoTypes[i],
            OpenSF__Priority__c = s4TodoPriorities[i],
            OpenSF__StoryPoints__c = s4TodoPoints[i],
            OpenSF__LexoRankPosition__c = generateLexorank(
                i,
                s4TodoSubjects.size()
            )
        )
    );
}

// In Progress
String[] s4IpSubjects = new List<String>{
    'GraphQL schema definition',
    'Query resolver layer'
};
String[] s4IpTypes = new List<String>{ 'Story', 'Story' };
String[] s4IpPriorities = new List<String>{ 'High', 'High' };
Integer[] s4IpPoints = new List<Integer>{ 8, 5 };

for (Integer i = 0; i < s4IpSubjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('In Progress').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = s4IpSubjects[i],
            OpenSF__Status__c = 'In Progress',
            OpenSF__CardType__c = s4IpTypes[i],
            OpenSF__Priority__c = s4IpPriorities[i],
            OpenSF__StoryPoints__c = s4IpPoints[i],
            OpenSF__LexoRankPosition__c = generateLexorank(
                i,
                s4IpSubjects.size()
            )
        )
    );
}

// Testing
cards.add(
    new OpenSF__Card__c(
        OpenSF__Column__c = colMap.get('Testing').Id,
        OpenSF__Board__c = board.Id,
        OpenSF__Subject__c = 'Redis cache integration',
        OpenSF__Status__c = 'Testing',
        OpenSF__CardType__c = 'Story',
        OpenSF__Priority__c = 'High',
        OpenSF__StoryPoints__c = 5,
        OpenSF__Color__c = '#06A59A',
        OpenSF__LexoRankPosition__c = generateLexorank(0, 1)
    )
);

// Done (in current sprint)
cards.add(
    new OpenSF__Card__c(
        OpenSF__Column__c = colMap.get('Done').Id,
        OpenSF__Board__c = board.Id,
        OpenSF__Subject__c = 'GraphQL playground setup',
        OpenSF__Status__c = 'Done',
        OpenSF__CardType__c = 'Task',
        OpenSF__Priority__c = 'Medium',
        OpenSF__StoryPoints__c = 2,
        OpenSF__LexoRankPosition__c = generateLexorank(0, 2)
    )
);

// --- Backlog cards (not in any sprint) ---
String[] blSubjects = new List<String>{
    'WebSocket subscriptions',
    'Batch operation endpoint',
    'API analytics dashboard',
    'SDK code generation',
    'Load testing suite'
};
String[] blTypes = new List<String>{
    'Story',
    'Story',
    'Story',
    'Task',
    'Task'
};
String[] blPriorities = new List<String>{
    'Medium',
    'Medium',
    'Low',
    'Low',
    'Medium'
};
Integer[] blPoints = new List<Integer>{ 8, 5, 5, 3, 3 };

for (Integer i = 0; i < blSubjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Backlog').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = blSubjects[i],
            OpenSF__Status__c = 'Backlog',
            OpenSF__CardType__c = blTypes[i],
            OpenSF__Priority__c = blPriorities[i],
            OpenSF__StoryPoints__c = blPoints[i],
            OpenSF__LexoRankPosition__c = generateLexorank(i, blSubjects.size())
        )
    );
}

// Bypass ColumnTriggerHandler to avoid max loop count when bulk-inserting cards
OpenSF.TriggerHandler.bypass('ColumnTriggerHandler');
insert cards;
OpenSF.TriggerHandler.clearBypass('ColumnTriggerHandler');

// 5. Create SprintCard junction records
// We need to map cards by subject for easy lookup
Map<String, OpenSF__Card__c> cardMap = new Map<String, OpenSF__Card__c>();
for (OpenSF__Card__c c : cards) {
    cardMap.put(c.OpenSF__Subject__c, c);
}

List<OpenSF__SprintCard__c> sprintCards = new List<OpenSF__SprintCard__c>();
DateTime now = DateTime.now();

// Sprint 1 cards
for (Integer i = 0; i < s1Subjects.size(); i++) {
    OpenSF__Card__c c = cardMap.get(s1Subjects[i]);
    sprintCards.add(
        new OpenSF__SprintCard__c(
            OpenSF__Sprint__c = sprint1.Id,
            OpenSF__Card__c = c.Id,
            OpenSF__AddedDate__c = DateTime.newInstance(
                today.addDays(-42),
                Time.newInstance(9, 0, 0, 0)
            ),
            OpenSF__CompletedDate__c = s1Completed[i]
                ? DateTime.newInstance(
                      today.addDays(-30),
                      Time.newInstance(17, 0, 0, 0)
                  )
                : null,
            OpenSF__CompletedInSprint__c = s1Completed[i],
            OpenSF__StoryPointsAtAdd__c = s1Points[i],
            OpenSF__Position__c = generateLexorank(i, s1Subjects.size())
        )
    );
}

// Sprint 2 cards
for (Integer i = 0; i < s2Subjects.size(); i++) {
    OpenSF__Card__c c = cardMap.get(s2Subjects[i]);
    sprintCards.add(
        new OpenSF__SprintCard__c(
            OpenSF__Sprint__c = sprint2.Id,
            OpenSF__Card__c = c.Id,
            OpenSF__AddedDate__c = DateTime.newInstance(
                today.addDays(-28),
                Time.newInstance(9, 0, 0, 0)
            ),
            OpenSF__CompletedDate__c = s2Completed[i]
                ? DateTime.newInstance(
                      today.addDays(-16),
                      Time.newInstance(17, 0, 0, 0)
                  )
                : null,
            OpenSF__CompletedInSprint__c = s2Completed[i],
            OpenSF__StoryPointsAtAdd__c = s2Points[i],
            OpenSF__Position__c = generateLexorank(i, s2Subjects.size())
        )
    );
}

// Sprint 3 cards
for (Integer i = 0; i < s3Subjects.size(); i++) {
    OpenSF__Card__c c = cardMap.get(s3Subjects[i]);
    sprintCards.add(
        new OpenSF__SprintCard__c(
            OpenSF__Sprint__c = sprint3.Id,
            OpenSF__Card__c = c.Id,
            OpenSF__AddedDate__c = DateTime.newInstance(
                today.addDays(-14),
                Time.newInstance(9, 0, 0, 0)
            ),
            OpenSF__CompletedDate__c = s3Completed[i]
                ? DateTime.newInstance(
                      today.addDays(-2),
                      Time.newInstance(17, 0, 0, 0)
                  )
                : null,
            OpenSF__CompletedInSprint__c = s3Completed[i],
            OpenSF__StoryPointsAtAdd__c = s3Points[i],
            OpenSF__Position__c = generateLexorank(i, s3Subjects.size())
        )
    );
}

// Sprint 4 (active) cards
String[] s4AllSubjects = new List<String>{
    'Cache invalidation strategy',
    'Performance dashboard',
    'GraphQL schema definition',
    'Query resolver layer',
    'Redis cache integration',
    'GraphQL playground setup'
};
Integer[] s4AllPoints = new List<Integer>{ 3, 5, 8, 5, 5, 2 };
Boolean[] s4AllCompleted = new List<Boolean>{
    false,
    false,
    false,
    false,
    false,
    true
};

for (Integer i = 0; i < s4AllSubjects.size(); i++) {
    OpenSF__Card__c c = cardMap.get(s4AllSubjects[i]);
    sprintCards.add(
        new OpenSF__SprintCard__c(
            OpenSF__Sprint__c = sprint4.Id,
            OpenSF__Card__c = c.Id,
            OpenSF__AddedDate__c = DateTime.newInstance(
                today,
                Time.newInstance(9, 0, 0, 0)
            ),
            OpenSF__CompletedDate__c = s4AllCompleted[i]
                ? DateTime.newInstance(today, Time.newInstance(16, 0, 0, 0))
                : null,
            OpenSF__CompletedInSprint__c = s4AllCompleted[i],
            OpenSF__StoryPointsAtAdd__c = s4AllPoints[i],
            OpenSF__Position__c = generateLexorank(i, s4AllSubjects.size())
        )
    );
}

insert sprintCards;

// 6. Create SprintSnapshots for Sprint 3 (completed sprint - full burndown data)
List<OpenSF__SprintSnapshot__c> snapshots = new List<OpenSF__SprintSnapshot__c>();
Integer s3Total = 29;
Integer s3Cards = 6;
// Simulate daily burndown over 14 days
Integer[] dailyCompleted = new List<Integer>{
    0,
    0,
    3,
    3,
    8,
    8,
    11,
    11,
    16,
    16,
    21,
    21,
    24,
    26
};
Integer[] dailyCompCards = new List<Integer>{
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    5,
    5
};

for (Integer d = 0; d < 14; d++) {
    snapshots.add(
        new OpenSF__SprintSnapshot__c(
            OpenSF__Sprint__c = sprint3.Id,
            OpenSF__SnapshotDate__c = today.addDays(-14 + d),
            OpenSF__TotalPoints__c = s3Total,
            OpenSF__CompletedPoints__c = dailyCompleted[d],
            OpenSF__RemainingPoints__c = s3Total - dailyCompleted[d],
            OpenSF__CardCount__c = s3Cards,
            OpenSF__CompletedCardCount__c = dailyCompCards[d]
        )
    );
}

// Sprint 4 snapshot (day 1 only - just started)
snapshots.add(
    new OpenSF__SprintSnapshot__c(
        OpenSF__Sprint__c = sprint4.Id,
        OpenSF__SnapshotDate__c = today,
        OpenSF__TotalPoints__c = 28,
        OpenSF__CompletedPoints__c = 2,
        OpenSF__RemainingPoints__c = 26,
        OpenSF__CardCount__c = 6,
        OpenSF__CompletedCardCount__c = 1
    )
);

insert snapshots;

System.debug('CREATED Running Sprint Board: ' + board.Id);
System.debug(
    'Sprints: S1(Completed) S2(Completed) S3(Completed) S4(Active=' +
        sprint4.Id +
        ')'
);
System.debug(
    'Cards: ' +
        cards.size() +
        ' | SprintCards: ' +
        sprintCards.size() +
        ' | Snapshots: ' +
        snapshots.size()
);
