/**
 * DesignSessionServiceTest - Tests for DesignSessionService and related classes
 */
@IsTest
private class DesignSessionServiceTest {

    @TestSetup
    static void setupTestData() {
        OpenSF__Board__c board = new OpenSF__Board__c(
            Name = 'Test Board',
            OpenSF__Status__c = 'Active',
            OpenSF__Active__c = true
        );
        insert board;

        OpenSF__Column__c col = new OpenSF__Column__c(
            Name = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__Position__c = 'a'
        );
        insert col;

        OpenSF__Card__c card1 = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 1',
            OpenSF__Board__c = board.Id,
            OpenSF__Column__c = col.Id,
            OpenSF__NeedsRefinement__c = true,
            OpenSF__LexoRankPosition__c = 'a'
        );
        OpenSF__Card__c card2 = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Test Card 2',
            OpenSF__Board__c = board.Id,
            OpenSF__Column__c = col.Id,
            OpenSF__NeedsRefinement__c = true,
            OpenSF__LexoRankPosition__c = 'b'
        );
        insert new List<OpenSF__Card__c>{ card1, card2 };
    }

    static OpenSF__Board__c getBoard() {
        return [SELECT Id FROM OpenSF__Board__c LIMIT 1];
    }

    static List<OpenSF__Card__c> getCards() {
        return [SELECT Id, OpenSF__Subject__c FROM OpenSF__Card__c ORDER BY OpenSF__Subject__c];
    }

    @IsTest
    static void testCreateSession() {
        OpenSF__Board__c board = getBoard();

        Test.startTest();
        DesignSessionDTO.SessionDTO dto = DesignSessionService.createSession(board.Id, 'Sprint Planning DT');
        Test.stopTest();

        System.assertNotEquals(null, dto.id, 'Session should be created');
        System.assertEquals('Sprint Planning DT', dto.title, 'Title should match');
        System.assertEquals('Planning', dto.status, 'Status should be Planning');
        System.assertEquals('Empathize', dto.currentPhase, 'Phase should default to Empathize');
        System.assertEquals(UserInfo.getUserId(), dto.facilitatorId, 'Facilitator should be current user');
    }

    @IsTest
    static void testCreateSessionInvalidBoard() {
        Test.startTest();
        try {
            DesignSessionService.createSession('a00000000000000AAA', 'Bad Session');
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Board not found'), 'Should mention board not found');
        }
        Test.stopTest();
    }

    @IsTest
    static void testStartSession() {
        OpenSF__Board__c board = getBoard();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Test Session');

        Test.startTest();
        DesignSessionDTO.SessionDTO started = DesignSessionService.startSession(session.id);
        Test.stopTest();

        System.assertEquals('Active', started.status, 'Status should be Active');
        System.assertNotEquals(null, started.startedAt, 'StartedAt should be set');
    }

    @IsTest
    static void testStartSessionAlreadyActive() {
        OpenSF__Board__c board = getBoard();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Test');
        DesignSessionService.startSession(session.id);

        Test.startTest();
        try {
            DesignSessionService.startSession(session.id);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Planning'), 'Should mention Planning status');
        }
        Test.stopTest();
    }

    @IsTest
    static void testEndSession() {
        OpenSF__Board__c board = getBoard();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Test');
        DesignSessionService.startSession(session.id);

        Test.startTest();
        DesignSessionService.endSession(session.id);
        Test.stopTest();

        OpenSF__DesignSession__c ended = [
            SELECT OpenSF__Status__c, OpenSF__EndedAt__c
            FROM OpenSF__DesignSession__c WHERE Id = :session.id
        ];
        System.assertEquals('Completed', ended.OpenSF__Status__c, 'Should be completed');
        System.assertNotEquals(null, ended.OpenSF__EndedAt__c, 'EndedAt should be set');
    }

    @IsTest
    static void testAddAndRemoveCardFromSession() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Card Test');

        Test.startTest();
        DesignSessionDTO.SessionCardDTO sc = DesignSessionService.addCardToSession(session.id, cards[0].Id);
        Test.stopTest();

        System.assertNotEquals(null, sc.id, 'Session card should be created');
        System.assertEquals(cards[0].Id, sc.cardId, 'Card ID should match');

        // Verify card's design phase was set
        OpenSF__Card__c updatedCard = [
            SELECT OpenSF__DesignPhase__c, OpenSF__ActiveDesignSession__c
            FROM OpenSF__Card__c WHERE Id = :cards[0].Id
        ];
        System.assertEquals('Empathize', updatedCard.OpenSF__DesignPhase__c, 'Card phase should be Empathize');
        System.assertEquals(session.id, updatedCard.OpenSF__ActiveDesignSession__c, 'Active session should be set');

        // Remove
        DesignSessionService.removeCardFromSession(session.id, cards[0].Id);
        updatedCard = [
            SELECT OpenSF__ActiveDesignSession__c FROM OpenSF__Card__c WHERE Id = :cards[0].Id
        ];
        System.assertEquals(null, updatedCard.OpenSF__ActiveDesignSession__c, 'Session should be cleared');
    }

    @IsTest
    static void testAddDuplicateCard() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Dup Test');
        DesignSessionService.addCardToSession(session.id, cards[0].Id);

        Test.startTest();
        try {
            DesignSessionService.addCardToSession(session.id, cards[0].Id);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('already in this session'), 'Should mention duplicate');
        }
        Test.stopTest();
    }

    @IsTest
    static void testAdvanceCardPhase() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Phase Test');
        DesignSessionService.addCardToSession(session.id, cards[0].Id);

        Test.startTest();
        DesignSessionService.advanceCardPhase(cards[0].Id, 'Define');
        Test.stopTest();

        OpenSF__Card__c card = [
            SELECT OpenSF__DesignPhase__c FROM OpenSF__Card__c WHERE Id = :cards[0].Id
        ];
        System.assertEquals('Define', card.OpenSF__DesignPhase__c, 'Phase should advance to Define');
    }

    @IsTest
    static void testInvalidPhaseAdvance() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Invalid Phase Test');
        DesignSessionService.addCardToSession(session.id, cards[0].Id);

        Test.startTest();
        try {
            DesignSessionService.advanceCardPhase(cards[0].Id, 'Ideate'); // Skip Define
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Invalid phase advance'), 'Should mention invalid');
        }
        Test.stopTest();
    }

    @IsTest
    static void testReturnCardToPhase() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Return Test');
        DesignSessionService.addCardToSession(session.id, cards[0].Id);
        DesignSessionService.advanceCardPhase(cards[0].Id, 'Define');
        DesignSessionService.advanceCardPhase(cards[0].Id, 'Ideate');

        Test.startTest();
        DesignSessionService.returnCardToPhase(cards[0].Id, 'Empathize');
        Test.stopTest();

        OpenSF__Card__c card = [
            SELECT OpenSF__DesignPhase__c FROM OpenSF__Card__c WHERE Id = :cards[0].Id
        ];
        System.assertEquals('Empathize', card.OpenSF__DesignPhase__c, 'Phase should return to Empathize');
    }

    @IsTest
    static void testCreateAndDeleteNote() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Note Test');

        Test.startTest();
        DesignSessionDTO.NoteDTO note = DesignSessionService.createNote(
            session.id, cards[0].Id, 'User feels frustrated', 'feels',
            'EmpathyMap', 'Empathize', 75.0, 25.0
        );
        Test.stopTest();

        System.assertNotEquals(null, note.id, 'Note should be created');
        System.assertEquals('User feels frustrated', note.text, 'Text should match');
        System.assertEquals('feels', note.zone, 'Zone should match');

        // Delete
        DesignSessionService.deleteNote(note.id);
        List<OpenSF__DesignNote__c> remaining = [
            SELECT Id FROM OpenSF__DesignNote__c WHERE Id = :note.id
        ];
        System.assert(remaining.isEmpty(), 'Note should be deleted');
    }

    @IsTest
    static void testUpdateNote() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Update Note Test');

        DesignSessionDTO.NoteDTO note = DesignSessionService.createNote(
            session.id, cards[0].Id, 'Original', 'says', 'EmpathyMap', 'Empathize', 10.0, 10.0
        );

        Test.startTest();
        DesignSessionService.updateNote(note.id, 'Updated text', 'thinks', 50.0, 50.0);
        Test.stopTest();

        OpenSF__DesignNote__c updated = [
            SELECT OpenSF__Text__c, OpenSF__Zone__c, OpenSF__PositionX__c, OpenSF__PositionY__c
            FROM OpenSF__DesignNote__c WHERE Id = :note.id
        ];
        System.assertEquals('Updated text', updated.OpenSF__Text__c, 'Text should be updated');
        System.assertEquals('thinks', updated.OpenSF__Zone__c, 'Zone should be updated');
    }

    @IsTest
    static void testCastAndRetractVote() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Vote Test');

        DesignSessionDTO.NoteDTO note = DesignSessionService.createNote(
            session.id, cards[0].Id, 'Great idea', 'unsorted', 'Brainstorm', 'Ideate', 0, 0
        );

        Test.startTest();
        DesignSessionService.castVote(session.id, note.id, 'Dot', null, 1);
        Test.stopTest();

        OpenSF__DesignNote__c votedNote = [
            SELECT OpenSF__VoteCount__c FROM OpenSF__DesignNote__c WHERE Id = :note.id
        ];
        System.assertEquals(1, votedNote.OpenSF__VoteCount__c, 'Vote count should be 1');

        // Retract
        DesignSessionService.retractVote(session.id, note.id, 1);
        votedNote = [
            SELECT OpenSF__VoteCount__c FROM OpenSF__DesignNote__c WHERE Id = :note.id
        ];
        System.assertEquals(0, votedNote.OpenSF__VoteCount__c, 'Vote count should be 0 after retract');
    }

    @IsTest
    static void testDuplicateVote() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Dup Vote');

        DesignSessionDTO.NoteDTO note = DesignSessionService.createNote(
            session.id, cards[0].Id, 'Idea', 'unsorted', 'Brainstorm', 'Ideate', 0, 0
        );
        DesignSessionService.castVote(session.id, note.id, 'Dot', null, 1);

        Test.startTest();
        try {
            DesignSessionService.castVote(session.id, note.id, 'Dot', null, 1);
            System.assert(false, 'Should have thrown exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('already voted'), 'Should mention already voted');
        }
        Test.stopTest();
    }

    @IsTest
    static void testSaveArtifact() {
        OpenSF__Board__c board = getBoard();
        List<OpenSF__Card__c> cards = getCards();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Artifact Test');

        Test.startTest();
        DesignSessionDTO.ArtifactDTO artifact = DesignSessionService.saveArtifact(
            session.id, cards[0].Id, 'Persona', 'Busy Parent Pat',
            '{"name":"Pat","role":"Parent","goals":["Save time"]}', 'Define', 'EmpathyMap'
        );
        Test.stopTest();

        System.assertNotEquals(null, artifact.id, 'Artifact should be created');
        System.assertEquals('Persona', artifact.artifactType, 'Type should match');
        System.assertEquals('Busy Parent Pat', artifact.title, 'Title should match');
    }

    @IsTest
    static void testSetSessionPhase() {
        OpenSF__Board__c board = getBoard();
        DesignSessionDTO.SessionDTO session = DesignSessionService.createSession(board.Id, 'Phase Test');

        Test.startTest();
        DesignSessionService.setSessionPhase(session.id, 'Define');
        Test.stopTest();

        OpenSF__DesignSession__c updated = [
            SELECT OpenSF__CurrentPhase__c FROM OpenSF__DesignSession__c WHERE Id = :session.id
        ];
        System.assertEquals('Define', updated.OpenSF__CurrentPhase__c, 'Phase should be updated');
    }

    @IsTest
    static void testDesignEnumsConversions() {
        // Session status
        System.assertEquals('Planning', DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.PLANNING));
        System.assertEquals('Active', DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.ACTIVE));
        System.assertEquals('Completed', DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.COMPLETED));
        System.assertEquals('Cancelled', DesignEnums.sessionStatusValue(DesignEnums.SessionStatus.CANCELLED));

        // Design phase
        System.assertEquals('Empathize', DesignEnums.designPhaseValue(DesignEnums.DesignPhase.EMPATHIZE));
        System.assertEquals('Test', DesignEnums.designPhaseValue(DesignEnums.DesignPhase.DT_TEST));
        System.assertEquals('Refined', DesignEnums.designPhaseValue(DesignEnums.DesignPhase.REFINED));

        // Tools
        System.assertEquals('EmpathyMap', DesignEnums.toolValue(DesignEnums.Tool.EMPATHY_MAP));
        System.assertEquals('Brainstorm', DesignEnums.toolValue(DesignEnums.Tool.BRAINSTORM));

        // Phase validation
        System.assert(DesignEnums.isValidPhaseAdvance('Empathize', 'Define'));
        System.assert(!DesignEnums.isValidPhaseAdvance('Empathize', 'Ideate'));
        System.assert(DesignEnums.isValidPhaseReturn('Ideate', 'Empathize'));
        System.assert(!DesignEnums.isValidPhaseReturn('Empathize', 'Define'));

        // Event types
        System.assertEquals('note_added', DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.NOTE_ADDED));
        System.assertEquals('vote_cast', DesignEnums.sessionEventTypeValue(DesignEnums.SessionEventType.VOTE_CAST));
    }
}
