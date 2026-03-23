/**
 * DesignSessionControllerTest - Tests for the thin controller facade
 */
@IsTest
private class DesignSessionControllerTest {
    @TestSetup
    static void setupTestData() {
        OpenSF__Board__c board = new OpenSF__Board__c(
            Name = 'Controller Test Board',
            OpenSF__Status__c = 'Active',
            OpenSF__Active__c = true
        );
        insert board;

        OpenSF__Column__c col = new OpenSF__Column__c(
            OpenSF__ColumnHeader__c = 'To Do',
            OpenSF__Board__c = board.Id,
            OpenSF__LexoRankPosition__c = '0|h00000:'
        );
        insert col;

        OpenSF__Card__c card = new OpenSF__Card__c(
            OpenSF__Subject__c = 'Controller Test Card',
            OpenSF__Board__c = board.Id,
            OpenSF__Column__c = col.Id,
            OpenSF__LexoRankPosition__c = 'a'
        );
        insert card;
    }

    static OpenSF__Board__c getBoard() {
        return [SELECT Id FROM OpenSF__Board__c LIMIT 1];
    }

    static OpenSF__Card__c getCard() {
        return [SELECT Id FROM OpenSF__Card__c LIMIT 1];
    }

    @IsTest
    static void testControllerCreateSession() {
        OpenSF__Board__c board = getBoard();

        Test.startTest();
        DesignSessionDTO.SessionDTO dto = DesignSessionController.createSession(
            board.Id,
            'Controller Session'
        );
        Test.stopTest();

        System.assertNotEquals(null, dto.id);
        System.assertEquals('Controller Session', dto.title);
    }

    @IsTest
    static void testControllerGetSession() {
        OpenSF__Board__c board = getBoard();
        DesignSessionDTO.SessionDTO created = DesignSessionController.createSession(
            board.Id,
            'Get Test'
        );

        Test.startTest();
        DesignSessionDTO.SessionDTO fetched = DesignSessionController.getSession(
            created.id
        );
        Test.stopTest();

        System.assertEquals(created.id, fetched.id);
        System.assertEquals('Get Test', fetched.title);
    }

    @IsTest
    static void testControllerGetSessionsByBoard() {
        OpenSF__Board__c board = getBoard();
        DesignSessionController.createSession(board.Id, 'Session A');
        DesignSessionController.createSession(board.Id, 'Session B');

        Test.startTest();
        List<DesignSessionDTO.SessionDTO> sessions = DesignSessionController.getSessionsByBoard(
            board.Id
        );
        Test.stopTest();

        System.assertEquals(2, sessions.size(), 'Should have 2 sessions');
    }

    @IsTest
    static void testControllerSessionLifecycle() {
        OpenSF__Board__c board = getBoard();
        DesignSessionDTO.SessionDTO session = DesignSessionController.createSession(
            board.Id,
            'Lifecycle'
        );

        Test.startTest();
        DesignSessionDTO.SessionDTO started = DesignSessionController.startSession(
            session.id
        );
        System.assertEquals('Active', started.status);

        DesignSessionController.endSession(session.id);
        Test.stopTest();

        OpenSF__DesignSession__c ended = [
            SELECT OpenSF__Status__c
            FROM OpenSF__DesignSession__c
            WHERE Id = :session.id
        ];
        System.assertEquals('Completed', ended.OpenSF__Status__c);
    }

    @IsTest
    static void testControllerCardOperations() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Card__c card = getCard();
        DesignSessionDTO.SessionDTO session = DesignSessionController.createSession(
            board.Id,
            'Card Ops'
        );

        Test.startTest();
        DesignSessionDTO.SessionCardDTO sc = DesignSessionController.addCardToSession(
            session.id,
            card.Id
        );
        System.assertNotEquals(null, sc.id);

        DesignSessionController.advanceCardPhase(card.Id, 'Define');
        DesignSessionController.setSessionPhase(session.id, 'Define');
        DesignSessionController.returnCardToPhase(card.Id, 'Empathize');
        DesignSessionController.removeCardFromSession(session.id, card.Id);
        Test.stopTest();
    }

    @IsTest
    static void testControllerNoteOperations() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Card__c card = getCard();
        DesignSessionDTO.SessionDTO session = DesignSessionController.createSession(
            board.Id,
            'Note Ops'
        );

        Test.startTest();
        DesignSessionDTO.NoteDTO note = DesignSessionController.createNote(
            session.id,
            card.Id,
            'Test note',
            'says',
            'EmpathyMap',
            'Empathize',
            10.0,
            20.0
        );
        System.assertNotEquals(null, note.id);

        DesignSessionController.updateNote(
            note.id,
            'Updated',
            'thinks',
            50.0,
            50.0
        );
        DesignSessionController.deleteNote(note.id);

        List<DesignSessionDTO.NoteDTO> notes = DesignSessionController.getNotesBySession(
            session.id,
            'EmpathyMap',
            'Empathize'
        );
        System.assertEquals(0, notes.size());
        Test.stopTest();
    }

    @IsTest
    static void testControllerVoteOperations() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Card__c card = getCard();
        DesignSessionDTO.SessionDTO session = DesignSessionController.createSession(
            board.Id,
            'Vote Ops'
        );
        DesignSessionDTO.NoteDTO note = DesignSessionController.createNote(
            session.id,
            card.Id,
            'Votable idea',
            'unsorted',
            'Brainstorm',
            'Ideate',
            0,
            0
        );

        Test.startTest();
        DesignSessionController.castVote(session.id, note.id, 'Dot', null, 1);

        List<DesignSessionDTO.VoteDTO> votes = DesignSessionController.getVotesBySession(
            session.id,
            1
        );
        System.assertEquals(1, votes.size());

        DesignSessionController.retractVote(session.id, note.id, 1);
        Test.stopTest();
    }

    @IsTest
    static void testControllerArtifactOperations() {
        OpenSF__Board__c board = getBoard();
        OpenSF__Card__c card = getCard();
        DesignSessionDTO.SessionDTO session = DesignSessionController.createSession(
            board.Id,
            'Artifact Ops'
        );

        Test.startTest();
        DesignSessionDTO.ArtifactDTO artifact = DesignSessionController.saveArtifact(
            session.id,
            card.Id,
            'Persona',
            'Test Persona',
            '{"name":"Pat"}',
            'Define',
            'EmpathyMap'
        );
        System.assertNotEquals(null, artifact.id);

        List<DesignSessionDTO.ArtifactDTO> artifacts = DesignSessionController.getArtifactsByCard(
            card.Id
        );
        System.assertEquals(1, artifacts.size());
        Test.stopTest();
    }

    @IsTest
    static void testControllerGetPhaseCounts() {
        OpenSF__Board__c board = getBoard();

        Test.startTest();
        Map<String, Integer> counts = DesignSessionController.getPhaseCounts(
            board.Id
        );
        Test.stopTest();

        System.assertNotEquals(null, counts);
    }
}
