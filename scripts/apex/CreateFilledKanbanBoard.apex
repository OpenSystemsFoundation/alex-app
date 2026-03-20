// Creates a Kanban board with 6 columns and realistic mock cards
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
    Name = 'Website Redesign',
    OpenSF__Status__c = 'Published',
    OpenSF__Type__c = 'Project',
    OpenSF__Active__c = true,
    OpenSF__EmailNotifications__c = false,
    OpenSF__SalesforceNotifications__c = false,
    OpenSF__Description__c = 'Full website redesign project tracking all tasks from design to deployment.'
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

List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
for (Integer i = 0; i < headers.size(); i++) {
    columns.add(
        new OpenSF__Column__c(
            OpenSF__Board__c = board.Id,
            OpenSF__ColumnHeader__c = headers[i],
            OpenSF__Status__c = statuses[i],
            OpenSF__LexoRankPosition__c = generateLexorank(i, headers.size())
        )
    );
}
insert columns;

// Map columns by header for easy lookup
Map<String, OpenSF__Column__c> colMap = new Map<String, OpenSF__Column__c>();
for (OpenSF__Column__c c : columns) {
    colMap.put(c.OpenSF__ColumnHeader__c, c);
}

// 3. Create an Epic card first (no column - lives in backlog)
OpenSF__Card__c epic = new OpenSF__Card__c(
    OpenSF__Column__c = colMap.get('Backlog').Id,
    OpenSF__Board__c = board.Id,
    OpenSF__Subject__c = 'Homepage Overhaul',
    OpenSF__Status__c = 'Backlog',
    OpenSF__CardType__c = 'Epic',
    OpenSF__Priority__c = 'High',
    OpenSF__StoryPoints__c = 21,
    OpenSF__Description__c = 'Complete redesign of the homepage including hero section, navigation, and footer.',
    OpenSF__LexoRankPosition__c = generateLexorank(0, 1)
);
insert epic;

// 4. Create Cards per column
// Structure: Subject, CardType, Priority, StoryPoints, Color (null = no color)
// Backlog cards (3 cards, index 0-2 among 3)
List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();

// -- Backlog --
String[] bSubjects = new List<String>{
    'Add dark mode support',
    'Implement search autocomplete',
    'Research analytics integration'
};
String[] bTypes = new List<String>{ 'Story', 'Story', 'Spike' };
String[] bPriorities = new List<String>{ 'Medium', 'Medium', 'Low' };
Integer[] bPoints = new List<Integer>{ 5, 8, 2 };

for (Integer i = 0; i < bSubjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Backlog').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = bSubjects[i],
            OpenSF__Status__c = 'Backlog',
            OpenSF__CardType__c = bTypes[i],
            OpenSF__Priority__c = bPriorities[i],
            OpenSF__StoryPoints__c = bPoints[i],
            OpenSF__Epic__c = epic.Id,
            OpenSF__LexoRankPosition__c = generateLexorank(
                i + 1,
                bSubjects.size() + 1
            )
        )
    );
}

// -- To Do --
String[] tSubjects = new List<String>{
    'Design new landing page',
    'Update color palette',
    'Add accessibility labels'
};
String[] tTypes = new List<String>{ 'Story', 'Task', 'Improvement' };
String[] tPriorities = new List<String>{ 'High', 'Medium', 'Medium' };
Integer[] tPoints = new List<Integer>{ 8, 3, 5 };
String[] tColors = new List<String>{ null, null, '#06A59A' };

for (Integer i = 0; i < tSubjects.size(); i++) {
    OpenSF__Card__c card = new OpenSF__Card__c(
        OpenSF__Column__c = colMap.get('To Do').Id,
        OpenSF__Board__c = board.Id,
        OpenSF__Subject__c = tSubjects[i],
        OpenSF__Status__c = 'To Do',
        OpenSF__CardType__c = tTypes[i],
        OpenSF__Priority__c = tPriorities[i],
        OpenSF__StoryPoints__c = tPoints[i],
        OpenSF__Epic__c = epic.Id,
        OpenSF__LexoRankPosition__c = generateLexorank(i, tSubjects.size())
    );
    if (tColors[i] != null)
        card.OpenSF__Color__c = tColors[i];
    cards.add(card);
}

// -- In Progress --
String[] ipSubjects = new List<String>{
    'Build responsive header',
    'Fix mobile navigation overflow'
};
String[] ipTypes = new List<String>{ 'Story', 'Bug' };
String[] ipPriorities = new List<String>{ 'High', 'High' };
Integer[] ipPoints = new List<Integer>{ 5, 3 };
String[] ipColors = new List<String>{ null, '#EA001E' };

for (Integer i = 0; i < ipSubjects.size(); i++) {
    OpenSF__Card__c card = new OpenSF__Card__c(
        OpenSF__Column__c = colMap.get('In Progress').Id,
        OpenSF__Board__c = board.Id,
        OpenSF__Subject__c = ipSubjects[i],
        OpenSF__Status__c = 'In Progress',
        OpenSF__CardType__c = ipTypes[i],
        OpenSF__Priority__c = ipPriorities[i],
        OpenSF__StoryPoints__c = ipPoints[i],
        OpenSF__Epic__c = epic.Id,
        OpenSF__LexoRankPosition__c = generateLexorank(i, ipSubjects.size())
    );
    if (ipColors[i] != null)
        card.OpenSF__Color__c = ipColors[i];
    cards.add(card);
}

// -- Testing --
String[] teSubjects = new List<String>{
    'Contact form validation',
    'Footer links update'
};
String[] teTypes = new List<String>{ 'Story', 'Task' };
String[] tePriorities = new List<String>{ 'Medium', 'Low' };
Integer[] tePoints = new List<Integer>{ 3, 2 };

for (Integer i = 0; i < teSubjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Testing').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = teSubjects[i],
            OpenSF__Status__c = 'Testing',
            OpenSF__CardType__c = teTypes[i],
            OpenSF__Priority__c = tePriorities[i],
            OpenSF__StoryPoints__c = tePoints[i],
            OpenSF__LexoRankPosition__c = generateLexorank(i, teSubjects.size())
        )
    );
}

// -- Review --
cards.add(
    new OpenSF__Card__c(
        OpenSF__Column__c = colMap.get('Review').Id,
        OpenSF__Board__c = board.Id,
        OpenSF__Subject__c = 'Hero section animation',
        OpenSF__Status__c = 'Review',
        OpenSF__CardType__c = 'Story',
        OpenSF__Priority__c = 'Medium',
        OpenSF__StoryPoints__c = 5,
        OpenSF__Epic__c = epic.Id,
        OpenSF__LexoRankPosition__c = generateLexorank(0, 1)
    )
);

// -- Done --
String[] dSubjects = new List<String>{
    'Setup project repository',
    'Create wireframes',
    'Configure CI/CD pipeline'
};
String[] dTypes = new List<String>{ 'Task', 'Story', 'Task' };
String[] dPriorities = new List<String>{ 'Trivial', 'Medium', 'Low' };
Integer[] dPoints = new List<Integer>{ 1, 5, 3 };

for (Integer i = 0; i < dSubjects.size(); i++) {
    cards.add(
        new OpenSF__Card__c(
            OpenSF__Column__c = colMap.get('Done').Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = dSubjects[i],
            OpenSF__Status__c = 'Done',
            OpenSF__CardType__c = dTypes[i],
            OpenSF__Priority__c = dPriorities[i],
            OpenSF__StoryPoints__c = dPoints[i],
            OpenSF__LexoRankPosition__c = generateLexorank(i, dSubjects.size())
        )
    );
}

// Bypass ColumnTriggerHandler to avoid max loop count when bulk-inserting cards across 6 columns
OpenSF.TriggerHandler.bypass('ColumnTriggerHandler');
insert cards;
OpenSF.TriggerHandler.clearBypass('ColumnTriggerHandler');

System.debug(
    'CREATED Filled Kanban Board: ' +
        board.Id +
        ' with ' +
        (cards.size() + 1) +
        ' cards'
);
