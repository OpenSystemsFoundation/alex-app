// Creates a Sprint board with 1 sprint in Planning status (not yet started)
// Cards in backlog, some assigned to the upcoming sprint
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
    Name = 'Mobile App MVP',
    OpenSF__Status__c = 'Published',
    OpenSF__Type__c = 'Sprint',
    OpenSF__Active__c = true,
    OpenSF__EmailNotifications__c = false,
    OpenSF__SalesforceNotifications__c = false,
    OpenSF__Description__c = 'Mobile application MVP development with sprint-based workflow.'
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
List<String> statuses = new List<String>{
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
List<String> colors = new List<String>{
    '#747474',
    '#1B96FF',
    '#F39C12',
    '#9B59B6',
    '#06A59A',
    '#2ECC71'
};
List<Integer> wipLimits = new List<Integer>{ null, 5, 3, 3, 2, null };

List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
for (Integer i = 0; i < headers.size(); i++) {
    OpenSF__Column__c col = new OpenSF__Column__c(
        OpenSF__Board__c = board.Id,
        OpenSF__ColumnHeader__c = headers[i],
        OpenSF__Status__c = statuses[i],
        OpenSF__Category__c = categories[i],
        OpenSF__Color__c = colors[i],
        OpenSF__LexoRankPosition__c = generateLexorank(i, headers.size())
    );
    if (wipLimits[i] != null) {
        col.OpenSF__WipLimit__c = wipLimits[i];
    }
    columns.add(col);
}
insert columns;

Map<String, OpenSF__Column__c> colMap = new Map<String, OpenSF__Column__c>();
for (OpenSF__Column__c c : columns) {
    colMap.put(c.OpenSF__ColumnHeader__c, c);
}

// 3. Create Sprint 1 - Planning (starts next Monday, 2-week sprint)
Date nextMonday = Date.today().toStartOfWeek().addDays(7);
OpenSF__Sprint__c sprint1 = new OpenSF__Sprint__c(
    OpenSF__Board__c = board.Id,
    OpenSF__Status__c = 'Planning',
    OpenSF__SprintNumber__c = 1,
    OpenSF__StartDate__c = nextMonday,
    OpenSF__EndDate__c = nextMonday.addDays(13),
    OpenSF__Goal__c = 'Deliver user authentication flow and onboarding screens.',
    OpenSF__TotalStoryPoints__c = 26,
    OpenSF__CompletedStoryPoints__c = 0
);
insert sprint1;

// 4. Create Cards - all start in Backlog (sprint hasn't started yet)
List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();

String[] subjects = new List<String>{
    'User registration screen',
    'Login with email and password',
    'Forgot password flow',
    'Social login integration',
    'Onboarding walkthrough',
    'Profile setup screen',
    'Push notification opt-in',
    'App icon and splash screen',
    'Bottom tab navigation',
    'Settings page layout'
};
String[] types = new List<String>{
    'Story',
    'Story',
    'Story',
    'Story',
    'Story',
    'Story',
    'Task',
    'Task',
    'Story',
    'Task'
};
String[] priorities = new List<String>{
    'High',
    'High',
    'Medium',
    'Medium',
    'High',
    'Medium',
    'Low',
    'Low',
    'High',
    'Trivial'
};
Integer[] points = new List<Integer>{ 5, 5, 3, 5, 8, 3, 2, 1, 5, 2 };

for (Integer i = 0; i < subjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Backlog').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = subjects[i],
            OpenSF__Status__c = 'Backlog',
            OpenSF__CardType__c = types[i],
            OpenSF__Priority__c = priorities[i],
            OpenSF__StoryPoints__c = points[i],
            OpenSF__LexoRankPosition__c = generateLexorank(i, subjects.size())
        )
    );
}
insert cards;

// 5. Assign first 6 cards to Sprint 1 via SprintCard junction
List<OpenSF__SprintCard__c> sprintCards = new List<OpenSF__SprintCard__c>();
for (Integer i = 0; i < 6; i++) {
    sprintCards.add(
        new OpenSF__SprintCard__c(
            OpenSF__Sprint__c = sprint1.Id,
            OpenSF__Card__c = cards[i].Id,
            OpenSF__AddedDate__c = DateTime.now(),
            OpenSF__StoryPointsAtAdd__c = points[i],
            OpenSF__CompletedInSprint__c = false,
            OpenSF__Position__c = generateLexorank(i, 6)
        )
    );
}
insert sprintCards;

System.debug(
    'CREATED New Sprint Board: ' +
        board.Id +
        ' | Sprint: ' +
        sprint1.Id +
        ' (Planning) | ' +
        cards.size() +
        ' cards, ' +
        sprintCards.size() +
        ' assigned to sprint'
);
